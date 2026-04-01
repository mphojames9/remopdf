document.addEventListener("DOMContentLoaded", () => {
  const sections = document.querySelectorAll(".section-block");

  // ==============================
  // OPEN / CLOSE SECTIONS
  // ==============================
  sections.forEach(section => {
    const header = section.querySelector(".section-header");
    const btn = section.querySelector(".toggle-btn");
    const content = section.querySelector(".section-content");

    if (!header || !btn || !content) return;

    header.addEventListener("click", () => {
      const isOpen =
        content.style.height && content.style.height !== "0px";

      // Close all other sections
      sections.forEach(s => {
        const c = s.querySelector(".section-content");
        const b = s.querySelector(".toggle-btn");

        if (!c || !b || c === content) return;

        c.style.height = c.scrollHeight + "px";
        requestAnimationFrame(() => {
          c.style.height = "0px";
        });

        b.classList.remove("active");
      });

      // Toggle current section
      if (isOpen) {
        content.style.height = content.scrollHeight + "px";
        requestAnimationFrame(() => {
          content.style.height = "0px";
        });
        btn.classList.remove("active");
      } else {
        btn.classList.add("active");

        content.style.height = content.scrollHeight + "px";

        content.addEventListener("transitionend", function handler() {
          content.style.height = "auto";
          content.removeEventListener("transitionend", handler);
        });
      }
    });
  });

  // ==============================
  // AUTO RESIZE WHEN BULLETS CHANGE
  // ==============================
  function animateSectionResize(sectionContent) {
    if (!sectionContent) return;

    // Only if open
    if (sectionContent.style.height === "0px") return;

    const startHeight = sectionContent.scrollHeight;

    sectionContent.style.height = startHeight + "px";

    requestAnimationFrame(() => {
      const newHeight = sectionContent.scrollHeight;
      sectionContent.style.height = newHeight + "px";
    });

    sectionContent.addEventListener("transitionend", function handler() {
      sectionContent.style.height = "auto";
      sectionContent.removeEventListener("transitionend", handler);
    });
  }

  // Listen for bullet add / delete
  document.addEventListener("click", e => {
    if (
      e.target.closest("[data-action='addbullet']") ||
      e.target.closest("[data-action='delbullet']")
    ) {
      const sectionContent = e.target.closest(".section-content");

      // Wait for DOM to update first
      setTimeout(() => {
        animateSectionResize(sectionContent);
      }, 50);
    }
  });
});

const toggle = document.getElementById("menuToggle");
const panel = document.getElementById("mobilePanel");
const backdrop = document.querySelector('.backdrop')

toggle.addEventListener("click", () => {
  toggle.classList.toggle("active");
  panel.classList.toggle("active");
  backdrop.classList.toggle("open");
  backdrop.classList.toggle("opacity");
});


backdrop.addEventListener("click", () => {
  toggle.classList.remove("active");
  panel.classList.remove("active");
  backdrop.classList.remove("open");
  backdrop.classList.remove("opacity");
});

const extraSection = document.querySelector('.extra-section');
const extraToggle = document.querySelector('.extra-toggle');
const mainDetails = document.querySelector('.mainDetails');

// 👉 DEFAULT STATE (main open)
mainDetails.classList.remove('closed');
extraSection.classList.remove('open');

extraToggle.addEventListener('click', () => {
  const isOpen = extraSection.classList.contains('open');

  if (!isOpen) {
    // 🔥 OPEN EXTRA → CLOSE MAIN
    extraSection.classList.add('open');
    mainDetails.classList.add('closed');

    extraToggle.classList.add('active');
    extraToggle.setAttribute('aria-expanded', true);
  } else {
    // 🔥 CLOSE EXTRA → OPEN MAIN (never both closed)
    extraSection.classList.remove('open');
    mainDetails.classList.remove('closed');

    extraToggle.classList.remove('active');
    extraToggle.setAttribute('aria-expanded', false);
  }
});

document.querySelectorAll('.mainDetails input').forEach(input => {
  input.addEventListener('focus', () => {
    // 🔥 FORCE MAIN OPEN
    mainDetails.classList.remove('closed');

    // 🔥 CLOSE EXTRA
    extraSection.classList.remove('open');
    extraToggle.classList.remove('active');
    extraToggle.setAttribute('aria-expanded', false);
  });
});
// ======================
// 🔥 FORCE UPDATE CLICK
// ======================
function triggerUpdaterClick() {
  const updater = document.querySelector('.updater');
  if (updater) {
    updater.click();
    console.log("✅ updater clicked");
  } else {
    console.warn("⚠️ .updater not found");
  }
}


// ======================
// CERT CARD TOGGLE
// ======================
document.addEventListener('click', (e) => {
  const header = e.target.closest('.cert-header');
  if (!header) return;

  if (e.target.closest('[data-action="removecert"]')) return;

  const currentCard = header.closest('.cert-card');
  if (!currentCard) return;

  const isOpen = currentCard.classList.contains('active');

  document.querySelectorAll('.cert-card').forEach(card => {
    card.classList.remove('active');
  });

  if (!isOpen) {
    currentCard.classList.add('active');
  }
});


// ======================
// SCROLL CONTROL
// ======================
let activeScrollContainer = null;

document.querySelectorAll('.aside, .preview-wrap').forEach(el => {
  el.addEventListener('mouseenter', () => {
    activeScrollContainer = el;
  });

  el.addEventListener('mouseleave', () => {
    activeScrollContainer = null;
  });
});

