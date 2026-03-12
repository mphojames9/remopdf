//templates css styles
export default function  injectPinkCorporateTemplateStylesII(){
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