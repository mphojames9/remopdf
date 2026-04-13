import updateCounter from "./resume/components";
import commonSkills from "./resume/commonskills";
import cvDatasetCollection from "./resume/cvdataset"
/* =========================
   DOM ELEMENTS
========================= */
const previewOverlay = document.querySelector('.preview-wrap');
const previewBtns = document.querySelectorAll('#previewBtn');
const editResumeBtn = document.querySelector('#editResume');
const navbar = document.querySelector('.navbar');
const personalDetailsOverlay = document.querySelector('.overlay-personalDetails');
const languagesContainer = document.getElementById('languagesContainer');
const addLanguageBtn = document.getElementById('addLanguageBtn');
const profilePicPreview = document.querySelectorAll('.backdropBtn');
const profilePhotoUpload = document.querySelector('#profilePhotoUpload');
const closeProfilePhotoUpload = document.querySelector('#closeProfilePhotoUpload');
const previewContent = previewOverlay.querySelector("#resumePreview");
const resumePreview = document.querySelector('#resumePreview');
const overlay = document.getElementById('layoutOverlay');
const track = document.getElementById('carouselTrack');
const layout = document.querySelector('.layout');
const nameEl = document.getElementById('templateName');
let activeExpId = null;
let activeEduId = null;
let activeTitleInput = null;
let activeBulletInput = null;
let activeSuggestionIndex = -1;
let asideGradient =
  localStorage.getItem("resumeAsideGradient")
  ||
  "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

let accentColor = "#2563eb";

const icon = (svg) =>
  `<span style="display:inline-flex;align-items:center;margin-right:6px;color:#6f93c1">
      ${svg}
    </span>`;


const ICONS = {
  interests: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M12 21s-6-4.35-9-8.5C1 9 3.5 6 6.5 6c1.74 0 3.41 1.01 4.5 2.09C12.09 7.01 13.76 6 15.5 6 18.5 6 21 9 21 12.5 18 16.65 12 21 12 21z"
        stroke="rgb(117,125,129)" stroke-width="1.5"></path>
      </svg>`,

  language: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M4 5h16M4 12h10M4 19h16"
          stroke="rgb(117,125,129)" stroke-width="1.5"></path>
      </svg>`,

  skill: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M12 2l2.5 5 5.5.8-4 4 .9 5.7-4.9-2.6-4.9 2.6.9-5.7-4-4 5.5-.8L12 2z"
          stroke="rgb(117,125,129)" stroke-width="1.5"></path>
      </svg>`,

  profile: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="12" cy="8" r="4" stroke="rgb(245, 250, 252)" stroke-width="1.5"/>
        <path d="M4 20a8 8 0 0 1 16 0" stroke="rgb(243, 246, 248)" stroke-width="1.5"/>
      </svg>`,

  education: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M3 7l9-4 9 4-9 4-9-4z" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
        <path d="M5 10v6c0 1 3 3 7 3s7-2 7-3v-6" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
      </svg>`,

  experience: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
        <path d="M9 7V5h6v2" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
      </svg>`,

  references: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <circle cx="12" cy="7" r="3.5" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
        <path d="M5 21a7 7 0 0 1 14 0" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
      </svg>`,

  contact: `
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
        <path d="M3 5a2 2 0 0 1 2-2h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2
        C9.8 19 5 14.2 5 7a2 2 0 0 1-2-2z"
        stroke="rgb(201, 214, 221)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,


  interests: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2
        4 4 0 0 1 7 2c0 5.6-7 10-7 10z"
        stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
      </svg>`,

  phone: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M3 5a2 2 0 0 1 2-2h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2C9.8 19 5 14.2 5 7a2 2 0 0 1-2-2z"
        stroke="#6f93c1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  email: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#6f93c1" stroke-width="1.5"/>
      <path d="M3 7l9 6 9-6" stroke="#6f93c1" stroke-width="1.5"/>
    </svg>`,

  location: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"
        stroke="#6f93c1" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="2.5" stroke="#6f93c1" stroke-width="1.5"/>
    </svg>`,

  website: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#6f93c1" stroke-width="1.5"/>
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
        stroke="#6f93c1" stroke-width="1.5"/>
    </svg>`,

  linkedin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3"
        stroke="#6f93c1" stroke-width="1.5"/>
      <path d="M8 11v5M8 8h.01M12 16v-3a2 2 0 0 1 4 0v3"
        stroke="#6f93c1" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,


  skills: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path d="M12 2l2.5 5 5.5.8-4 4 .9 5.7-4.9-2.6-4.9 2.6.9-5.7-4-4 5.5-.8L12 2z"
        stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
    </svg>`,

  campany: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none">
    <rect x="3" y="7" width="18" height="13" rx="2"
      stroke="#6f93c1" stroke-width="1.5"/>
    <path d="M9 7V5h6v2"
      stroke="#6f93c1" stroke-width="1.5"/>
  </svg>`,

  calendar: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <rect x="3" y="4" width="18" height="17" rx="2"
    stroke="#6f93c1" stroke-width="1.5"/>
  <path d="M8 2v4M16 2v4M3 10h18"
    stroke="#6f93c1" stroke-width="1.5"/>
</svg>`,

  heart: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <path d="M12 21s-7-4.5-7-10.5a4 4 0 0 1 7-2.5
           4 4 0 0 1 7 2.5c0 6-7 10.5-7 10.5z"
    stroke="#6f93c1" stroke-width="1.5"/>
</svg>`,

  user: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <circle cx="12" cy="7.5" r="3.5"
    stroke="#6f93c1" stroke-width="1.5"/>
  <path d="M4.5 20a7.5 7.5 0 0 1 15 0"
    stroke="#6f93c1" stroke-width="1.5"/>
</svg>`,

  faith: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <path d="M12 2.5v19M5.5 9.5h13"
    stroke="#6f93c1" stroke-width="1.5" stroke-linecap="round"/>
</svg>`,

  group: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <circle cx="7.5" cy="9" r="3"
    stroke="#6f93c1" stroke-width="1.5"/>
  <circle cx="16.5" cy="9" r="3"
    stroke="#6f93c1" stroke-width="1.5"/>
  <path d="M2.5 20a6 6 0 0 1 10 0M11.5 20a6 6 0 0 1 10 0"
    stroke="#6f93c1" stroke-width="1.5"/>
</svg>`,

  car: `
<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
  <rect x="3" y="9" width="18" height="7" rx="2"
    stroke="#6f93c1" stroke-width="1.5"/>
  <path d="M6 9l2-4h8l2 4"
    stroke="#6f93c1" stroke-width="1.5"/>
  <circle cx="7.5" cy="17" r="1.5"
    stroke="#6f93c1" stroke-width="1.5"/>
  <circle cx="16.5" cy="17" r="1.5"
    stroke="#6f93c1" stroke-width="1.5"/>
</svg>`,

  language: `
<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
  <path d="M4 5h16M4 12h10M4 19h16"
    stroke="rgb(117,125,129)" stroke-width="1.5"/>
</svg>`,

  contact_w: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
        <path d="M3 5a2 2 0 0 1 2-2h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2
        C9.8 19 5 14.2 5 7a2 2 0 0 1-2-2z"
        stroke="#fafafa" stroke-width="1.6" stroke-linecap="round"/>
      </svg>`,


  phone_w: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M3 5a2 2 0 0 1 2-2h3l2 5-2 1a11 11 0 0 0 5 5l1-2 5 2v3a2 2 0 0 1-2 2C9.8 19 5 14.2 5 7a2 2 0 0 1-2-2z"
        stroke="#fafafa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,

  email_w: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#fafafa" stroke-width="1.6"/>
      <path d="M3 7l9 6 9-6" stroke="#fafafa" stroke-width="1.6"/>
    </svg>`,

  location_w: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z"
        stroke="#fafafa" stroke-width="1.6"/>
      <circle cx="12" cy="10" r="2.5" stroke="#fafafa" stroke-width="1.6"/>
    </svg>`,

  website_w: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="12" r="9" stroke="#fafafa" stroke-width="1.5"/>
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
       stroke="#fafafa" stroke-width="1.6"/>
    </svg>`,

  linkedin_w: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
      <rect x="3" y="3" width="20" height="20" rx="3"
        stroke="#f1f1f1" stroke-width="1.5"/>
      <path d="M8 11v5M8 8h.01M12 16v-3a2 2 0 0 1 4 0v3"
        stroke="#fafafa" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`,

  calendar_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <rect x="3" y="4" width="18" height="17" rx="2"
    stroke="#fafafa" stroke-width="1.6""/>
  <path d="M8 2v4M16 2v4M3 10h18"
    stroke="#fafafa" stroke-width="1.6"/>
</svg>`,

  heart_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <path d="M12 21s-7-4.5-7-10.5a4 4 0 0 1 7-2.5
           4 4 0 0 1 7 2.5c0 6-7 10.5-7 10.5z"
    stroke="#fafafa" stroke-width="1.6"/>
</svg>`,

  user_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <circle cx="12" cy="7.5" r="3.5"
    stroke="#fafafa" stroke-width="1.6"/>
  <path d="M4.5 20a7.5 7.5 0 0 1 15 0"
    stroke="#fafafa" stroke-width="1.6"/>
</svg>`,

  faith_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <path d="M12 2.5v19M5.5 9.5h13"
    stroke="#fafafa" stroke-width="1.6" stroke-linecap="round"/>
</svg>`,

  group_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <circle cx="7.5" cy="9" r="3"
    stroke="#fafafa" stroke-width="1.6"/>
  <circle cx="16.5" cy="9" r="3"
    stroke="#fafafa" stroke-width="1.6"/>
  <path d="M2.5 20a6 6 0 0 1 10 0M11.5 20a6 6 0 0 1 10 0"
    stroke="#fafafa" stroke-width="1.6"/>
</svg>`,

  car_w: `
<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
  <rect x="3" y="9" width="18" height="7" rx="2"
    stroke="#fafafa" stroke-width="1.6"/>
  <path d="M6 9l2-4h8l2 4"
    stroke="#fafafa" stroke-width="1.6"/>
  <circle cx="7.5" cy="17" r="1.5"
    stroke="#fafafa" stroke-width="1.6"/>
  <circle cx="16.5" cy="17" r="1.5"
    stroke="#fafafa" stroke-width="1.6"/>
</svg>`,

};

/* =========================
   GLOBAL STATE
========================= */

const LANGUAGE_LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'native', label: 'Native' }
];

let zoomControl;
let previewRAF = null;

function updatePreviewLive() {
  if (previewRAF) return;

  previewRAF = requestAnimationFrame(() => {
    renderPreview();
    previewRAF = null;

  });
}

function updateExpHeader(expId) {
  const card = document.querySelector(`.exp-card[data-exp="${expId}"]`);
  if (!card) return;

  const titleEl = card.querySelector('.exp-title');
  if (!titleEl) return;

  const exp = data.experience.find(x => x.id === expId);
  if (!exp) return;

  titleEl.innerHTML = `
    ${escapeHtml(exp.role || 'New Role')}
    <span class="exp-sep">|</span>
    ${escapeHtml(exp.campany || 'campany')}
  `;
}

function updateEduHeader(eduId) {
  const card = document.querySelector(`.edu-card[data-edu="${eduId}"]`);
  if (!card) return;

  const titleEl = card.querySelector('.edu-title');
  if (!titleEl) return;

  const edu = data.education.find(x => x.id === eduId);
  if (!edu) return;

  titleEl.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 20" class="w-3">
      <path fill="currentColor" d="M9.482 0c1.104 0 2 .897 2 2 0 1.101-.896 2-2 2S7.48 3.101 7.48 2c0-1.103.897-2 2-2zM2 0c1.105
      0 2.002.897 2.002 2C4.002 3.1 3.105 4 2 4 .897 4 0 3.101 0 2 0 .896.897 0 2 0zM9.482 8c1.104 0
      2 .897 2 2 0 1.101-.896 2-2 2s-2.001-.899-2.001-2c0-1.103.897-2 2-2zM2 8c1.105 0 2.002.897 2.002 2
      0 1.101-.897 2-2.001 2C.897 12 0 11.101 0 10c0-1.103.897-2 2-2zM9.482 16c1.104 0 2 .897 2 2
      0 1.102-.896 2-2 2s-2.001-.898-2.001-2c0-1.103.897-2 2-2zM2 16c1.105 0 2.002.897 2.002 2 0
      1.102-.897 2-2.001 2C.897 20 0 19.102 0 18c0-1.103.897-2 2-2z"></path>
    </svg>

    ${escapeHtml(edu.degree || 'New Degree')}
    <span class="edu-sep">|</span>
    ${escapeHtml(edu.school || 'Institution')}
  `;
}

function updateRefHeader(refId) {
  const card = document.querySelector(`.ref-card[data-ref="${refId}"]`);
  if (!card) return;

  const titleEl = card.querySelector('.ref-title');
  if (!titleEl) return;

  const ref = data.references.find(x => x.id === refId);
  if (!ref) return;

  titleEl.innerHTML = `
    ${escapeHtml(ref.name || 'Contact Person')}
    <span class="ref-sep">|</span>
    ${escapeHtml(ref.campany || 'campany')}
  `;
}
// --- Utilities ------------------------------------------------------------
function id() { return Math.random().toString(36).slice(2, 9); }
function $(s) { return document.querySelector(s); }
function $id(s) { return document.getElementById(s); }
function $all(s) { return Array.from(document.querySelectorAll(s)); }

// Basic stopwords set (simple)
const STOPWORDS = new Set(("a about above after again against all am an and any are as at be because been before being below between both but by could did do does doing down during each few for from further had has have having he her here hers herself him himself his how i if in into is it its itself just me more most my yourself yourselves no nor not of off on once only or other our ours ourselves out over own same she should so some such than that the their theirs them themselves then there these they this those through to too under until up very was were what when where which while who whom why with would you your yours").split(" "));

// --- DOM refs -------------------------------------------------------------
const refs = {
  fullName: $id('fullName'),
  title: $id('title'),
  email: $id('email'),
  phone: $id('phone'),
  location: $id('location'),
  website: $id('website'),
  linkedin: $id('linkedin'),
  summary: $id('summary'),
  experienceContainer: $id('experienceContainer'),
  educationContainer: $id('educationContainer'),
  referencesContainer: $id('referencesContainer'),
  skillsContainer: $id('skillsContainer'),
  interestsContainer: $id('interestsContainer'),
  resumePreview: $id('resumePreview'),
  addExpBtn: $id('addExpBtn'),
  addEduBtn: $id('addEduBtn'),
  addRefBtn: $id('addrefBtn'),
  addSkillBtn: $id('addSkillBtn'),
  addinterestBtn: $id('addinterestBtn'),
  pdfBtn: $id('pdfBtn'),
  pdfAtsBtn: $id('pdfAtsBtn'),
  exportJsonBtn: $id('exportJsonBtn'),
  importJsonInput: $id('importJsonInput'),
  jobDesc: $id('jobDesc'),
  keywordPanel: $id('keywordPanel'),
  covercampany: $id('covercampany'),
  coverRole: $id('coverRole'),
  generateCoverBtn: $id('generateCoverBtn'),
  coverPreview: $id('coverPreview'),
  downloadCoverPdfBtn: $id('downloadCoverPdfBtn'),
  templateSelect: $id('templateSelect'),
  profilePicInput: $id('profilePicInput'),
  photoPreviewContainer: $id('photoPreviewContainer'),
  photoPreviewContainers: $all('#photoPreviewContainer, .photoPreviewContainer, .photo-preview'),
  removePhotoBtn: $id('removePhotoBtn'),
  dob: $id('dob'),
  gender: $id('gender'),
  race: $id('race'),
  religion: $id('religion'),
  maritalStatus: $id('maritalStatus'),
  driversLicence: $id('driversLicence'),
  certificatesContainer: document.getElementById('certificatesContainer'),
  addCertificateBtn: document.getElementById('addCertificateBtn'),
  addPortfolioBtn: document.getElementById('addPortfolioBtn'),
  achievementsContainer: document.getElementById('achievementsContainer'),
  addAchievementBtn: document.getElementById('addAchievementBtn'),
achievementsContainer: document.getElementById('achievementsContainer'),
};

const pdfBtn = document.querySelectorAll('#pdfBtn');

// --- Default data --------------------------------------------------------
const DEFAULT = {
  personal: {
    fullName: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    dob: "",
    gender: "",
    race: "",
    religion: "",
    maritalStatus: "",
    driversLicence: "",
    photo: "" // data URL
  },
  summary: "",
  experience: [
    { id: id(), role: "", campany: "", start: "", end: "", bullets: [""] },
    { id: id(), role: "", campany: "", start: "", end: "", bullets: [""] }
  ],
  education: [
    { id: id(), school: "", degree: "", discription: "", year: "" }
  ],
  references: [
    { id: id(), name: "", campany: "", position: "", phone: "", email: "" }
  ],
  skills: [
    { name: "", level: "" },
    { name: "", level: "" },
    { name: "", level: "" },
    { name: "", level: "" }
  ],
  certificates: [
    {
      id: id(),
      name: "",
      issuer: "",
      date: "",
      url: "",
      description: ""
    }
  ],

  portfolio: [
  {
    "id": "",
    "name": "",
    "url": "",
    "description": ""
  }
],
  interests: ["", "", "", ""],
  languages: [],
  achievements: [],
  template: "midnight"
};


// --- State ---------------------------------------------------------------
let data = load() || JSON.parse(JSON.stringify(DEFAULT));
// 🔥 Ensure certificates always exist
data.certificates = data.certificates || [];
data.achievements = data.achievements || [];
let lastJDKeywords = [];

// --- Init ----------------------------------------------------------------
function init() {
  bindProfileInputs();
  renderLists();
  renderPreview();
  bindButtons();
  renderLanguagesEditor();
  refs.templateSelect.value = data.template || 'midnight';
  window.addEventListener('beforeunload', save);
  renderPhotoPreview();

  const savedScale = Number(localStorage.getItem(PHOTO_SCALE_KEY)) || 100;
  photoScale.value = savedScale;

  const scale = savedScale / 100;
  document.querySelectorAll(
    '#photoPreviewContainer, .photoPreviewContainer, .photo-wrap_Template_1'
  ).forEach(container => {
    const img = container.querySelector('img');
    if (img) {
      img.style.transform = `scale(${scale})`;
      img.style.transformOrigin = 'center';
    }
  });

  refs.educationContainer.addEventListener('click', function (e) {
    restoreExpBody(); // 🔥 VERY IMPORTANT
    const header = e.target.closest('.edu-header');
    if (!header) return;

    // 🔥 only trigger if clicking title
    if (!e.target.closest('.edu-title')) return;

    // 🔥 restore previous
    restoreEduBody();

    const eduOverlay = document.getElementById('eduOverlay');
    const eduOverlayContent = eduOverlay.querySelector('.edu-overlay-content');

    const card = header.closest('.edu-card');
    const body = card.querySelector('.edu-body');

    if (!body) return;

    const eduId = card.dataset.edu;

    body.dataset.eduParent = eduId;
    activeEduId = eduId;

    eduOverlayContent.innerHTML = '';
    eduOverlayContent.appendChild(body);

    eduOverlay.classList.add('active');
  });

 
  refs.experienceContainer.addEventListener('click', function (e) {
  const title = e.target.closest('.exp-title');
  if (!title) return;

  const card = title.closest('.exp-card');
  const body = card.querySelector('.exp-body');
  const expOverlay = document.getElementById('expOverlay');
  const expOverlayContent = expOverlay.querySelector('.exp-overlay-content');

  if (!body) return;

  // move content into overlay
  expOverlayContent.innerHTML = '';
  expOverlayContent.appendChild(body);

  // open overlay
  expOverlay.classList.add('active');
  toggleBodyScroll(true);
});



  refs.referencesContainer.addEventListener('click', function (e) {
    const header = e.target.closest('.ref-header');
    if (!header) return;

    const card = header.closest('.ref-card');
    const refId = card.dataset.ref;

    const isActive = card.classList.contains('active');

    // Close all
    refs.referencesContainer
      .querySelectorAll('.ref-card')
      .forEach(c => c.classList.remove('active'));

    if (!isActive) {
      card.classList.add('active');
      localStorage.setItem('lastOpenRef', refId);
    } else {
      localStorage.removeItem('lastOpenRef');
    }
  });
}

// --- Photo handling -----------------------------------------------------
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const OUTPUT_PIXEL = 400; // square output size (pixels) — decent for print and PDF
const PHOTO_SCALE_KEY = 'photoScale';
function handleProfilePicFile(file) {
  if (!file) return;
  if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) { showToast('Only PNG or JPEG allowed.', 'warn'); return; }
  if (file.size > MAX_FILE_BYTES) { showToast('Image too large (limit 2MB).', 'warn'); return; }
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = function () {
      const dataUrl = centerCropToDataURL(img, OUTPUT_PIXEL);
      data.personal.photo = dataUrl;
      save();
      renderPhotoPreview();
      renderPreview();
      const savedScale = Number(localStorage.getItem(PHOTO_SCALE_KEY)) || 100;
      const scale = savedScale / 100;

      document.querySelectorAll(
        '#photoPreviewContainer, .photoPreviewContainer, .photo-wrap_Template_1, .photo-wrap_Template_1',
      ).forEach(container => {
        const img = container.querySelector('img');
        if (img) {
          img.style.transform = `scale(${scale})`;
          img.style.transformOrigin = 'center';
        }
      });
    };
    img.onerror = function () { showToast('Failed to read image. Try a different file.', 'error'); };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