document.addEventListener('keydown', (e) => {
  if (!activeScrollContainer) return;

  const scrollAmount = 40;

  if (e.key === 'ArrowDown') {
    activeScrollContainer.scrollTop += scrollAmount;
    e.preventDefault();
  }

  if (e.key === 'ArrowUp') {
    activeScrollContainer.scrollTop -= scrollAmount;
    e.preventDefault();
  }
});


// ======================
// PORTFOLIO TOGGLE
// ======================
document.addEventListener('click', (e) => {
  const header = e.target.closest('.portfolio-header');
  if (!header) return;

  if (e.target.closest('[data-action="removeportfolio"]')) return;

  const current = header.closest('.portfolio-card');
  if (!current) return;

  const isOpen = current.classList.contains('active');

  document.querySelectorAll('.portfolio-card').forEach(card => {
    card.classList.remove('active');
  });

  if (!isOpen) {
    current.classList.add('active');
  }
});


// ======================
// DRAWER
// ======================
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay-add');
const openBtn = document.getElementById('openDrawerBtn');
const closeBtn = document.getElementById('closeDrawerBtn');

// ======================
// DRAWER CONTROL
// ======================
openBtn.addEventListener('click', () => {
  drawer.classList.add('open');
  overlay.classList.add('show');
});

function closeDrawer() {
  drawer.classList.remove('open');
  overlay.classList.remove('show');
}

closeBtn.addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);


// ======================
// DEFAULT STRUCTURE (🔥 IMPORTANT)
// ======================
const DEFAULT_RESUME = {
  personal: {},
  summary: "",
  experience: [],
  education: [],
  references: [],
  skills: [],
  interests: [],
  languages: [],
  template: "goldenexecutiveII",
  certificates: [],
  portfolio: [],
  achievements: [],
  sections: {}
};


// ======================
// STORAGE HELPERS (🔥 SAFE)
// ======================
function getResumeData() {
  let stored;

  try {
    stored = JSON.parse(localStorage.getItem("resume:data"));
  } catch {
    stored = null;
  }

  // 🔥 ALWAYS return safe object
  const data = { ...DEFAULT_RESUME, ...(stored || {}) };

  // 🔥 ENSURE ALL KEYS EXIST (fix your crash)
  Object.keys(DEFAULT_RESUME).forEach(key => {
    if (data[key] === undefined) {
      data[key] = DEFAULT_RESUME[key];
    }
  });

  return data;
}

function saveResumeData(data) {
  localStorage.setItem("resume:data", JSON.stringify(data));
}


// ======================
// RESET VALUE
// ======================
function resetSectionValue(key, data) {
  if (!key || !data) return;

  if (key === "personal") {
    data[key] = {};
  } else {
    data[key] = [];
  }
}


// ======================
// RESTORE UI ON LOAD
// ======================
function restoreSectionsUI() {
  const data = getResumeData();

  document.querySelectorAll('.drawer-item').forEach(btn => {
    const key = btn.dataset.key;
    const targetId = btn.dataset.target;
    const section = document.getElementById(targetId);

    if (!section || !key) return;

    const isActive = data.sections && data.sections[key];

    if (isActive) {
      section.style.display = 'block';
      section.classList.remove('section-hidden');

      btn.classList.add('active');
      btn.style.opacity = "0.7";
      btn.innerHTML = `
        <i class="fa-solid fa-trash"></i>
        <span>Remove ${btn.dataset.label}</span>
      `;
    } else {
      section.style.display = 'none';
      section.classList.add('section-hidden');

      btn.classList.remove('active');
      btn.style.opacity = "1";
      btn.innerHTML = `
        <i class="fa-solid fa-plus"></i>
        <span>${btn.dataset.label}</span>
      `;
    }
  });
}


// ======================
// BUTTON LOGIC (🔥 FIXED)
// ======================
document.querySelectorAll('.drawer-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.target;
    const key = btn.dataset.key;
    const section = document.getElementById(targetId);

    if (!section || !key) return;

    let data = getResumeData(); // 🔥 always safe
    const isActive = btn.classList.contains('active');

    // =====================
    // REMOVE SECTION
    // =====================
    if (isActive) {

      section.classList.remove('section-show');
      section.classList.add('section-anim-start');

      setTimeout(() => {
        section.style.display = 'none';
        section.classList.add('section-hidden');
      }, 250);

      // 🔥 SAFE RESET
      resetSectionValue(key, data);

      // 🔥 SAFE SECTIONS OBJECT
      data.sections = data.sections || {};
      data.sections[key] = false;

      saveResumeData(data);

      triggerUpdaterClick();

      btn.classList.remove('active');
      btn.style.opacity = "1";
      btn.innerHTML = `
        <i class="fa-solid fa-plus"></i>
        <span>${btn.dataset.label}</span>
      `;

      return;
    }

    // =====================
    // ADD SECTION
    // =====================
    section.classList.remove('section-hidden');
    section.style.display = 'block';

    section.classList.add('section-anim-start');
    void section.offsetHeight;

    section.classList.add('section-show');
    section.classList.remove('section-anim-start');

    setTimeout(() => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);

    // 🔥 ENSURE KEY EXISTS (FIXES YOUR ERROR)
    if (!data[key]) {
      data[key] = key === "personal" ? {} : [];
    }

    // 🔥 SAFE SECTIONS OBJECT
    data.sections = data.sections || {};
    data.sections[key] = true;

    saveResumeData(data);

    triggerUpdaterClick();

    btn.classList.add('active');
    btn.style.opacity = "0.7";
    btn.innerHTML = `
      <i class="fa-solid fa-trash"></i>
      <span>Remove ${btn.dataset.label}</span>
    `;

    closeDrawer?.();
  });
});


// ======================
// INIT
// ======================
document.addEventListener("DOMContentLoaded", () => {
  restoreSectionsUI();
});