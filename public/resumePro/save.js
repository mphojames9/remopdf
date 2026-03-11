
function renderATS()  {
  const p = photoHtml();

  return `
  <div class="resume_ats" style="
      font-family: Arial, Helvetica, sans-serif;
      font-size:14px;
      line-height:1.6;
      color:#111;
      max-width:800px;
      margin:auto;
  ">

  <!-- HEADER -->
  <header style="
      margin-bottom:26px;
      padding-bottom:12px;
      border-bottom:2px solid #000;
  ">

  <h1 style="
      font-size:28px;
      font-weight:700;
      letter-spacing:.5px;
      margin-bottom:4px;
  ">
  ${escapeHtml(data.personal.fullName || '')}
  </h1>

  <p style="
      font-size:16px;
      margin:2px 0;
      color:#333;
      font-weight:600;
  ">
  ${escapeHtml(data.personal.title || '')}
  </p>

  <p style="
      font-size:13px;
      margin-top:8px;
      line-height:1.6;
      color:#333;
  ">

  ${data.personal.phone ? `${escapeHtml(data.personal.phone)} | ` : ''}
  ${data.personal.email ? `${escapeHtml(data.personal.email)} | ` : ''}
  ${data.personal.location ? `${escapeHtml(data.personal.location)} | ` : ''}
  ${data.personal.website ? `${escapeHtml(data.personal.website)} | ` : ''}
  ${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

  </p>

  </header>


  <!-- SUMMARY -->
  ${data.summary && data.summary.trim() ? `
  <section style="margin-bottom:22px">

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  Professional Summary
  </h2>

  <p style="color:#222">
  ${escapeHtml(data.summary)}
  </p>

  </section>
  ` : ''}


  <!-- EXPERIENCE -->
  ${hasExperience() ? `
  <section style="margin-bottom:22px">

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  Professional Experience
  </h2>

  ${data.experience.map(exp => `
  
  <div style="margin-bottom:16px">

  <strong style="font-size:15px">
  ${escapeHtml(exp.role)}
  </strong>

  <div style="
      font-size:13px;
      color:#444;
      margin-top:2px;
  ">
  ${escapeHtml(exp.campany)}
  ${[exp.start, exp.end].some(d => d && d.trim())
    ? ` | ${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}`
    : ''}
  </div>

  ${exp.bullets && exp.bullets.length ? `
  <ul style="
      margin-top:6px;
      padding-left:18px;
  ">
  ${exp.bullets.map(b => `
  <li style="margin-bottom:4px">
  ${escapeHtml(b)}
  </li>
  `).join('')}
  </ul>
  ` : ''}

  </div>

  `).join('')}

  </section>
  ` : ''}



  <!-- EDUCATION -->
  ${hasEducation() ? `
  <section style="margin-bottom:22px">

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  Education
  </h2>

  ${data.education.map(edu => `

  <div style="margin-bottom:12px">

  <strong style="font-size:15px">
  ${escapeHtml(edu.degree)}
  </strong>

  <div style="
      font-size:13px;
      color:#444;
      margin-top:2px;
  ">
  ${escapeHtml(edu.school)}
  ${edu.year ? ` | ${escapeHtml(edu.year)}` : ''}
  </div>

  ${edu.discription ? `
  <p style="margin-top:4px">
  ${escapeHtml(edu.discription)}
  </p>
  ` : ''}

  </div>

  `).join('')}

  </section>
  ` : ''}



  <!-- SKILLS -->
  ${hasSkills() ? `
  <section style="margin-bottom:22px">

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  Skills
  </h2>

  <ul style="padding-left:18px">
  ${data.skills
    .filter(skill => skill.name?.trim())
    .map(skill => `
      <li style="margin-bottom:4px">
      ${escapeHtml(skill.name)}
      </li>
    `).join('')}
  </ul>

  </section>
  ` : ''}



  <!-- LANGUAGES -->
  ${hasLanguage() ? `
  <section style="margin-bottom:22px">

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  Languages
  </h2>

  <ul style="padding-left:18px">
  ${data.languages
    .filter(lang => lang.name?.trim())
    .map(lang => `
      <li style="margin-bottom:4px">
      ${escapeHtml(lang.name)}
      ${lang.level ? ` - ${escapeHtml(lang.level)}` : ''}
      </li>
    `).join('')}
  </ul>

  </section>
  ` : ''}



  <!-- REFERENCES -->
  ${hasReferences() ? `
  <section>

  <h2 style="
      font-size:17px;
      font-weight:700;
      border-bottom:1px solid #444;
      padding-bottom:4px;
      margin-bottom:10px;
      text-transform:uppercase;
      letter-spacing:.5px;
  ">
  References
  </h2>

  ${data.references.map(ref => `
  <div style="margin-bottom:12px">

  <strong style="font-size:15px">
  ${escapeHtml(ref.name)}
  </strong>

  <div style="color:#444">
  ${escapeHtml(ref.campany || '')}
  </div>

  ${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
  ${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}

  </div>
  `).join('')}

  </section>
  ` : ''}


  </div>
  `;
}