const photoScale = document.getElementById("photoScale");

document.addEventListener("DOMContentLoaded", () => {

  const avatar = document.querySelector(".photo-wrap_Template_1 .avatar");

  if (!avatar || !photoScale) return;

  const savedScale = localStorage.getItem("photoScale") || "100";
  photoScale.value = savedScale;
  avatar.style.transform = `scale(${savedScale / 100})`;

  photoScale.addEventListener("input", () => {
    avatar.style.transform = `scale(${photoScale.value / 100})`;
    localStorage.setItem("photoScale", photoScale.value);
  });
});

function centerCropToDataURL(img, size) {
  // create square canvas, center-crop the source image into it, respecting aspect ratio
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Determine scale so smaller side fits the square, then crop center
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const srcRatio = iw / ih;
  let sx = 0, sy = 0, sSize = 0;

  if (iw > ih) {
    // wider than tall: crop sides
    sSize = ih;
    sx = Math.round((iw - ih) / 2);
    sy = 0;
  } else {
    // taller than wide: crop top/bottom
    sSize = iw;
    sx = 0;
    sy = Math.round((ih - iw) / 2);
  }

  // draw cropped square to full canvas
  try {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, size, size);
    // return high-quality JPEG (smaller than PNG) but keep quality high
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch (e) {
    console.warn('Crop error', e);
    return '';
  }
}

function removePhoto() {
  data.personal.photo = '';
  save();
  renderPhotoPreview();
  renderPreview();
}

photoScale.addEventListener('input', () => {
  const scaleValue = Number(photoScale.value);
  const scale = scaleValue / 100;

  // 🔥 save to localStorage
  localStorage.setItem(PHOTO_SCALE_KEY, scaleValue);

  const containers = document.querySelectorAll(
    '#photoPreviewContainer, .photoPreviewContainer, .photo-wrap_Template_1'
  );

  containers.forEach(container => {
    const img = container.querySelector('img');
    if (!img) return;

    img.style.transform = `scale(${scale})`;
    img.style.transformOrigin = 'center';
  });
});

function renderPhotoPreview() {
  const containers =
    refs.photoPreviewContainers?.length
      ? refs.photoPreviewContainers
      : [refs.photoPreviewContainer];

  const photo = getPhotoSrc();

  containers.forEach(container => {
    if (!container) return;

    container.innerHTML = '';

    if (photo) {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = 'Profile photo';
      container.appendChild(img);
    } else {
      const span = document.createElement('div');
      span.className = 'avatar';
      span.textContent = getInitials(data.personal.fullName || '');
      container.appendChild(span);
    }
  });
}

function getPhotoSrc() {
  const p = data && data.personal && data.personal.photo;
  if (!p) return '';
  // only allow data URLs that look like images
  if (typeof p === 'string' && p.indexOf('data:image/') === 0) return p;
  return '';
}

function getInitials(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p[0] ? p[0].toUpperCase() : '').join('');
}

// --- Bind profile inputs -----------------------------------------------
function bindProfileInputs() {
  refs.fullName.value = data.personal.fullName || '';
  refs.title.value = data.personal.title || '';
  refs.email.value = data.personal.email || '';
  refs.phone.value = data.personal.phone || '';
  refs.location.value = data.personal.location || '';
  refs.website.value = data.personal.website || '';
  refs.linkedin.value = data.personal.linkedin || '';
  refs.summary.value = data.summary || '';
  refs.dob.value = data.personal.dob || '';
  refs.gender.value = data.personal.gender || '';
  refs.race.value = data.personal.race || '';
  refs.religion.value = data.personal.religion || '';
  refs.maritalStatus.value = data.personal.maritalStatus || '';
  refs.driversLicence.value = data.personal.driversLicence || '';


  [
    'fullName',
    'title',
    'email',
    'phone',
    'location',
    'website',
    'linkedin',
    'dob',
    'gender',
    'race',
    'religion',
    'maritalStatus',
    'driversLicence'
  ].forEach(key => {
    $id(key).addEventListener('input', (e) => {
      data.personal[key] = e.target.value;
      renderPhotoPreview(); // initials may change
      renderPreview();
      save();

    });
  });

  refs.summary.addEventListener('input', (e) => {
    data.summary = e.target.value;
    renderPreview();
    save();
  });

  refs.templateSelect.addEventListener('change', (e) => {
    data.template = e.target.value;
    renderPreview();
    save();
  });

  // photo input
  if (refs.profilePicInput) {
    refs.profilePicInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      handleProfilePicFile(f);
      e.target.value = ''; // reset
    });
  }
  if (refs.removePhotoBtn) {
    refs.removePhotoBtn.addEventListener('click', () => {
      removePhoto();
    });
  }
}

refs.certificatesContainer.addEventListener('click', certButtonHandler);


// --- Render lists (experience, education, skills, references) -----------------------//
 function renderLists() {
  validateReferenceAdd();
  validateSkillAdd();
  validateLanguageAdd();
  validateCertificateAdd();
  // Education
  refs.educationContainer.innerHTML = '';
  data.education.forEach((edu) => {
    const node = document.createElement('div');
    node.className = 'item';
    node.innerHTML = node.innerHTML = node.innerHTML = `
  <div class="edu-card" data-edu="${edu.id}">

    <!-- HEADER -->
    <div class="edu-header drag-handle" draggable="true">
      <div class="edu-title">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 20" class="w-3"><path fill="currentColor" d="M9.482 0c1.104 0 2 .897 2 2 0 1.101-.896 2-2 2S7.48 3.101 7.48 2c0-1.103.897-2 2-2zM2 0c1.105
        0 2.002.897 2.002 2C4.002 3.1 3.105 4 2 4 .897 4 0 3.101 0 2 0 .896.897 0 2 0zM9.482 8c1.104 0
         2 .897 2 2 0 1.101-.896 2-2 2s-2.001-.899-2.001-2c0-1.103.897-2 2-2zM2 8c1.105 0 2.002.897 2.002 2
          0 1.101-.897 2-2.001 2C.897 12 0 11.101 0 10c0-1.103.897-2 2-2zM9.482 16c1.104 0 2 .897 2 2
           0 1.102-.896 2-2 2s-2.001-.898-2.001-2c0-1.103.897-2 2-2zM2 16c1.105 0 2.002.897 2.002 2 0
            1.102-.897 2-2.001 2C.897 20 0 19.102 0 18c0-1.103.897-2 2-2z"></path></svg>
        ${escapeHtml(edu.degree || 'New Degree')}
        <span class="edu-sep">|</span>
        ${escapeHtml(edu.school || 'Institution')}
      </div>
      <button class="btn-danger">
          <i class="fa-solid fa-trash"
            data-action="removeedu"
            data-id="${edu.id}"></i>
        </button>
    </div>

    <!-- BODY -->
    <div class="edu-body">
      <div class="edu-grid">
        <div class="field">
          <label>Degree</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="degree"
            value="${escapeHtml(edu.degree)}"
            placeholder="e.g. BSc Computer Science" />
        </div>

        <div class="field">
          <label>Institution</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="school"
            value="${escapeHtml(edu.school)}"
            placeholder="e.g. University of Cape Town" />
        </div>

            <!-- ✅ NEW LOCATION FIELD -->
    <div class="field">
      <label>Location</label>
      <input class="input_data"
        data-id="${edu.id}"
        data-field="location"
        value="${escapeHtml(edu.location || '')}"
        placeholder="e.g. Cape Town, South Africa" />
    </div>

        <div class="field">
          <label>Year Obtained</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="year"
            value="${escapeHtml(edu.year || '')}"
            placeholder="e.g. 2024" />
        </div>

        <div class="field">
          <label>discription</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="discription"
            value="${escapeHtml(edu.discription || '')}"
            placeholder="Achievements, distinctions, major subjects..." />
        </div>
      </div>
    </div>
  </div>
`;
    refs.educationContainer.appendChild(node);
    // 🔥 Restore last opened education
    const lastOpenEdu = localStorage.getItem('lastOpenEdu');
    if (lastOpenEdu) {
      const card = refs.educationContainer.querySelector(
        `.edu-card[data-edu="${lastOpenEdu}"]`
      );
      if (card) {
        card.classList.add('active');
      }
    }
  });


  // Experience
  refs.experienceContainer.innerHTML = '';
  data.experience.forEach((exp) => {
    const node = document.createElement('div');
    node.className = 'item';
    node.innerHTML = node.innerHTML = node.innerHTML = `
  <div class="exp-card" data-exp="${exp.id}">
    
    <!-- HEADER -->
    <div class="exp-header drag-handle" draggable="true">
      <div class="exp-title">
      <svg  xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 20" class="w-3"><path fill="currentColor"
       d="M9.482 0c1.104 0 2 .897 2 2 0 1.101-.896 2-2 2S7.48 3.101 7.48 2c0-1.103.897-2 2-2zM2 0c1.105
        0 2.002.897 2.002 2C4.002 3.1 3.105 4 2 4 .897 4 0 3.101 0 2 0 .896.897 0 2 0zM9.482 8c1.104 0
         2 .897 2 2 0 1.101-.896 2-2 2s-2.001-.899-2.001-2c0-1.103.897-2 2-2zM2 8c1.105 0 2.002.897 2.002 2
          0 1.101-.897 2-2.001 2C.897 12 0 11.101 0 10c0-1.103.897-2 2-2zM9.482 16c1.104 0 2 .897 2 2
           0 1.102-.896 2-2 2s-2.001-.898-2.001-2c0-1.103.897-2 2-2zM2 16c1.105 0 2.002.897 2.002 2 0
            1.102-.897 2-2.001 2C.897 20 0 19.102 0 18c0-1.103.897-2 2-2z"></path></svg>
        ${escapeHtml(exp.role || 'New Role')}
        <span class="exp-sep">|</span>
        ${escapeHtml(exp.campany || 'campany')}
      </div>
      <button class="btn-danger">
          <i class="fa-solid fa-trash"
             data-action="remove"
             data-id="${exp.id}"></i>
        </button>
    </div>

    <!-- BODY -->
    <div class="exp-body">
      <div class="exp-grid">
        <div class="field">
          <label>Job Title</label>
          <input class="input_data job-title"
            data-id="${exp.id}"
            data-field="role"
            value="${escapeHtml(exp.role)}"
            placeholder="e.g. Frontend Developer" />
             <ul class="title-suggestions" data-title-suggest="${exp.id}"></ul>
        </div>

        <div class="field">
          <label>campany</label>
          <input class="input_data"
            data-id="${exp.id}"
            data-field="Campany"
            value="${escapeHtml(exp.campany)}"
            placeholder="e.g. Google" />
        </div>

        <div class="field">
          <label>Start Date</label>
          <input class="input_data"
            data-id="${exp.id}"
            data-field="start"
            value="${escapeHtml(exp.start || '')}"
            placeholder="e.g. Jan 2023" />
        </div>

        <div class="field">
          <label>End Date</label>
          <input class="input_data"
            data-id="${exp.id}"
            data-field="end"
            value="${escapeHtml(exp.end || '')}"
            placeholder="e.g. Present" />
        </div>

            <div class="field">
      <label>Location</label>
      <input class="input_data"
        data-id="${exp.id}"
        data-field="location"
        value="${escapeHtml(exp.location || '')}"
        placeholder="e.g. Johannesburg, South Africa" />
    </div>
      </div>

      <!-- RESPONSIBILITIES -->
      <div class="exp-bullets-section">
        <label class="section-label">Achievements</label>

        <div class="exp-bullets" data-bullets="${exp.id}">
          ${(exp.bullets && exp.bullets.length ? exp.bullets : [""]).map((b, i) => `
            <div class="bullet-row">
              <input class="bullet-input"
                data-id="${exp.id}"
                data-field="bullet"
                data-idx="${i}"
                placeholder="Describe your achievement..."
                value="${escapeHtml(b)}" />
                 <ul class="bullet-suggestions" data-bullet-suggest="${exp.id}"></ul>
              
                <button class="bullet-delete-btn"
  data-action="delbullet"
  data-id="${exp.id}"
  data-idx="${i}">
  <i class="fa-solid fa-trash"></i>
</button>
            </div>
          `).join('')}
        </div>


        <button class="addbullet midnight-add" data-action="addbullet" data-id="${exp.id}">
        <i class="fa-solid fa-plus"></i>
        Add Achievement
        </button>
      </div>
    </div>
  </div>
`;
    refs.experienceContainer.appendChild(node);
    // 🔥 Restore last opened experience
    const lastOpenExp = localStorage.getItem('lastOpenExp');
    if (lastOpenExp) {
      const card = refs.experienceContainer.querySelector(
        `.exp-card[data-exp="${lastOpenExp}"]`
      );
      if (card) {
        card.classList.add('active');
      }
    }
  });


  refs.referencesContainer.innerHTML = '';
  data.references.forEach((ref) => {
    const node = document.createElement('div');
    node.className = 'item';
    node.innerHTML = `
  <div class="ref-card" data-ref="${ref.id}">

    <!-- HEADER -->
    <div class="ref-header">
      <div class="ref-title">
        ${escapeHtml(ref.name || 'Contact Person')}
        <span class="ref-sep">|</span>
        ${escapeHtml(ref.campany || 'campany')}
      </div>
      <div class="ref-actions">
       <i class="fa-solid fa-chevron-down ref-chevron"></i>
              <button class="btn-danger">
          <i class="fa-solid fa-trash"
             data-action="removeref"
             data-id="${ref.id}"></i>
        </button>
      </div>
    </div>

    <!-- BODY -->
    <div class="ref-body">

      <div class="ref-grid">

        <div class="field">
          <label>Contact Person</label>
          <input class="input_data"
            data-id="${ref.id}"
            data-field="name"
            value="${escapeHtml(ref.name)}"
            placeholder="e.g. John Smith" />
        </div>

        <div class="field">
          <label>campany</label>
          <input class="input_data"
            data-id="${ref.id}"
            data-field="campany"
            value="${escapeHtml(ref.campany)}"
            placeholder="e.g. ABC Corporation" />
        </div>

        <div class="field">
          <label>Position Held</label>
          <input class="input_data"
            data-id="${ref.id}"
            data-field="position"
            value="${escapeHtml(ref.position || '')}"
            placeholder="e.g. Senior Manager" />
        </div>

        <div class="field">
          <label>Phone Number</label>
          <input class="input_data"
            data-id="${ref.id}"
            data-field="phone"
            value="${escapeHtml(ref.phone || '')}"
            placeholder="e.g. +27 82 123 4567" />
        </div>

        <div class="field">
          <label>Email Address</label>
          <input class="input_data"
            data-id="${ref.id}"
            data-field="email"
            value="${escapeHtml(ref.email || '')}"
            placeholder="e.g. john@email.com" />
        </div>
      </div>
    </div>
  </div>
`;
    refs.referencesContainer.appendChild(node);
    // 🔥 Restore last opened reference
    const lastOpenRef = localStorage.getItem('lastOpenRef');
    if (lastOpenRef) {
      const card = refs.referencesContainer.querySelector(
        `.ref-card[data-ref="${lastOpenRef}"]`
      );
      if (card) {
        card.classList.add('active');
      }
    }
  });

  // Skills
  refs.skillsContainer.innerHTML = data.skills
    .map(renderSkillRow)
    .join('');

  // interests
  refs.interestsContainer.innerHTML = '';
  data.interests.forEach((its, idx) => {
    const node = document.createElement('div');
    node.className = 'item-row-skill-hobby';
    node.innerHTML = `<div class="row-skill-hobby"><input class="delete-raw" data-idx="${idx}" data-field="interest" placeholder="New interest" value="${escapeHtml(its)}" /><button class="remove-btn"
  data-idx="${idx}">
  <i class="fa-solid fa-trash remove-btn" data-action="removeinterest"></i>
</button></div>`;
    refs.interestsContainer.appendChild(node);
  });

  refs.achievementsContainer.innerHTML = (data.achievements || []).map((item, i) => `
  <div class="item">
    <input 
      type="text" 
      class="input_data" 
      data-idx="${i}" 
      value="${escapeHtml(item)}"
      placeholder="e.g. Increased sales by 40%">
    
    <button class="btn-danger">
      <i class="fa-solid fa-trash" data-action="removeachievement" data-idx="${i}"></i>
    </button>
  </div>
`).join('');

  // attach listeners
  refs.experienceContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', expInputHandler));
  refs.experienceContainer.querySelectorAll('button').forEach(btn => btn.addEventListener('click', expButtonHandler));
  refs.educationContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', eduInputHandler));
  refs.educationContainer.querySelectorAll('button').forEach(btn => btn.addEventListener('click', eduButtonHandler));
  refs.referencesContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', refInputHandler));
  refs.referencesContainer.querySelectorAll('button').forEach(btn => btn.addEventListener('click', refButtonHandler));
  refs.skillsContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', skillInputHandler));
  refs.skillsContainer.querySelectorAll('button').forEach(btn => btn.addEventListener('click', skillButtonHandler));
  refs.interestsContainer.querySelectorAll('input').forEach(inp => inp.addEventListener('input', interestInputHandler));
  refs.interestsContainer.querySelectorAll('button').forEach(btn => btn.addEventListener('click', interestButtonHandler));
  refs.certificatesContainer.querySelectorAll('input')
  .forEach(inp => inp.addEventListener('input', certInputHandler));
  refs.achievementsContainer.querySelectorAll('input')
  .forEach(inp => inp.addEventListener('input', achievementInputHandler));
  refs.achievementsContainer.querySelectorAll('button')
  .forEach(btn => btn.addEventListener('click', achievementButtonHandler));

refs.certificatesContainer.querySelectorAll('button')
  .forEach(btn => btn.addEventListener('click', certButtonHandler));

// =========================
// CERTIFICATES
// =========================
refs.certificatesContainer.innerHTML = '';

(data.certificates || []).forEach((cert) => {
  const node = document.createElement('div');
  node.className = 'item';

  node.innerHTML = `
<div class="cert-card" data-cert="${cert.id}">

  <div class="cert-header">

    <div class="cert-left">
      <i class="fa-solid fa-certificate cert-icon"></i>

      <div class="cert-title">
        ${escapeHtml(cert.name || 'New Certificate')}
      </div>
    </div>

    <div class="cert-actions">
      <i class="fa-solid fa-chevron-down toggle-icon"></i>

      <button class="btn-danger">
        <i class="fa-solid fa-trash" data-action="removecert" data-id="${cert.id}"></i>
      </button>
    </div>

  </div>

      <div class="cert-body">

        <div class="field">
          <label>Certificate Name</label>
          <input class="input_data"
            data-id="${cert.id}"
            data-field="name"
            value="${escapeHtml(cert.name)}"
            placeholder="e.g. AWS Certified Developer" />
        </div>

        <div class="field">
          <label>Issuer</label>
          <input class="input_data"
            data-id="${cert.id}"
            data-field="issuer"
            value="${escapeHtml(cert.issuer || '')}"
            placeholder="e.g. Amazon, Google, Microsoft" />
        </div>

        <div class="field">
          <label>Date</label>
          <input class="input_data"
            data-id="${cert.id}"
            data-field="date"
            value="${escapeHtml(cert.date || '')}"
            placeholder="e.g. 2024" />
        </div>

        <div class="field">
          <label>Credential URL</label>
          <input class="input_data"
            data-id="${cert.id}"
            data-field="url"
            value="${escapeHtml(cert.url || '')}"
            placeholder="https://..." />
        </div>

        <div class="field">
          <label>Description</label>
          <input class="input_data"
            data-id="${cert.id}"
            data-field="description"
            value="${escapeHtml(cert.description || '')}"
            placeholder="What did you achieve?" />
        </div>

      </div>
    </div>
  `;

  refs.certificatesContainer.appendChild(node);
});

// ===== PORTFOLIO =====
const portfolioContainer = document.getElementById('portfolioContainer');

if (portfolioContainer) {
  portfolioContainer.innerHTML = (data.portfolio || []).map(link => {
    return `
      <div class="item">
        <div class="portfolio-card" data-portfolio="${link.id}">

          <div class="portfolio-header">
            <div class="portfolio-title">
              ${escapeHtml(link.name || 'New Project')}
            </div>

            <div class="portfolio-actions">
      <!-- 🔽 Arrow -->
      <i class="fa-solid fa-chevron-down portfolio-arrow"></i>

      <!-- 🗑 Delete -->
      <button class="btn-danger">
        <i class="fa-solid fa-trash"
           data-action="removeportfolio"
           data-id="${link.id}"></i>
      </button>
    </div>
          </div>

          <div class="portfolio-body">

            <div class="field">
              <label>Title</label>
              <input class="input_data"
                data-id="${link.id}"
                data-field="name"
                value="${escapeHtml(link.name)}"
                placeholder="e.g. Netflix App">
            </div>

            <div class="field">
              <label>URL</label>
              <input class="input_data"
                data-id="${link.id}"
                data-field="url"
                value="${escapeHtml(link.url || '')}"
                placeholder="https://...">
            </div>

            <div class="field">
              <label>Description</label>
              <input class="input_data"
                data-id="${link.id}"
                data-field="description"
                value="${escapeHtml(link.description || '')}"
                placeholder="What is this project about?">
            </div>

          </div>
        </div>
      </div>
    `;
  }).join('');
}
}

