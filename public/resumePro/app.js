/* =========================
   DOM ELEMENTS
========================= */
const previewOverlay = document.querySelector('.preview-wrap');
const previewBtns = document.querySelectorAll('#previewBtn');
const editResumeBtn = document.querySelector('#editResume');
const navbar = document.querySelector('.navbar');
const overlayPersonalDetails = document.querySelector('.overlay-personalDetails');
const editProfileBtn = document.querySelectorAll('#editProfileBtn, .profile-section .left');
const savePersonalDetails = document.querySelector('.savePersonalDetails')
const languagesContainer = document.getElementById('languagesContainer');
const addLanguageBtn = document.getElementById('addLanguageBtn');
const profilePicPreview = document.querySelectorAll('.backdropBtn');
const profilePhotoUpload = document.querySelector('#profilePhotoUpload');
const closeProfilePhotoUpload = document.querySelector('#closeProfilePhotoUpload');
const previewContent = previewOverlay.querySelector("#resumePreview");
const resumePreview = document.querySelector('#resumePreview');
const overlay = document.getElementById('layoutOverlay');
const track = document.getElementById('carouselTrack');
const nameEl = document.getElementById('templateName');

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
        <circle cx="12" cy="8" r="4" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
        <path d="M4 20a8 8 0 0 1 16 0" stroke="rgb(117, 125, 129)" stroke-width="1.5"/>
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
        stroke="rgb(117, 125, 129)" stroke-width="1.5" stroke-linecap="round"/>
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
const TEMPLATE_LIBRARY = [
  {
    id: 'midnight',
    name: 'midnight',
    image: '/mnt/data/8c084f86-b9fa-4010-988d-7f50782de721.png'
  },

  {
    id: 'promidnight',
    name: 'promidnight',
    image: '/mnt/data/8c084f86-b9fa-4010-988d-7f50782de721.png'
  },

  {
    id: 'goldenexecutive',
    name: 'goldenexecutive',
    image: '/images/templates/goldenexecutive.png'
  },

   {   id: 'goldenexecutiveII',
    name: 'goldenexecutiveII',
    image: '/images/templates/goldenexecutiveII.png'
  },
  {
    id: 'creative',
    name: 'Creative',
    image: '/images/templates/creative.png'
  },
  {
    id: 'pinkcorporate',
    name: 'pinkcorporate',
    image: '/images/templates/recruiter.png'
  },
    {
    id: 'pinkcorporateII',
    name: 'pinkcorporateII',
    image: '/images/templates/recruiter.png'
  },

      {
    id: 'Modernats',
    name: 'Modernats',
    image: '/images/templates/recruiter.png'
  }
];
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

};

// --- Default data --------------------------------------------------------
const DEFAULT = {
  personal: {
    fullName: "Jorn Williams",
    title: "Junior Developer",
    email: "williams@domin.com",
    phone: "+2782 000 000",
    location: "South Africa",
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
  interests: ["", "", "", ""],
  languages: [],
  template: "midnight"
};
// --- State ---------------------------------------------------------------
let data = load() || JSON.parse(JSON.stringify(DEFAULT));
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
    const header = e.target.closest('.edu-header');
    if (!header) return;

    const card = header.closest('.edu-card');
    const eduId = card.dataset.edu;

    const isActive = card.classList.contains('active');

    // Close all
    refs.educationContainer
      .querySelectorAll('.edu-card')
      .forEach(c => c.classList.remove('active'));

    if (!isActive) {
      card.classList.add('active');
      localStorage.setItem('lastOpenEdu', eduId);
    } else {
      localStorage.removeItem('lastOpenEdu');
    }
  });

  refs.experienceContainer.addEventListener('click', function (e) {
    const header = e.target.closest('.exp-header');
    if (!header) return;

    const card = header.closest('.exp-card');
    const expId = card.dataset.exp;

    const isActive = card.classList.contains('active');

    // Close all
    refs.experienceContainer
      .querySelectorAll('.exp-card')
      .forEach(c => c.classList.remove('active'));

    if (!isActive) {
      card.classList.add('active');

      // 🔥 remember last opened
      localStorage.setItem('lastOpenExp', expId);
    } else {
      // 🔥 if clicking same header → close it and clear memory
      localStorage.removeItem('lastOpenExp');
    }
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
      if (confirm('Remove profile photo?')) removePhoto();
    });
  }
}

// --- Render lists (experience, education, skills, references) -----------------------
function renderLists() {
validateReferenceAdd();
validateSkillAdd();
validateLanguageAdd();
  // Education
  refs.educationContainer.innerHTML = '';
  data.education.forEach((edu) => {
    const node = document.createElement('div');
    node.className = 'item';
    node.innerHTML = node.innerHTML = node.innerHTML = `
  <div class="edu-card" data-edu="${edu.id}">

    <!-- HEADER -->
    <div class="edu-header">
      <div class="edu-title">
        ${escapeHtml(edu.degree || 'New Degree')}
        <span class="edu-sep">|</span>
        ${escapeHtml(edu.school || 'Institution')}
      </div>
      <div class="edu-actions">
        <i class="fa-solid fa-chevron-down edu-chevron"></i>
      </div>
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

        <div class="field">
          <label>Year Obtained</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="year"
            value="${escapeHtml(edu.year || '')}"
            placeholder="e.g. 2024" />
        </div>

        <div class="field">
          <label>Description</label>
          <input class="input_data"
            data-id="${edu.id}"
            data-field="discription"
            value="${escapeHtml(edu.discription || '')}"
            placeholder="Achievements, distinctions, major subjects..." />
        </div>

      </div>

      <div class="edu-actions-row">
        <button class="move btn-midnight">
          <i class="fa-solid fa-arrow-up"
            data-action="upedu"
            data-id="${edu.id}"></i>
        </button>

        <button class="move btn-midnight">
          <i class="fa-solid fa-arrow-down"
            data-action="downedu"
            data-id="${edu.id}"></i>
        </button>

        <button class="btn-danger">
          <i class="fa-solid fa-trash"
            data-action="removeedu"
            data-id="${edu.id}"></i>
        </button>
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
    <div class="exp-header">
      <div class="exp-title">
        ${escapeHtml(exp.role || 'New Role')}
        <span class="exp-sep">|</span>
        ${escapeHtml(exp.campany || 'campany')}
      </div>
      <div class="exp-actions">
        <i class="fa-solid fa-chevron-down exp-chevron"></i>
      </div>
    </div>

    <!-- BODY -->
    <div class="exp-body">

      <div class="exp-grid">

        <div class="field">
          <label>Job Title</label>
          <input class="input_data"
            data-id="${exp.id}"
            data-field="role"
            value="${escapeHtml(exp.role)}"
            placeholder="e.g. Frontend Developer" />
        </div>

        <div class="field">
          <label>campany</label>
          <input class="input_data"
            data-id="${exp.id}"
            data-field="campany"
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

      </div>

      <!-- RESPONSIBILITIES -->
      <div class="exp-bullets-section">
        <label class="section-label">Responsibilities</label>

        <div class="exp-bullets" data-bullets="${exp.id}">
          ${(exp.bullets || []).map((b, i) => `
            <div class="bullet-row">
              <input class="bullet-input"
                data-id="${exp.id}"
                data-field="bullet"
                data-idx="${i}"
                placeholder="Describe your achievement..."
                value="${escapeHtml(b)}" />
              
                <button class="remove-btn bullet-delete"
        data-action="delbullet"
        data-id="${exp.id}"
        data-idx="${i}">
        ✕
        </button>




            </div>
          `).join('')}
        </div>


        <button class="addbullet midnight-add" data-action="addbullet" data-id="${exp.id}">
        <i class="fa-solid fa-plus"></i>
        Add Responsibility
        </button>
      </div>

      <!-- ACTIONS -->
      <div class="exp-actions-row">
        <button class="btn-midnight">
          <i class="fa-solid fa-arrow-up"
             data-action="up"
             data-id="${exp.id}"></i>
        </button>

        <button class="btn-midnight">
          <i class="fa-solid fa-arrow-down"
             data-action="down"
             data-id="${exp.id}"></i>
        </button>

        <button class="btn-danger">
          <i class="fa-solid fa-trash"
             data-action="remove"
             data-id="${exp.id}"></i>
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

      <!-- ACTION BUTTONS -->
      <div class="ref-actions-row">
        <button class="btn-midnight">
          <i class="fa-solid fa-arrow-up"
             data-action="upref"
             data-id="${ref.id}"></i>
        </button>

        <button class="btn-midnight">
          <i class="fa-solid fa-arrow-down"
             data-action="downref"
             data-id="${ref.id}"></i>
        </button>

        <button class="btn-danger">
          <i class="fa-solid fa-trash"
             data-action="removeref"
             data-id="${ref.id}"></i>
        </button>
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
        data-action="removeinterest"
        data-idx="${idx}">
  ✕
</button></div>`;
    refs.interestsContainer.appendChild(node);
  });

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
    }
  }
  // 🔥 check button state
  updatePreviewLive();
  save();
}

