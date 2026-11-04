import express, { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import requireAuth from '../middleware/requireAuth.js';
import { accessFor } from './payments.js';

const router = Router();

// The resume can include a photo, so it needs more room than the 10kb used for login forms.
const BODY_LIMIT = '6mb';
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // MongoDB documents stop at 16MB; this leaves plenty of headroom.
const MAX_RESUMES = 10; // premium: per person; with photos, this keeps one account's storage in check.
const FREE_MAX_RESUMES = 1; // everyone without an active premium payment
const MAX_TITLE = 80;
const DEFAULT_TITLE = 'My resume';
const NOT_FOUND = { message: 'Resume not found.' };

// How many resumes this person may keep right now. Premium is checked on every call, so the limit follows
// the person's payment: it goes up when they pay and back down when their access runs out.
const limitFor = async (userId) => {
  const { premium } = await accessFor(userId);
  return { premium, limit: premium ? MAX_RESUMES : FREE_MAX_RESUMES };
};

const limitMessage = ({ premium, limit }) =>
  premium
    ? `You can keep up to ${limit} resumes. Delete one to add another.`
    : `Free accounts can save ${limit} resume. Delete it to start a new one, or upgrade to Premium to save up to ${MAX_RESUMES}.`;

// Returns the body for a 409 when the person is already at their limit, or null when they can add another.
const limitReached = async (userId) => {
  const plan = await limitFor(userId);
  if ((await Resume.countDocuments({ user: userId })) < plan.limit) return null;
  return { message: limitMessage(plan), premiumRequired: !plan.premium };
};

// The builder saves a second after each change, so this is generous for one person and still stops abuse.
const profileLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many saves. Please wait a moment.' },
});

// Order matters: rate limit, then the token check, then (only for signed-in people) read the body.
export const profileMiddleware = [profileLimiter, requireAuth, express.json({ limit: BODY_LIMIT })];

// Only what the builder really saves is kept; anything else in the request is dropped.
const RESUME_KEYS = ['resumeData', 'selectedTemplate', 'sectionOrder', 'hiddenSections', 'pageNumbers', 'completedSteps'];

const ID_RE = /^[0-9a-f]{24}$/i; // mongoose.isValidObjectId() also accepts any 12-character string, so it is not used here.

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const cleanText = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

// The few details the resume list shows, so listing never has to read every resume's JSON.
const summarise = (resume) => {
  const personal = isPlainObject(resume.resumeData?.personal) ? resume.resumeData.personal : {};
  return {
    name: [cleanText(personal.firstName, 60), cleanText(personal.lastName, 60)].filter(Boolean).join(' '),
    profession: cleanText(personal.profession, 100),
    template: cleanText(resume.selectedTemplate, 60),
  };
};

// Checks a request body of the form { resume: {...} }.
// Returns { json, summary } when it can be saved, or { status, message } when it cannot.
const parseResume = (body) => {
  const incoming = body?.resume;
  if (!isPlainObject(incoming) || !isPlainObject(incoming.resumeData)) {
    return { status: 400, message: 'Resume data is missing or invalid.' };
  }

  const resume = {};
  RESUME_KEYS.forEach((key) => {
    if (incoming[key] !== undefined) resume[key] = incoming[key];
  });

  const json = JSON.stringify(resume);
  if (Buffer.byteLength(json) > MAX_RESUME_BYTES) {
    return { status: 413, message: 'Your resume is too large to save. Try a smaller photo.' };
  }
  return { json, summary: summarise(resume) };
};

