import mongoose from 'mongoose';

// One document per saved resume. A person can have several (see MAX_RESUMES in routes/profile.js).
// They live in their own collection instead of inside the User document, because every resume can hold a
// photo of up to 5MB and MongoDB stops a single document at 16MB.
const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // What the person calls it ("Marketing CV", "Resume 2"). Not part of the resume itself.
    title: { type: String, required: true, trim: true, maxlength: 80 },
    // What the resume list shows, copied out of the resume on every save so listing never has to read the
    // (large) JSON of every resume.
    name: { type: String, default: '', maxlength: 130 },
    profession: { type: String, default: '', maxlength: 100 },
    template: { type: String, default: '', maxlength: 60 },
    // Everything the builder keeps for this resume, as one JSON string. A string cannot carry keys like
    // "$set" or "a.b" into MongoDB, and it is left out of queries unless asked for with
    // .select('+resumeJson').
    resumeJson: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

// "All resumes of this person, newest edit first" is the only list query there is.
resumeSchema.index({ user: 1, updatedAt: -1 });

// What the API sends back about a resume. The JSON itself is only sent by GET /resumes/:id.
resumeSchema.set('toJSON', {
  transform: (doc, ret) => ({
    id: ret._id.toString(),
    title: ret.title,
    name: ret.name,
    profession: ret.profession,
    template: ret.template,
    createdAt: ret.createdAt,
    updatedAt: ret.updatedAt,
  }),
});

export default mongoose.model('Resume', resumeSchema);