function renderATS()  {
const p = photoHtml();

return `

  <div class="resume_ats" style="
      font-family: Arial, Helvetica, sans-serif;
      font-size:14px;
      line-height:1.65;
      color:#111;
      max-width:800px;
      margin:auto;
  ">

  <!-- HEADER -->

  <header style="
      margin-bottom:28px;
      padding-bottom:14px;
      border-bottom:3px solid #2563eb;
  ">

  <h1 style="
      font-size:30px;
      font-weight:800;
      letter-spacing:.4px;
      margin-bottom:2px;
  ">
  ${escapeHtml(data.personal.fullName || '')}
  </h1>

  <p style="
      font-size:16px;
      color:#2563eb;
      font-weight:600;
      margin:3px 0;
  ">
  ${escapeHtml(data.personal.title || '')}
  </p>

  <p style="
      font-size:13px;
      margin-top:8px;
      line-height:1.7;
      color:#333;
  ">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

  </p>

  </header>

  <!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

  <section style="margin-bottom:24px">

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  Professional Summary
  </h2>

  <p style="color:#222">
  ${escapeHtml(data.summary)}
  </p>

  </section>
  ` : ''}

  <!-- EXPERIENCE -->

${hasExperience() ? `

  <section style="margin-bottom:24px">

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  Professional Experience
  </h2>

${data.experience.map(exp => `

  <div style="margin-bottom:18px">

  <strong style="font-size:15px">
  ${escapeHtml(exp.role)}
  </strong>

  <div style="
      font-size:13px;
      color:#444;
      margin-top:2px;
  ">
  ${escapeHtml(exp.campany)}
  ${[exp.start, exp.end].some(d => d && d.trim())
    ? ` • ${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}`
    : ''}
  </div>

${exp.bullets && exp.bullets.length ? `

  <ul style="
      margin-top:8px;
      padding-left:18px;
      line-height:1.6;
  ">
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

  <!-- EDUCATION -->

${hasEducation() ? `

  <section style="margin-bottom:24px">

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  Education
  </h2>

${data.education.map(edu => `

  <div style="margin-bottom:14px">

  <strong style="font-size:15px">
  ${escapeHtml(edu.degree)}
  </strong>

  <div style="
      font-size:13px;
      color:#444;
      margin-top:2px;
  ">
  ${escapeHtml(edu.school)}
  ${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
  </div>

${edu.discription ? `

  <p style="margin-top:4px">
  ${escapeHtml(edu.discription)}
  </p>
  ` : ''}

  </div>

`).join('')}

  </section>
  ` : ''}

  <!-- SKILLS -->

${hasSkills() ? `

  <section style="margin-bottom:24px">

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  Skills
  </h2>

  <ul style="padding-left:18px; line-height:1.6">
  ${data.skills
    .filter(skill => skill.name?.trim())
    .map(skill => `
      <li style="margin-bottom:5px">
      ${escapeHtml(skill.name)}
      </li>
    `).join('')}
  </ul>

  </section>
  ` : ''}

  <!-- LANGUAGES -->

${hasLanguage() ? `

  <section style="margin-bottom:24px">

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  Languages
  </h2>

  <ul style="padding-left:18px; line-height:1.6">
  ${data.languages
    .filter(lang => lang.name?.trim())
    .map(lang => `
      <li style="margin-bottom:5px">
      ${escapeHtml(lang.name)}
      ${lang.level ? ` - ${escapeHtml(lang.level)}` : ''}
      </li>
    `).join('')}
  </ul>

  </section>
  ` : ''}

  <!-- REFERENCES -->

${hasReferences() ? `

  <section>

  <h2 style="
      font-size:15px;
      font-weight:700;
      text-transform:uppercase;
      letter-spacing:1px;
      color:#111;
      border-bottom:2px solid #d1d5db;
      padding-bottom:4px;
      margin-bottom:10px;
  ">
  References
  </h2>

${data.references.map(ref => `

  <div style="margin-bottom:14px">

  <strong style="font-size:15px">
  ${escapeHtml(ref.name)}
  </strong>

  <div style="color:#444">
  ${escapeHtml(ref.campany || '')}
  </div>

${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}

  </div>
  `).join('')}

  </section>
  ` : ''}

  </div>
  `;
}



//THIS IS THE BEST EVER
function renderATS() {
const p = photoHtml();

return `

<div class="resume_ats" style="
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
  font-size:14px;
  line-height:1.7;
  color:#1f2937;
  max-width:820px;
  margin:auto;
  background:#ffffff;
  padding:40px;
">

<!-- HEADER -->

<header style="
  margin-bottom:32px;
  padding-bottom:18px;
  border-bottom:4px solid #2563eb;
">

<h1 style="
  font-size:32px;
  font-weight:800;
  letter-spacing:.3px;
  color:#111827;
  margin-bottom:4px;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<p style="
  font-size:17px;
  color:#2563eb;
  font-weight:600;
  margin:2px 0 8px 0;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
  font-size:13px;
  color:#374151;
  line-height:1.7;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

</p>

</header>

<!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#111827;
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

<!-- EXPERIENCE -->

${hasExperience() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#111827;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:20px">

<div style="
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  flex-wrap:wrap;
">

<strong style="
  font-size:15px;
  color:#111827;
">
${escapeHtml(exp.role)}
</strong>

<span style="
  font-size:13px;
  color:#6b7280;
">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="
  font-size:13px;
  color:#374151;
  margin-top:3px;
  font-weight:500;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="
  margin-top:8px;
  padding-left:18px;
  line-height:1.65;
">

${exp.bullets.map(b => `
<li style="margin-bottom:6px">
${escapeHtml(b)}
</li>
`).join('')}

</ul>
` : ''}

</div>

`).join('')}

</section>
` : ''}

