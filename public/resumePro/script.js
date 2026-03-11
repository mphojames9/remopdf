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

document.addEventListener('click', e => {
  const toggle = e.target.closest('.extra-toggle');
  if (!toggle) return;

  const section = toggle.closest('.extra-section');
  const isOpen = section.classList.toggle('open');

  toggle.setAttribute('aria-expanded', isOpen);
});

backdrop.addEventListener("click", () => {
  toggle.classList.remove("active");
  panel.classList.remove("active");
  backdrop.classList.remove("open");
  backdrop.classList.remove("opacity");
});