function expButtonHandler(e) {
  const action = e.target.dataset.action;
  const idVal = e.target.dataset.id;
  const idx = Number(e.target.dataset.idx);

  if (action === 'addbullet') {
    const exp = data.experience.find(x => x.id === idVal);
    exp.bullets.push('');
  } else if (action === 'delbullet') {
    const exp = data.experience.find(x => x.id === idVal);
    exp.bullets.splice(idx, 1);
  } else if (action === 'remove') {
    data.experience = data.experience.filter(x => x.id !== idVal);
  } else if (action === 'up') {
    moveItem(data.experience, idVal, -1);
  } else if (action === 'down') {
    moveItem(data.experience, idVal, 1);
  }

  renderLists();
  renderPreview();
  save();
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

function eduButtonHandler(e) {
  const action = e.target.dataset.action;
  const idVal = e.target.dataset.id;
  if (action === 'removeedu') {
    data.education = data.education.filter(x => x.id !== idVal);
  } else if (action === 'upedu') {
    moveItem(data.education, idVal, -1);
  } else if (action === 'downedu') {
    moveItem(data.education, idVal, 1);
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

function interestInputHandler(e) {
  const idx = Number(e.target.dataset.idx);
  data.interests[idx] = e.target.value;
  validateInterestAdd()
  renderPreview(); save();
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

function renderSkillRow(skill, index) {
  return `
    <div class="language-row" data-index="${index}">
      <input
        class="input_data"
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

      <button class="remove-btn">✕</button>
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

      <button class="remove-btn">✕</button>
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
    
    data.experience.unshift({
      id: id(),
      role: "",
      campany: "",
      start: "",
      end: "",
      bullets: [""]
      
    });
    renderLists();
    renderPreview();
    save();

  });

  refs.addEduBtn.addEventListener('click', () => {
    data.education.unshift({ id: id(), school: "", degree: "", year: "", discription: "" });
    renderLists(); renderPreview(); save(); validateEducationAdd();
  });

  //References
  refs.addRefBtn.addEventListener('click', () => {
    data.references.unshift({ id: id(), name: "", campany: "", position: "", phone: "", email: "" });
    renderLists(); renderPreview(); save();validateReferenceAdd();
  });



  refs.addinterestBtn.addEventListener('click', () => {
    data.interests.unshift("");
    renderLists(); renderPreview(); save();
  });
  refs.pdfBtn.addEventListener('click', () => downloadPDF(false));
  refs.pdfAtsBtn && refs.pdfAtsBtn.addEventListener('click', () => downloadPDF(true));
}

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

function downloadPDF(atsMode) {

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

  // 🔥 get ALL resume pages
  const pages = preview.querySelectorAll('.resume-page');

  // temp wrapper
  const wrapper = document.createElement('div');
  wrapper.style.background = '#fff';

  pages.forEach((page, i) => {
    const clone = page.cloneNode(true);

    // force page break except last
    if (i !== pages.length - 1) {
      clone.style.pageBreakAfter = 'always';
    }

    wrapper.appendChild(clone);
  });

  document.body.appendChild(wrapper);

  const opt = {
    margin: 0,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  html2pdf()
    .set(opt)
    .from(wrapper)
    .save()
    .then(() => {
      wrapper.remove(); // cleanup
    });
}

function renderPreview(highlightKeywords) {
  renderPersonalDetails();
  validateExperienceAdd();
  validateEducationAdd();
  validateInterestAdd()

  refs.resumePreview.className =
    'resume ' + (data.template || 'midnight');

  const html = (() => {
    switch (data.template) {
      case 'goldenexecutive': return renderGoldenExecutive();
      case 'goldenexecutiveII': return renderGoldenExecutiveII();
      case 'creative': return renderCreative();
      case 'pinkcorporate': return renderPinkCorporate();
      case 'pinkcorporateII': return renderPinkCorporateII();
      case 'Modernats': return ModernAtsPhoto();
      case 'promidnight': return renderpromidnight();
      case 'ats': return renderATS();
      default: return rendermidnight();
    }
  })();

  paginateResume(html);

  if (highlightKeywords && highlightKeywords.length) {
    highlightKeywordsInPreview(highlightKeywords);
  }
}

function renderPersonalDetails() {
  document.querySelector('.name').textContent = data.personal.fullName || '';
  document.querySelector('.tittle').textContent = data.personal.title || '';
  document.querySelector('.emailAd').textContent = data.personal.email || '';
  document.querySelector('.phoneNo').textContent = data.personal.phone || '';
  document.querySelector('.locationAd').textContent = data.personal.location || '';
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
  const p = photoHtml();
  injectmidnightTemplateStyles()


  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_1">
      <div class="photo-wrap_Template_1">${p}</div>

      <div style="margin-top:85px;text-align:center">
        <div class="name_Template_1">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_1">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_1 summary">
  <div  class="heading_Template_1">
    <h2>${ICONS.profile}<span>Profile</span></h2>
  </div>
  <p class="about_Template_1">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_1">
  <div class="section-title_Template_1">
    ${ICONS.contact} Contact
  </div>
  <ul class="contact-list_Template_1">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
">

${hasExperience() ? `
<div class="heading_Template_1 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2>${ICONS.experience}<span>Professional Experience</span></h2>
  <div class="rule"></div>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569;">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}



        ${hasEducation() && `
<!-- EDUCATION HEADING -->
<div class="heading_Template_1 overflow" id="h2-edu" style="margin-bottom:5px;">
  <h2>
    ${ICONS.education}<span>EDUCATION</span>
  </h2>
  <div class="rule"></div>
</div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}

            <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>

            <section class="section_Template_1 overflow">
            ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>

           <section class="section_Template_1 overflow">
              <div class="heading_Template_1">
                <h2>${ICONS.interests}<span>Interests</span>
                </h2>
                <div class="rule"></div>
              </div>
              <ul class="skills-list_Template_1">
                <li>${data.interests.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</li>
              </ul>
            </section> 

            <section class="section_Template_1 overflow">
          <div class="heading_Template_1">
          <h2>${ICONS.references}<span>References</span></h2>
          <div class="rule"></div>
          </div>
          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_1">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function renderpromidnight() {
  injectpromidnighttTemplateStylesII()
  const p = photoHtml();

  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_1">
      <div class="photo-wrap_Template_1">${p}</div>
      <div style="margin-top:85px;text-align:center">
        <div class="name_Template_1">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_1">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_1 summary">
  <div  class="heading_Template_1">
    <h2>${ICONS.profile}<span>Profile</span></h2>
  </div>
  <p class="about_Template_1">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_1">
  <div class="section-title_Template_1">
    ${ICONS.contact} Contact
  </div>
  <ul class="contact-list_Template_1">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
  position:absolute;
  left:0;
">

${hasExperience() ? `
<div class="heading_Template_1 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2>${ICONS.experience}<span>Professional Experience</span></h2>
  <div class="rule"></div>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}



        ${hasEducation() && `
<!-- EDUCATION HEADING -->
<div class="heading_Template_1 overflow" id="h2-edu" style="margin-bottom:5px;">
  <h2>
    ${ICONS.education}<span>EDUCATION</span>
  </h2>
  <div class="rule"></div>
</div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}

             <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>
                          <section class="section_Template_1 overflow">
                ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>

            <section class="section_Template_1 overflow">
              <div class="heading_Template_1">
                <h2>${ICONS.interests}<span>Interests</span>
                </h2>
                <div class="rule"></div>
              </div>
              <ul class="skills-list_Template_1">
                <li>${data.interests.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</li>
              </ul>
            </section>

            <section class="section_Template_1 overflow">
          <div class="heading_Template_1">
          <h2>${ICONS.references}<span>References</span></h2>
          <div class="rule"></div>
          </div>
          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_1">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function renderGoldenExecutive() {
  const p = photoHtml();
  injectGoldSlateTemplateStyles()

  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_2">
      <div class="photo-wrap_Template_2">${p}</div>

      <div style="margin-top:35px;text-align:center">
        <div class="name_Template_2">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_2">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_2 summary">
  <div  class="heading_Template_2">
    <h2><span>Profile</span></h2>
  </div>
  <p class="about_Template_2">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_2">
  <div class="section-title_Template_2">
    ${ICONS.contact} Contact
  </div>
  <ul class="contact-list_Template_2">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
">

${hasExperience() ? `
<div class="heading_Template_2 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2><span>Professional Experience</span></h2>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}
                ${hasEducation() && `
        <div class="heading_Template_2 overflow" id="h2-edu" style="margin-bottom:5px; margin-top:30px;">
          <h2>
            <span>EDUCATION</span>
          </h2>
        </div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}

              <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>
                          <section class="section_Template_1 overflow">
                ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>

              ${hasInterest() && `
          <section class="section_Template_1 overflow">
           <div class="heading_Template_1">
            <h2>
            ${ICONS.interests}
           <span>Interests</span>
           </h2>
          <div class="rule"></div>
          </div>
        `}

          <ul class="skills-list_Template_1 interests-list_Template_1">
         ${data.interests
          .filter(i => i && i.trim() !== '')
          .map(i => `
            <li class="interest-item_Template_2">
              ${escapeHtml(i)}
            </li>
          `).join('')}
         </ul>
        </section>

          
${hasReferences() ? `
<section class="section_Template_2 overflow">
          <div class="heading_Template_2" style="margin-top:30px">
          <h2><span>References</span></h2>
          </div>
` : ``}



          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_2">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function renderGoldenExecutiveII() {
  const p = photoHtml();
  injectGoldSlateTemplateStylesII()

  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_2">
      <div class="photo-wrap_Template_2">${p}</div>

      <div style="margin-top:35px;text-align:center">
        <div class="name_Template_2">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_2">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_2 summary">
  <div  class="heading_Template_2">
    <h2><span>Profile</span></h2>
  </div>
  <p class="about_Template_2">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_2">
  <div class="section-title_Template_2">
    ${ICONS.contact} Contact
  </div>
  <ul class="contact-list_Template_2">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
">

${hasExperience() ? `
<div class="heading_Template_2 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2><span>Professional Experience</span></h2>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}
                ${hasEducation() && `
        <div class="heading_Template_2 overflow" id="h2-edu" style="margin-bottom:5px; margin-top:30px;">
          <h2>
            <span>EDUCATION</span>
          </h2>
        </div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}

              <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>
                          <section class="section_Template_1 overflow">
                ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>
              
              ${hasInterest() && `
          <section class="section_Template_1 overflow">
           <div class="heading_Template_1">
            <h2>
            ${ICONS.interests}
           <span>Interests</span>
           </h2>
          <div class="rule"></div>
          </div>
        `}

          <ul class="skills-list_Template_1 interests-list_Template_1">
         ${data.interests
          .filter(i => i && i.trim() !== '')
          .map(i => `
            <li class="interest-item_Template_2">
              ${escapeHtml(i)}
            </li>
          `).join('')}
         </ul>
        </section>

          
${hasReferences() ? `
<section class="section_Template_2 overflow">
          <div class="heading_Template_2" style="margin-top:30px">
          <h2><span>References</span></h2>
          </div>
` : ``}



          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_2">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function renderPinkCorporate() {
  const p = photoHtml();
  injectPinkCorporateTemplateStyles()

  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_3">
      <div class="photo-wrap_Template_3">${p}</div>

      <div style="margin-top:35px;text-align:center">
        <div class="name_Template_3">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_3">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_3 summary">
  <div  class="heading_Template_3">
    <h2><span>Profile</span></h2>
  </div>
  <p class="about_Template_3">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_3">
  <div class="section-title_Template_3">
    ${ICONS.contact_w} Contact
  </div>
  <ul class="contact-list_Template_3">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone_w)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email_w)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location_w)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website_w)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin_w)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar_w)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user_w)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group_w)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith_w)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart_w)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car_w)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
">

${hasExperience() ? `
<div class="heading_Template_3 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2>${ICONS.experience}<span>Professional Experience</span></h2>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}

        ${hasEducation() && `
<!-- EDUCATION HEADING -->
<div class="heading_Template_3 overflow" id="h2-edu" style="margin-bottom:5px; margin-top:30px;">
  <h2>
    ${ICONS.education}<span>EDUCATION</span>
  </h2>
</div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}

              <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>
              

          
            <section class="section_Template_1 overflow">
            ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

           <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
          ${data.languages
         .filter(lang => lang.name?.trim())
         .map(lang => `
         <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
          ${renderLanguageLevel(lang.level)}
         </li>
        `).join('')}
         </ul>
       </section>

              ${hasInterest() && `
          <section class="section_Template_1 overflow">
           <div class="heading_Template_1">
            <h2>
            ${ICONS.interests}
           <span>Interests</span>
           </h2>
          <div class="rule"></div>
          </div>
        `}

          <ul class="skills-list_Template_1 interests-list_Template_1">
         ${data.interests
          .filter(i => i && i.trim() !== '')
          .map(i => `
            <li class="interest-item_Template_2">
              ${escapeHtml(i)}
            </li>
          `).join('')}
         </ul>
        </section>

            <section class="section_Template_3 overflow">

${hasReferences() ? `
<div class="heading_Template_3" style="margin-top:30px">
  <h2><span>References</span></h2>
</div>
` : ``}
          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_1">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function renderPinkCorporateII() {
  const p = photoHtml();
  injectPinkCorporateTemplateStylesII()

  return `
  <div class="resume_Template_1">
    <aside class="sidebar_Template_3">
      <div class="photo-wrap_Template_3">${p}</div>

      <div style="margin-top:35px;text-align:center">
        <div class="name_Template_3">${escapeHtml(data.personal.fullName || '')}</div>
        <div class="role_Template_3">${escapeHtml(data.personal.title || '')}</div>
      </div>

      ${data.summary && data.summary.trim()
      ? `
<section class="section_Template_3 summary">
  <div  class="heading_Template_3">
    <h2><span>Profile</span></h2>
  </div>
  <p class="about_Template_3">${escapeHtml(data.summary)}</p>
</section>
`
      : ''}

${(
      data.personal.phone ||
      data.personal.email ||
      data.personal.location ||
      data.personal.website ||
      data.personal.linkedin
    ) ? `
<div class="side-section_Template_3">
  <div class="section-title_Template_3">
    ${ICONS.contact_w} Contact
  </div>
  <ul class="contact-list_Template_3">

    ${data.personal.phone
      ? `<li>${icon(ICONS.phone_w)}${escapeHtml(data.personal.phone)}</li>`
      : ''}

    ${data.personal.email
      ? `<li>${icon(ICONS.email_w)}${escapeHtml(data.personal.email)}</li>`
      : ''}

    ${data.personal.location
      ? `<li>${icon(ICONS.location_w)}${escapeHtml(data.personal.location)}</li>`
      : ''}

    ${data.personal.website
      ? `<li>${icon(ICONS.website_w)}${escapeHtml(data.personal.website)}</li>`
      : ''}

    ${data.personal.linkedin
      ? `<li>${icon(ICONS.linkedin_w)}${escapeHtml(data.personal.linkedin)}</li>`
      : ''}

    ${data.personal.dob
      ? `<li>${icon(ICONS.calendar_w)}${escapeHtml(data.personal.dob)}</li>`
      : ''}
    ${data.personal.gender
      ? `<li>${icon(ICONS.user_w)}${escapeHtml(data.personal.gender)}</li>`
      : ''}

${data.personal.race
      ? `<li>${icon(ICONS.group_w)}${escapeHtml(data.personal.race)}</li>`
      : ''}

${data.personal.religion
      ? `<li>${icon(ICONS.faith_w)}${escapeHtml(data.personal.religion)}</li>`
      : ''}

${data.personal.maritalStatus
      ? `<li>${icon(ICONS.heart_w)}${escapeHtml(data.personal.maritalStatus)}</li>`
      : ''}

${data.personal.driversLicence
      ? `<li>${icon(ICONS.car_w)}${escapeHtml(data.personal.driversLicence)}</li>`
      : ''}

  </ul>
</div>
` : ''}


    </aside>
<main class="content_Template_1" style="
  display:flex;
  flex-direction:column;
  flex-grow:1;
  background:#fff;
  color:#0f172a;
  font-size:10.5pt;
  line-height:17px;
">

${hasExperience() ? `
<div class="heading_Template_3 overflow" style="margin-bottom: 5px; margin-top: 5px;">
  <h2>${ICONS.experience}<span>Professional Experience</span></h2>
</div>
` : ``}

${data.experience.map(exp => `
  <!-- EXPERIENCE ITEM -->
  <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
    <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
    ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

  <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
    ${escapeHtml(exp.role)}
  </p>

  ${exp.bullets && exp.bullets.length
          ? `
    ${exp.bullets.map(b => `
     <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
    ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}

        ${hasEducation() && `
<!-- EDUCATION HEADING -->
<div class="heading_Template_3 overflow" id="h2-edu" style="margin-bottom:5px; margin-top:30px;">
  <h2>
    ${ICONS.education}<span>EDUCATION</span>
  </h2>
</div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}


        <section class="section_Template_1 overflow">
        ${hasSkills() ? `
       <div class="heading_Template_1">
       <h2>
        ${ICONS.skill}
         <span>Skills</span>
         </h2>
         <div class="rule"></div>
         </div>
         ` : ""}

        <ul class="skills-list_Template_1 overflow">
         ${data.skills
        .filter(skill => skill.name?.trim())
        .map(skill => `
        <li>
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
        </li>
        `).join('')}
          </ul>
        </section>



            <section class="section_Template_1 overflow">
            ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>

              ${hasInterest() && `
          <section class="section_Template_1 overflow">
           <div class="heading_Template_1">
            <h2>
            ${ICONS.interests}
           <span>Interests</span>
           </h2>
          <div class="rule"></div>
          </div>
        `}

          <ul class="skills-list_Template_1 interests-list_Template_1">
         ${data.interests
          .filter(i => i && i.trim() !== '')
          .map(i => `
            <li class="interest-item_Template_2">
              ${escapeHtml(i)}
            </li>
          `).join('')}
         </ul>
        </section>

            <section class="section_Template_3 overflow">

${hasReferences() ? `
<div class="heading_Template_3" style="margin-top:30px">
  <h2><span>References</span></h2>
</div>
` : ``}
          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_1">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}
      </section>
        </main>
  </div>
  `;
}

function ModernAtsPhoto() {
  injectModernAtsTemplateStyles()
  const p = photoHtml();

  return `
  <div class="resume_Template_1">
            <aside class="header" 
        style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);
            padding: 40px 40px 80px 40px;
            color: white;
            position: relative;">

            <div class="header-grid" 
            style="display: flex;
            justify-content: space-between;
            align-items: center;">
            <div>

                    <div class="name"
                     style="font-size: 42px;
                    font-family: Space Grotesk;
                    font-weight: 700;
                    letter-spacing: 2px;">${escapeHtml(data.personal.fullName || '')}</div>

                    <div class="title" 
                    style="opacity: .85;
                    margin-top: 6px;
                    letter-spacing: 2px;
                    font-size: 14px;">${escapeHtml(data.personal.title || '')}</div>
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
            bottom: -55px;
            left: 60px;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            overflow: hidden;
            border: 6px solid white;
            background: #0f172a;
            box-shadow: 0 10px 25px rgba(0, 0, 0, .25);">
            <div>${p}</div>
            </div>
        </aside>
        <main
            style="padding: 100px 60px 60px 60px;">
            <!-- LEFT SIDE -->

            <div>
          ${data.summary && data.summary.trim()
           ? `
          <section class="overflow" style="margin-top:50px">
         <div>
         <h2 style="margin-bottom:20px">${ICONS.profile}<span style="margin-left:30px">Profile</span></h2>
         </div>
         <p style="color:#475569; line-height: 1.6;">${escapeHtml(data.summary)}</p>
          </section>
            `: ''}
            </div>

            ${hasExperience() ? `
            <div class="heading_Template_1 overflow" style="margin-bottom: 5px; margin-top: 40px;">
            <h2>${ICONS.experience}<span>Professional Experience</span></h2>
           <div class="rule" style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);"></div>
           </div>
            ` : ``}

          ${data.experience.map(exp => `
          <!-- EXPERIENCE ITEM -->
          <div class="overflow" style="margin-top:1rem;font-weight:bold; display:flex; justify-content:space-between;">
          <p style="font-weight:800">${escapeHtml(exp.campany)}</p>
          ${[exp.start, exp.end].some(d => d && d.trim())
          ? `<i style="font-weight:400;font-size:13px;">${[exp.start, exp.end]
            .filter(d => d && d.trim())
            .join(' – ')}</i>`
          : ''
        }
  </div>

          <p class="overflow" style="margin:0;font-weight:600;color:rgb(59,57,57); margin-bottom: 5px;">
          ${escapeHtml(exp.role)}
           </p>

        ${exp.bullets && exp.bullets.length
          ? `
       ${exp.bullets.map(b => `
        <li class="overflow ${b?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
       ${escapeHtml(b)}
        </li>
          `).join('')}
      `
          : ''
        }
`).join('')}

${hasEducation() && `
<!-- EDUCATION HEADING -->
<div class="heading_Template_1 overflow" id="h2-edu" style="margin-bottom:5px;">
  <h2>
    ${ICONS.education}<span>EDUCATION</span>
  </h2>
  <div class="rule" style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);"></div>
</div>
`}

        <!-- EDUCATION ITEM -->
        ${data.education.map(edu => `
              <div class="overflow" style="margin-top:1rem;;font-weight:bold; display: flex; justify-content: space-between;">
              <p style="font-weight: 800">${escapeHtml(edu.degree)}</p>
              <i style="margin:0; float: right; font-weight:400; font-size: 13px; list-style-type: none;">${escapeHtml(edu.year || '')}</i>
            </div>
            <p class="overflow" style="margin:0; font-weight: 600; margin-bottom:5px; color: rgb(59, 57, 57);">${escapeHtml(edu.school)}</p>
              <li class="overflow" style="display:flex;white-space:pre-wrap;">
              </li>

              <li class="overflow ${edu.discription?.trim() ? 'li' : ''}" style="color:#475569; line-height: 1.3">
             ${escapeHtml(edu.discription)}
             </li>
              `).join('')}
              
              
              <section class="section_Template_1 overflow">
              ${hasSkills() ? `
              <div class="heading_Template_1">
              <h2>
              ${ICONS.skill}
             <span>Skills</span>
              </h2>
            <div class="rule" style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);"></div>
            </div>
             ` : ""}

           <ul class="skills-list_Template_1 overflow">
           ${data.skills
         .filter(skill => skill.name?.trim())
         .map(skill => `
          <li style="color:#475569;">
          ${escapeHtml(skill.name)}
          ${skill.level ? renderLanguageLevel(skill.level) : ""}
          </li>
          `).join('')}
           </ul>
          </section>

            <section class="section_Template_1 overflow">
                ${hasLanguage() ? `
            <div class="heading_Template_1">
            <h2>
            ${ICONS.language}
            <span>Languages</span>
           </h2>
            <div class="rule" style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);"></div>
           </div>
            ` : ""}

      <ul class="skills-list_Template_1 languages-list_Template_1 overflow">
        ${data.languages
        .filter(lang => lang.name?.trim())
         .map(lang => `
        <li class="language-item_Template_1" style="color:#475569;">
         <span class="language-name_Template_1">
          ${escapeHtml(lang.name)}
         </span>
       ${renderLanguageLevel(lang.level)}
        </li>
      `).join('')}
      </ul>
    </section>

            
          ${hasInterest() && `
          <section class="section_Template_1 overflow">
           <div class="heading_Template_1">
            <h2>
            ${ICONS.interests}
           <span>Interests</span>
           </h2>
          <div class="rule" style="background: linear-gradient(135deg, #0f172a, #1e293b, #0ea5a4);"></div>
          </div>
        `}

          <ul class="skills-list_Template_1 interests-list_Template_1">
         ${data.interests
          .filter(i => i && i.trim() !== '')
          .map(i => `
            <li class="interest-item_Template_2" style="color:#475569;">
              ${escapeHtml(i)}
            </li>
          `).join('')}
         </ul>
        </section>

            <section class="section_Template_1 overflow">
         ${hasReferences() ? `
        <div class="heading_Template_3" style="margin-top:30px">
        <h2><span>References</span></h2>
        </div>
        ` : ``}
          ${data.references.map(ref => `
         <div class="ref-card-wrapper">
          <div class="ref-card_Template_1">

        ${ref.name ? `<h4>${escapeHtml(ref.name)}</h4>` : ''}

         ${(ref.campany || ref.position) ? `
         <p class="ref-line">
          ${ICONS.campany}
          ${[
              ref.campany
                ? `<strong>${escapeHtml(ref.campany)}</strong>`
                : '',
              ref.position
                ? escapeHtml(ref.position)
                : ''
            ].filter(Boolean).join(' / ')}
        </p>
      ` : ''}

      ${ref.phone ? `
        <p class="ref-line">
          ${ICONS.phone}
          ${escapeHtml(ref.phone)}
        </p>
      ` : ''}

      ${ref.email ? `
        <p class="ref-line">
          ${ICONS.email}
          ${escapeHtml(ref.email)}
        </p>
      ` : ''}
          </div>
        </div>
        `).join('')}

        </main>
  </div>
  `;
}


function renderCreative() {
  const p = photoHtml();
  return `
      <div class="r-top">
        <div class="r-left">${p}<div style="margin-top:12px"><div class="name">${escapeHtml(data.personal.fullName || '')}</div><div class="title">${escapeHtml(data.personal.title || '')}</div><div class="contact small">${escapeHtml(data.personal.location || '')}</div><div style="margin-top:12px"><h4>Skills</h4><div class="small">${data.skills.map(s => escapeHtml(s)).join(', ')}</div></div></div></div>
        <div class="r-right"><div class="section"><h4>About</h4><div class="small">${escapeHtml(data.summary || '')}</div></div><div class="section"><h4>Experience</h4>${data.experience.map(exp => `<div class="job"><strong>${escapeHtml(exp.role)}</strong> — ${escapeHtml(exp.campany)} <div class="meta small">${escapeHtml(exp.start || '')} — ${escapeHtml(exp.end || '')}</div><ul class="bullets">${(exp.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}</ul></div>`).join('')}</div><div class="section"><h4>Education</h4>${data.education.map(edu => `<div class="job"><strong>${escapeHtml(edu.school)}</strong> — ${escapeHtml(edu.degree)} <div class="meta small">${escapeHtml(edu.year || '')}</div></div>`).join('')}</div></div>
      </div>
    `;
}


function renderATS() {
  const p = photoHtml();
return `

<div class="resume_ats" style="
  font-family:'Segoe UI', Arial, Helvetica, sans-serif;
  font-size:14px;
  line-height:1.65;
  color:#1f2937;
  max-width:820px;
  margin:auto;
  display:grid;
  grid-template-columns:260px 1fr;
  background:#ffffff;
  border:1px solid #e5e7eb;
  border-radius:8px;
  overflow:hidden;
  box-shadow:0 12px 35px rgba(0,0,0,.08);
">


<aside style="
  background:#2563eb;
  color:#ffffff;
  padding:32px 24px;
  display:grid;
  grid-template-rows:auto 1fr;
  height:100%;
">

<!-- TOP NAME -->
<div style="text-align:center;">
  <h1 style="
    font-size:24px;
    font-weight:700;
    line-height:1.2;
    margin-bottom:6px;
  ">
  ${escapeHtml(data.personal.fullName || '')}
  </h1>

  <div style="
    font-size:13px;
    opacity:.9;
  ">
  ${escapeHtml(data.personal.title || '')}
  </div>
</div>


<!-- BOTTOM AREA -->
<div style="
  display:grid;
  grid-template-columns:1fr auto;
  align-items:end;
  margin-top:40px;
">

<!-- PERSONAL DETAILS LEFT -->
<div style="
  font-family:'Segoe UI', Arial, sans-serif;
  font-size:13px;
  line-height:1.9;
  display:flex;
  flex-direction:column;
  gap:6px;
">

${data.personal.phone ? `
<div style="display:flex; align-items:center; gap:8px;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M6.6 10.8c1.5 3 3.6 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 
    1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V21c0 .6-.4 1-1 
    1C10.3 22 2 13.7 2 3c0-.6.4-1 1-1h3.5c.6 0 
    1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 
    1.1l-2.2 2.2z"/>
  </svg>
  <span>${escapeHtml(data.personal.phone)}</span>
</div>` : ''}

${data.personal.email ? `
<div style="display:flex; align-items:center; gap:8px;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M20 4H4c-1.1 0-2 .9-2 
    2v12c0 1.1.9 2 2 2h16c1.1 
    0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 
    4-8 5-8-5V6l8 5 8-5v2z"/>
  </svg>
  <span>${escapeHtml(data.personal.email)}</span>
</div>` : ''}

${data.personal.location ? `
<div style="display:flex; align-items:center; gap:8px;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M12 2C8.1 2 5 5.1 5 
    9c0 5.3 7 13 7 13s7-7.7 
    7-13c0-3.9-3.1-7-7-7zm0 
    9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 
    6.5 12 6.5s2.5 1.1 2.5 
    2.5S13.4 11.5 12 11.5z"/>
  </svg>
  <span>${escapeHtml(data.personal.location)}</span>
</div>` : ''}

${data.personal.website ? `
<div style="display:flex; align-items:center; gap:8px;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M12 2a10 10 0 100 
    20 10 10 0 000-20zm7.9 
    9h-3.4c-.2-2-.8-3.8-1.6-5.1 
    2.6.9 4.5 3.1 5 5.1zM12 
    4c.9 1.3 1.6 3.3 1.8 
    6h-3.6c.2-2.7.9-4.7 
    1.8-6zM4.1 13h3.4c.2 
    2 .8 3.8 1.6 5.1-2.6-.9-4.5-3.1-5-5.1zm3.4-2H4.1c.5-2 
    2.4-4.2 5-5.1-.8 1.3-1.4 
    3.1-1.6 5.1zM12 
    20c-.9-1.3-1.6-3.3-1.8-6h3.6c-.2 
    2.7-.9 4.7-1.8 6zm2.9-1.9c.8-1.3 
    1.4-3.1 1.6-5.1h3.4c-.5 2-2.4 
    4.2-5 5.1z"/>
  </svg>
  <span>${escapeHtml(data.personal.website)}</span>
</div>` : ''}

${data.personal.linkedin ? `
<div style="display:flex; align-items:center; gap:8px;">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
    <path d="M4.98 3.5C4.98 4.88 
    3.86 6 2.5 6S0 4.88 0 
    3.5 1.12 1 2.5 1 4.98 
    2.12 4.98 3.5zM.5 8h4V24h-4V8zm7 
    0h3.8v2.2h.1c.5-.9 
    1.8-2.2 3.8-2.2 4 
    0 4.8 2.6 4.8 
    6V24h-4v-7.1c0-1.7 
    0-3.9-2.4-3.9-2.4 
    0-2.7 1.9-2.7 
    3.8V24h-4V8z"/>
  </svg>
  <span>${escapeHtml(data.personal.linkedin)}</span>
</div>` : ''}

</div>

  <!-- PHOTO RIGHT -->
<div style="
  margin-left:16px;
  width:100px;
  height:100px;
  flex-shrink:0;
  border-radius:50%;
  overflow: hidden;


">
  ${p}
</div>



</div>

</aside>
<!-- MAIN -->

<main style="padding:36px 42px">

${data.summary ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#1e3a8a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:12px;
">
Professional Summary
</h2>

<p style="color:#374151">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}

${hasExperience() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#1e3a8a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:20px">

<div style="
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
">

<strong style="font-size:15px;color:#111827">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:12px;color:#6b7280">
${[exp.start, exp.end].filter(Boolean).join(' - ')}
</span>

</div>

<div style="
  font-size:13px;
  color:#374151;
  font-weight:600;
  margin-top:3px;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets?.length ? `

<ul style="margin-top:8px;padding-left:18px">

${exp.bullets.map(b => `
<li style="margin-bottom:5px">
${escapeHtml(b)}
</li>
`).join('')}

</ul>

` : ''}

</div>

`).join('')}

</section>

` : ''}

${hasEducation() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#1e3a8a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:16px">

<strong style="font-size:15px">
${escapeHtml(edu.degree)}
</strong>

<div style="font-size:13px;color:#374151">
${escapeHtml(edu.school)}
${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
</div>

</div>

`).join('')}

</section>

` : ''}

<!-- SKILLS -->

${hasSkills() ? `

<div style="margin-bottom:26px">

<h2 style="
font-size:12px;
text-transform:uppercase;
letter-spacing:1.4px;
font-weight:700;
margin-bottom:12px;
border-bottom:1px solid rgba(255,255,255,.35);
padding-bottom:6px;
">
Skills
</h2>

${data.skills
.filter(s => s.name?.trim())
.map(skill => {

const levelMap = {
basic:40,
intermediate:65,
advanced:85,
native:95
};

const level = levelMap[skill.level] || 70;

return `

<div style="margin-bottom:10px">

<div style="
display:flex;
justify-content:space-between;
font-size:12px;
margin-bottom:4px;
">
<span>${escapeHtml(skill.name)}</span>
<span>${skill.level || ''}</span>
</div>

<div style="
height:5px;
background:rgba(255,255,255,.3);
border-radius:4px;
">

<div style="
height:100%;
width:${level}%;
background:#ffffff;
border-radius:4px;
"></div>

</div>

</div>

`;
}).join('')}

</div>

` : ''}

<!-- LANGUAGES -->

${hasLanguage() ? `

<div>

<h2 style="
font-size:12px;
text-transform:uppercase;
letter-spacing:1.4px;
font-weight:700;
margin-bottom:12px;
border-bottom:1px solid rgba(255,255,255,.35);
padding-bottom:6px;
">
Languages
</h2>

<ul style="padding-left:16px; font-size:13px">

${data.languages
.filter(l => l.name?.trim())
.map(l => `
<li style="margin-bottom:6px">
${escapeHtml(l.name)}
${l.level ? ` – ${escapeHtml(l.level)}` : ''}
</li>
`).join('')}

</ul>

</div>

` : ''}

${hasReferences() ? `

<section>

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#1e3a8a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:12px;
">
References
</h2>

${data.references.map(ref => `

<div style="margin-bottom:14px">

<strong>${escapeHtml(ref.name)}</strong>

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

editProfileBtn.forEach(btn => btn.addEventListener('click', () => {
  overlayPersonalDetails.classList.remove('hidden');
  savePersonalDetails.classList.remove('hidden');
  setTimeout(() => {
    overlayPersonalDetails.classList.add('opacity');
    savePersonalDetails.classList.add('opacity');
  }, 100);
}));

savePersonalDetails.addEventListener('click', () => {
  overlayPersonalDetails.classList.remove('opacity');
  savePersonalDetails.classList.remove('opacity');
  setTimeout(() => {
    overlayPersonalDetails.classList.add('hidden');
    savePersonalDetails.classList.add('hidden');
  }, 450);


});

/* OPEN PREVIEW */
previewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // show overlay
    previewOverlay.classList.add('open');
    document.querySelector('.download-btn-premium').classList.add('open');
    document.querySelector('.closeBtn').classList.add('open');
    setTimeout(() => {
      previewOverlay.classList.add('opacity');
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
});

function closePreview() {
  previewOverlay.classList.remove("opacity");
  document.querySelector('.download-btn-premium').classList.remove('open');

  setTimeout(() => {
    previewOverlay.classList.remove("open");
    document.querySelector(".closeBtn")?.classList.remove("open");
    zoomControl = false;
    scalePreview();
  }, 450); // must match CSS transition
}

// Close when clicking outside the resume content
previewOverlay.addEventListener("click", (e) => {
  if (!previewContent.contains(e.target)) {
    closePreview();
  }
});

// Close with ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closePreview();
  }
});


// show overlay when no PDF
function showpreviewOverlay() {
  previewOverlay.classList.remove("hidden");
  previewOverlay.classList.add('opacity')
}

function hidepreviewOverlay() {
  previewOverlay.classList.add("hidden");
  previewOverlay.classList.add('opacity')
}


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



let currentIndex = 0;


function openLayoutPreview(templateId) {
  currentIndex = TEMPLATE_LIBRARY.findIndex(t => t.id === templateId);
  if (currentIndex < 0) currentIndex = 0;

  updateCarousel();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLayoutPreview() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

function updateCarousel() {
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  nameEl.textContent = TEMPLATE_LIBRARY[currentIndex].name;
}

/* Navigation */
function nextTemplate() {
  currentIndex = (currentIndex + 1) % TEMPLATE_LIBRARY.length;
  updateCarousel();
}

function prevTemplate() {
  currentIndex =
    (currentIndex - 1 + TEMPLATE_LIBRARY.length) %
    TEMPLATE_LIBRARY.length;
  updateCarousel();
}

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

function openLayoutPreview() {

  document
    .getElementById("layoutOverlay")
    .style.display = "block"
}

function closeLayoutPreview() {
  document
    .getElementById("layoutOverlay")
    .style.display = "none"
}

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

function injectmidnightTemplateStyles() {
  if (!document.getElementById('midnight-template-style')) {

    const style = document.createElement('style');
    style.id = 'midnight-template-style';

    style.textContent = `
      
    :root {
      --fa-primary: #68687a;
      --fa-accent: #9cc7d1;
      --dark: #191c24;
      --gray: #64748b;
      --light: #f8fafc;
      --border: #e2e8f0;
    }

    .skill {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ATS-skills */
    .ATS-skills {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
      gap: 15px;
    }
    
.resume {
    width: 794px;
    min-width: 794px;
    min-height: 1122px;
    max-height: 1122px;
    margin-bottom: 30px;
    background: #ffffff;
}

/* ================================
   SIDEBAR – GLASS + GRADIENT
================================ */
.sidebar_Template_1 {
  width: 34%;
  padding: 50px 30px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  position: relative;
  max-height: 1122px;
  overflow-y: hidden;
}

.photo-wrap_Template_1 {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 25px;
  border: 4px solid rgba(255,255,255,0.15);
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.photo-wrap_Template_1 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-title_Template_1 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
}

.name_Template_1 {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
}

.role_Template_1 {
  font-size: 14px;
  text-align: center;
  margin-top: 6px;
  color: #94a3b8;
}

.side-section_Template_1 {
  margin-top: 40px;
}



.contact-list_Template_1,
.skills-list_Template_1 {
  list-style: none;
 
}

.summary {
  margin-top: 1rem;
}

.summary .heading_Template_1 h2 {
  font-size: 13px;
  color:#e2e8f0 ;
  margin-top: 2rem;
  margin-bottom: -0.5rem;
}

.skills-list_Template_1 {
 border-left: 2px solid #e2e8f0;
 display: grid;
 grid-template-columns: 1fr 1fr;
}


.language-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.language-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lang-level {
  display: flex;
  gap: 4px;
}

.skills-list_Template_1 li {
  font-size: 14px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  line-height: 1.5;
  padding-left: 20px;
  font-weight: 600;
}

.timeline_Template_1 {
    margin-bottom: 25px;
    padding-left: 20px;
    border-left: 2px solid #e2e8f0;
    position: relative;
}

/* ================================
   MAIN CONTENT – CLEAN + AIRY
================================ */
.content_Template_1 {
  width: 66%;
  padding: 50px 50px;
  background: #ffffff;
}

.heading_Template_1 {
  margin: 45px 0 15px 0;
  color: #3e3e3e;
}

.heading_Template_1 h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}


.about_Template_1 {
  font-size: 14px;
  line-height: 1.8;
  color: #e2e8f0;
}

/* ============================
   SKILLS EDITOR (with level)
============================ */

.skill-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.skill-row .input_data {
  width: 100%;
}

.skill-row .language-level {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 13px;
}



/* ================================
   REFERENCES – CARD STYLE
================================ */
.ref-card-wrapper {
  margin-bottom: 15px;
}

.ref-card_Template_1 {
  background: #f8fafc;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.ref-card_Template_1 h4 {
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 600;
  color: #0f172a;
}

.ref-line {
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
}



.section_Template_1,
.ref-card_Template_1 {
  break-inside: avoid;
}

li {
    list-style-type: none;
}

.li {
  position: relative; /* REQUIRED */
  list-style: none;   /* Remove default bullet */
  margin-left: 40px;
}

    `;

    document.head.appendChild(style);
  }
}

function injectGoldSlateTemplateStyles(){
  if (!document.getElementById('midnight-goldSlate-style')) {
    const style = document.createElement('style');
    style.id = 'midnight-template-style';

    style.textContent = `
    :root {
  --fa-primary: #1f4d53;   /* dark teal */
  --fa-accent: #c8a24d;    /* gold */
  --dark: #1f4d53;
  --gray: #6b7280;
  --light: #f4f1eb;        /* beige */
  --border: #e5e1d8;
}

.skill {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ATS-skills */
.ATS-skills {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 15px;
}

.resume {
  width: 794px;
  min-width: 794px;
  min-height: 1122px;
  max-height: 1122px;
  margin-bottom: 30px;
}

/* ================================
   SIDEBAR
================================ */
.sidebar_Template_2 {
  width: 34%;
  padding: 50px 30px;
  background: #1f4d53; /* changed from gradient */
  color: #ffffff; /* pure white */
  position: relative;
  max-height: 1122px;
  overflow-y: hidden;
}

.photo-wrap_Template_2 {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 25px;
  border: 4px solid #c8a24d; /* gold */
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.photo-wrap_Template_2 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-title_Template_2 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c8a24d; /* gold */
}

.name_Template_2 {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
  color: #ffffff;
}

.role_Template_2 {
  font-size: 14px;
  text-align: center;
  margin-top: 6px;
  color: #e5e7eb; /* softer white */
}

.side-section_Template_2 {
  margin-top: 40px;
}

.contact-list_Template_2,
.skills-list_Template_2 {
  list-style: none;
}

.summary {
  margin-top: 1rem;
}

.summary .heading_Template_2 h2 {
  font-size: 16px;
  color: #ffffff;
  margin-top: 1rem;
  margin-bottom: -0.5rem;
  width: 100%;
  text-align: center;
  border: none;
}

.skills-list_Template_2 {
  border-left: 2px solid #c8a24d; /* gold */
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.language-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.language-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lang-level {
  display: flex;
  gap: 4px;
}

.contact-list_Template_2 li {
  font-size: 13px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  line-height: 1.5;
}

.skills-list_Template_2 li {
  font-size: 14px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f4d53; /* dark teal */
  line-height: 1.5;
  padding-left: 20px;
  font-weight: 600;
}

.timeline_Template_2 {
  margin-bottom: 25px;
  padding-left: 20px;
  border-left: 2px solid #c8a24d; /* gold */
  position: relative;
}

/* ================================
   MAIN CONTENT
================================ */
.content_Template_1 {
  width: 66%;
  padding: 50px 50px;
}

.heading_Template_2 {
  margin: 5px 0 15px 0;
}

.heading_Template_2 h2 {
  display: inline-block;
  padding: 6px 22px;
  background: #c8a24d; /* gold pill */
  color: #ffffff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  width: 100%;
  text-align: center;
}

.about_Template_2 {
  font-size: 14px;
  line-height: 1.8;
  color: #ffffff;
}

/* ============================
   SKILLS EDITOR
============================ */

.skill-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.skill-row .input_data {
  width: 100%;
}

.skill-row .language-level {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #c8a24d;
  background: #fff;
  font-size: 13px;
}

/* ================================
   REFERENCES
================================ */
.ref-card-wrapper {
  margin-bottom: 15px;
}

.ref-card_Template_2 {
  background: #ffffff;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e5e1d8;
  transition: all 0.2s ease;
}

.ref-card_Template_2 h4 {
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 600;
}

.ref-line {
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section_Template_2,
.ref-card_Template_2 {
  break-inside: avoid;
}

li {
  list-style-type: none;
}

.li {
  position: relative;
  list-style: none;
  margin-left: 40px;
}
`;

    document.head.appendChild(style);
  }
}

function injectGoldSlateTemplateStylesII(){
  if (!document.getElementById('goldSlate-styleII')) {
    const style = document.createElement('style');
    style.id = 'goldSlate-styleII';

    style.textContent = `
    :root {
  --fa-primary: #1f4d53;   /* dark teal */
  --fa-accent: #c8a24d;    /* gold */
  --dark: #1f4d53;
  --gray: #6b7280;
  --light: #f4f1eb;        /* beige */
  --border: #e5e1d8;
}

.skill {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ATS-skills */
.ATS-skills {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  gap: 15px;
}

.resume {
  width: 794px;
  min-width: 794px;
  min-height: 1122px;
  max-height: 1122px;
  margin-bottom: 30px;
}

/* ================================
   SIDEBAR
================================ */
.sidebar_Template_2 {
  width: 34%;
  padding: 50px 30px;
  background: #1f4d53; /* changed from gradient */
  color: #ffffff; /* pure white */
  position: relative;
  max-height: 1122px;
  overflow-y: hidden;
}

.photo-wrap_Template_2 {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 25px;
  border: 4px solid #c8a24d; /* gold */
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.photo-wrap_Template_2 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-title_Template_2 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #c8a24d; /* gold */
}

.name_Template_2 {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
  color: #ffffff;
}

.role_Template_2 {
  font-size: 14px;
  text-align: center;
  margin-top: 6px;
  color: #e5e7eb; /* softer white */
}

.side-section_Template_2 {
  margin-top: 40px;
}

.contact-list_Template_2,
.skills-list_Template_2 {
  list-style: none;
}

.summary {
  margin-top: 1rem;
}

.summary .heading_Template_2 h2 {
  font-size: 16px;
  color: #ffffff;
  margin-top: 1rem;
  margin-bottom: -0.5rem;
  width: 100%;
  text-align: center;
  border: none;
}

.skills-list_Template_2 {
  border-left: 2px solid #c8a24d; /* gold */
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.language-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.language-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lang-level {
  display: flex;
  gap: 4px;
}

.contact-list_Template_2 li {
  font-size: 13px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ffffff;
  line-height: 1.5;
}

.skills-list_Template_2 li {
  font-size: 14px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f4d53; /* dark teal */
  line-height: 1.5;
  padding-left: 20px;
  font-weight: 600;
}

.timeline_Template_2 {
  margin-bottom: 25px;
  padding-left: 20px;
  border-left: 2px solid #c8a24d; /* gold */
  position: relative;
}

/* ================================
   MAIN CONTENT
================================ */
.content_Template_1 {
  width: 66%;
  padding: 50px 50px;
}

.heading_Template_2 {
  margin: 5px 0 15px 0;
}

.heading_Template_2 h2 {
  display: inline-block;
  padding: 6px 22px;
  background: #c8a24d; /* gold pill */
  color: #ffffff;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  width: 100%;
  text-align: center;
}

.about_Template_2 {
  font-size: 14px;
  line-height: 1.8;
  color: #ffffff;
}

/* ============================
   SKILLS EDITOR
============================ */

.skill-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.skill-row .input_data {
  width: 100%;
}

.skill-row .language-level {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #c8a24d;
  background: #fff;
  font-size: 13px;
}

/* ================================
   REFERENCES
================================ */
.ref-card-wrapper {
  margin-bottom: 15px;
}

.ref-card_Template_2 {
  background: #ffffff;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e5e1d8;
  transition: all 0.2s ease;
}

.ref-card_Template_2 h4 {
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 600;
}

.ref-line {
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.section_Template_2,
.ref-card_Template_2 {
  break-inside: avoid;
}

li {
  list-style-type: none;
}

.li {
  position: relative;
  list-style: none;
  margin-left: 40px;
}
`;

    document.head.appendChild(style);
  }
}

function injectPinkCorporateTemplateStyles(){
  if (!document.getElementById('pink-corporate-style')) {
    const style = document.createElement('style');
    style.id = 'pink-corporate-style';

    style.textContent = `

/* ====================
SIDEBAR
==================== */
.sidebar_Template_3{
  width:34%;
  padding:50px 30px;
  background:linear-gradient(180deg,#f472a1 0%, #e75480 100%);
  color:white;

}

.ref-card_Template_3 h4 {
  margin: 10px 0;

}

/* PHOTO */
.photo-wrap_Template_3{
  width:140px;
  height:140px;
  border-radius:50%;
  overflow:hidden;
  margin:0 auto 25px;
  border:5px solid white;
  box-shadow:0 10px 30px rgba(0,0,0,0.2);
}

/* SIDEBAR TITLES */
.section-title_Template_3{
  font-size:16px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:15px;
  color:white;
  
  

}

/* NAME */
.name_Template_3{
      font-size: 24px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.5px;
  color:var(--dark);
}

.role_Template_3{
  font-size: 14px;
    text-align: center;
    margin-top: 6px;
  color: whitesmoke;
}

/* CONTACT */
.contact-list_Template_3 li{
  font-size:13px;
  margin-bottom:10px;
  color:white;
}

.side-section_Template_3 {
  margin-top:10px ;
}

.side-section_Template_3 li {
  font-size: 14px;
  display: flex;
  align-items: center;
}
/* ====================
MAIN CONTENT
==================== */
.content_Template_1{
  width:66%;
  padding:50px;
  background:white;
}

/* SECTION HEADINGS */
.heading_Template_3 h2{
    display: flex;
    align-items: center;
    gap: 10px;
  font-size:17px;
  font-weight:700;
  letter-spacing:2px;
  text-transform:uppercase;
  border-bottom:2px solid #fce7ef;
  padding-bottom:6px;
  margin-bottom:15px;
}

/* ABOUT TEXT */
.about_Template_3{
  font-size:15px;
  line-height:1.5;
  color: white;
  font-weight: 500;
}

/* TIMELINE */
.timeline_Template_3{
  margin-bottom:25px;
  padding-left:20px;
  border-left:2px solid #f80961;
}

/* SKILLS */
.skills-list_Template_3{
  display:grid;
  grid-template-columns:1fr 1fr;
}

.skills-list_Template_3 li{
  font-size:14px;
  color:white;
}

`;
    document.head.appendChild(style);
  }
}

function injectPinkCorporateTemplateStylesII(){
  if (!document.getElementById('pink-corporate-styleII')) {
    const style = document.createElement('style');
    style.id = 'pink-corporate-styleII';

    style.textContent = `

/* ====================
SIDEBAR
==================== */
.sidebar_Template_3{
  width:34%;
  padding:50px 30px;
  background:linear-gradient(180deg,#f472a1 0%, #e75480 100%);
  color:white;

}

.ref-card_Template_3 h4 {
  margin: 10px 0;

}

/* PHOTO */
.photo-wrap_Template_3{
  width:140px;
  height:140px;
  border-radius:50%;
  overflow:hidden;
  margin:0 auto 25px;
  border:5px solid white;
  box-shadow:0 10px 30px rgba(0,0,0,0.2);
}

/* SIDEBAR TITLES */
.section-title_Template_3{
  font-size:16px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.5px;
  margin-bottom:15px;
  color:white;
  
  

}

/* NAME */
.name_Template_3{
      font-size: 24px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 0.5px;
  color:var(--dark);
}

.role_Template_3{
  font-size: 14px;
    text-align: center;
    margin-top: 6px;
  color: whitesmoke;
}

/* CONTACT */
.contact-list_Template_3 li{
  font-size:13px;
  margin-bottom:10px;
  color:white;
}

.side-section_Template_3 {
  margin-top:10px ;
}

.side-section_Template_3 li {
  font-size: 14px;
  display: flex;
  align-items: center;
}
/* ====================
MAIN CONTENT
==================== */
.content_Template_1{
  width:66%;
  padding:50px;
  background:white;
}

/* SECTION HEADINGS */
.heading_Template_3 h2{
    display: flex;
    align-items: center;
    gap: 10px;
  font-size:17px;
  font-weight:700;
  letter-spacing:2px;
  text-transform:uppercase;
  border-bottom:2px solid #fce7ef;
  padding-bottom:6px;
  margin-bottom:15px;
}

/* ABOUT TEXT */
.about_Template_3{
  font-size:15px;
  line-height:1.5;
  color: white;
  font-weight: 500;
}

/* TIMELINE */
.timeline_Template_3{
  margin-bottom:25px;
  padding-left:20px;
  border-left:2px solid #f80961;
}

/* SKILLS */
.skills-list_Template_3{
  display:grid;
  grid-template-columns:1fr 1fr;
}

.skills-list_Template_3 li{
  font-size:14px;
  color:white;
}

`;
    document.head.appendChild(style);
  }
}

function injectpromidnighttTemplateStylesII() {
  if (!document.getElementById('promidnight-template-style')) {

    const style = document.createElement('style');
    style.id = 'midnight-template-style';

    style.textContent = `
      
    :root {
      --fa-primary: #68687a;
      --fa-accent: #9cc7d1;
      --dark: #191c24;
      --gray: #64748b;
      --light: #f8fafc;
      --border: #e2e8f0;
    }

    .skill {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* ATS-skills */
    .ATS-skills {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
      gap: 15px;
    }
    
.resume {
    width: 794px;
    min-width: 794px;
    min-height: 1122px;
    max-height: 1122px;
    margin-bottom: 30px;
    background: #ffffff;
}

/* ================================
   SIDEBAR – GLASS + GRADIENT
================================ */
.sidebar_Template_1 {
  width: 34%;
  padding: 50px 30px;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  color: #e2e8f0;
  position: relative;
  max-height: 1122px;
  overflow-y: hidden;
}

.photo-wrap_Template_1 {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto 25px;
  border: 4px solid rgba(255,255,255,0.15);
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
}

.photo-wrap_Template_1 img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.section-title_Template_1 {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 15px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
}

.name_Template_1 {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5px;
}

.role_Template_1 {
  font-size: 14px;
  text-align: center;
  margin-top: 6px;
  color: #94a3b8;
}

.side-section_Template_1 {
  margin-top: 40px;
}



.contact-list_Template_1,
.skills-list_Template_1 {
  list-style: none;
 
}

.summary {
  margin-top: 1rem;
}

.summary .heading_Template_1 h2 {
  font-size: 13px;
  color:#e2e8f0 ;
  margin-top: 2rem;
  margin-bottom: -0.5rem;
}

.skills-list_Template_1 {
 border-left: 2px solid #e2e8f0;
 display: grid;
 grid-template-columns: 1fr 1fr;
}


.language-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.language-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.lang-level {
  display: flex;
  gap: 4px;
}

.skills-list_Template_1 li {
  font-size: 14px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  line-height: 1.5;
  padding-left: 20px;
  font-weight: 600;
}

.timeline_Template_1 {
    margin-bottom: 25px;
    padding-left: 20px;
    border-left: 2px solid #e2e8f0;
    position: relative;
}

/* ================================
   MAIN CONTENT – CLEAN + AIRY
================================ */
.content_Template_1 {
  width: 66%;
  padding: 50px 50px;
  background: #ffffff;
}

.heading_Template_1 {
  margin: 45px 0 15px 0;
  color: #3e3e3e;
}

.heading_Template_1 h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}


.about_Template_1 {
  font-size: 14px;
  line-height: 1.8;
  color: #e2e8f0;
}

/* ============================
   SKILLS EDITOR (with level)
============================ */

.skill-row {
  display: grid;
  grid-template-columns: 1fr 140px auto;
  gap: 8px;
  margin-bottom: 8px;
}

.skill-row .input_data {
  width: 100%;
}

.skill-row .language-level {
  width: 100%;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 13px;
}



/* ================================
   REFERENCES – CARD STYLE
================================ */
.ref-card-wrapper {
  margin-bottom: 15px;
}

.ref-card_Template_1 {
  background: #f8fafc;
  padding: 18px 20px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
}

.ref-card_Template_1 h4 {
  font-size: 14px;
  margin-bottom: 6px;
  font-weight: 600;
  color: #0f172a;
}

.ref-line {
  font-size: 13px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #0f172a;
}



.section_Template_1,
.ref-card_Template_1 {
  break-inside: avoid;
}

li {
    list-style-type: none;
}

.li {
  position: relative; /* REQUIRED */
  list-style: none;   /* Remove default bullet */
  margin-left: 40px;
}

    `;

    document.head.appendChild(style);
  }
}

function injectModernAtsTemplateStyles() {
  if (!document.getElementById('Modern-ATS-template-style')) {

    const style = document.createElement('style');
    style.id = 'Modern-ATS-template-style';

    style.textContent = `

    `;

    document.head.appendChild(style);
  }
}

function injectAtsTemplateStyles() {
  if (!document.getElementById('Modern-ATS-template-style')) {

    const style = document.createElement('style');
    style.id = 'Modern-ATS-template-style';

    style.textContent = `
      :root { 
        --text-colors-primary:rgba(0,0, 0, 0.87); 
        --background-color:rgba(255, 255, 255, 1);
        --common-black:rgba(0,0, 0, 1);
        --divider:rgba(0, 0, 0, 1)
      ;
    
      } /*reset style*/ *, *::before, *::after { box-sizing: border-box; } body, h1,
      h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd, ul { margin: 0; padding: 0;
      } .template { color: var(--text-colors-primary); background:
      var(--background-color); } .template * { font-family:
        "Tinos", serif
      !important; } ul { list-style: none; } .resume-template-scope { min-height: 11in; } .resume-template-scope {
      min-height: 11in; line-height: 18px; font-size: 14px; -webkit-font-smoothing:
      antialiased; -moz-osx-font-smoothing: grayscale; } img, picture, video,
      canvas, svg { display: block; max-width: 100%; height: auto; } input, button,
      textarea, select { font: inherit; } a { color: inherit; font: inherit;
      text-decoration: none; } .divider { margin: 8px 0 12px; display: flex;
      flex-direction: column; justify-content: space-between; height: 4px;
      border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider);
      } .mt8{ margin-top: 8px; } .photo { width: 72px; height: 72px; object-fit:
      cover; border-radius: 50%; overflow: hidden; border: 1px solid rgba(0, 0, 0,
      0.15); } /*typography*/ .title { font-style: normal; letter-spacing: 0.58px;
      line-height: 44px; } .subtitle { font-size: 18px; text-transform: uppercase;
      text-align: center; font-weight: 700; line-height: normal; } .bold {
      font-weight: 700; } .italic { font-style: italic; } .uppercase {
      text-transform: uppercase; } .underline { text-decoration: underline; } .fs14{
      font-size: 14px; } .fs16{ font-size: 16px; } .fs24{ font-size: 24px; } .fs40{
      font-size: 40px; } .ls28 { letter-spacing: 0.28px; } /*main*/ .container {
      width: 100%; max-width: 956px; margin: 0 auto; padding: 32px 56px; min-height:
      100%; } .header{ display: flex; padding: 5px 0 16px; flex-direction: column;
      justify-content: center; align-items: center; gap: 8px; } .address {
      text-transform: uppercase; display: flex; align-items: center;
      justify-content: center; flex-wrap: wrap; width: 100%; gap: 8px; font-style:
      normal; text-align: center; } .position { line-height: normal; } .summary,
      .hobbies{ padding: 4px 0 24px; } section { padding-top: 4px; }
      .section-content { display: flex; gap: 24px; } 
      .content-details { 
        display: grid;
        grid-template-rows: 1fr 1fr;
        gap: 4px;
        text-align: end; 
        }
       .content {
      display: flex; gap: 12px; flex: 1; flex-direction: column; } 
      .content-title,
      .education-title,
      .internships-title {
      display: flex; flex-direction: column; font-size: 16px; line-height: normal;
      gap: 4px; max-width: 50%; 
      }
      .course-title {
      display: grid; grid-template-rows: 1fr 1fr; font-size: 16px; line-height: normal;
      gap: 4px; max-width: 50%; 
      }
       .content-top { display: flex; gap: 25px;
      justify-content: space-between; } .content-text { display: flex;
      flex-direction: row; gap: 2px; flex-wrap: wrap; } .content-list { display:
      flex; flex-direction: column; gap: 6px; } .content-list li{ position:
      relative; padding-left: 12px; } .content-list li::before { content: '•';
      position: absolute; left: 0; top: 3px; color: var(--text-colors-primary);
      font-size: 1em; line-height: 1; } .item { padding-bottom: 20px; } .location {
      font-weight: 400; }
    `;

    document.head.appendChild(style);
  }
}



function updateCounter(){
  const textarea = document.getElementById("summary");
  const counter = document.getElementById("summaryCounter");
  
  const length = textarea.value.length;
  counter.textContent = length + " / 250";

  counter.classList.remove("warning","limit");

  if(length > 200){
    counter.classList.add("warning");
  }

  if(length === 250){
    counter.classList.add("limit");
  }
}
document.addEventListener("DOMContentLoaded", updateCounter);
renderPreview();
save();