// A saved resume's JSON as an object; an unreadable copy is treated as "nothing saved yet".
const readJson = (json) => {
  try {
    const parsed = JSON.parse(json);
    return isPlainObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/*
 * Accounts made before multiple resumes existed hold their one resume on the user itself (resumeJson).
 * The first time such an account asks for its resumes, that resume moves into the Resume collection.
 * Taking it off the user is a single atomic update, so if two requests arrive together only one of them
 * gets the resume and moves it. If the move fails, it is put back and the next request tries again.
 */
const moveLegacyResume = async (userId) => {
  const legacy = await User.findOneAndUpdate(
    { _id: userId, resumeJson: { $exists: true, $ne: null } },
    { $unset: { resumeJson: 1, resumeUpdatedAt: 1 } }
  ).select('+resumeJson resumeUpdatedAt'); // returns the user as it was before the update

  if (!legacy || !legacy.resumeJson) return;

  try {
    const parsed = readJson(legacy.resumeJson);
    const summary = parsed && isPlainObject(parsed.resumeData) ? summarise(parsed) : {};
    const when = legacy.resumeUpdatedAt || new Date();
    await new Resume({
      user: userId,
      title: DEFAULT_TITLE,
      ...summary,
      resumeJson: legacy.resumeJson,
      createdAt: when,
      updatedAt: when, // keeps "last edited" truthful instead of showing the moment of the move
    }).save({ timestamps: false });
  } catch (err) {
    await User.updateOne({ _id: userId }, { $set: { resumeJson: legacy.resumeJson, resumeUpdatedAt: legacy.resumeUpdatedAt } });
    throw err;
  }
};

// Every route below needs a real account, and every :id must look like an id before it reaches a query.
router.use(async (req, res, next) => {
  try {
    if (!(await User.exists({ _id: req.userId }))) return res.status(401).json({ message: 'Please sign in to continue.' });
    return next();
  } catch (err) {
    return next(err);
  }
});

router.param('id', (req, res, next, id) => (ID_RE.test(id) ? next() : res.status(404).json(NOT_FOUND)));

// A resume is only ever looked up together with its owner, so nobody can reach someone else's by id.
const mine = (req) => ({ _id: req.params.id, user: req.userId });

/* GET /api/profile/resumes  ->  { items: [{ id, title, name, profession, template, createdAt, updatedAt }], limit, premium } */
router.get('/resumes', async (req, res, next) => {
  try {
    await moveLegacyResume(req.userId);
    const [items, plan] = await Promise.all([Resume.find({ user: req.userId }).sort({ updatedAt: -1 }), limitFor(req.userId)]);
    return res.json({ items, limit: plan.limit, premium: plan.premium });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/profile/resumes  { title?, resume: {...} }  ->  201 { item } */
router.post('/resumes', async (req, res, next) => {
  try {
    const parsed = parseResume(req.body);
    if (parsed.message) return res.status(parsed.status).json({ message: parsed.message });

    const full = await limitReached(req.userId);
    if (full) return res.status(409).json(full);

    const item = await Resume.create({
      user: req.userId,
      title: cleanText(req.body?.title, MAX_TITLE) || DEFAULT_TITLE,
      ...parsed.summary,
      resumeJson: parsed.json,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
});

/* GET /api/profile/resumes/:id  ->  { item, resume: {...} | null } */
router.get('/resumes/:id', async (req, res, next) => {
  try {
    const doc = await Resume.findOne(mine(req)).select('+resumeJson');
    if (!doc) return res.status(404).json(NOT_FOUND);
    return res.json({ item: doc, resume: readJson(doc.resumeJson) });
  } catch (err) {
    return next(err);
  }
});

/* PUT /api/profile/resumes/:id  { resume: { resumeData, selectedTemplate, sectionOrder, hiddenSections, pageNumbers, completedSteps } }  ->  { item } */
router.put('/resumes/:id', async (req, res, next) => {
  try {
    const parsed = parseResume(req.body);
    if (parsed.message) return res.status(parsed.status).json({ message: parsed.message });

    const item = await Resume.findOneAndUpdate(
      mine(req),
      { $set: { ...parsed.summary, resumeJson: parsed.json } },
      { new: true }
    );
    if (!item) return res.status(404).json(NOT_FOUND);
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
});

/* PATCH /api/profile/resumes/:id  { title }  ->  { item }   (renaming is not an edit, so "last edited" stays) */
router.patch('/resumes/:id', async (req, res, next) => {
  try {
    const title = cleanText(req.body?.title, MAX_TITLE);
    if (!title) return res.status(400).json({ message: 'Enter a name for this resume.' });

    const item = await Resume.findOneAndUpdate(mine(req), { $set: { title } }, { new: true, timestamps: false });
    if (!item) return res.status(404).json(NOT_FOUND);
    return res.json({ item });
  } catch (err) {
    return next(err);
  }
});

/* DELETE /api/profile/resumes/:id  ->  { ok: true } */
router.delete('/resumes/:id', async (req, res, next) => {
  try {
    const result = await Resume.deleteOne(mine(req));
    if (result.deletedCount === 0) return res.status(404).json(NOT_FOUND);
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

/* POST /api/profile/resumes/:id/duplicate  ->  201 { item } */
router.post('/resumes/:id/duplicate', async (req, res, next) => {
  try {
    const full = await limitReached(req.userId);
    if (full) return res.status(409).json(full);

    const source = await Resume.findOne(mine(req)).select('+resumeJson');
    if (!source) return res.status(404).json(NOT_FOUND);

    const item = await Resume.create({
      user: req.userId,
      title: `${source.title} (copy)`.slice(0, MAX_TITLE),
      name: source.name,
      profession: source.profession,
      template: source.template,
      resumeJson: source.resumeJson,
    });
    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
});

export default router;
