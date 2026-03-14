export default function injectGoldSlateTemplateStyles() {
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