<!-- EDUCATION -->

${hasEducation() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#111827;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:16px">

<strong style="
  font-size:15px;
  color:#111827;
">
${escapeHtml(edu.degree)}
</strong>

<div style="
  font-size:13px;
  color:#374151;
  margin-top:3px;
">
${escapeHtml(edu.school)}
${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
</div>

${edu.discription ? `
<p style="
  margin-top:5px;
  color:#4b5563;
">
${escapeHtml(edu.discription)}
</p>
` : ''}

</div>

`).join('')}

</section>
` : ''}

<!-- SKILLS -->

<!-- SKILLS -->

${hasSkills() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
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

const level = skill.level || 80;

return `

<div>

<div style="
  display:flex;
  justify-content:space-between;
  font-size:13px;
  margin-bottom:4px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<span style="color:#6b7280">
${level}%
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
  width:${level}%;
  background:linear-gradient(90deg,#2563eb,#1d4ed8);
">
</div>

</div>

</div>

`;
}).join('')}

</div>

</section>

` : ''}

<!-- LANGUAGES -->

${hasLanguage() ? `

<section style="margin-bottom:28px">

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#111827;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:12px;
">
Languages
</h2>

<ul style="padding-left:18px">

${data.languages
.filter(lang => lang.name?.trim())
.map(lang => `
<li style="margin-bottom:6px">
${escapeHtml(lang.name)}
${lang.level ? ` – ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}

</ul>

</section>
` : ''}

<!-- REFERENCES -->

${hasReferences() ? `

<section>

<h2 style="
  font-size:14px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.2px;
  color:#111827;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:12px;
">
References
</h2>

${data.references.map(ref => `

<div style="margin-bottom:16px">

<strong style="font-size:15px">
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

</div>
`;
}

function renderATS() {
const p = photoHtml();

return `

<div class="resume_ats" style="
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

<header style="
  margin-bottom:36px;
  padding-bottom:22px;
  border-bottom:3px solid #2563eb;
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
  color:#2563eb;
  font-weight:600;
  margin-bottom:10px;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
  font-size:13px;
  color:#4b5563;
  line-height:1.8;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

</p>

</header>


<!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
Professional Summary
</h2>

<p style="
  color:#374151;
  font-size:14px;
">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}


<!-- EXPERIENCE -->

${hasExperience() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:16px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:24px">

<div style="
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
  margin-bottom:4px;
">

<strong style="
  font-size:15px;
  color:#0f172a;
  font-weight:700;
">
${escapeHtml(exp.role)}
</strong>

<span style="
  font-size:13px;
  color:#6b7280;
">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="
  font-size:13px;
  color:#374151;
  font-weight:600;
  margin-bottom:6px;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="
  padding-left:18px;
  margin-top:6px;
  line-height:1.7;
">

${exp.bullets.map(b => `
<li style="margin-bottom:6px">
${escapeHtml(b)}
</li>
`).join('')}

</ul>

` : ''}

</div>

`).join('')}

</section>

` : ''}


<!-- EDUCATION -->

${hasEducation() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:16px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:18px">

<strong style="
  font-size:15px;
  color:#0f172a;
">
${escapeHtml(edu.degree)}
</strong>

<div style="
  font-size:13px;
  color:#374151;
  margin-top:4px;
">
${escapeHtml(edu.school)}
${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
</div>

${edu.discription ? `
<p style="
  margin-top:6px;
  color:#4b5563;
">
${escapeHtml(edu.discription)}
</p>
` : ''}

</div>

`).join('')}

</section>

` : ''}


<!-- SKILLS -->

${hasSkills() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
Skills
</h2>

<div style="
  display:flex;
  flex-wrap:wrap;
  gap:8px;
">

${data.skills
.filter(skill => skill.name?.trim())
.map(skill => `
<span style="
  font-size:13px;
  background:#f1f5f9;
  border:1px solid #e2e8f0;
  padding:6px 10px;
  border-radius:6px;
">
${escapeHtml(skill.name)}
</span>
`).join('')}

</div>

</section>

` : ''}


<!-- LANGUAGES -->

${hasLanguage() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
Languages
</h2>

<ul style="padding-left:18px">

${data.languages
.filter(lang => lang.name?.trim())
.map(lang => `
<li style="margin-bottom:6px">
${escapeHtml(lang.name)}
${lang.level ? ` – ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}

</ul>

</section>

` : ''}


<!-- REFERENCES -->

${hasReferences() ? `

<section>

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `

<div style="margin-bottom:18px">

<strong style="
  font-size:15px;
  color:#0f172a;
">
${escapeHtml(ref.name)}
</strong>

<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone ? `<div style="font-size:13px">${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div style="font-size:13px">${escapeHtml(ref.email)}</div>` : ''}

</div>

`).join('')}

</section>

` : ''}

</div>
`;
}

//Advanced skills bar ats
function renderATS() {
const p = photoHtml();

return `

<div class="resume_ats" style="
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

<header style="
  margin-bottom:36px;
  padding-bottom:22px;
  border-bottom:3px solid #2563eb;
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
  color:#2563eb;
  font-weight:600;
  margin-bottom:10px;
">
${escapeHtml(data.personal.title || '')}
</p>

<p style="
  font-size:13px;
  color:#4b5563;
  line-height:1.8;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

</p>

</header>


<!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
Professional Summary
</h2>

<p style="
  color:#374151;
  font-size:14px;
">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}


<!-- EXPERIENCE -->

${hasExperience() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:16px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:24px">

<div style="
  display:flex;
  justify-content:space-between;
  flex-wrap:wrap;
  margin-bottom:4px;
">

<strong style="
  font-size:15px;
  color:#0f172a;
  font-weight:700;
">
${escapeHtml(exp.role)}
</strong>

<span style="
  font-size:13px;
  color:#6b7280;
">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="
  font-size:13px;
  color:#374151;
  font-weight:600;
  margin-bottom:6px;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="
  padding-left:18px;
  margin-top:6px;
  line-height:1.7;
">

${exp.bullets.map(b => `
<li style="margin-bottom:6px">
${escapeHtml(b)}
</li>
`).join('')}

</ul>

` : ''}

</div>

`).join('')}

</section>

` : ''}


<!-- EDUCATION -->

${hasEducation() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:16px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:18px">

<strong style="
  font-size:15px;
  color:#0f172a;
">
${escapeHtml(edu.degree)}
</strong>

<div style="
  font-size:13px;
  color:#374151;
  margin-top:4px;
">
${escapeHtml(edu.school)}
${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
</div>

${edu.discription ? `
<p style="
  margin-top:6px;
  color:#4b5563;
">
${escapeHtml(edu.discription)}
</p>
` : ''}

</div>

`).join('')}