/* ADD SKILL */
refs.addSkillBtn.addEventListener("click", () => {
  data.skills.unshift({
    id: id(),
    name: "",
    level: "basic"
  });

  renderLists();
  renderPreview();
  save();
  validateSkillAdd();
});

/* UPDATE SKILL */
refs.skillsContainer.addEventListener('input', e => {
  const row = e.target.closest('.language-row');
  if (!row) return;

  const index = Number(row.dataset.index);
  const field = e.target.dataset.field;

  data.skills[index][field] = e.target.value;
  save();
  renderPreview();
  validateSkillAdd();
});

/* REMOVE SKILL */
refs.skillsContainer.addEventListener('click', e => {
  if (!e.target.classList.contains('remove-btn')) return;

  const index = Number(e.target.closest('.language-row').dataset.index);
  data.skills.splice(index, 1);

  save();
  renderLists();
  validateSkillAdd();
  renderPreview();
});
// --- Input handlers ----------------------------------------------------
function expInputHandler(e) {
  const idVal = e.target.dataset.id;
  const field = e.target.dataset.field;
  const idx = e.target.dataset.idx;

  const exp = data.experience.find(x => x.id === idVal);
  if (!exp) return;

  if (field === 'bullet') {
    exp.bullets[idx] = e.target.value;
  } else {
    exp[field] = e.target.value;

    // 🔥 LIVE update editor header
    if (field === 'role' || field === 'campany') {
      updateExpHeader(idVal);
      validateExperienceAdd();
      updateExpHeader(idVal);
    }
  }
  // 🔥 check button state
  updatePreviewLive();
  save();
}


function expButtonHandler(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const idVal = btn.dataset.id;
  const idx = Number(btn.dataset.idx);

  const exp = data.experience.find(x => x.id === idVal);
  if (!exp) return;

  // =====================
  // ADD BULLET
  // =====================
  if (action === 'addbullet') {
    exp.bullets = exp.bullets || [];
    exp.bullets.push('');

    save();

    renderBullets(idVal); // 🔥 only update bullets

    return; // 🚀 stop full re-render
  }

  // =====================
  // DELETE BULLET
  // =====================
  if (action === 'delbullet') {
    exp.bullets.splice(idx, 1);

    save();

    renderBullets(idVal); // 🔥 only update bullets

    return; // 🚀 stop full re-render
  }

  // =====================
  // REMOVE EXPERIENCE
  // =====================
  if (action === 'remove') {
    data.experience = data.experience.filter(x => x.id !== idVal);
  }

  // =====================
  // DEFAULT FULL RENDER
  // =====================
  renderLists();
  renderPreview();
  save();
}

function renderBullets(expId) {
  const exp = data.experience.find(e => e.id === expId);
  if (!exp) return;

  const container = document.querySelector(`[data-bullets="${expId}"]`);
  if (!container) return;

  container.innerHTML = exp.bullets.map((b, i) => `
    <div class="bullet-row">
      <input class="bullet-input"
        data-id="${expId}"
        data-field="bullet"
        data-idx="${i}"
        placeholder="Describe your achievement..."
        value="${b || ""}" />

      <ul class="bullet-suggestions" data-bullet-suggest="${expId}"></ul>

      <button class="bullet-delete-btn"
        data-action="delbullet"
        data-id="${expId}"
        data-idx="${i}">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `).join("");

  // 🔥 THIS FIXES YOUR ISSUE
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', expButtonHandler);
  });
}

function eduInputHandler(e) {
  const eduId = e.target.dataset.id;
  const field = e.target.dataset.field;

  const edu = data.education.find(x => x.id === eduId);
  if (!edu) return;

  edu[field] = e.target.value;

  // 🔥 LIVE editor header update
  if (field === 'degree' || field === 'school') {
    updateEduHeader(eduId);

  }

  updatePreviewLive();
  validateEducationAdd()
  save();
}

function refInputHandler(e) {
  const refId = e.target.dataset.id;
  const field = e.target.dataset.field;

  const ref = data.references.find(x => x.id === refId);
  if (!ref) return;
  ref[field] = e.target.value;

  // 🔥 LIVE editor header update
  if (field === 'name' || field === 'campany') {
    updateRefHeader(refId);
    validateReferenceAdd();
  }

  updatePreviewLive();
  save();
}

function certInputHandler(e) {
  const certId = e.target.dataset.id;
  const field = e.target.dataset.field;

  const cert = data.certificates.find(c => c.id === certId);
  if (!cert) return;

  cert[field] = e.target.value;
  updatePreviewLive();
  save();
}

function eduButtonHandler(e) {
  const action = e.target.dataset.action;
  const idVal = e.target.dataset.id;
  if (action === 'removeedu') {
    data.education = data.education.filter(x => x.id !== idVal);
  }
  renderLists(); renderPreview(); save();
}

function refButtonHandler(e) {
  const action = e.target.dataset.action;
  const idVal = e.target.dataset.id;
  if (action === 'removeref') {
    data.references = data.references.filter(x => x.id !== idVal);
  } else if (action === 'upref') {
    moveItem(data.references, idVal, -1);
  } else if (action === 'downref') {
    moveItem(data.references, idVal, 1);
  }
  renderLists(); renderPreview(); save();
}

function skillInputHandler(e) {
  const idx = Number(e.target.dataset.idx);
  data.skills[idx] = e.target.value;
  validateSkillAdd();
  renderPreview(); save();
}

function skillButtonHandler(e) {
  const action = e.target.dataset.action;
  if (action === 'removeskill') {
    const idx = Number(e.target.dataset.idx);
    data.skills.splice(idx, 1);
  }
  renderLists(); renderPreview(); save();
}

function certButtonHandler(e) {
  const action = e.target.dataset.action;
  const idVal = e.target.dataset.id;
  console.log('certButtonHandler')

  if (action === 'removecert') {
    data.certificates = data.certificates.filter(c => c.id !== idVal);
      renderLists();
  }
  renderPreview();
  validateCertificateAdd();
  save();
}

document.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-action="removeportfolio"]');
  if (!removeBtn) return;
  const id = removeBtn.dataset.id;
  // ✅ make sure array exists
  if (!data.portfolio) data.portfolio = [];
  data.portfolio = data.portfolio.filter(item => item.id !== id);
  renderLists();   // your main render
  renderPreview(); // if you have it
  save();
  validateProjectsAdd();
});

function interestInputHandler(e) {
  const idx = Number(e.target.dataset.idx);
  data.interests[idx] = e.target.value;
  validateInterestAdd()
  renderPreview(); save();
}

function achievementInputHandler(e) {
  const idx = Number(e.target.dataset.idx);
  data.achievements[idx] = e.target.value;

  validateAchievementAdd();
  renderPreview(); 
  save();
}

function interestButtonHandler(e) {
  const action = e.target.dataset.action;
  if (action === 'removeinterest') {
    const idx = Number(e.target.dataset.idx);
    data.interests.splice(idx, 1);
  }
  validateInterestAdd()
  renderLists(); renderPreview(); save();
}

function achievementButtonHandler(e) {
  const action = e.target.dataset.action;

  if (action === 'removeachievement') {
    const idx = Number(e.target.dataset.idx);
    data.achievements.splice(idx, 1);
  }

  validateAchievementAdd();
  renderLists(); 
  renderPreview(); 
  save();
}

function renderSkillRow(skill, index) {
  return `
    <div class="language-row" data-index="${index}">
      <input
        class="input_data skill-input"
        placeholder="Skill"
        value="${escapeHtml(skill.name || '')}"
        data-field="name"
      />
      <select class="language-level" data-field="level">
        <option value="basic" ${skill.level === 'basic' ? 'selected' : ''}>Basic</option>
        <option value="conversational" ${skill.level === 'conversational' ? 'selected' : ''}>Conversational</option>
        <option value="fluent" ${skill.level === 'fluent' ? 'selected' : ''}>Fluent</option>
        <option value="native" ${skill.level === 'native' ? 'selected' : ''}>Expert</option>
      </select>
      <ul class="skill-suggestions"></ul>

      <button class="remove-btn"><i class="fa-solid fa-trash remove-btn"></i></button>
    </div>
  `;
}

function renderLanguageRow(lang, index) {
  return `
    <div class="language-row" data-index="${index}">
      <input
        class="input_data"
        placeholder="Language"
        value="${escapeHtml(lang.name || '')}"
        data-field="name"
      />

      <select class="language-level" data-field="level">
        ${LANGUAGE_LEVELS.map(l =>
    `<option value="${l.value}" ${lang.level === l.value ? 'selected' : ''}>
            ${l.label}
          </option>`
  ).join('')}
      </select>

      <button class="remove-btn">
  <i class="fa-solid fa-trash remove-btn"></i>
</button>
    </div>
  `;
}



function renderLanguagesEditor() {
  languagesContainer.innerHTML = data.languages
    .map(renderLanguageRow)
    .join('');
}

/* ADD */
addLanguageBtn.addEventListener('click', () => {
  data.languages.unshift({ name: '', level: 'basic' });
  save();
  renderLanguagesEditor();
  renderPreview();
  validateLanguageAdd()
});

document.addEventListener('input', (e) => {
  const input = e.target.closest('.input_data');
  if (!input) return;

  const certId = input.dataset.id;
  const field = input.dataset.field;

  const cert = data.certificates.find(c => c.id === certId);
  if (!cert) return; // ❌ THIS IS THE PROBLEM

  cert[field] = input.value;
    // 🔥 LIVE TITLE UPDATE
  if (field === 'name') {
    updateCertHeader(certId);
  }

  validateCertificateAdd();
  save();
});


/* UPDATE */
languagesContainer.addEventListener('input', e => {
  const row = e.target.closest('.language-row');
  if (!row) return;

  const index = row.dataset.index;
  const field = e.target.dataset.field;

  data.languages[index][field] = e.target.value;
  save();
  renderPreview();
  validateLanguageAdd();
});

const portfolioContainer = document.getElementById('portfolioContainer');

portfolioContainer?.addEventListener('input', e => {
  const card = e.target.closest('.portfolio-card');
  if (!card) return;

  const itemId = e.target.dataset.id;
  const field = e.target.dataset.field;

  const item = data.portfolio.find(p => p.id === itemId);
  if (!item) return;

  item[field] = e.target.value;

  // 🔥 live title update
  if (field === 'name') {
    const title = card.querySelector('.portfolio-title');
    if (title) {
      title.textContent = e.target.value.trim() || 'New Project';
    }
  }

  save();
  renderPreview();
  validateProjectsAdd();
});


/* REMOVE */
languagesContainer.addEventListener('click', e => {
  if (!e.target.classList.contains('remove-btn')) return;

  const index = e.target.closest('.language-row').dataset.index;
  data.languages.splice(index, 1);
  save();
  renderLanguagesEditor();
  renderPreview();
  validateLanguageAdd();
});

// --- Helpers ------------------------------------------------------------
function moveItem(arr, idVal, delta) {
  const i = arr.findIndex(x => x.id === idVal);
  if (i < 0) return;
  const j = i + delta;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[i];
  arr.splice(i, 1);
  arr.splice(j, 0, tmp);
}

// --- Buttons ------------------------------------------------------------
function bindButtons() {
  refs.addExpBtn.addEventListener('click', () => {

    // 🔥 create new experience
    const newExp = {
      id: Math.random().toString(36).slice(2, 9),
      role: "",
      campany: "",
      location: "",
      start: "",
      end: "",
      bullets: [""]
    };

    // add to data (top)
    data.experience.unshift(newExp);

    // 🔥 set active BEFORE render
    activeExpId = newExp.id;

    // render everything
    renderLists();
    renderPreview();
    save();
    validateExperienceAdd();

    // 🔥 OPEN overlay for the new item
    openOverlay(activeExpId);
  });

  refs.addEduBtn.addEventListener('click', () => {
    const newEdu = {
      id: id(),
      school: "",
      degree: "",
      location: "",
      year: "",
      discription: ""
    };

    // add to data
    data.education.unshift(newEdu);

    // 🔥 set active ID
    activeEduId = newEdu.id;

    renderLists();
    renderPreview();
    save();
    validateEducationAdd();

  // 🔥 OPEN OVERLAY DIRECTLY (no fake click)
  const eduOverlay = document.getElementById('eduOverlay');
  const eduOverlayContent = eduOverlay.querySelector('.edu-overlay-content');

  const card = document.querySelector(`.edu-card[data-edu="${newEdu.id}"]`);
  const body = card?.querySelector('.edu-body');

  if (!body) return;

  body.dataset.eduParent = newEdu.id;

  eduOverlayContent.innerHTML = '';
  eduOverlayContent.appendChild(body);

  eduOverlay.classList.add('active');
    
  });

  //References
  refs.addRefBtn.addEventListener('click', () => {
    data.references.unshift({ id: id(), name: "", campany: "", position: "", phone: "", email: "" });
    renderLists(); renderPreview(); save(); validateReferenceAdd();
  });



  refs.addinterestBtn.addEventListener('click', () => {
    data.interests.unshift("");
    renderLists(); renderPreview(); save();
  });

  refs.addAchievementBtn.addEventListener('click', () => {
  data.achievements.unshift("");
  renderLists();
  validateAchievementAdd();
  renderPreview(); 
  save();
});

  pdfBtn.forEach(btn => {
    btn.addEventListener('click', () => {
      downloadPDF(false);
    });
  });

  refs.pdfBtn.addEventListener('click', () => downloadPDF(false));
  refs.pdfAtsBtn && refs.pdfAtsBtn.addEventListener('click', () => downloadPDF(true));

  refs.addCertificateBtn.addEventListener('click', () => {
  data.certificates.unshift({
    id: id(),
    name: "",
    issuer: "",
    date: "",
    url: "",
    description: ""
  });

  renderLists();
  validateCertificateAdd(); // 🔥 ADD THIS
  renderPreview();
  save();
});
}

document.getElementById('addPortfolioBtn')?.addEventListener('click', () => {
  if (!data.portfolio) {
    data.portfolio = [];
  }

  data.portfolio.unshift({
    id: id(),
    name: "",
    url: "",
    description: ""
  });

  validateProjectsAdd()
  renderLists();
  save();
});


document.querySelectorAll('.input_data').forEach(input => {
  const li = input.closest('.li');

  function updateHoverState() {
    if (!input.value.trim()) {
      li.classList.add('no-hover');
    } else {
      li.classList.remove('no-hover');
    }
  }

  updateHoverState();
  input.addEventListener('input', updateHoverState);
});

function setPdfStep(step) {

  const steps = document.querySelectorAll(".pdfSteps li");

  steps.forEach((li, i) => {

    if (i < step) {

      li.classList.add("show");

      if (i < step - 1) {
        li.classList.remove("active");
        li.classList.add("done");
      } else {
        li.classList.add("active");
      }

    }

  });

  const progress = document.getElementById("pdfProgress");
  progress.style.width = (step - 1) * 33 + "%";
}


function downloadPDF(atsMode) {
  document.querySelectorAll(".pdfSteps li").forEach(li => {
    li.classList.remove("show", "active", "done");
  });

  const preview = refs.resumePreview;
  const templateClass = atsMode ? 'ats' : (data.template || 'goldenexecutive');

  preview.className = 'resume ' + templateClass;

  const filename =
    (data.personal.fullName || 'resume')
      .replace(/\s+/g, '_') +
    (atsMode ? '_ATS' : '') +
    '_resume.pdf';

  if (typeof html2pdf === 'undefined') {
    showToast('PDF library not loaded.', 'error');
    return;
  }

  // get pages
  let pages = [...preview.querySelectorAll('.resume-page')].filter(page => {
    const main = page.querySelector('main');
    return main && main.innerText.trim().length > 0;
  });

  // wrapper
  const wrapper = document.createElement('div');
  wrapper.style.background = '#fff';
  wrapper.style.width = '794px';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';
  wrapper.style.position = 'relative';

  pages.forEach(page => {

    const clone = page.cloneNode(true);

    const template = clone.querySelector('.resume_Template_1');
    if (template) {
      template.style.marginLeft = "-10px";
    }

    wrapper.appendChild(clone);

  });

  document.body.appendChild(wrapper);

  const overlay = document.getElementById("pdfOverlay");
  overlay.classList.add("active");

  setPdfStep(1);

  const opt = {
    margin: 0,
    filename: filename,
    image: { type: "jpeg", quality: 1 },

    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0
    },

    jsPDF: {
      unit: "px",
      format: [792, 1122],
      orientation: "portrait"
    },

    pagebreak: { mode: [] }
  };

  setTimeout(() => setPdfStep(2), 400);

  html2pdf()
    .set(opt)
    .from(wrapper)
    .toPdf()
    .get('pdf')
    .then((pdf) => {

      setPdfStep(3);

      const totalPages = pdf.internal.getNumberOfPages();

      if (totalPages > 1) {
        pdf.deletePage(totalPages);
      }

      setPdfStep(4);

      pdf.save(filename);

    })
    .then(() => {

      document.getElementById("pdfProgress").style.width = "100%";

      setTimeout(() => {
        overlay.classList.remove("active");
      }, 700);

      wrapper.remove();

    });
}

function renderPreview(highlightKeywords) {
  renderPersonalDetails();
  validateExperienceAdd();
  validateEducationAdd();
  validateInterestAdd();
  validateAchievementAdd();

  refs.resumePreview.className =
    'resume ' + (data.template || 'midnight');

  const html = (() => {
    switch (data.template) {
      case 'goldenexecutive': return renderGoldenExecutive();
      case 'goldenexecutiveII': return renderGoldenExecutiveII();
      case 'creative': return renderCreative();
      case 'ModernEdgeATS': return renderModernEdgeATS();
      case 'pinkcorporate': return renderPinkCorporate();
      case 'pinkcorporateII': return renderPinkCorporateII();
      case 'Modernats': return ModernAtsPhoto();
      case 'promidnight': return renderpromidnight();
      case 'ModernatsClean': return renderModernAtsClean();
      case 'ats': return renderATS();
      case "vertexats": return renderVertexATS();
      case "apexats": return renderApexATS();
      default: return rendermidnight();
    }
  })();

  paginateResume(html);

  if (highlightKeywords && highlightKeywords.length) {
    highlightKeywordsInPreview(highlightKeywords);
  }
}

function renderPersonalDetails() {
  document.querySelector('.name').textContent =
    data.personal.fullName || 'Your Name';

  document.querySelector('.tittle').textContent =
    data.personal.title || 'Your Title';

  document.querySelector('.emailAd').textContent =
    data.personal.email || 'your@email.com';

  document.querySelector('.phoneNo').textContent =
    data.personal.phone || 'Your Phone number';
  document.querySelector('.locationAd').textContent =
    data.personal.location || 'Your Location';
}

renderPersonalDetails()

function paginateResume(html) {

  const container = refs.resumePreview;
  container.innerHTML = '';

  const PAGE_HEIGHT = 1122;

  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  temp.style.width = '794px';
  temp.innerHTML = html;
  document.body.appendChild(temp);

  const root = temp.firstElementChild;
  cleanAllSections(root);
  const sidebar = root.querySelector('aside');
  const main = root.querySelector('main');

  if (!sidebar || !main) {
    container.innerHTML = html;
    document.body.removeChild(temp);
    return;
  }

  let currentPage = createPageWithSidebar(sidebar);

  [...main.children].forEach(section => {

    const clone = section.cloneNode(true);
    currentPage.main.appendChild(clone);

    if (currentPage.page.scrollHeight <= PAGE_HEIGHT) return;

    currentPage = microSplitOverflow(currentPage, PAGE_HEIGHT);
  });

  document.body.removeChild(temp);
}

function microSplitOverflow(pageObj, PAGE_HEIGHT) {
  let currentPage = pageObj;

  while (currentPage.page.scrollHeight > PAGE_HEIGHT) {

    console.log("⚠️ OVERFLOW DETECTED");
    console.log("Page height:", currentPage.scrollHeight);
    console.log("Max allowed:", PAGE_HEIGHT);

    const main = currentPage.main;
    const overflowEls = Array.from(main.querySelectorAll('.overflow'));

    // ❌ Nothing to move
    if (overflowEls.length === 0) break;

    // 🔥 ALWAYS move the LAST element (Word behavior)
    const elementToMove = overflowEls[overflowEls.length - 1];

    // Create next page
    const nextPage = createPageWithoutSidebar();

    // Move element
    nextPage.main.prepend(elementToMove);

    // Continue checking overflow on the NEXT page
    currentPage = nextPage;
  }

  return currentPage;
}



