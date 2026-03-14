export default function injectmidnightTemplateStyles() {
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