</section>

` : ''}


<!-- SKILLS -->

${hasSkills() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
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
  native: 100
};

let level = skill.level;

if (typeof level === "string") {
  level = levelMap[level.toLowerCase()] ?? 0;
}

level = Math.max(0, Math.min(100, Number(level)));

return `

<div>

<div style="
  display:flex;
  justify-content:space-between;
  font-size:13px;
  margin-bottom:4px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(skill.name)}
</span>

<span style="color:#6b7280">
${level}%
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
  width:${level}%;
  background:linear-gradient(90deg,#2563eb,#1d4ed8);
  border-radius:4px;
">
</div>

</div>

</div>

`;
}).join('')}

</div>

</section>

` : ''}


<!-- LANGUAGES -->

${hasLanguage() ? `

<section style="margin-bottom:34px">

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
Languages
</h2>

<ul style="padding-left:18px">

${data.languages
.filter(lang => lang.name?.trim())
.map(lang => `
<li style="margin-bottom:6px">
${escapeHtml(lang.name)}
${lang.level ? ` – ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}

</ul>

</section>

` : ''}


<!-- REFERENCES -->

${hasReferences() ? `

<section>

<h2 style="
  font-size:13px;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:1.4px;
  color:#0f172a;
  border-bottom:2px solid #e5e7eb;
  padding-bottom:8px;
  margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `

<div style="margin-bottom:18px">

<strong style="
  font-size:15px;
  color:#0f172a;
">
${escapeHtml(ref.name)}
</strong>

<div style="color:#374151">
${escapeHtml(ref.campany || '')}
</div>

${ref.phone ? `<div style="font-size:13px">${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div style="font-size:13px">${escapeHtml(ref.email)}</div>` : ''}

</div>

`).join('')}

</section>

` : ''}

</div>
`;
}

//ats photo skill dot
function renderATS() {
const p = photoHtml();

return `

<div class="resume_ats" style="
  font-family:'Segoe UI', Roboto, Arial, Helvetica, sans-serif;
  font-size:13.5px;
  line-height:1.65;
  color:#1f2937;
  max-width:820px;
  margin:auto;
  background:#ffffff;
  padding:40px 46px;
">

<!-- HEADER -->

<header style="
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  border-bottom:2px solid #2563eb;
  padding-bottom:18px;
  margin-bottom:28px;
">

<div>

<h1 style="
  font-size:30px;
  font-weight:800;
  letter-spacing:.5px;
  color:#0f172a;
  margin:0 0 4px 0;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<div style="
  font-size:16px;
  font-weight:600;
  color:#2563eb;
  margin-bottom:8px;
">
${escapeHtml(data.personal.title || '')}
</div>

<div style="
  font-size:12.5px;
  color:#475569;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

</div>

</div>

${p ? `
<div style="
  width:82px;
  height:82px;
  border-radius:6px;
  overflow:hidden;
  border:1px solid #e5e7eb;
">
${p}
</div>
` : ''}

</header>


<!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:10px;
">
Professional Summary
</h2>

<p style="
  font-size:13.5px;
  color:#334155;
  margin:0;
">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}


<!-- EXPERIENCE -->

${hasExperience() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:18px">

<div style="
  display:flex;
  justify-content:space-between;
  font-weight:700;
  font-size:13.5px;
  color:#0f172a;
">

<span>${escapeHtml(exp.role)}</span>

<span style="
  font-weight:600;
  font-size:12.5px;
  color:#64748b;
">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="
  font-size:12.8px;
  font-weight:600;
  color:#2563eb;
  margin:3px 0 8px 0;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="
  padding-left:18px;
  margin:0;
  font-size:12.8px;
  color:#374151;
">

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


<!-- EDUCATION -->

${hasEducation() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:16px">

<div style="
  display:flex;
  justify-content:space-between;
  font-weight:700;
  font-size:13.5px;
">

<span>${escapeHtml(edu.degree)}</span>

<span style="
  font-size:12.5px;
  color:#64748b;
">
${escapeHtml(edu.year || '')}
</span>

</div>

<div style="
  font-size:12.8px;
  color:#334155;
  margin-top:2px;
">
${escapeHtml(edu.school)}
</div>

${edu.discription ? `
<p style="
  margin-top:5px;
  font-size:12.8px;
  color:#475569;
">
${escapeHtml(edu.discription)}
</p>
` : ''}

</div>

`).join('')}

</section>
` : ''}


${hasSkills() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Technical Skills
</h2>

<div style="
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:10px 30px;
  font-size:12.8px;
">

${data.skills
.filter(skill => skill.name?.trim())
.map(skill => {

const levelMap = {
basic:1,
intermediate:3,
advanced:4,
expert:5,
native:5
};

const level = (skill.level || '').toLowerCase();
const dots = levelMap[level] || 0;

const filled = '●'.repeat(dots);
const empty = '○'.repeat(5 - dots);

return `
<div style="display:flex;justify-content:space-between;align-items:center">

<span style="color:#0f172a;font-weight:600">
${escapeHtml(skill.name)}
</span>

<span style="
  font-size:12px;
  letter-spacing:2px;
  color:#2563eb;
">
${filled}${empty}
</span>

</div>
`;
}).join('')}

</div>

</section>

` : ''}


<!-- LANGUAGES -->

${hasLanguage() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Languages
</h2>

<ul style="
  padding-left:18px;
  margin:0;
  font-size:12.8px;
  color:#374151;
">

${data.languages
.filter(lang => lang.name?.trim())
.map(lang => `
<li>
${escapeHtml(lang.name)}
${lang.level ? ` • ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}

</ul>

</section>
` : ''}


<!-- REFERENCES -->

${hasReferences() ? `

<section>

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `

<div style="
  margin-bottom:14px;
  font-size:12.8px;
  color:#374151;
">

<strong style="color:#0f172a">
${escapeHtml(ref.name)}
</strong>

<div>${escapeHtml(ref.campany || '')}</div>

${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}

</div>

`).join('')}

</section>
` : ''}

</div>
`;
}

//ats photo skill bar
function renderATS() {
const p = photoHtml();

return `

<div class="resume_ats" style="
  font-family:'Segoe UI', Roboto, Arial, Helvetica, sans-serif;
  font-size:13.5px;
  line-height:1.65;
  color:#1f2937;
  max-width:820px;
  margin:auto;
  background:#ffffff;
  padding:40px 46px;
">

<!-- HEADER -->

<header style="
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  border-bottom:2px solid #2563eb;
  padding-bottom:18px;
  margin-bottom:28px;
">

<div>

<h1 style="
  font-size:30px;
  font-weight:800;
  letter-spacing:.5px;
  color:#0f172a;
  margin:0 0 4px 0;
">
${escapeHtml(data.personal.fullName || '')}
</h1>

<div style="
  font-size:16px;
  font-weight:600;
  color:#2563eb;
  margin-bottom:8px;
">
${escapeHtml(data.personal.title || '')}
</div>

<div style="
  font-size:12.5px;
  color:#475569;
">

${data.personal.phone ? `${escapeHtml(data.personal.phone)} • ` : ''}
${data.personal.email ? `${escapeHtml(data.personal.email)} • ` : ''}
${data.personal.location ? `${escapeHtml(data.personal.location)} • ` : ''}
${data.personal.website ? `${escapeHtml(data.personal.website)} • ` : ''}
${data.personal.linkedin ? `${escapeHtml(data.personal.linkedin)}` : ''}

</div>

</div>

${p ? `
<div style="
  width:82px;
  height:82px;
  border-radius:6px;
  overflow:hidden;
  border:1px solid #e5e7eb;
">
${p}
</div>
` : ''}

</header>


<!-- SUMMARY -->

${data.summary && data.summary.trim() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:10px;
">
Professional Summary
</h2>

<p style="
  font-size:13.5px;
  color:#334155;
  margin:0;
">
${escapeHtml(data.summary)}
</p>

</section>
` : ''}


<!-- EXPERIENCE -->

${hasExperience() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:18px">

<div style="
  display:flex;
  justify-content:space-between;
  font-weight:700;
  font-size:13.5px;
  color:#0f172a;
">

<span>${escapeHtml(exp.role)}</span>

<span style="
  font-weight:600;
  font-size:12.5px;
  color:#64748b;
">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="
  font-size:12.8px;
  font-weight:600;
  color:#2563eb;
  margin:3px 0 8px 0;
">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="
  padding-left:18px;
  margin:0;
  font-size:12.8px;
  color:#374151;
">

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


<!-- EDUCATION -->

${hasEducation() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:16px">

<div style="
  display:flex;
  justify-content:space-between;
  font-weight:700;
  font-size:13.5px;
">

<span>${escapeHtml(edu.degree)}</span>

<span style="
  font-size:12.5px;
  color:#64748b;
">
${escapeHtml(edu.year || '')}
</span>

</div>

<div style="
  font-size:12.8px;
  color:#334155;
  margin-top:2px;
">
${escapeHtml(edu.school)}
</div>

${edu.discription ? `
<p style="
  margin-top:5px;
  font-size:12.8px;
  color:#475569;
">
${escapeHtml(edu.discription)}
</p>
` : ''}

</div>

`).join('')}

</section>
` : ''}


${hasSkills() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:16px;
">
Technical Skills
</h2>

<div style="
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:14px 30px;
">

${data.skills
.filter(skill => skill.name?.trim())
.map(skill => {

const levelMap = {
basic:35,
intermediate:60,
advanced:80,
expert:90,
native:100
};

const level = (skill.level || '').toLowerCase();
const width = levelMap[level] || 40;

return `

<div>

<div style="
  display:flex;
  justify-content:space-between;
  font-size:12.8px;
  margin-bottom:4px;
">

<span style="font-weight:600;color:#0f172a">
${escapeHtml(skill.name)}
</span>

<span style="font-size:11px;color:#64748b">
${escapeHtml(skill.level || '')}
</span>

</div>

<div style="
  height:6px;
  background:#e5e7eb;
  border-radius:6px;
  overflow:hidden;
">

<div style="
  width:${width}%;
  height:100%;
  background:#2563eb;
  border-radius:6px;
"></div>

</div>

</div>

`;
}).join('')}

</div>

</section>

` : ''}

<!-- LANGUAGES -->

${hasLanguage() ? `

<section style="margin-bottom:24px">

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
Languages
</h2>

<ul style="
  padding-left:18px;
  margin:0;
  font-size:12.8px;
  color:#374151;
">

${data.languages
.filter(lang => lang.name?.trim())
.map(lang => `
<li>
${escapeHtml(lang.name)}
${lang.level ? ` • ${escapeHtml(lang.level)}` : ''}
</li>
`).join('')}

</ul>

</section>
` : ''}


<!-- REFERENCES -->

${hasReferences() ? `

<section>

<h2 style="
  font-size:12px;
  font-weight:800;
  letter-spacing:1.2px;
  text-transform:uppercase;
  color:#2563eb;
  border-bottom:1px solid #e5e7eb;
  padding-bottom:6px;
  margin-bottom:14px;
">
References
</h2>

${data.references.map(ref => `

<div style="
  margin-bottom:14px;
  font-size:12.8px;
  color:#374151;
">

<strong style="color:#0f172a">
${escapeHtml(ref.name)}
</strong>

<div>${escapeHtml(ref.campany || '')}</div>

${ref.phone ? `<div>${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div>${escapeHtml(ref.email)}</div>` : ''}

</div>

`).join('')}

</section>
` : ''}

</div>
`;
}