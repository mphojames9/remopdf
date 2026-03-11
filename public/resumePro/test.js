function renderATS() {
  // For ATS we purposely omit photo (many ATS prefer no images)
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