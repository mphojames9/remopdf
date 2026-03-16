const textarea = document.getElementById("summary");
export default function updateCounter(){
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


${data.summary && data.summary.trim() ? `

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
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

<p style="color:#374151;font-size:14px">
${escapeHtml(data.summary)}
</p>

</section>

` : ''}


${hasExperience() ? `

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Professional Experience
</h2>

${data.experience.map(exp => `

<div style="margin-bottom:24px">

<div style="display:flex;justify-content:space-between;flex-wrap:wrap;margin-bottom:4px">

<strong style="font-size:15px;color:#0f172a;font-weight:700">
${escapeHtml(exp.role)}
</strong>

<span style="font-size:13px;color:#6b7280">
${[exp.start, exp.end].filter(d => d && d.trim()).join(' - ')}
</span>

</div>

<div style="font-size:13px;color:#374151;font-weight:600;margin-bottom:6px">
${escapeHtml(exp.campany)}
</div>

${exp.bullets && exp.bullets.length ? `

<ul style="padding-left:18px;margin-top:6px;line-height:1.7">

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


${hasEducation() ? `

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
font-weight:700;
text-transform:uppercase;
letter-spacing:1.4px;
color:${accentColor};
border-bottom:2px solid #e5e7eb;
padding-bottom:8px;
margin-bottom:16px;
">
Education
</h2>

${data.education.map(edu => `

<div style="margin-bottom:18px">

<strong style="font-size:15px;color:#0f172a">
${escapeHtml(edu.degree)}
</strong>

<div style="font-size:13px;color:#374151;margin-top:4px">
${escapeHtml(edu.school)}
${edu.year ? ` • ${escapeHtml(edu.year)}` : ''}
</div>

</div>

`).join('')}

</section>

` : ''}


${hasSkills() ? `

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
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

<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">

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


${hasLanguage() ? `

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
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

          return `

<div>

<div style="
display:flex;
justify-content:space-between;
font-size:13px;
margin-bottom:4px;
">

<span style="font-weight:600;color:#1f2937">
${escapeHtml(lang.name)}
</span>

<span style="color:#6b7280">
${escapeHtml(lang.level || '')}
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

<section style="margin-bottom:34px">

<h2 style="
font-size:13px;
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

<section>

<h2 style="
font-size:13px;
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

${ref.phone ? `<div style="font-size:13px">${escapeHtml(ref.phone)}</div>` : ''}
${ref.email ? `<div style="font-size:13px">${escapeHtml(ref.email)}</div>` : ''}

</div>

`).join('')}

</section>

` : ''}

</div>
`;
}