function createPageWithSidebar(sidebarNode) {
  const selectedTemplate = data.template;
  console.log(selectedTemplate)
  const page = document.createElement('div');
  page.className = 'resume-page resume professional';
  page.style.minHeight = '1122px';

  const wrapper = document.createElement('div');
  wrapper.style.background = '#fff';
  wrapper.style.width = '794px';
  wrapper.style.margin = '0';
  wrapper.style.padding = '0';
  wrapper.style.position = 'relative';
  wrapper.className = `resume_Template_1 ${selectedTemplate}`;

  const sidebarClone = sidebarNode.cloneNode(true);
  const main = document.createElement('main');
  main.className = 'content_Template_1';
  main.id = `${selectedTemplate}`

  wrapper.appendChild(sidebarClone);
  wrapper.appendChild(main);
  page.appendChild(wrapper);

  refs.resumePreview.appendChild(page);

  return { page, main };
}

function createPageWithoutSidebar() {
  const page = document.createElement('div');
  page.className = 'resume-page resume professional';

  const main = document.createElement('main');
  main.className = 'content_Template_1';
  main.style.width = '100%';

  page.appendChild(main);
  refs.resumePreview.appendChild(page);

  return { page, main };
}

function renderLanguageLevel(level) {
  const levels = ['basic', 'conversational', 'fluent', 'native'];
  const count = levels.indexOf(level) + 1;

  return `
    <span class="lang-level">
      ${levels.map((_, i) =>
    `<span class="dot ${i < count ? 'filled' : ''}"></span>`
  ).join('')}
    </span>
  `;
}

function photoHtml() {
  const photo = getPhotoSrc();
  if (photo) {
    // safe: only include data URLs we produced or approved
    return `<img class="avatar" src="${photo}" alt="Profile photo">`;
  } else {
    const initials = escapeHtml(getInitials(data.personal.fullName || ''));
    return `<div class="avatar placeholder">${initials}</div>`;
  }
}


function hasExperience() {
  return data.experience && data.experience.some(exp =>
    exp.role?.trim() ||
    exp.campany?.trim() ||
    exp.start?.trim() ||
    exp.end?.trim() ||
    (exp.bullets && exp.bullets.some(b => b?.trim()))
  );
}

function hasEducation() {
  return data.education && data.education.some(edu =>
    edu.school?.trim() ||
    edu.degree?.trim() ||
    edu.year?.trim() ||
    edu.discription?.trim()
  );
}

function hasSkills() {
  return data.skills?.some(skill =>
    skill.name?.trim()
  );
}

function hasLanguage() {
  return data.languages && data.languages.some(lang =>
    lang.name?.trim()
  );
}


function hasCertificate() {
  return data.certificates && data.certificates.some(cert =>
    cert.name?.trim()
  );
}

function hasAchievements() {
  return data.achievements && data.achievements.some(a => a?.trim());
}

  function hasPortfolio() {
  return data.portfolio && data.portfolio.some(link =>
    link.name?.trim() || link.url?.trim()
  );
}

function hasInterest() {
  return data.interests && data.interests.some(i =>
    i?.trim()
  );
}

function hasReferences() {
  return data.references && data.references.some(ref =>
    ref.name?.trim() ||
    ref.campany?.trim() ||
    ref.phone?.trim() ||
    ref.email?.trim()
  );
}


function rendermidnight() {
  return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
    <aside style="padding: 30px 0;
padding-bottom: 0;
  height: fit-content;
  width: 680px;
  margin: 0 auto;">
      <h1 style="
      font-family:'Times New Roman';
font-size:34px;
color: #050505;
font-weight:700;
letter-spacing:.3px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:18px;
font-style:italic;
margin:4px 0 14px 0;
color:#444;
">
${escapeHtml(data.personal.title || '')}
</p>

<div style="
display:grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap:10px 30px;
font-size:14px;
color:#333;
margin-top:14px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-phone" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.phone)}
</span>
` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-envelope" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.email)}
</span>
` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-location-dot" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.location)}
</span>
` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-globe" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.website)}
</span>
` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-brands fa-linkedin" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.linkedin)}
</span>
` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-calendar" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.dob)}
</span>
` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-id-card" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>
` : ''}

${data.personal.maritalStatus ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-user" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.maritalStatus)}
</span>
` : ''}

${data.personal.religion ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-place-of-worship" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.religion)}
</span>
` : ''}
</div>

    </aside>
<main class="content_Template_1">


${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color: #050505;
font-size:15px;
font-weight:700;
margin-bottom:8px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color: #050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>

<span style="font-size:13px; color:#444;">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span>${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets
  ?.filter(b => b?.trim())
  .map(b => `
<li class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Education
</h2>

${data.education.map(edu => `
<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">
<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>
<span style="font-size:13px; color:#444;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span>${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills
  .filter(s => s.name?.trim())
  .map(skill => {

    let dots = 3;
    if (typeof skill.level === "number") {
      dots = Math.ceil(skill.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(skill.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Certificates
</h2>

${data.certificates
  .filter(cert => cert.name?.trim() || cert.issuer?.trim())
  .map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Projects
</h2>

${data.portfolio
  .filter(link => link.name?.trim() || link.url?.trim())
  .map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.languages
  .filter(l => l.name?.trim())
  .map(lang => {

    let dots = 3;
    if (typeof lang.level === "number") {
      dots = Math.ceil(lang.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(lang.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
margin-top: 22px;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>
` : ''}

${(() => {
  const validRefs = data.references.filter(
    ref => ref.name?.trim() || ref.campany?.trim()
  );

  if (!validRefs.length) return '';

  return `
<h2 class="overflow" style="
font-size:15px;
color:#050505;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
References
</h2>

${validRefs.map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}
`;
})()}

</main>
  </div>
  `;
}

function renderpromidnight() {
  const p = photoHtml();
  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }
  return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
<aside style="
width:100%;
background:${asideGradient};
padding:50px 60px;
display:flex;
justify-content:center;
box-shadow:0 20px 60px rgba(0,0,0,0.35);
">

<div style="
width:100%;
max-width:1100px;
display:flex;
align-items:center;
justify-content:space-between;
gap:40px;
flex-wrap:wrap;
">

<!-- LEFT -->
<div style="flex:1; min-width:260px;">

<h1 style="
font-family:'Times New Roman';
font-size:40px;
color:#ffffff;
font-weight:700;
letter-spacing:.5px;
margin-bottom:8px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:18px;
font-style:italic;
margin-bottom:18px;
color:#c7d2fe;
">
${escapeHtml(data.personal.title || '')}
</p>

<!-- CONTACT GRID -->
<div style="
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px 28px;
font-size:15px;
color:#e2e8f0;
font-weight: 600;
letter-spacing: 1px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-phone" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.phone)}
</span>` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-envelope" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.email)}
</span>` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-location-dot" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.location)}
</span>` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-globe" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.website)}
</span>` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:14px;">
<i class="fa-brands fa-linkedin" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.linkedin)}
</span>` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-calendar" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.dob)}
</span>` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-id-card" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>` : ''}

</div>

<!-- SUBTLE DIVIDER -->
<div style="
height:1px;
background:rgba(255,255,255,0.08);
margin-top:20px;
width:100%;
"></div>

</div>

<!-- RIGHT PHOTO -->
<div style="
position:relative;
width:140px;
height:140px;
border-radius:50%;
overflow:hidden;
background:${asideGradient};
display:flex;
align-items:center;
justify-content:center;
flex-shrink:0;
border:4px solid rgba(255,255,255,0.12);
box-shadow:0 10px 30px rgba(0,0,0,0.4);
">

<!-- GLOW RING -->
<div style="
position:absolute;
inset:-6px;
border-radius:50%;
background:radial-gradient(circle,rgba(99,102,241,0.4),transparent 70%);
filter:blur(6px);
z-index:0;
"></div>

${data.personal.photo ? `
<img src="${data.personal.photo}" style="
position:relative;
z-index:1;
width:100%;
height:100%;
object-fit:cover;
">
` : `
<span style="
position:relative;
z-index:1;
color:#94a3b8;
font-size:34px;
font-weight:700;
">
${(data.personal.fullName || '').split(' ').map(n=>n[0]).join('').slice(0,2)}
</span>
`}

</div>

</div>
</aside>
<main class="content_Template_1">

${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color: #050505;
font-size:15px;
font-weight:700;
margin-bottom:8px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color: #050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
flex-wrap:wrap;
margin-top: 20px;
width:100%:
">
<span style="font-size:13px; color:#444; width: 200px">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
display:flex;
flex-wrap:wrap;
color:#333;
">
<span style="width: 200px">${escapeHtml(exp.location || '')}</span>
<span>${escapeHtml(exp.campany || '')}</span>
</div>

${exp.bullets
  ?.filter(b => b?.trim())
  .map(b => `
<li class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Education
</h2>

${data.education.map(edu => `

<div style="
display:flex;
width: 100%;
flex-wrap:wrap;
margin-top: 20px;
">
<span style="font-size:13px; color:#444; width: 200px;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>


</div>

<div style="
font-size:14px;
display:flex;
width: 100%;
flex-wrap:wrap;
font-style:italic;
margin-bottom:6px;
color:#333;
  display:flex;
  flex-wrap:wrap;
">
<span style="width:200px">${escapeHtml(edu.location || '')}</span>
<span>${escapeHtml(edu.school || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills
  .filter(s => s.name?.trim())
  .map(skill => {

    let dots = 3;
    if (typeof skill.level === "number") {
      dots = Math.ceil(skill.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(skill.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Certificates
</h2>

${data.certificates
  .filter(cert => cert.name?.trim() || cert.issuer?.trim())
  .map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}


${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Projects
</h2>

${data.portfolio
  .filter(link => link.name?.trim() || link.url?.trim())
  .map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.languages
  .filter(l => l.name?.trim())
  .map(lang => {

    let dots = 3;
    if (typeof lang.level === "number") {
      dots = Math.ceil(lang.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(lang.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
margin-top: 22px;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>
` : ''}

${(() => {
  const validRefs = data.references.filter(
    ref => ref.name?.trim() || ref.campany?.trim()
  );

  if (!validRefs.length) return '';

  return `
<h2 class="overflow" style="
font-size:15px;
color:#050505;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
References
</h2>

${validRefs.map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}
`;
})()}

</main>
  </div>
  `;
}

function renderGoldenExecutive() {

  return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
 <aside style="
width:100%;
padding:50px 50px 20px 50px;
box-sizing:border-box;
">

<h1 style="
font-family:'Times New Roman', Georgia, serif;
font-size:34px;
color:#050505;
font-weight:700;
letter-spacing:.3px;
margin:0;
display:flex;
align-items:baseline;
gap:10px;
flex-wrap:wrap;
">

<span>${escapeHtml(data.personal.fullName || '')}</span>

${data.personal.title ? `
<span style="
font-size:18px;
font-style:italic;
font-weight:400;
color:#444;
">
 ${escapeHtml(data.personal.title)}
</span>
` : ''}

</h1>

<div style="
display:grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap:10px 30px;
font-size:14px;
color:#333;
margin-top:14px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-phone" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.phone)}
</span>
` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-envelope" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.email)}
</span>
` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-location-dot" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.location)}
</span>
` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-globe" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.website)}
</span>
` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-brands fa-linkedin" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.linkedin)}
</span>
` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-calendar" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.dob)}
</span>
` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-id-card" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>
` : ''}

${data.personal.maritalStatus ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-user" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.maritalStatus)}
</span>
` : ''}

${data.personal.religion ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-place-of-worship" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.religion)}
</span>
` : ''}

</div>

</aside>
<main class="content_Template_1">

${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color: #050505;
font-size:15px;
font-weight:700;
margin-bottom:8px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color: #050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
flex-wrap:wrap;
margin-top: 20px;
width:100%:
">
<span style="font-size:13px; color:#444; width: 200px">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
display:flex;
flex-wrap:wrap;
color:#333;
">
<span style="width: 200px">${escapeHtml(exp.location || '')}</span>
<span>${escapeHtml(exp.campany || '')}</span>
</div>

${exp.bullets
  ?.filter(b => b?.trim())
  .map(b => `
<li class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Education
</h2>

${data.education.map(edu => `

<div style="
display:flex;
width: 100%;
flex-wrap:wrap;
margin-top: 20px;
">
<span style="font-size:13px; color:#444; width: 200px;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>


</div>

<div style="
font-size:14px;
display:flex;
width: 100%;
flex-wrap:wrap;
font-style:italic;
margin-bottom:6px;
color:#333;
  display:flex;
  flex-wrap:wrap;
">
<span style="width:200px">${escapeHtml(edu.location || '')}</span>
<span>${escapeHtml(edu.school || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills
  .filter(s => s.name?.trim())
  .map(skill => {

    let dots = 3;
    if (typeof skill.level === "number") {
      dots = Math.ceil(skill.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(skill.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Certificates
</h2>

${data.certificates
  .filter(cert => cert.name?.trim() || cert.issuer?.trim())
  .map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}


${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Projects
</h2>

${data.portfolio
  .filter(link => link.name?.trim() || link.url?.trim())
  .map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.languages
  .filter(l => l.name?.trim())
  .map(lang => {

    let dots = 3;
    if (typeof lang.level === "number") {
      dots = Math.ceil(lang.level / 20);
    }

    return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(lang.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
margin-top: 22px;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>

` : ''}

${hasReferences ? `

<h2 class="overflow" style="
font-size:15px;
color:#050505;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
References
</h2>

${data.references
  .filter(ref => ref.name?.trim() || ref.campany?.trim())
  .map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}

` : ''}
</main>
  </div>
  `;
}

function renderGoldenExecutiveII() {
  const p = photoHtml();
  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }
  return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
<aside style="
width:100%;
background:${asideGradient};
padding:50px 60px;
display:flex;
justify-content:center;
box-shadow:0 20px 60px rgba(0,0,0,0.35);
">

<div style="
width:100%;
max-width:1100px;
display:flex;
align-items:center;
justify-content:space-between;
gap:40px;
flex-wrap:wrap;
">

<!-- LEFT -->
<div style="flex:1; min-width:260px;">

<h1 style="
font-family:'Times New Roman';
font-size:40px;
color:#ffffff;
font-weight:700;
letter-spacing:.5px;
margin-bottom:8px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:18px;
font-style:italic;
margin-bottom:18px;
color:#c7d2fe;
">
${escapeHtml(data.personal.title || '')}
</p>

<!-- CONTACT GRID -->
<div style="
display: grid;
grid-template-columns: 1fr 1fr;
gap: 12px 28px;
font-size:15px;
color:#e2e8f0;
font-weight: 600;
letter-spacing: 1px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-phone" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.phone)}
</span>` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-envelope" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.email)}
</span>` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-location-dot" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.location)}
</span>` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-globe" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.website)}
</span>` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:14px;">
<i class="fa-brands fa-linkedin" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.linkedin)}
</span>` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-calendar" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.dob)}
</span>` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;">
<i class="fa-solid fa-id-card" style="font-size:12px;opacity:.85;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>` : ''}

</div>

<!-- SUBTLE DIVIDER -->
<div style="
height:1px;
background:rgba(255,255,255,0.08);
margin-top:20px;
width:100%;
"></div>

</div>

<!-- RIGHT PHOTO -->
<div style="
position:relative;
width:140px;
height:140px;
border-radius:50%;
overflow:hidden;
background:${asideGradient};
display:flex;
align-items:center;
justify-content:center;
flex-shrink:0;
border:4px solid rgba(255,255,255,0.12);
box-shadow:0 10px 30px rgba(0,0,0,0.4);
">

<!-- GLOW RING -->
<div style="
position:absolute;
inset:-6px;
border-radius:50%;
background:radial-gradient(circle,rgba(99,102,241,0.4),transparent 70%);
filter:blur(6px);
z-index:0;
"></div>

${data.personal.photo ? `
<img src="${data.personal.photo}" style="
position:relative;
z-index:1;
width:100%;
height:100%;
object-fit:cover;
">
` : `
<span style="
position:relative;
z-index:1;
color:#94a3b8;
font-size:34px;
font-weight:700;
">
${(data.personal.fullName || '').split(' ').map(n=>n[0]).join('').slice(0,2)}
</span>
`}

</div>

</div>
</aside>
<main class="content_Template_1">

${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color:#fff;
font-size:15px;
font-weight:700;
margin-bottom:8px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
flex-wrap:wrap;
margin-top:20px;
width:100%:
">
<span style="font-size:13px; color:#444; width:200px">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
display:flex;
flex-wrap:wrap;
color:#333;
">
<span style="width:200px">${escapeHtml(exp.location || '')}</span>
<span>${escapeHtml(exp.campany || '')}</span>
</div>

${exp.bullets?.filter(b => b?.trim()).map(b => `
<li class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Education
</h2>

${data.education.map(edu => `

<div style="
display:flex;
width:100%;
flex-wrap:wrap;
margin-top:20px;
">
<span style="font-size:13px; color:#444; width:200px;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>

</div>

<div style="
font-size:14px;
display:flex;
width:100%;
flex-wrap:wrap;
font-style:italic;
margin-bottom:6px;
color:#333;
">
<span style="width:200px">${escapeHtml(edu.location || '')}</span>
<span>${escapeHtml(edu.school || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills.filter(s => s.name?.trim()).map(skill => {

let dots = 3;
if (typeof skill.level === "number") {
dots = Math.ceil(skill.level / 20);
}

return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(skill.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Certificates
</h2>

${data.certificates.filter(cert => cert.name?.trim() || cert.issuer?.trim()).map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top:10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Projects
</h2>

${data.portfolio.filter(link => link.name?.trim() || link.url?.trim()).map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top:10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#fff;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.languages.filter(l => l.name?.trim()).map(lang => {

let dots = 3;
if (typeof lang.level === "number") {
dots = Math.ceil(lang.level / 20);
}

return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(lang.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#fff;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>

` : ''}

${(() => {
const validRefs = data.references.filter(
ref => ref.name?.trim() || ref.campany?.trim()
);

if (!validRefs.length) return '';

return `
<h2 class="overflow" style="
font-size:15px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
References
</h2>

${validRefs.map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}
`;
})()}

</main>
</div>
  `;
}

function renderPinkCorporate() {
    return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
 <aside style="
width:100%;
padding:50px 50px 20px 50px;
box-sizing:border-box;
">

<h1 style="
font-family:'Times New Roman', Georgia, serif;
font-size:34px;
color:#050505;
font-weight:700;
letter-spacing:.3px;
margin:0;
display:flex;
align-items:baseline;
gap:10px;
flex-wrap:wrap;
">

<span>${escapeHtml(data.personal.fullName || '')}</span>

${data.personal.title ? `
<span style="
font-size:18px;
font-style:italic;
font-weight:400;
color:#444;
">
 ${escapeHtml(data.personal.title)}
</span>
` : ''}

</h1>

<div style="
display:grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap:10px 30px;
font-size:14px;
color:#333;
margin-top:14px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-phone" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.phone)}
</span>
` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-envelope" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.email)}
</span>
` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-location-dot" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.location)}
</span>
` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-globe" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.website)}
</span>
` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-brands fa-linkedin" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.linkedin)}
</span>
` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-calendar" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.dob)}
</span>
` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-id-card" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>
` : ''}

${data.personal.maritalStatus ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-user" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.maritalStatus)}
</span>
` : ''}

${data.personal.religion ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-place-of-worship" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.religion)}
</span>
` : ''}

</div>

</aside>
<main class="content_Template_1">

${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color: #050505;
font-size:15px;
font-weight:700;
margin-bottom:8px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color: #050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
flex-wrap:wrap;
margin-top: 20px;
width:100%:
">
<span style="font-size:13px; color:#444; width: 200px">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
display:flex;
flex-wrap:wrap;
color:#333;
">
<span style="width: 200px">${escapeHtml(exp.location || '')}</span>
<span>${escapeHtml(exp.campany || '')}</span>
</div>

${exp.bullets
  ?.filter(b => b?.trim())
  .map(b => `
<li class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
font-weight:700;
margin-top: 22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Education
</h2>

${data.education.map(edu => `

<div style="
display:flex;
width: 100%;
flex-wrap:wrap;
margin-top: 20px;
">
<span style="font-size:13px; color:#444; width: 200px;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>


</div>

<div style="
font-size:14px;
display:flex;
width: 100%;
flex-wrap:wrap;
font-style:italic;
margin-bottom:6px;
color:#333;
  display:flex;
  flex-wrap:wrap;
">
<span style="width:200px">${escapeHtml(edu.location || '')}</span>
<span>${escapeHtml(edu.school || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color:#050505;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills.map(skill => {

      const levelMap = {
        basic: 40,
        intermediate: 65,
        advanced: 85,
        expert: 90,
        native: 100
      };

      let level = skill.level;

      // convert string levels
      if (typeof level === "string") {

        const normalized = level.trim().toLowerCase();

        if (levelMap[normalized] !== undefined) {
          level = levelMap[normalized];
        }
        else if (!isNaN(level)) {
          level = Number(level);
        }
        else {
          level = 70; // default
        }

      }

      // ensure number
      if (typeof level !== "number") level = 70;

      // clamp between 0-100
      level = Math.max(0, Math.min(level, 100));

      return `

<div>

<div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:4px">
<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<span style="color:#6b7280">
</span>

</div>

<div style="
height:6px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">

<div style="
height:100%;
max-width: 400px;
width:${level}%;
background:#333;
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}
</div>
` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Certificates
</h2>

${data.certificates
  .filter(cert => cert.name?.trim() || cert.issuer?.trim())
  .map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}


${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#050505;
margin-top: 22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Projects
</h2>

${data.portfolio
  .filter(link => link.name?.trim() || link.url?.trim())
  .map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top: 10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">
${data.languages
        .filter(l => l.name?.trim())
        .map(l => {

          const levelMap = {
            basic: 25,
            intermediate: 50,
            advanced: 85,
            native: 100
          };

          const level = levelMap[l.level?.toLowerCase?.()] || 70;

          return `
<div>
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
margin-bottom:4px;
">

<span>${escapeHtml(l.name)}</span>
</div>

<div style="
height:5px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">
<div style="
height:100%;
width:${level}%;
background:#333;
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}

</div>

` : ''}


${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color: #050505;
margin-top: 22px;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#050505;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>

` : ''}

${(() => {
  const validRefs = data.references.filter(
    ref => ref.name?.trim() || ref.campany?.trim()
  );

  if (!validRefs.length) return '';

  return `
<h2 class="overflow" style="
font-size:15px;
color:#050505;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
border-bottom:2px solid #111;
padding-bottom:4px;
">
References
</h2>

${validRefs.map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px; margin-top: 10px">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}
`;
})()}

</main>
  </div>
  `;
}

function renderPinkCorporateII() {
  const p = photoHtml();
  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

   return `
  <div class="resume_Template_1" style="
font-family: Georgia, 'Times New Roman', serif;
font-size:14px;
line-height:1.7;
color:#080808;
max-width:820px;
margin:auto;
background:#fff;
">
 <aside style="
width:100%;
padding:50px 50px 20px 50px;
box-sizing:border-box;
  border-bottom: 2px solid ${accentColor} ;
">

<h1 style="
font-family:'Times New Roman', Georgia, serif;
font-size:34px;
color:#050505;
font-weight:700;
letter-spacing:.3px;
margin:0;
display:flex;
align-items:baseline;
gap:10px;
flex-wrap:wrap;
">

<span>${escapeHtml(data.personal.fullName || '')}</span>

${data.personal.title ? `
<span style="
font-size:18px;
font-style:italic;
font-weight:400;
color:#444;
">
 ${escapeHtml(data.personal.title)}
</span>
` : ''}

</h1>

<div style="
display:grid;
grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
gap:10px 30px;
font-size:14px;
color:#333;
margin-top:14px;
">

${data.personal.phone ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-phone" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.phone)}
</span>
` : ''}

${data.personal.email ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-envelope" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.email)}
</span>
` : ''}

${data.personal.location ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-location-dot" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.location)}
</span>
` : ''}

${data.personal.website ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-globe" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.website)}
</span>
` : ''}

${data.personal.linkedin ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-brands fa-linkedin" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.linkedin)}
</span>
` : ''}

${data.personal.dob ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-calendar" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.dob)}
</span>
` : ''}

${data.personal.driversLicence ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-id-card" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.driversLicence)}
</span>
` : ''}

${data.personal.maritalStatus ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-user" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.maritalStatus)}
</span>
` : ''}

${data.personal.religion ? `
<span style="display:flex;align-items:center;gap:6px;">
<i class="fa-solid fa-place-of-worship" style="font-size:11px;opacity:.7;"></i>
${escapeHtml(data.personal.religion)}
</span>
` : ''}

</div>

</aside>
<main class="content_Template_1">

${data.summary?.trim() ? `
<section class="overflow" style="margin-bottom:26px;">

<h2 style="
color:#fff;
font-size:15px;
font-weight:700;
margin-bottom:8px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Professional Summary
</h2>

<p style="font-size:14px; color:#222;">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="
display:flex;
flex-wrap:wrap;
margin-top:20px;
width:100%:
">
<span style="font-size:13px; color:#444; width:200px">
${[exp.start, exp.end].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(exp.role || '')}
</strong>
</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
display:flex;
flex-wrap:wrap;
color:#333;
">
<span style="width:200px">${escapeHtml(exp.location || '')}</span>
<span>${escapeHtml(exp.campany || '')}</span>
</div>

${exp.bullets?.filter(b => b?.trim()).map(b => `
<li class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
list-style:none;
">
<span style="margin-right:6px;">•</span>${escapeHtml(b)}
</li>
`).join('')}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Education
</h2>

${data.education.map(edu => `

<div style="
display:flex;
width:100%;
flex-wrap:wrap;
margin-top:20px;
">
<span style="font-size:13px; color:#444; width:200px;">
${[edu.start, edu.end, edu.year].filter(Boolean).join(' – ')}
</span>

<strong style="font-size:15px;">
${escapeHtml(edu.degree || '')}
</strong>

</div>

<div style="
font-size:14px;
display:flex;
width:100%;
flex-wrap:wrap;
font-style:italic;
margin-bottom:6px;
color:#333;
">
<span style="width:200px">${escapeHtml(edu.location || '')}</span>
<span>${escapeHtml(edu.school || '')}</span>
</div>

${edu.discription ? `
<div class="overflow" style="
margin-left:200px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(edu.discription)}
</div>
` : ''}

`).join('')}

` : ''}

${hasSkills() ? `

<h2 class="overflow" style="
font-size:15px;
color:#fff;
font-weight:700;
margin-top:22px;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Skills
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.skills.filter(s => s.name?.trim()).map(skill => {

let dots = 3;
if (typeof skill.level === "number") {
dots = Math.ceil(skill.level / 20);
}

return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(skill.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasCertificate() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Certificates
</h2>

${data.certificates.filter(cert => cert.name?.trim() || cert.issuer?.trim()).map(cert => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top:10px;
">

<strong style="font-size:15px;">
${escapeHtml(cert.name || '')}
</strong>

<span style="font-size:13px; color:#444;">
${cert.date ? escapeHtml(cert.date) : ''}
</span>

</div>

<div class="overflow" style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
color:#333;
">
${escapeHtml(cert.issuer || '')}
</div>

${cert.description ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
<span style="margin-right:6px;">•</span>${escapeHtml(cert.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasPortfolio() ? `

<h2 class="overflow" style="
font-size:14px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Projects
</h2>

${data.portfolio.filter(link => link.name?.trim() || link.url?.trim()).map(link => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
margin-top:10px;
">

<strong style="font-size:15px;">
${escapeHtml(link.name || '')}
</strong>

<span style="font-size:13px; color:#444; font-style:italic;">
${link.url ? escapeHtml(link.url) : ''}
</span>

</div>

${link.description ? `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(link.description)}
</div>
` : ''}

`).join('')}

` : ''}

${hasLanguage() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#fff;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Languages
</h2>

<div class="overflow" style="
display:grid;
grid-template-columns:1fr 1fr;
gap:10px 30px;
">

${data.languages.filter(l => l.name?.trim()).map(lang => {

let dots = 3;
if (typeof lang.level === "number") {
dots = Math.ceil(lang.level / 20);
}

return `
<div style="
display:flex;
justify-content:space-between;
font-size:14px;
">

<span>${escapeHtml(lang.name)}</span>

<div style="display:flex; gap:5px;">
${[1,2,3,4,5].map(i => `
<div style="
width:6px;
height:6px;
border-radius:50%;
background:${i <= dots ? '#111' : '#ddd'};
"></div>
`).join('')}
</div>

</div>
`;
}).join('')}

</div>

` : ''}

${hasAchievements() ? `

<h2 class="overflow" style="
font-size:15px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Honors & Awards
</h2>

${data.achievements.map(a => `
<div class="overflow" style="
font-size:14px;
margin-bottom:6px;
">
• ${escapeHtml(a)}
</div>
`).join('')}

` : ''}

${hasInterest() ? `

<h2 class="overflow" style="
font-size:15px;
font-weight:700;
margin-top:22px;
color:#fff;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
Interests
</h2>

<div class="overflow" style="
font-size:14px;
display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
">
${data.interests.map(i => `<span>• ${escapeHtml(i)}</span>`).join('')}
</div>

` : ''}

${(() => {
const validRefs = data.references.filter(
ref => ref.name?.trim() || ref.campany?.trim()
);

if (!validRefs.length) return '';

return `
<h2 class="overflow" style="
font-size:15px;
color:#fff;
margin-top:22px;
font-weight:700;
margin-bottom:10px;
background:${asideGradient};
text-align:center;
padding:6px 0;
">
References
</h2>

${validRefs.map(ref => `

<div style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;">
<span style="margin-right:6px;">•</span>
${escapeHtml(ref.name || '')}
</strong>

</div>

<div style="
font-size:14px;
font-style:italic;
margin-bottom:6px;
margin-left:16px;
color:#333;
">
${escapeHtml(ref.position || '')}
</div>

<div style="
font-size:14px;
font-style:italic;
margin-left:16px;
margin-bottom:6px;
color:#333;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone || ref.email ? `
<div class="overflow" style="
margin-left:16px;
margin-bottom:4px;
font-size:14px;
color:#222;
line-height:1.5;
">
${[ref.phone, ref.email].filter(Boolean).map(escapeHtml).join(' | ')}
</div>
` : ''}

`).join('')}
`;
})()}

</main>
  </div>
  `;
  
}

function ModernAtsPhoto() {
  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  const p = photoHtml();

  return `
  <div class="resume_Template_1">
            <aside class="header" 
        style="background: ${asideGradient};
            padding: 40px 40px 80px 40px;
            color: white;
            position: relative;">
            <div class="header-grid" 
            style="display: grid;
            grid-template-columns: 1fr 2fr;
            align-items: center;">
            <div>
                    <div class="name"
                     style="font-size: 36px;
                    font-family: Space Grotesk;
                    font-weight: 700;
                    letter-spacing: 2px;">${escapeHtml(data.personal.fullName || '')}</div>
                    <div class="title" 
                    style="opacity: .85;
                    margin-top: 6px;
                    letter-spacing: 2px;
                    font-size: 15px;">${escapeHtml(data.personal.title || '')}</div>
                    </div>

                <ul class="contact-list_Template_1" style="display: grid;grid-template-columns: 1fr 1fr;">

    ${data.personal.phone
      ? `<li style="font-size:14px">${icon(ICONS.phone_w)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li style="font-size:14px">${icon(ICONS.email_w)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li style="font-size:14px">${icon(ICONS.location_w)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li style="font-size:14px">${icon(ICONS.website_w)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li style="font-size:14px">${icon(ICONS.linkedin_w)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li style="font-size:14px">${icon(ICONS.calendar_w)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li style="font-size:14px">${icon(ICONS.user_w)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li style="font-size:14px">${icon(ICONS.group_w)}${escapeHtml(data.personal.race)}</li>`
      : ''}
${data.personal.religion
      ? `<li style="font-size:14px">${icon(ICONS.faith_w)}${escapeHtml(data.personal.religion)}</li>`
      : ''}
${data.personal.maritalStatus
      ? `<li style="font-size:14px">${icon(ICONS.heart_w)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li style="font-size:14px">${icon(ICONS.car_w)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}
  </ul>
            </div>

            <div class="profile" 
            style="position: absolute;
            display: flex;
            justify-content: center;
            bottom: -65px;
            left: 60px;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            overflow: hidden;
            border: 6px solid white;
            background: ${asideGradient};
            box-shadow: 0 10px 25px rgba(0, 0, 0, .25);">
            <div>${p}</div>
            </div>
        </aside>
       
<main style="padding-top:0">

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px; margin-top:40px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;

">
Professional Summary
</h2>

<p style="color:#374151;">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280; margin-top:10px">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets?.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:5px;color: #374151; margin-left: 18px">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
margin-top: 28px;
">
Education
</h2>

${data.education.map(edu => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(edu.degree || '')}
</strong>

<span style="font-size:12px;color:#6b7280">
${[
      edu.start,
      edu.end,
      edu.startYear,
      edu.endYear,
      edu.year
    ].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription?.trim() ? `
<div class="overflow" style="
color:#4b5563;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `

<section class="overflow" style="margin-bottom:34px; margin-top: 28px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Skills
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => {

          const levelMap = {
            basic: 40,
            intermediate: 65,
            advanced: 85,
            expert: 90,
            native: 100
          };

          let level = skill.level;

          if (typeof level === "string") {
            const normalized = level.trim().toLowerCase();
            if (levelMap[normalized] !== undefined) {
              level = levelMap[normalized];
            }
            else if (!isNaN(level)) {
              level = Number(level);
            }
            else {
              level = 70;
            }
          }
          if (typeof level !== "number") level = 70;
          level = Math.max(0, Math.min(level, 100));
          const dots = Math.ceil(level / 20);
          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>
`).join('')}
</div>
</div>
`;
}).join('')}
</div>
</section>

` : ''}

${hasCertificate() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Certificates
</h2>

${data.certificates.map(cert => `
<div style="margin-bottom:12px">
<span style="display: flex; justify-content: space-between;">
<strong style="font-size:14px;color:#111827">
${escapeHtml(cert.name || '')}
</strong>
${cert.date ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(cert.date)}</div>` : ''}
</span>

${cert.issuer ? `<div style="font-size:13px;color:#374151; margin:3px 0; font-weight: 600;">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#4b5563">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Projects
</h2>

${data.portfolio.map(link => `
<div style="margin-top:12px;">
<strong style="font-size:14px;color:#111827;">
${escapeHtml(link.name || '')}
</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}"; font-weight: 600; margin:3px 0;>${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#4b5563">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}

</section>

` : ''}

${hasAchievements() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Honors & Awards
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.achievements
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasLanguage() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Languages
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => {

          const levelMap = {
            basic: 1,
            intermediate: 2,
            advanced: 3,
            fluent: 4,
            native: 5
          };

          let dots = 3;

          if (typeof lang.level === "string") {
            const normalized = lang.level.trim().toLowerCase();

            if (levelMap[normalized] !== undefined) {
              dots = levelMap[normalized];
            }
          }

          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>

`).join('')}
</div>
</div>
`;
        }).join('')}
</div>
</section>
` : ''}

${hasInterest() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Interests
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.interests
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow" style="margin-bottom:26px ; margin-top:28px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
References
</h2>

<div style="
display:grid;
grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
gap:16px;
">

${data.references.map(ref => `
<div style="
border:1px solid #e5e7eb;
border-radius:6px;
padding:14px;
background:#fafafa;
">

<strong style="
font-size:14px;
color:#111827;
display:block;
margin-bottom:4px;
">
${escapeHtml(ref.name)}
</strong>

<div style="
font-size:13px;
color:#374151;
margin-bottom:8px;
">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone ? `
<div style="
display:flex;
align-items:center;
gap:6px;
font-size:12px;
color:#6b7280;
margin-bottom:4px;
">

<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M22 16.92v3a2 2 0 0 1-2.18 2 
19.79 19.79 0 0 1-8.63-3.07 
19.5 19.5 0 0 1-6-6 
19.79 19.79 0 0 1-3.07-8.67 
A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 
12.84 12.84 0 0 0 .7 2.81 
2 2 0 0 1-.45 2.11L8.09 9.91
a16 16 0 0 0 6 6l1.27-1.27
a2 2 0 0 1 2.11-.45
12.84 12.84 0 0 0 2.81.7
A2 2 0 0 1 22 16.92z"/>
</svg>

${escapeHtml(ref.phone)}

</div>
` : ''}

${ref.email ? `
<div style="
display:flex;
align-items:center;
gap:6px;
font-size:12px;
color:#6b7280;
">
<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M4 4h16v16H4z"/>
<polyline points="22,6 12,13 2,6"/>
</svg>
${escapeHtml(ref.email)}
</div>
` : ''}
</div>
`).join('')}
</div>
</section>
` : ''}
</main>
  </div>
  `;
}


function renderModernAtsClean() {

  let accentColor = "#2563eb";

  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  const p = photoHtml();
  const selectedTemplate = data.template;




  /* EXTRACT ACCENT COLOR FROM GRADIENT */

  const match = asideGradient.match(/#([0-9a-fA-F]{6})/g);

  if (match && match.length >= 2) {
    accentColor = match[1];
  }


  const personalFields = [
    { key: "phone", icon: ICONS.phone_w },
    { key: "email", icon: ICONS.email_w },
    { key: "location", icon: ICONS.location_w },
    { key: "website", icon: ICONS.website_w },
    { key: "linkedin", icon: ICONS.linkedin_w },
    { key: "dob", icon: ICONS.calendar_w },
    { key: "gender", icon: ICONS.user_w },
    { key: "race", icon: ICONS.group_w },
    { key: "driversLicence", icon: ICONS.car_w }
  ];

  return `
<div class="resume_Template_1" style="
display:block;
width:100%;
">


<aside style="
background:${asideGradient};
color:#ffffff;
padding:34px 26px;
display:flex;
flex-direction:column;
gap:20px;
">

<div style="text-align:center;" class="overflow">
<h1 style="
font-size:35px;
font-weight:700;
line-height:1.2;
margin-bottom:6px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<div style="font-size:20px;opacity:.9;">
${escapeHtml(data.personal.title || '')}
</div>
</div>

<div style="
display:grid;
grid-template-columns:3fr auto;
">
<div>

<ul style="
list-style:none;
padding:0;
margin:0;
display:grid;
grid-template-columns:1fr 1fr;
gap:6px 12px;
">

${personalFields
      .filter(f => data.personal[f.key])
      .map(f => `
<li class="overflow" style="display:flex;align-items:center;gap:8px;">
${icon(f.icon)}
${escapeHtml(data.personal[f.key])}
</li>
`).join('')}

</ul>

</div>

<div style="
  margin-left:16px;
  width:100px;
  height:100px;
  flex-shrink:0;
  border-radius:50%; /* modern rounded corners */
  overflow:hidden;
  border: 3px solid #e4e3f1; /* stylish modern border color */
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); /* subtle shadow for depth */
">
  ${p}
</div>
</div>
</aside>
<main style="padding-top:0">

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Professional Summary
</h2>

<p style="color:#374151;">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280; margin-top:10px">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets?.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:5px;color: #374151; margin-left: 18px">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
margin-top: 28px;
">
Education
</h2>

${data.education.map(edu => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(edu.degree || '')}
</strong>

<span style="font-size:12px;color:#6b7280">
${[
      edu.start,
      edu.end,
      edu.startYear,
      edu.endYear,
      edu.year
    ].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription?.trim() ? `
<div class="overflow" style="
color:#4b5563;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `

<section class="overflow" style="margin-bottom:34px; margin-top:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Skills
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.skills.map(skill => {

      const levelMap = {
        basic: 40,
        intermediate: 65,
        advanced: 85,
        expert: 90,
        native: 100
      };

      let level = skill.level;

      if (typeof level === "string") {
        const normalized = level.trim().toLowerCase();
        if (levelMap[normalized] !== undefined) level = levelMap[normalized];
        else if (!isNaN(level)) level = Number(level);
        else level = 70;
      }

      if (typeof level !== "number") level = 70;
      level = Math.max(0, Math.min(level, 100));

      return `
<div>
<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>
<span style="color:#6b7280"></span>
</div>

<div style="
height:6px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">
<div style="
height:100%;
width:${level}%;
background:${accentColor};
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}

</div>

</section>

` : ''}

${hasCertificate() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Certificates
</h2>

${data.certificates.map(cert => `
<div style="margin-bottom:12px">
<span style="display: flex; justify-content: space-between;">
<strong style="font-size:14px;color:#111827">
${escapeHtml(cert.name || '')}
</strong>
${cert.date ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(cert.date)}</div>` : ''}
</span>

${cert.issuer ? `<div style="font-size:13px;color:#374151; margin:3px 0; font-weight: 600;">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#4b5563">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Projects
</h2>

${data.portfolio.map(link => `
<div style="margin-top:12px;">
<strong style="font-size:14px;color:#111827;">
${escapeHtml(link.name || '')}
</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}"; font-weight: 600; margin:3px 0;>${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#4b5563">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}

</section>

` : ''}

${hasAchievements() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Honors & Awards
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.achievements
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasLanguage() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Languages
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => {

          const levelMap = {
            basic: 40,
            intermediate: 65,
            advanced: 85,
            fluent: 90,
            native: 100
          };

          let level = lang.level;

          if (typeof level === "string") {
            const normalized = level.trim().toLowerCase();
            if (levelMap[normalized] !== undefined) level = levelMap[normalized];
            else if (!isNaN(level)) level = Number(level);
            else level = 70;
          }

          if (typeof level !== "number") level = 70;
          level = Math.max(0, Math.min(level, 100));

          return `
<div>
<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>
<span style="color:#6b7280"></span>
</div>

<div style="
height:6px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">
<div style="
height:100%;
width:${level}%;
background:${accentColor};
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}

</div>

</section>

` : ''}

${hasInterest() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Interests
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.interests
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `
<div style="margin-bottom:18px">
<strong style="font-size:15px;color:#0f172a">
${escapeHtml(ref.name)}
</strong>
<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>
${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

</main>
</div>
`;
}

function renderModernEdgeATS() {

  let accentColor = "#2563eb";

  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  const p = photoHtml();
  const selectedTemplate = data.template;




  /* EXTRACT ACCENT COLOR FROM GRADIENT */

  const match = asideGradient.match(/#([0-9a-fA-F]{6})/g);

  if (match && match.length >= 2) {
    accentColor = match[1];
  }


  const personalFields = [
    { key: "phone", icon: ICONS.phone_w },
    { key: "email", icon: ICONS.email_w },
    { key: "location", icon: ICONS.location_w },
    { key: "website", icon: ICONS.website_w },
    { key: "linkedin", icon: ICONS.linkedin_w },
    { key: "dob", icon: ICONS.calendar_w },
    { key: "gender", icon: ICONS.user_w },
    { key: "race", icon: ICONS.group_w },
    { key: "driversLicence", icon: ICONS.car_w }
  ];

  return `
<div class="resume_Template_1" style="
display:block;
width:100%;
">


<aside style="
background:${asideGradient};
color:#ffffff;
padding:34px 26px;
display:flex;
flex-direction:column;
gap:20px;
">

<div style="text-align:center;" class="overflow">
<h1 style="
font-size:35px;
font-weight:700;
line-height:1.2;
margin-bottom:6px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<div style="font-size:20px;opacity:.9;">
${escapeHtml(data.personal.title || '')}
</div>
</div>

<div style="
display:grid;
grid-template-columns:3fr auto;
">
<div>

<ul style="
list-style:none;
padding:0;
margin:0;
display:grid;
grid-template-columns:1fr 1fr;
gap:6px 12px;
">

${personalFields
      .filter(f => data.personal[f.key])
      .map(f => `
<li class="overflow" style="display:flex;align-items:center;gap:8px;">
${icon(f.icon)}
${escapeHtml(data.personal[f.key])}
</li>
`).join('')}

</ul>

</div>

<div style="
  margin-left:16px;
  width:100px;
  height:100px;
  flex-shrink:0;
  border-radius:50%; /* modern rounded corners */
  overflow:hidden;
  border: 3px solid #e4e3f1; /* stylish modern border color */
  box-shadow: 0 4px 12px rgba(0,0,0,0.1); /* subtle shadow for depth */
">
  ${p}
</div>
</div>
</aside>
<main style="padding-top:0">

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Professional Summary
</h2>

<p style="color:#374151;">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280; margin-top:10px">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets?.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:5px;color: #374151; margin-left: 18px">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
margin-top: 28px;
">
Education
</h2>

${data.education.map(edu => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(edu.degree || '')}
</strong>

<span style="font-size:12px;color:#6b7280">
${[
      edu.start,
      edu.end,
      edu.startYear,
      edu.endYear,
      edu.year
    ].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription?.trim() ? `
<div class="overflow" style="
color:#4b5563;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `

<section class="overflow" style="margin-bottom:34px; margin-top: 28px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Skills
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => {

          const levelMap = {
            basic: 40,
            intermediate: 65,
            advanced: 85,
            expert: 90,
            native: 100
          };

          let level = skill.level;

          if (typeof level === "string") {
            const normalized = level.trim().toLowerCase();
            if (levelMap[normalized] !== undefined) {
              level = levelMap[normalized];
            }
            else if (!isNaN(level)) {
              level = Number(level);
            }
            else {
              level = 70;
            }
          }
          if (typeof level !== "number") level = 70;
          level = Math.max(0, Math.min(level, 100));
          const dots = Math.ceil(level / 20);
          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>
`).join('')}
</div>
</div>
`;
}).join('')}
</div>
</section>

` : ''}

${hasCertificate() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Certificates
</h2>

${data.certificates.map(cert => `
<div style="margin-bottom:12px">
<span style="display: flex; justify-content: space-between;">
<strong style="font-size:14px;color:#111827">
${escapeHtml(cert.name || '')}
</strong>
${cert.date ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(cert.date)}</div>` : ''}
</span>

${cert.issuer ? `<div style="font-size:13px;color:#374151; margin:3px 0; font-weight: 600;">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#4b5563">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Projects
</h2>

${data.portfolio.map(link => `
<div style="margin-top:12px;">
<strong style="font-size:14px;color:#111827;">
${escapeHtml(link.name || '')}
</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}"; font-weight: 600; margin:3px 0;>${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#4b5563">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}

</section>

` : ''}

${hasAchievements() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Honors & Awards
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.achievements
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasLanguage() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Languages
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => {

          const levelMap = {
            basic: 1,
            intermediate: 2,
            advanced: 3,
            fluent: 4,
            native: 5
          };

          let dots = 3;

          if (typeof lang.level === "string") {
            const normalized = lang.level.trim().toLowerCase();

            if (levelMap[normalized] !== undefined) {
              dots = levelMap[normalized];
            }
          }

          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>

`).join('')}
</div>
</div>
`;
        }).join('')}
</div>
</section>
` : ''}

${hasInterest() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Interests
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.interests
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `
<div style="margin-bottom:18px">
<strong style="font-size:15px;color:#0f172a">
${escapeHtml(ref.name)}
</strong>
<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>
${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

</main>
</div>
`;
}

function renderATS() {

  const p = photoHtml();

  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);

  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  return `

<div class="resume_Template_1" style="
font-family:'Inter', Arial, Helvetica, sans-serif;
font-size:15px;
line-height:1.75;
color:#0f172a;
max-width:820px;
margin:auto;
padding:50px;
max-height:1122px;
overflow:hidden;
">

<!-- HEADER -->

<aside style="
margin-bottom:36px;
padding-bottom:18px;
border-bottom:3px solid ${accentColor};
">

<h1 style="
font-size:34px;
font-weight:800;
letter-spacing:.6px;
margin-bottom:4px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:17px;
color:${accentColor};
font-weight:600;
margin:6px 0;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
font-size:13px;
margin-top:10px;
line-height:1.8;
color:#475569;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? ` ${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? ` ${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? ` ${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? ` ${escapeHtml(data.personal.linkedin)} • ` : ''}
${data.personal.dob ? `Date of birth: ${escapeHtml(data.personal.dob)} • ` : ''}
${data.personal.race ? `Race: ${escapeHtml(data.personal.race)} • ` : ''}
${data.personal.driversLicence ? `Drivers Licence: ${escapeHtml(data.personal.driversLicence)} • ` : ''}
${data.personal.maritalStatus ? `Marital Status: ${escapeHtml(data.personal.maritalStatus)} • ` : ''}
${data.personal.religion ? `Religion: ${escapeHtml(data.personal.religion)}` : ''}

</p>

</aside>

<main>

${data.summary && data.summary.trim() ? `
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:14px;
">
Professional Summary
</h2>
<p style="color:#64748b;">
${escapeHtml(data.summary)}
</p>
` : ''}

${hasExperience() ? `
<h2 class="overflow" style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
margin-top:32px;
">
Professional Experience
</h2>
${data.experience.map(exp => `
<strong style="font-size:16px;font-weight:700; margin-top:10px;">
${escapeHtml(exp.role)}
</strong>
<div class="overflow" style="font-size:13px;color:#475569;margin-top:4px;line-height:1.6">
<div>
<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>
</div>
${[exp.start, exp.end].some(d => d && d.trim()) ? `
<div style="margin-top:2px">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</div>
` : ''}
</div>
${exp.bullets && exp.bullets.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:6px; padding-left:18px; color:#64748b;">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}
`).join('')}
` : ''}

${hasEducation() ? `
<h2 class="overflow" style="
margin-top:32px;
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Education
</h2>
${data.education.map(edu => `
<div class="overflow">
<strong style="font-size:16px; margin-top:10px">
${escapeHtml(edu.degree)}
</strong>
<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>
${edu.year ? `
<div style="font-size:13px;color:#64748b;margin-top:2px">
${escapeHtml(edu.year)}
</div>
</div>
` : ''}
${edu.discription?.trim() ? `
<div class="overflow" style="
color:#64748b;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `
<section class="overflow" style="margin-bottom:32px; margin-top:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Skills
</h2>
<ul style="padding-left:18px;line-height:1.7">
${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
<li style="margin-bottom:6px">
${escapeHtml(skill.name)}
</li>
`).join('')}
</ul>
</section>
` : ''}

${hasCertificate() ? `
<section class="overflow" style="margin-bottom:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Certificates
</h2>
${data.certificates.map(cert => `
<div style="margin-bottom:10px">
<strong>${escapeHtml(cert.name || '')}</strong>
${cert.date ? `<div style="font-size:13px;color:#64748b">${escapeHtml(cert.date)}</div>` : ''}
${cert.issuer ? `<div style="color:#475569">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#64748b">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `
<section class="overflow" style="margin-bottom:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Projects
</h2>
${data.portfolio.map(link => `
<div style="margin-bottom:10px">
<strong>${escapeHtml(link.name || '')}</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}">${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#64748b">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasLanguage() ? `
<section class="overflow" style="margin-bottom:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Languages
</h2>
<ul style="padding-left:18px;line-height:1.7">
${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => `
<li style="margin-bottom:6px">
${escapeHtml(lang.name)}
${lang.level ? ` — ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}
</ul>
</section>
` : ''}

${hasAchievements() ? `
<section class="overflow" style="margin-bottom:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Honors & Awards
</h2>
${data.achievements.map(a => `
<div style="color:#64748b;margin-bottom:6px">• ${escapeHtml(a)}</div>
`).join('')}
</section>
` : ''}

${hasInterest() ? `
<section class="overflow" style="margin-bottom:32px">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
Interests
</h2>
<div style="color:#64748b;">
${data.interests.map(i => `<span>${escapeHtml(i)}</span>`).join(', ')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow">
<h2 style="
font-size:14px;
font-weight:800;
text-transform:uppercase;
letter-spacing:1.5px;
color:#0f172a;
padding-left:10px;
border-left:4px solid ${accentColor};
margin-bottom:16px;
">
References
</h2>
${data.references.map(ref => `
<div style="margin-bottom:18px">
<strong style="font-size:16px">
${escapeHtml(ref.name)}
</strong>
<div style="color:#475569;margin-top:3px">
${escapeHtml(ref.campany || '')}
</div>
${ref.phone ? `<div style="margin-top:2px">${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div style="margin-top:2px">${escapeHtml(ref.email)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

</main>
</div>
`;
}

function renderApexATS() {

  const p = photoHtml();

  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);
  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  return `
<div class="resume_Template_1" style="
font-family:'Segoe UI', Arial, Helvetica, sans-serif;
font-size:14px;
line-height:1.75;
color:#1f2937;
max-width:860px;
margin:auto;
background:#ffffff;
padding:48px 50px;
">

<!-- HEADER -->

<aside style="
margin-bottom:36px;
padding-bottom:22px;
border-bottom:3px solid ${accentColor};
">

<h1 style="
font-size:34px;
font-weight:800;
letter-spacing:.4px;
color:#0f172a;
margin:0 0 6px 0;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:18px;
color:${accentColor};
font-weight:600;
margin-bottom:10px;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
font-size:14px;
color:#4b5563;
line-height:1.8;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? ` ${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? ` ${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? ` ${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? ` ${escapeHtml(data.personal.linkedin)} • ` : ''}
${data.personal.dob ? `Date of birth: ${escapeHtml(data.personal.dob)} • ` : ''}
${data.personal.race ? `Race: ${escapeHtml(data.personal.race)} • ` : ''}
${data.personal.driversLicence ? `Drivers Licence: ${escapeHtml(data.personal.driversLicence)} • ` : ''}
${data.personal.maritalStatus ? `Marital Status: ${escapeHtml(data.personal.maritalStatus)} • ` : ''}
${data.personal.religion ? `Religion: ${escapeHtml(data.personal.religion)}` : ''}

</p>

</aside>

<main style="padding-top:0">

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Professional Summary
</h2>

<p style="color:#374151;">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280; margin-top:10px">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets?.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:5px;color: #374151; margin-left: 18px">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
margin-top: 28px;
">
Education
</h2>

${data.education.map(edu => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(edu.degree || '')}
</strong>

<span style="font-size:12px;color:#6b7280">
${[
      edu.start,
      edu.end,
      edu.startYear,
      edu.endYear,
      edu.year
    ].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription?.trim() ? `
<div class="overflow" style="
color:#4b5563;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `

<section class="overflow" style="margin-bottom:34px; margin-top:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Skills
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.skills.map(skill => {

      const levelMap = {
        basic: 40,
        intermediate: 65,
        advanced: 85,
        expert: 90,
        native: 100
      };

      let level = skill.level;

      if (typeof level === "string") {
        const normalized = level.trim().toLowerCase();
        if (levelMap[normalized] !== undefined) level = levelMap[normalized];
        else if (!isNaN(level)) level = Number(level);
        else level = 70;
      }

      if (typeof level !== "number") level = 70;
      level = Math.max(0, Math.min(level, 100));

      return `
<div>
<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>
<span style="color:#6b7280"></span>
</div>

<div style="
height:6px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">
<div style="
height:100%;
width:${level}%;
background:${accentColor};
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}

</div>

</section>

` : ''}

${hasCertificate() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Certificates
</h2>

${data.certificates.map(cert => `
<div style="margin-bottom:12px">
<span style="display: flex; justify-content: space-between;">
<strong style="font-size:14px;color:#111827">
${escapeHtml(cert.name || '')}
</strong>
${cert.date ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(cert.date)}</div>` : ''}
</span>

${cert.issuer ? `<div style="font-size:13px;color:#374151; margin:3px 0; font-weight: 600;">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#4b5563">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Projects
</h2>

${data.portfolio.map(link => `
<div style="margin-top:12px;">
<strong style="font-size:14px;color:#111827;">
${escapeHtml(link.name || '')}
</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}"; font-weight: 600; margin:3px 0;>${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#4b5563">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}

</section>

` : ''}

${hasAchievements() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Honors & Awards
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.achievements
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasLanguage() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Languages
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => {

          const levelMap = {
            basic: 40,
            intermediate: 65,
            advanced: 85,
            fluent: 90,
            native: 100
          };

          let level = lang.level;

          if (typeof level === "string") {
            const normalized = level.trim().toLowerCase();
            if (levelMap[normalized] !== undefined) level = levelMap[normalized];
            else if (!isNaN(level)) level = Number(level);
            else level = 70;
          }

          if (typeof level !== "number") level = 70;
          level = Math.max(0, Math.min(level, 100));

          return `
<div>
<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>
<span style="color:#6b7280"></span>
</div>

<div style="
height:6px;
background:#e5e7eb;
border-radius:4px;
overflow:hidden;
">
<div style="
height:100%;
width:${level}%;
background:${accentColor};
border-radius:4px;
"></div>
</div>
</div>
`;
}).join('')}

</div>

</section>

` : ''}

${hasInterest() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Interests
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.interests
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `
<div style="margin-bottom:18px">
<strong style="font-size:15px;color:#0f172a">
${escapeHtml(ref.name)}
</strong>
<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>
${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

</main>
</div>
`;
}

function renderVertexATS() {
  const p = photoHtml();

  /* GET SAVED GRADIENT */
  let asideGradient =
    localStorage.getItem("resumeAsideGradient") ||
    "linear-gradient(180deg,#1e3a8a,#2563eb,#1d4ed8)";

  /* EXTRACT ACCENT COLOR */
  let accentColor = "#2563eb";
  const colors = asideGradient.match(/#[0-9a-fA-F]{6}/g);
  if (colors && colors.length) {
    accentColor = colors[Math.floor(colors.length / 2)];
  }

  return `
<div class="resume_Template_1" style="
font-family:'Segoe UI', Arial, Helvetica, sans-serif;
font-size:14px;
line-height:1.75;
color:#1f2937;
max-width:860px;
margin:auto;
background:#ffffff;
padding:48px 50px;
">

<!-- HEADER -->

<aside style="
margin-bottom:36px;
padding-bottom:22px;
border-bottom:3px solid ${accentColor};
">

<h1 style="
font-size:34px;
font-weight:800;
letter-spacing:.4px;
color:#0f172a;
margin:0 0 6px 0;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
font-size:18px;
color:${accentColor};
font-weight:600;
margin-bottom:10px;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
font-size:14px;
color:#4b5563;
line-height:1.8;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? ` ${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? ` ${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? ` ${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? ` ${escapeHtml(data.personal.linkedin)} • ` : ''}
${data.personal.dob ? `Date of birth: ${escapeHtml(data.personal.dob)} • ` : ''}
${data.personal.race ? `Race: ${escapeHtml(data.personal.race)} • ` : ''}
${data.personal.driversLicence ? `Drivers Licence: ${escapeHtml(data.personal.driversLicence)} • ` : ''}
${data.personal.maritalStatus ? `Marital Status: ${escapeHtml(data.personal.maritalStatus)} • ` : ''}
${data.personal.religion ? `Religion: ${escapeHtml(data.personal.religion)}` : ''}

</p>

</aside>

<main style="padding-top:0">

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Professional Summary
</h2>

<p style="color:#374151;">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280; margin-top:10px">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
margin-top:3px;
margin-bottom: 8px;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>${escapeHtml(exp.campany || '')} </span>
<span style="font-size: 12px; color: #6b7280; font-weight:500;">${escapeHtml(exp.location || '')}</span>
</div>

${exp.bullets?.length ? `
${exp.bullets.map(b => `
<li class="overflow" style="margin-bottom:5px;color: #374151; margin-left: 18px">
${escapeHtml(b)}
</li>
`).join('')}
` : ''}

`).join('')}

` : ''}

${hasEducation() ? `

<h2 class="overflow" style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.2px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:6px;
margin-bottom:14px;
margin-top: 28px;
">
Education
</h2>

${data.education.map(edu => `
<div class="overflow" style="
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827; margin-top:10px">
${escapeHtml(edu.degree || '')}
</strong>

<span style="font-size:12px;color:#6b7280">
${[
      edu.start,
      edu.end,
      edu.startYear,
      edu.endYear,
      edu.year
    ].filter(Boolean).join(' - ')}
</span>

</div>

<div class="overflow" style="
font-size:13px;
color:#374151;
font-weight:600;
display:flex;
justify-content:space-between;
flex-wrap:wrap;
">
<span>$${escapeHtml(edu.school || '')} </span>
<span style="font-size:13px; color:#6b7280;">${escapeHtml(edu.location || '')}</span>
</div>

${edu.discription?.trim() ? `
<div class="overflow" style="
color:#4b5563;
margin-top:6px;
line-height:1.5;margin-left: 18px;
">
${escapeHtml(edu.discription)}
</div>
` : ''}
`).join('')}
` : ''}

${hasSkills() ? `

<section class="overflow" style="margin-bottom:34px; margin-top: 28px;">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Skills
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => {

          const levelMap = {
            basic: 40,
            intermediate: 65,
            advanced: 85,
            expert: 90,
            native: 100
          };

          let level = skill.level;

          if (typeof level === "string") {
            const normalized = level.trim().toLowerCase();
            if (levelMap[normalized] !== undefined) {
              level = levelMap[normalized];
            }
            else if (!isNaN(level)) {
              level = Number(level);
            }
            else {
              level = 70;
            }
          }
          if (typeof level !== "number") level = 70;
          level = Math.max(0, Math.min(level, 100));
          const dots = Math.ceil(level / 20);
          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>
`).join('')}
</div>
</div>
`;
}).join('')}
</div>
</section>

` : ''}

${hasCertificate() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Certificates
</h2>

${data.certificates.map(cert => `
<div style="margin-bottom:12px">
<span style="display: flex; justify-content: space-between;">
<strong style="font-size:14px;color:#111827">
${escapeHtml(cert.name || '')}
</strong>
${cert.date ? `<div style="font-size:12px;color:#6b7280">${escapeHtml(cert.date)}</div>` : ''}
</span>

${cert.issuer ? `<div style="font-size:13px;color:#374151; margin:3px 0; font-weight: 600;">${escapeHtml(cert.issuer)}</div>` : ''}
${cert.description ? `<div style="color:#4b5563">${escapeHtml(cert.description)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

${hasPortfolio() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Projects
</h2>

${data.portfolio.map(link => `
<div style="margin-top:12px;">
<strong style="font-size:14px;color:#111827;">
${escapeHtml(link.name || '')}
</strong>
${link.url ? `<div style="font-size:13px;color:${accentColor}"; font-weight: 600; margin:3px 0;>${escapeHtml(link.url)}</div>` : ''}
${link.description ? `<div style="color:#4b5563">${escapeHtml(link.description)}</div>` : ''}
</div>
`).join('')}

</section>

` : ''}

${hasAchievements() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Honors & Awards
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.achievements
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasLanguage() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Languages
</h2>

<div style="
display:grid;
grid-template-columns:1fr 1fr;
gap:14px 28px;
">

${data.languages
        .filter(lang => lang.name?.trim())
        .map(lang => {

          const levelMap = {
            basic: 1,
            intermediate: 2,
            advanced: 3,
            fluent: 4,
            native: 5
          };

          let dots = 3;

          if (typeof lang.level === "string") {
            const normalized = lang.level.trim().toLowerCase();

            if (levelMap[normalized] !== undefined) {
              dots = levelMap[normalized];
            }
          }

          return `

<div style="
display:flex;
justify-content:space-between;
align-items:center;
font-size:13px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>

<div style="display:flex;gap:6px">

${[1, 2, 3, 4, 5].map(i => `

<div style="
width:8px;
height:8px;
border-radius:50%;
background:${i <= dots ? accentColor : '#e5e7eb'};
"></div>

`).join('')}
</div>
</div>
`;
        }).join('')}
</div>
</section>
` : ''}

${hasInterest() ? `

<section class="overflow" style="margin-bottom:34px">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
Interests
</h2>

<div style="
display:flex;
flex-wrap:wrap;
gap:10px 16px;
font-size:14px;
color:#374151;
">

${data.interests
        .filter(i => i?.trim())
        .map(i => `
<div style="
background:#f1f5f9;
border:1px solid #e5e7eb;
padding:6px 12px;
border-radius:16px;
font-size:13px;
">
${escapeHtml(i)}
</div>
`).join('')}
</div>
</section>
` : ''}

${hasReferences() ? `
<section class="overflow">

<h2 style="
font-size:14px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `
<div style="margin-bottom:18px">
<strong style="font-size:15px;color:#0f172a">
${escapeHtml(ref.name)}
</strong>
<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>
${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}
</div>
`).join('')}
</section>
` : ''}

</main>
</div>
`;
}

// --- Sanitizer ----------------------------------------------------------
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; });
}

// --- Highlight matched keywords safely ---------------------------------
function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightKeywordsInPreview(keywords) {
  if (!Array.isArray(keywords) || !keywords.length) return;
  const root = refs.resumePreview;
  const safeParts = keywords.map(k => escapeRegExp(k)).filter(Boolean).slice(0, 200);
  if (!safeParts.length) return;
  const pattern = '\\b(' + safeParts.join('|') + ')\\b';
  let regex;
  try {
    regex = new RegExp(pattern, 'gi');
  } catch (err) {
    console.warn('Failed to construct highlight RegExp:', err);
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach(textNode => {
    const parent = textNode.parentNode;
    if (!parent) return;
    const text = textNode.nodeValue;
    if (!text || !regex.test(text)) return;
    regex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = regex.lastIndex;
      if (matchStart > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, matchStart)));
      }
      const m = document.createElement('mark');
      m.textContent = text.slice(matchStart, matchEnd);
      frag.appendChild(m);
      lastIndex = matchEnd;
      if (matchEnd === matchStart) regex.lastIndex++;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    parent.replaceChild(frag, textNode);
  });
}

// --- Persistence --------------------------------------------------------
function save() { try { localStorage.setItem('resume:data', JSON.stringify(data)); } catch (e) { /* ignore */ } }
function load() { try { const raw = localStorage.getItem('resume:data'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

// --- Start ----------------------------------------------------------------
init();

/* OPEN PREVIEW */
previewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // show overlay
    previewOverlay.classList.add('open');
    document.querySelector('.download-btn-premium').classList.add('open');
    document.querySelector('.closeBtn').classList.add('open');
    setTimeout(() => {
      previewOverlay.classList.add('opacity');
      syncPaletteButton()
    }, 450); // MUST match CSS transition

    // hide UI
    document.body.classList.add('overlay-open');
    navbar?.classList.add('hidden-ui');
  });
});

/* CLOSE PREVIEW (EDIT MODE) */
editResumeBtn.addEventListener('click', () => {
  // start overlay exit animation
  previewOverlay.classList.remove('opacity');
  setTimeout(() => {
    previewOverlay.classList.remove('open');
    document.querySelector('.closeBtn').classList.remove('open');
    document.querySelector('.download-btn-premium').classList.remove('open');
    zoomControl = false;
    scalePreview()
  }, 450); // MUST match CSS transition
  setTimeout(() => {
    syncPaletteButton()
  }, 500);
});

function closePreview() {
  previewOverlay.classList.remove("opacity");
  document.querySelector('.download-btn-premium').classList.remove('open');


  setTimeout(() => {
    previewOverlay.classList.remove("open");
    document.querySelector(".closeBtn")?.classList.remove("open");
    zoomControl = false;
    scalePreview();
    syncPaletteButton()
  }, 450); // must match CSS transition
}

// Close when clicking outside the resume content
previewOverlay.addEventListener("click", (e) => {
  if (e.target === previewOverlay) {
    closePreview();
  }
});

// Close with ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePreview();
  }
});


profilePicPreview.forEach(profile => profile.addEventListener('click', () => {
  profilePhotoUpload.classList.remove('hidden')
  setTimeout(() => {
    profilePhotoUpload.classList.add('opacity')
  }, 450);
}))

closeProfilePhotoUpload.addEventListener('click', () => {
  profilePhotoUpload.classList.remove('opacity')
  setTimeout(() => {
    profilePhotoUpload.classList.add('hidden')
  }, 450);
})

document.querySelector('.saveImage').addEventListener('click', () => {
  profilePhotoUpload.classList.remove('opacity')
  setTimeout(() => {
    profilePhotoUpload.classList.add('hidden')
  }, 450);
})

function scalePreview() {
  const stage = document.querySelector('.preview-wrap');
  const preview = document.querySelector('#resumePreview');
  if (!stage || !preview) return;

  const w = window.innerWidth;
  let scale;

  let BASE_WIDTH = 1499;   // real preview width
  let START_POINT = 1000; // where scale = 0.63
  let START_SCALE = 0.55;
  previewOverlay.classList.remove('hidden');
  previewOverlay.classList.remove('opacity');

  if (window.innerWidth <= 900) {
    BASE_WIDTH = 794;      // real resume width
    START_POINT = 510;     // where scale = 0.63
    START_SCALE = 0.63;
    previewOverlay.classList.add('hidden');
    previewOverlay.classList.add('opacity');
  }

  if (window.innerWidth >= 901 && zoomControl === true) {
    BASE_WIDTH = 794;      // real resume width
    START_POINT = 510;     // where scale = 0.63
    START_SCALE = 0.63;
    previewOverlay.classList.add('hidden');
    previewOverlay.classList.add('opacity');
  }

  if (w >= 1500) {
    scale = 1
  } else if (w <= BASE_WIDTH) {
    // smooth proportional scaling from phones up to tablets
    scale = (w / START_POINT) * START_SCALE;
  }

  else {
    // full size on large screens
    scale = 1;
  }
  // 🔒 never let it get too tiny
  scale = Math.max(scale, 0.4);

  preview.style.transform = `scale(${scale})`;
  renderPreview()
}

window.addEventListener('resize', scalePreview);
scalePreview();

resumePreview.addEventListener('click', () => {
  document.querySelector('.preview-wrap').classList.add('open');
  document.querySelector('.download-btn-premium').classList.add('open');
  document.querySelector('.closeBtn').classList.add('open');
  zoomControl = true;
  scalePreview();
})

function setTemplateCss() {
  const ATSheader = document.querySelector('.ATS-header');
  const proSummary = document.querySelector('.proSummary')
  const proSummaryMargin = ATSheader.scrollHeight
  proSummary.style.marginTop = `${proSummaryMargin - 30}px`
}

function cleanAllSections(root) {

  const main = root.querySelector('.content_Template_1');
  if (!main) return;

  const sections = main.querySelectorAll('.section_Template_1');

  sections.forEach(section => {

    /* =========================
       1️⃣ CLEAN TIMELINE ITEMS
    ========================== */

    section.querySelectorAll('.timeline_Template_1-item').forEach(item => {

      const title = item.querySelector('h3')?.textContent.trim();
      const sub = item.querySelector('.item-sub_Template_1')?.textContent.trim();
      const date = item.querySelector('.date')?.textContent.trim();

      const bullets = Array.from(
        item.querySelectorAll('.item-desc_Template_1 li')
      ).filter(li => li.textContent.trim() !== '');

      // Remove empty bullets
      item.querySelectorAll('.item-desc_Template_1 li').forEach(li => {
        if (!li.textContent.trim()) li.remove();
      });

      const hasContent =
        title ||
        sub ||
        date ||
        bullets.length;

      if (!hasContent) {
        item.remove();
      }
    });

    /* =========================
       2️⃣ REMOVE EMPTY TIMELINES
    ========================== */

    section.querySelectorAll('.timeline_Template_1').forEach(timeline => {
      if (!timeline.querySelector('.timeline_Template_1-item')) {
        timeline.remove();
      }
    });

    /* =========================
       3️⃣ CLEAN SKILLS / INTERESTS
    ========================== */

    section.querySelectorAll('.skills-list_Template_1').forEach(list => {

      list.querySelectorAll('li').forEach(li => {
        if (!li.textContent.trim()) li.remove();
      });

      if (!list.querySelector('li')) {
        list.remove();
      }
    });

    /* =========================
       4️⃣ CLEAN REFERENCES
    ========================== */

    section.querySelectorAll('.ref-card_Template_1').forEach(card => {

      const name = card.querySelector('h4')?.textContent.trim();

      const lines = Array.from(
        card.querySelectorAll('.ref-line')
      ).filter(p => p.textContent.trim() !== '');

      // Remove empty lines
      card.querySelectorAll('.ref-line').forEach(p => {
        if (!p.textContent.trim()) p.remove();
      });

      if (!name && !lines.length) {
        card.remove();
      }
    });

    // Remove empty ref wrappers
    section.querySelectorAll('.ref-card-wrapper').forEach(wrapper => {
      if (!wrapper.querySelector('.ref-card_Template_1')) {
        wrapper.remove();
      }
    });

    /* =========================
       5️⃣ FINAL SECTION CHECK
    ========================== */

    const hasTimeline = section.querySelector('.timeline_Template_1');
    const hasSkills = section.querySelector('.skills-list_Template_1');
    const hasRefs = section.querySelector('.ref-card_Template_1');

    if (!hasTimeline && !hasSkills && !hasRefs) {
      section.remove();
    }
  });
}

function validateInterestAdd() {
  const interestLength = data.interests.length;

  // If no interests → allow adding
  if (!interestLength) {
    refs.addinterestBtn.disabled = false;
    return;
  }

  // Get first interest
  const firstInterest = data.interests[0];

  const empty = !firstInterest || firstInterest.trim() === "";

  refs.addinterestBtn.disabled = empty;
}

function validateAchievementAdd() {
  const length = data.achievements.length;

  if (!length) {
    refs.addAchievementBtn.disabled = false;
    return;
  }

  const first = data.achievements[0];
  const empty = !first || first.trim() === "";

  refs.addAchievementBtn.disabled = empty;
}

function validateLanguageAdd() {
  const langLength = data.languages.length;

  // If no languages → allow adding
  if (!langLength) {
    addLanguageBtn.disabled = false;
    return;
  }

  const lastLanguage = data.languages[0];

  const empty =
    !lastLanguage.name ||
    lastLanguage.name.trim() === "";

  addLanguageBtn.disabled = empty;
}


function validateSkillAdd() {
  const skillLength = data.skills.length;

  // If no skills → allow adding
  if (!skillLength) {
    refs.addSkillBtn.disabled = false;
    return;
  }

  // Get last skill
  const lastSkill = data.skills[0];

  const nameEmpty = !lastSkill.name || lastSkill.name.trim() === "";

  // Disable add button if last skill name is empty
  refs.addSkillBtn.disabled = nameEmpty;
}

function validateCertificateAdd() {
  if (!refs.addCertificateBtn) return;

  const list = data.certificates || [];

  // ✅ allow if empty
  if (list.length === 0) {
    refs.addCertificateBtn.disabled = false;
    refs.addCertificateBtn.classList.remove('disabled');
    return;
  }

  // ❌ check only FIRST item
  const first = list[0];
  const isEmpty = !first.name || first.name.trim() === "";

  refs.addCertificateBtn.disabled = isEmpty;

  // styling
  refs.addCertificateBtn.classList.toggle('disabled', isEmpty);
  console.log(list.length)
}

function validateProjectsAdd() {
  console.log('validatevalidateProjectsAdd()')
  if (!refs.addPortfolioBtn) return;

  const list = data.portfolio || [];

  // ✅ allow if empty
  if (list.length === 0) {
    refs.addPortfolioBtn.disabled = false;
    refs.addPortfolioBtn.classList.remove('disabled');
    return;
  }
  // ❌ check only FIRST item
  const first = list[0];
  const isEmpty = !first.name || first.name.trim() === "";

  refs.addPortfolioBtn.disabled = isEmpty;

  // styling
  refs.addPortfolioBtn.classList.toggle('disabled', isEmpty);

  console.log(list.length);
} 

function validateEducationAdd() {
  const eduLength = data.education.length;

  // If no education → allow adding
  if (!eduLength) {
    refs.addEduBtn.disabled = false;
    return;
  }

  // Get first education
  const firstEdu = data.education[0];

  const degreeEmpty = !firstEdu.degree || firstEdu.degree.trim() === "";
  const schoolEmpty = !firstEdu.school || firstEdu.school.trim() === "";

  refs.addEduBtn.disabled = degreeEmpty || schoolEmpty;
}

function validateReferenceAdd() {
  const refLength = data.references.length;

  // If no references → allow adding
  if (!refLength) {
    refs.addRefBtn.disabled = false;
    return;
  }

  // Get first reference
  const firstRef = data.references[0];

  const nameEmpty = !firstRef.name || firstRef.name.trim() === "";
  const campanyEmpty = !firstRef.campany || firstRef.campany.trim() === "";

  refs.addRefBtn.disabled = nameEmpty || campanyEmpty;
}

function validateExperienceAdd() {
  const expLength = data.experience.length;

  // If no experience → allow adding
  if (!expLength) {
    refs.addExpBtn.disabled = false;
    return;
  }

  // Get first experience
  const firstExp = data.experience[0];

  const roleEmpty = !firstExp.role || firstExp.role.trim() === "";
  const campanyEmpty = !firstExp.campany || firstExp.campany.trim() === "";

  refs.addExpBtn.disabled = roleEmpty || campanyEmpty;
}

function showToast(message, type = 'info', duration = 5500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <span class="toast-icon">
      ${type === 'error' ? '⛔' : type === 'warn' ? '⚠️' : 'ℹ️'}
    </span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toast-out 0.25s ease forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

document.querySelectorAll('.layout-preview-btn').forEach(button => button.addEventListener('click', () => {
  openLayoutPreview()
}))

document.querySelector('#close-preview').addEventListener('click', () => {
  closeLayoutPreview()
})

document.querySelectorAll('.use-template-btn').forEach(button => button.addEventListener('click', (e) => {
  selectTemplate(`${e.target.id}`)
}))

function openLayoutPreview() {
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeLayoutPreview() {
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeLayoutPreview();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLayoutPreview();
});

let currentTemplate = null

document.querySelectorAll(".template-card").forEach(card => {

  card.addEventListener("click", () => {

    currentTemplate = card.dataset.template

    document
      .querySelectorAll(".template-card")
      .forEach(c => c.classList.remove("selected"))

    card.classList.add("selected")

  })

})



document.querySelectorAll(".filter").forEach(btn => {

  btn.addEventListener("click", () => {

    document
      .querySelectorAll(".filter")
      .forEach(b => b.classList.remove("active"))

    btn.classList.add("active")

    const filter = btn.dataset.filter

    document
      .querySelectorAll(".template-group")
      .forEach(group => {

        if (filter === "all") {
          group.style.display = "block"
        }
        else {
          group.style.display =
            group.dataset.group === filter ? "block" : "none"
        }

      })

  })

})

function selectTemplate(template) {
  data.template = template
  refs.templateSelect.value = template
  renderPreview()
  closeLayoutPreview()
  bindProfileInputs()
  save()
}

function toggleFilterMenu() {
  const menu = document.getElementById("templateFilters")
  menu.classList.toggle("open")
}

document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"))
    btn.classList.add("active")
    const filter = btn.dataset.filter
    document.querySelectorAll(".template-group").forEach(group => {
      if (filter === "all" || group.dataset.group === filter) {
        group.style.display = "block"
      } else {
        group.style.display = "none"
      }
    })
  })

})

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    /* active state */
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"))
    button.classList.add("active")
    const filter = button.dataset.filter
    /* filter templates */
    document.querySelectorAll(".template-group").forEach(group => {
      if (filter === "all" || group.dataset.group === filter) {
        group.style.display = "block"
      } else {
        group.style.display = "none"
      }
    })
    /* CLOSE MOBIE FILTER MENU */
    const menu = document.getElementById("templateFilters")
    menu.classList.remove("open")
  })
})



const textarea = document.getElementById("summary");
textarea.addEventListener("keydown", () => {
  updateCounter()
})


/* extract accent color from gradient */


const match = asideGradient.match(/#([0-9a-fA-F]{6})/g);
if (match && match.length >= 2) {
  accentColor = match[1];
}



function applyAsideGradient() {
  const selectedTemplate = data.template;

  const asides =
    document.querySelectorAll("#resumePreview aside");

  asides.forEach(a => {

    a.style.transition = "background 0.4s ease";
    if (selectedTemplate === "vertexats" || selectedTemplate === "apexats" || selectedTemplate === "ats" || selectedTemplate === "midnight"  || selectedTemplate === "goldenexecutive" || selectedTemplate === "pinkcorporate" || selectedTemplate === "pinkcorporateII" ) {
      a.style.background = "white";
    } else {
      a.style.background = asideGradient;
    }
  });

}

/* COLOR CLICK */

document.querySelectorAll(".color-card")
  .forEach(card => {

    card.addEventListener("click", () => {

      asideGradient = card.dataset.color;

      localStorage.setItem(
        "resumeAsideGradient",
        asideGradient
      );

      /* update aside instantly */
      applyAsideGradient();

      /* re-render resume so headings + dots update */
      renderPreview();

    });
  });



/* PANEL TOGGLE */

const palette =
  document.getElementById("colorPalette");

const toggleColor =
  document.getElementById("paletteToggle");

toggleColor.addEventListener("click", () => {

  palette.classList.toggle("open");

});


function syncPaletteButton() {

  const palette = document.getElementById("colorPalette");
  const download = document.querySelector('.pdfBtn');

  if (window.innerWidth <= 420) {
    download.style.width = "130px";
    download.style.padding = "12px";
    document.querySelector('.fa-pdfBtn').style.fontSize = '14px';
  }

  if (window.innerWidth <= 900) {

    if (download.classList.contains("open")) {
      palette.classList.add("show");
    } else {
      palette.classList.remove("show");
    }

  } else {
    palette.classList.add("show");
  }

  setTimeout(() => {
    renderPreview();
  }, 50);
}

const closeExpOverlay = document.getElementById("closeExpOverlay");

// CLOSE BUTTON
closeExpOverlay.addEventListener("click", () => {
      expOverlay.classList.remove('active');
    activeExpId = null;

    renderLists();
});

const expOverlay = document.getElementById('expOverlay');

expOverlay.addEventListener('click', (e) => {
  if (e.target === expOverlay) {
    expOverlay.classList.remove('active');
    activeExpId = null;

    renderLists();
  }
});

/* APPLY AFTER TEMPLATE RENDER */

setTimeout(applyAsideGradient, 200);
document.addEventListener("DOMContentLoaded", updateCounter);
renderPreview();
save();
const eduOverlay = document.getElementById('eduOverlay');
const closeEduOverlay = document.getElementById('closeEduOverlay');
closeEduOverlay.addEventListener('click', () => {
  restoreEduBody();

  const card = document.querySelector(`.edu-card[data-edu="${activeEduId}"]`);
  const body = eduOverlay.querySelector('.edu-body');

  if (card && body) {
    card.appendChild(body); // 🔥 RETURN BACK
  }
  eduOverlay.classList.remove('active');
});

eduOverlay.addEventListener('click', (e) => {
  if (e.target === eduOverlay) {
    eduOverlay.classList.remove('active');
  }
})


function openOverlay(expId) {
  const expOverlay = document.getElementById('expOverlay');
  const expOverlayContent = expOverlay.querySelector('.exp-overlay-content');

  // 🔥 find fresh element from DOM
  const freshCard = document.querySelector(`.exp-card[data-exp="${expId}"]`);
  const body = freshCard.querySelector('.exp-body');

  expOverlayContent.innerHTML = '';
  expOverlayContent.appendChild(body);

  expOverlay.classList.add('active');
}

function restoreEduBody() {
  const currentBody = document.querySelector('#eduOverlay .edu-body');

  if (!currentBody) return;

  const parentId = currentBody.dataset.eduParent;
  const originalCard = document.querySelector(`.edu-card[data-edu="${parentId}"]`);

  if (originalCard) {
    originalCard.appendChild(currentBody);
  }
}

function toggleBodyScroll(lock) {
  document.body.style.overflow = lock ? 'hidden' : '';
}

/* Update your reusable function */
function createOverlay(triggerId, overlayId, closeBtnId) {
  const trigger = document.getElementById(triggerId);
  const overlay = document.getElementById(overlayId);
  const closeBtn = document.getElementById(closeBtnId);

  if (!trigger || !overlay || !closeBtn) return;

  trigger.addEventListener('click', () => {
    overlay.classList.add('active');
    toggleBodyScroll(true);
  });

  closeBtn.addEventListener('click', () => {
    overlay.classList.remove('active');
    toggleBodyScroll(false);
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      toggleBodyScroll(false);
    }
  });
}

/* INITIALIZE ALL OVERLAYS */
createOverlay('skillBlock', 'skillOverlay', 'closeSkillOverlay');
createOverlay('languagesBlock', 'languagesOverlay', 'closeLanguagesOverlay');
createOverlay('interestBlock', 'interestOverlay', 'closeInterestOverlay');
createOverlay('refSection', 'refOverlay', 'closeRefOverlay');
createOverlay('certificateBlock', 'certificateBlockOverlay', 'closecertificateBlockOverlay');
createOverlay('addPortfolio', 'portfolioOverlay', 'closeportfolioOverlay');
createOverlay('achievementBlock', 'achievementOverlay', 'closeAchievementOverlay');

const editProfileBtn = document.querySelectorAll('#editProfileBtn, .profile-section .left')

editProfileBtn.forEach(btn => btn.addEventListener('click', () => {
  personalDetailsOverlay.classList.add('active');
  toggleBodyScroll(true)
}))

const closeEditOverlay = document.querySelector('#closeEditOverlay');
closeEditOverlay.addEventListener('click', () => {
  personalDetailsOverlay.classList.remove('active');
  toggleBodyScroll(false);
})

personalDetailsOverlay.addEventListener('click', (e) => {
  if (e.target === personalDetailsOverlay) {
    personalDetailsOverlay.classList.remove('active');
    toggleBodyScroll(false);
  }
})

const container = document.getElementById("experienceContainer");

let draggedEl = null;
let placeholder = document.createElement("div");
placeholder.className = "item placeholder";

// 🔥 ensure draggable always
document.querySelectorAll(".drag-handle").forEach(el => {
  el.setAttribute("draggable", "true");
});

// =========================
// DRAG START
// =========================
container.addEventListener("dragstart", (e) => {
  if (!e.target.closest(".drag-handle")) return;

  draggedEl = e.target.closest(".item");
  if (!draggedEl) return;

  // 🔥 CRITICAL (fix random failure)
  e.dataTransfer.setData("text/plain", "drag");
  e.dataTransfer.effectAllowed = "move";

  draggedEl.classList.add("dragging");

  placeholder.style.height = draggedEl.offsetHeight + "px";

  draggedEl.after(placeholder);

  requestAnimationFrame(() => {
    draggedEl.style.display = "none";
  });
});

// =========================
// DRAG OVER
// =========================
container.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!draggedEl) return;

  const afterElement = getDragAfterElement(container, e.clientY);

  if (!afterElement || afterElement.parentNode !== container) {
    container.appendChild(placeholder);
  } else {
    container.insertBefore(placeholder, afterElement);
  }
});

// =========================
// DRAG END
// =========================
container.addEventListener("dragend", () => {
  if (!draggedEl) return;

  draggedEl.style.display = "";
  draggedEl.classList.remove("dragging");

  if (placeholder.parentNode === container) {
    container.insertBefore(draggedEl, placeholder);
  }
  placeholder.remove();
  // update order
  const newOrderIds = [
    ...container.querySelectorAll(".item")
  ].map(item =>
    item.querySelector(".exp-card")?.dataset.exp
  ).filter(Boolean);

  data.experience = newOrderIds.map(id =>
    data.experience.find(x => x.id === id)
  );

  save();
  renderLists();
  renderPreview();

  draggedEl = null;
});

// =========================
// POSITION LOGIC
// =========================
function getDragAfterElement(container, y) {
  const elements = [...container.children].filter(
    el => !el.classList.contains("dragging") && el !== placeholder
  );

  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  elements.forEach(child => {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = child;
    }
  });

  return closest;
}

let touchEduItem = null;
let touchEduStartY = 0;

refs.educationContainer.addEventListener("touchstart", (e) => {
  const item = e.target.closest(".item");
  if (!item) return;

  if (!e.target.closest(".drag-handle")) return;

  touchEduItem = item;
  touchEduStartY = e.touches[0].clientY;

  item.classList.add("dragging");
});

refs.educationContainer.addEventListener("touchmove", (e) => {
  if (!touchEduItem) return;

  const touchY = e.touches[0].clientY;

  const items = [...refs.educationContainer.querySelectorAll(".item")];
  const currentIndex = items.indexOf(touchEduItem);

  const target = items.find(el => {
    const rect = el.getBoundingClientRect();
    return touchY < rect.top + rect.height / 2;
  });

  if (!target) return;

  const targetIndex = items.indexOf(target);

  if (targetIndex !== currentIndex) {
    refs.educationContainer.insertBefore(
      touchEduItem,
      targetIndex > currentIndex ? target.nextSibling : target
    );
  }
});

refs.educationContainer.addEventListener("touchend", () => {
  if (!touchEduItem) return;

  touchEduItem.classList.remove("dragging");

  // 🔥 update data order
  const newOrder = [...refs.educationContainer.querySelectorAll(".item")]
    .map(el => el.querySelector(".edu-card").dataset.edu);

  data.education = newOrder.map(id =>
    data.education.find(x => x.id === id)
  );

  save();
  renderPreview();

  touchEduItem = null;
});

let touchItem = null;
let touchStartY = 0;

refs.experienceContainer.addEventListener("touchstart", (e) => {
  const item = e.target.closest(".item");
  if (!item) return;

  // 🔥 only drag when touching the handle
  if (!e.target.closest(".drag-handle")) return;

  touchItem = item;
  touchStartY = e.touches[0].clientY;

  item.classList.add("dragging");
});

refs.experienceContainer.addEventListener("touchmove", (e) => {
  if (!touchItem) return;

  const touchY = e.touches[0].clientY;
  const delta = touchY - touchStartY;

  const items = [...refs.experienceContainer.querySelectorAll(".item")];

  const currentIndex = items.indexOf(touchItem);

  const target = items.find((el, index) => {
    const rect = el.getBoundingClientRect();
    return touchY < rect.top + rect.height / 2;
  });

  if (!target) return;

  const targetIndex = items.indexOf(target);

  if (targetIndex !== currentIndex) {
    refs.experienceContainer.insertBefore(
      touchItem,
      targetIndex > currentIndex ? target.nextSibling : target
    );
  }
});

refs.experienceContainer.addEventListener("touchend", () => {
  if (!touchItem) return;

  touchItem.classList.remove("dragging");

  // 🔥 update data order
  const newOrder = [...refs.experienceContainer.querySelectorAll(".item")]
    .map(el => el.querySelector(".exp-card").dataset.exp);

  data.experience = newOrder.map(id =>
    data.experience.find(x => x.id === id)
  );

  save();
  renderPreview();

  touchItem = null;
});

const eduContainer = document.getElementById("educationContainer");

let draggedEdu = null;
let eduPlaceholder = document.createElement("div");
eduPlaceholder.className = "item placeholder";

// 🔥 ensure draggable
document.querySelectorAll("#educationContainer .drag-handle").forEach(el => {
  el.setAttribute("draggable", "true");
});

// =========================
// DRAG START
// =========================
eduContainer.addEventListener("dragstart", (e) => {
  if (!e.target.closest(".drag-handle")) return;

  draggedEdu = e.target.closest(".item");
  if (!draggedEdu) return;

  e.dataTransfer.setData("text/plain", "drag");
  e.dataTransfer.effectAllowed = "move";

  draggedEdu.classList.add("dragging");

  eduPlaceholder.style.height = draggedEdu.offsetHeight + "px";

  draggedEdu.after(eduPlaceholder);

  requestAnimationFrame(() => {
    draggedEdu.style.display = "none";
  });
});

// =========================
// DRAG OVER
// =========================
eduContainer.addEventListener("dragover", (e) => {
  e.preventDefault();
  if (!draggedEdu) return;

  const afterElement = getEduAfterElement(eduContainer, e.clientY);

  if (!afterElement || afterElement.parentNode !== eduContainer) {
    eduContainer.appendChild(eduPlaceholder);
  } else {
    eduContainer.insertBefore(eduPlaceholder, afterElement);
  }
});


// =========================
// DRAG END
// =========================
eduContainer.addEventListener("dragend", () => {
  if (!draggedEdu) return;

  draggedEdu.style.display = "";
  draggedEdu.classList.remove("dragging");

  if (eduPlaceholder.parentNode === eduContainer) {
    eduContainer.insertBefore(draggedEdu, eduPlaceholder);
  }

  eduPlaceholder.remove();

  // 🔥 UPDATE EDUCATION ORDER
  const newOrderIds = [
    ...eduContainer.querySelectorAll(".item")
  ].map(item =>
    item.querySelector(".edu-card")?.dataset.edu
  ).filter(Boolean);

  data.education = newOrderIds.map(id =>
    data.education.find(x => x.id === id)
  );

  save();
  renderLists();
  renderPreview();

  draggedEdu = null;
});

// =========================
// POSITION LOGIC
// =========================
function getEduAfterElement(container, y) {
  const elements = [...container.children].filter(
    el => !el.classList.contains("dragging") && el !== eduPlaceholder
  );

  let closest = null;
  let closestOffset = Number.NEGATIVE_INFINITY;

  elements.forEach(child => {
    const box = child.getBoundingClientRect();
    const offset = y - (box.top + box.height / 2);

    if (offset < 0 && offset > closestOffset) {
      closestOffset = offset;
      closest = child;
    }
  });

  return closest;
}

/* =========================
   DRAG SCROLL FIX
========================= */

// DESKTOP DRAG
document.addEventListener('dragstart', (e) => {
  if (e.target.closest('.drag-handle')) {
    layout.classList.add('dragging');
  }
});

document.addEventListener('dragend', () => {
  layout.classList.remove('dragging');
});

// TOUCH START
document.addEventListener('touchstart', (e) => {
  if (e.target.closest('.drag-handle')) {
    layout.classList.add('dragging');
  }
}, { passive: false });

// TOUCH END
document.addEventListener('touchend', () => {
  layout.classList.remove('dragging');
});

document.addEventListener('touchcancel', () => {
  layout.classList.remove('dragging');
});

// 🔥 THIS IS THE KEY FIX FOR MOBILE
document.addEventListener('touchmove', (e) => {
  if (layout.classList.contains('dragging')) {
    e.preventDefault();
  }
}, { passive: false });

function restoreExpBody() {
  if (!activeExpId) return;

  const overlay = document.getElementById('expOverlay');
  const content = overlay.querySelector('.exp-overlay-content');

  const body = content.querySelector('.exp-body');
  if (!body) return;

  const parentCard = document.querySelector(`.exp-card[data-exp="${activeExpId}"]`);
  if (!parentCard) return;

  parentCard.appendChild(body);
}

// =========================
// DATASET
// =========================

const cvDataset = cvDatasetCollection()
// =========================
// FIND ROLE KEY
// =========================
function findRoleKey(title) {
  if (!title) return null;

  const input = title.toLowerCase();

  for (let key in cvDataset) {
    if (input.includes(key)) {
      console.log("✅ Matched role:", key);
      return key;
    }
  }

  console.log("❌ No role match for:", title);
  return null;
}

document.addEventListener("input", (e) => {
  activeSuggestionIndex = -1;
  if (!e.target.classList.contains("job-title")) return;

  activeTitleInput = e.target; // 🔥 track active input

  console.log("🔥 Typing title:", e.target.value);

  const id = e.target.dataset.id;
  const value = e.target.value.toLowerCase();

  const list = document.querySelector(
    `.title-suggestions[data-title-suggest="${id}"]`
  );

  if (!list) {
    console.log("❌ No title suggestion box found");
    return;
  }

  if (!value) {
    list.innerHTML = "";
    return;
  }

  const matches = Object.keys(cvDataset).filter(key => {
    const k = key.toLowerCase();
    return k.startsWith(value) || k.includes(value);
  });

  console.log("✅ Matches:", matches);

  list.innerHTML = matches.map(key => `
    <li class="title-item" data-id="${id}" data-role="${key}">
      ${key}
    </li>
  `).join("");
});

document.addEventListener("click", (e) => {
  if (!e.target.classList.contains("title-item")) return;
  const id = e.target.dataset.id;
  const role = e.target.dataset.role;
  console.log("✅ Selected role:", role);
  if (!activeTitleInput) return;

  // 🔥 update input directly
  activeTitleInput.value = role;

  const exp = data.experience.find(x => x.id === id);
  if (!exp) return;

  // 🔥 update data
  exp.role = role;

  // 🔥 update header
  updateExpHeader(id);

  // 🔥 render + save
  renderPreview();
  save();

  // 🔥 close suggestions
  const list = document.querySelector(
    `.title-suggestions[data-title-suggest="${id}"]`
  );
  if (list) list.innerHTML = "";

  // 🔥 reset
  activeTitleInput = null;
});

document.addEventListener("focusin", (e) => {
  activeSuggestionIndex = -1;
  if (!e.target.classList.contains("bullet-input")) return;

  activeBulletInput = e.target; // 🔥 track current input

  console.log("🔥 Bullet input focused");

  const id = e.target.dataset.id;

  const exp = data.experience.find(x => x.id === id);
  if (!exp) return;

  const roleKey = findRoleKey(exp.role);
  if (!roleKey) return;

  const list = document.querySelector(
    `.bullet-suggestions[data-bullet-suggest="${id}"]`
  );
  if (!list) return;

  const achievements = cvDataset[roleKey].achievements
    .filter(item =>
      !exp.bullets.some(b => b.trim().toLowerCase() === item.trim().toLowerCase())
    );

  list.innerHTML = achievements.map(item => `
    <li class="bullet-item" data-id="${id}">
      ${item}
    </li>
  `).join("");
});

// =========================
// CLICK BULLET
// =========================
document.addEventListener("click", (e) => {

  if (!e.target.classList.contains("bullet-item")) return;

  const id = e.target.dataset.id;
  const text = e.target.textContent.trim();

  console.log("✅ Selecting bullet:", text);

  if (!activeBulletInput) return;

  const idx = activeBulletInput.dataset.idx;

  const exp = data.experience.find(x => x.id === id);
  if (!exp) return;

  // 🔥 UPDATE EXISTING INPUT (not push)
  exp.bullets[idx] = text;
  activeBulletInput.value = text;

  // 🔥 update UI + save
  renderPreview();
  save();

  // 🔥 CLOSE suggestions
  const list = document.querySelector(
    `.bullet-suggestions[data-bullet-suggest="${id}"]`
  );
  if (list) list.innerHTML = "";

  // 🔥 reset active input
  activeBulletInput = null;
});

// =========================
// CLOSE SUGGESTIONS WHEN NOT FOCUSED
// =========================
document.addEventListener("click", (e) => {

  // ❌ if clicking a suggestion → ignore (your existing handlers will handle)
  if (e.target.closest(".title-item") || e.target.closest(".bullet-item")) {
    return;
  }

  // ❌ if clicking inside inputs → do nothing
  if (
    e.target.closest(".job-title") ||
    e.target.closest(".bullet-input")
  ) {
    return;
  }

  // 🔥 OTHERWISE → CLOSE EVERYTHING
  document.querySelectorAll(".title-suggestions").forEach(el => {
    el.innerHTML = "";
  });

  document.querySelectorAll(".bullet-suggestions").forEach(el => {
    el.innerHTML = "";
  });

  // 🔥 reset active inputs
  activeTitleInput = null;
  activeBulletInput = null;
});

document.addEventListener("input", (e) => {

  if (!e.target.classList.contains("bullet-input")) return;

  activeBulletInput = e.target;

  const id = e.target.dataset.id;
  const idx = Number(e.target.dataset.idx); // ✅ ADD THIS
  const value = e.target.value;

  const exp = data.experience.find(x => x.id === id);
  if (!exp) return;

  // ✅ 🔥 SAVE THE VALUE PROPERLY
  if (!Array.isArray(exp.bullets)) {
    exp.bullets = [];
  }

  exp.bullets[idx] = value;

  localStorage.setItem("resumeData", JSON.stringify(data));

  // =============================
  // YOUR EXISTING SUGGESTION LOGIC
  // =============================

  const roleKey = findRoleKey(exp.role);
  if (!roleKey) return;

  const list = document.querySelector(
    `.bullet-suggestions[data-bullet-suggest="${id}"]`
  );
  if (!list) return;

  let achievements = cvDataset[roleKey].achievements.filter(item =>
    !exp.bullets.some(b =>
      b.trim().toLowerCase() === item.trim().toLowerCase()
    )
  );

  if (value) {
    achievements = achievements.filter(item =>
      item.toLowerCase().includes(value.toLowerCase())
    );
  }

  list.innerHTML = achievements.map(item => `
    <li class="bullet-item" data-id="${id}">
      ${item}
    </li>
  `).join("");
});

function updateActiveItem(items) {
  items.forEach(el => el.classList.remove("active"));

  if (items[activeSuggestionIndex]) {
    items[activeSuggestionIndex].classList.add("active");
  }
}

document.addEventListener("keydown", (e) => {

  const activeList =
    document.querySelector(".title-suggestions:not(:empty)") ||
    document.querySelector(".bullet-suggestions:not(:empty)");

  if (!activeList) return;

  const items = activeList.querySelectorAll("li");
  if (!items.length) return;

  // ⬇️ DOWN
  if (e.key === "ArrowDown") {
    e.preventDefault();
    activeSuggestionIndex++;

    if (activeSuggestionIndex >= items.length) {
      activeSuggestionIndex = 0;
    }

    updateActiveItem(items);
  }

  // ⬆️ UP
  if (e.key === "ArrowUp") {
    e.preventDefault();
    activeSuggestionIndex--;

    if (activeSuggestionIndex < 0) {
      activeSuggestionIndex = items.length - 1;
    }

    updateActiveItem(items);
  }

  // ⏎ ENTER
  if (e.key === "Enter") {
    if (activeSuggestionIndex >= 0) {
      e.preventDefault();
      items[activeSuggestionIndex].click();
      activeSuggestionIndex = -1;
    }
  }
});

function getSavedTitles() {
  const titles = data.experience
    .map(exp => (exp.role || "").toLowerCase())
    .filter(Boolean);

  console.log("📌 titles:", titles); // ADD THIS
  return titles;
}

function getSkillsFromTitles() {
  const titles = getSavedTitles();
  let skills = [];

  titles.forEach(title => {
    const roleKey = findRoleKey(title);

    console.log("🎯 match:", title, "→", roleKey); // ADD THIS

    if (roleKey && cvDataset[roleKey]) {
      console.log("✅ dataset found:", cvDataset[roleKey]); // ADD THIS

      // TRY BOTH (we don't know your structure yet)
      if (Array.isArray(cvDataset[roleKey])) {
        skills.push(...cvDataset[roleKey]);
      } else if (cvDataset[roleKey].skills) {
        skills.push(...cvDataset[roleKey].skills);
      }
    }
  });

  console.log("🧠 final skills:", skills); // ADD THIS
  return [...new Set(skills)];
}

refs.skillsContainer.addEventListener("input", (e) => {
  if (!e.target.classList.contains("skill-input")) return;

  const input = e.target;
  const value = input.value.toLowerCase();
  const row = input.closest(".language-row");
  const box = row.querySelector(".skill-suggestions");

  if (!box) return;

  const skills = getSkillsFromTitles();

  const filtered = skills.filter(skill =>
    skill.toLowerCase().includes(value)
  );

  box.innerHTML = filtered
    .map(s => `<li>${s}</li>`)
    .join("");

  box.querySelectorAll("li").forEach(li => {
    li.addEventListener("click", () => {
      input.value = li.textContent;
      box.innerHTML = "";

      const index = Number(row.dataset.index);
      data.skills[index].name = li.textContent;

      save();
      renderPreview();
    });
  });
});

function updateCertHeader(certId) {
  const card = document.querySelector(`.cert-card[data-cert="${certId}"]`);
  if (!card) return;

  const titleEl = card.querySelector('.cert-title');
  if (!titleEl) return;

  const cert = data.certificates.find(c => c.id === certId);
  if (!cert) return;

  titleEl.textContent = cert.name?.trim() || 'New Certificate';
}

document.querySelector('.updater').addEventListener('click', () => {
  function syncResumeData() {
  const KEY = "resume:data";

  // 1. GET from localStorage
  let stored = localStorage.getItem(KEY);

  try {
    stored = stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.error("❌ Invalid JSON in localStorage:", e);
    stored = null;
  }

  // 2. Console log
  console.log("📦 LocalStorage (resume:data):", stored);

  // 3. If exists → update global state
  if (stored) {
    data = stored;

    // 🔥 ensure missing fields don't break UI
    data.certificates = data.certificates || [];
    data.achievements = data.achievements || [];
    data.languages = data.languages || [];
    data.skills = data.skills || [];
    data.interests = data.interests || [];
  }

  // 4. SAVE back (normalize structure)
  localStorage.setItem(KEY, JSON.stringify(data));
  console.log("💾 Synced back to localStorage");

  // 5. UPDATE UI
  renderLists();
  renderPreview();
  renderLanguagesEditor?.(); // safe optional
}
  setTimeout(() => {
    syncResumeData()
  }, 200);

    console.log('happy')
});