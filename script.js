
    const fileInput = document.getElementById('fileInput');
    const dropArea = document.getElementById('dropArea');
    const convertBtn = document.getElementById('convertBtn');
    const output = document.getElementById('output');
    const downloadZipBtn = document.getElementById('downloadZip');
    const formatSelect = document.getElementById('formatSelect');
    const scaleSelect = document.getElementById('scaleSelect');
    const jpegQualityInput = document.getElementById('jpegQuality');

    convertBtn.disabled = true;
    downloadZipBtn.disabled = true;


    function updateConvertBtnState() {
      convertBtn.disabled = currentFiles.length === 0;
    }

    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
    }

    let currentFiles = [];
    let lastZipBlobUrl = null;

    // drag & drop UX
    ['dragenter', 'dragover'].forEach(evt => {
      dropArea.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropArea.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation();
        dropArea.classList.remove('dragover');
      });
    });
    dropArea.addEventListener('drop', e => {
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = Array.from(dt.files || []).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
      if (files.length) handleFiles(files);
    });
    // click/keyboard to open file picker
    dropArea.addEventListener('click', () => fileInput.click());
    dropArea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
    });
    fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files || [])));

    function handleFiles(files) {
      const seen = new Map(currentFiles.map(f => [f.name + '_' + f.size, true]));
      files.forEach(f => {
        if (!seen.has(f.name + '_' + f.size)) {
          currentFiles.push(f);
          seen.set(f.name + '_' + f.size, true);
        }
      });

      renderFileListSummary();
      updateConvertBtnState(); // <— NEW LINE
    }


    function renderFileListSummary() {
      output.innerHTML = '';
      if (!currentFiles.length) {
        output.innerHTML = '<div class="note">No files selected yet.</div>';
        updateConvertBtnState(); // <— NEW LINE
        return;
      }
      currentFiles.forEach((f) => {
        const el = document.createElement('div');
        el.className = 'thumb card';
        el.style.padding = '12px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.gap = '12px';

        el.innerHTML = `
         <!-- X REMOVE BUTTON -->
  <button class="remove-file-btn" style="
      position: absolute;
      top: 6px;
      right: 6px;
      background: #ff4d4d;
      color: white;
      border: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
  ">×</button>
      <img src="./images/pdfIcon.jpg" class="pdf-icon" alt="PDF">
      <div class='meta-row'>
         <div class='pdfDetails'>${escapeHtml(f.name)}</div>
         <small style="font-weight: 500; padding:0 10px;">${(f.size / 1024 / 1024).toFixed(2)} MB</small>
      </div>
    `;

        output.appendChild(el);

        // attach remove button listener
const removeBtn = el.querySelector('.remove-file-btn');

removeBtn.addEventListener('click', () => {
    // remove the file using its index
    const idx = currentFiles.indexOf(f);
    if (idx > -1) currentFiles.splice(idx, 1);

    // re-render UI
    renderFileListSummary();
    updateConvertBtnState();
});

      });


      updateConvertBtnState(); // <— NEW LINE
    }



    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c])); }

    // conversion pipeline (same core logic, with small memory-friendly tweaks)
    convertBtn.addEventListener('click', async () => {
      if (!currentFiles.length) return alert('Please add one or more PDF files first.');
      convertBtn.disabled = true; convertBtn.textContent = 'Converting...';
      output.innerHTML = '';
      if (lastZipBlobUrl) { try { URL.revokeObjectURL(lastZipBlobUrl); } catch (e) { } lastZipBlobUrl = null; }

      const zip = new JSZip();
      const format = formatSelect.value;
      const scale = Number(scaleSelect.value) || 1;
      const jpegQuality = Number(jpegQualityInput.value) || 0.92;

      for (let i = 0; i < currentFiles.length; i++) {
        const file = currentFiles[i];
        let arrayBuffer;
        try {
          arrayBuffer = await file.arrayBuffer();
        } catch (err) {
          console.error('file read error', err);
          const errEl = document.createElement('div'); errEl.className = 'thumb card'; errEl.innerHTML = `<div style="font-weight:700">${escapeHtml(file.name)}</div><small style="color:#ff6b6b">Failed to read file</small>`; output.appendChild(errEl);
          continue;
        }

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        let pdf = null;
        try {
          pdf = await loadingTask.promise;
        } catch (err) {
          console.error('Error loading PDF', file.name, err);
          const errEl = document.createElement('div'); errEl.className = 'thumb card'; errEl.innerHTML = `<div style="font-weight:700">${escapeHtml(file.name)}</div><small style="color:#ff6b6b">Failed to open PDF</small>`; output.appendChild(errEl);
          continue;
        }

        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          // safe integer sizes
          canvas.width = Math.max(1, Math.floor(viewport.width * scale));
          canvas.height = Math.max(1, Math.floor(viewport.height * scale));

          const renderContext = { canvasContext: context, viewport: page.getViewport({ scale }) };
          await page.render(renderContext).promise;

          // Enable ZIP button only after successful conversion
          downloadZipBtn.disabled = false;
          downloadZipBtn.removeAttribute('aria-disabled');

          const blob = await new Promise(res => canvas.toBlob(res, format === 'jpeg' ? 'image/jpeg' : 'image/png', jpegQuality));

          const baseName = file.name.replace(/\.pdf$/i, '');
          const pageName = `${baseName}_page_${String(p).padStart(3, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`;
          zip.file(pageName, blob);

          // show thumbnail
          const thumb = document.createElement('div'); thumb.className = 'thumb';
          const url = URL.createObjectURL(blob);
          thumb.innerHTML = `
            <img alt="${escapeHtml(pageName)}" src="${url}" />
            <div class="meta-row">
              <small title="${escapeHtml(pageName)}">${escapeHtml(pageName)}</small>
              <a class="download-btn" download="${escapeHtml(pageName)}" href="${url}">Download</a>
            </div>
          `;
          output.appendChild(thumb);
        }

        try { pdf.cleanup && pdf.cleanup(); pdf.destroy && pdf.destroy(); } catch (e) { }
      }

      convertBtn.textContent = 'Finalizing ZIP...';
      try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        lastZipBlobUrl = URL.createObjectURL(zipBlob);
        downloadZipBtn.href = lastZipBlobUrl;
        downloadZipBtn.download = `pdf-images-${Date.now()}.zip`;
        downloadZipBtn.disabled = false;
        downloadZipBtn.removeAttribute('aria-disabled');
        intersactionAd()
        showToast(`Success! Converted ${currentFiles.length} file(s) with a total of ${Array.from(output.querySelectorAll('.thumb')).length} page(s).`);
        
        const blob = await zip.generateAsync({ type: 'blob' });
        lastZipBlobUrl = URL.createObjectURL(blob);
        downloadZipBtn.disabled = false;
        downloadZipBtn.removeAttribute('aria-disabled');

      } catch (e) {
        console.error('zip error', e);
        showToast('Failed to create ZIP file.');
      } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = 'Convert';
      }
    });

    downloadZipBtn.addEventListener('click', (e) => {
      if (downloadZipBtn.disabled) { e.preventDefault(); return; }
      const a = document.createElement('a'); a.href = downloadZipBtn.href; a.download = downloadZipBtn.download || 'pdf-images.zip'; document.body.appendChild(a); a.click(); a.remove();
    });

    function showToast(message, type = "success") {
      const container = document.getElementById("toastContainer");

      const toast = document.createElement("div");
      toast.className = "toast";

      // apply red background for error
      if (type === "error") {
        toast.classList.add("error");
      }

      toast.textContent = message;

      container.appendChild(toast);

      // remove after animation
      setTimeout(() => {
        toast.remove();
      }, 7000);
    }

    // ===== Modern Overlay (Option A) =====

const overlay = document.getElementById("overlay");
const overlayClose = document.querySelector(".overlay-close");
const overlayBody = document.querySelector(".overlay-body");

function openOverlay() {
  overlay.style.display = "flex";

  overlayBody.innerHTML = `

    <h3>1. Introduction</h3>
    <p>RemoPDF ("we", "our", "the website") is committed to protecting your privacy.
    This Privacy Policy explains how we handle information when you use our free
    PDF-to-Image conversion tool. By accessing or using the RemoPDF website, 
    you agree to these Terms & Conditions. If you do not agree, please stop using the site immediately.</p>

    <h3>2. No File Uploads — Local Processing Only</h3>
    <p>RemoPDF is designed so that all PDF conversion happens locally on your device using browser technologies (JavaScript, PDF.js).</p>
    <ul>
      <li>Your PDF files NEVER leave your device.</li>
      <li>We do not upload, store, analyze, or access your files in any way.</li>
      <li>No PDFs or converted images are sent to our servers because the processing uses client-side rendering.</li>
      <li>Your files belong entirely to you.</li>
    </ul>

    <h3>3. Information We Do NOT Collect</h3>
    <p>RemoPDF does <strong>NOT</strong> collect or store:</p>
    <ul>
      <li>Personal information</li>
      <li>Email addresses</li>
      <li>Names or contact details</li>
      <li>Uploaded files or images</li>
      <li>IP addresses</li>
      <li>User account data (no account required)</li>
      <li>Payment information</li>
      <li>Conversion history</li>
      <li>Cookies for tracking or analytics</li>
    </ul>
    <p>We do not sell, share, or trade user data with any third party.</p>

    <h3>4. Information We MAY Collect</h3>
    <p>To maintain the site and improve performance, we may use standard, privacy-friendly web hosting logs which can include:</p>
    <ul>
      <li>Browser type</li>
      <li>Device type</li>
      <li>Basic usage statistics (anonymous)</li>
      <li>Error logs when the site fails to load</li>
    </ul>
    <p>These logs:</p>
    <ul>
      <li>Do not identify you personally</li>
      <li>Are used solely for performance monitoring</li>
      <li>Are deleted regularly as part of hosting operations</li>
    </ul>
    <p>We do NOT use Google Analytics or other intrusive trackers unless explicitly stated.</p>

    <h3>5. Cookies</h3>
    <p>RemoPDF does not use cookies for tracking, advertising, or analytics.</p>
    <p>If any cookies appear, they are strictly:</p>
    <ul>
      <li>Temporary</li>
      <li>Functional</li>
      <li>Required for the website to operate</li>
    </ul>

    <h3>6. Third-Party Services</h3>
    <p>RemoPDF uses the following open-source libraries:</p>
    <ul>
      <li><strong>PDF.js</strong> — for rendering PDF pages</li>
      <li><strong>JSZip</strong> — for ZIP creation</li>
    </ul>
    <p>These libraries run entirely in your browser and do not transmit your data externally.</p>
    <p>If you click external links (e.g., ads, social media, support email), those sites have their own privacy policies.</p>

    <h3>7. Data Security</h3>
    <p>Because your files never leave your browser:</p>
    <ul>
      <li>There is no risk of your PDF being intercepted or stored by RemoPDF</li>
      <li>You retain full control over your files at all times</li>
    </ul>
    <p>However, you should always ensure:</p>
    <ul>
      <li>Your device is secure</li>
      <li>Your browser is up to date</li>
      <li>You trust the network you are using</li>
    </ul>

    <h3>8. Children’s Privacy</h3>
    <p>RemoPDF is safe for all ages and does not collect personal information.
    However, minors should always use the internet responsibly.</p>

    <h3>9. Changes to This Policy</h3>
    <p>We may update this Privacy Policy over time.
    By continuing to use the site, you agree to the most recent version.</p>

    <h3>10. Contact Us</h3>
    <p>If you have any questions or concerns:</p>
    <p><strong>Email:</strong>tmsoftwaresprivacy@outlook.com</p>
  `;
}


overlayClose.onclick = () => overlay.style.display = "none";

overlay.addEventListener("click", (e) => {
  if (e.target === overlay) overlay.style.display = "none"; // click outside to close
});


const EMAILJS_SERVICE_ID = 'service_a7c5ag9';
const EMAILJS_TEMPLATE_ID = 'template_5bc1mt5';
const EMAILJS_PUBLIC_KEY = 'drD2CBWiRuBzQGBEO';

// Initialize EmailJS
if (window.emailjs) {
  emailjs.init(EMAILJS_PUBLIC_KEY);
} else {
  console.warn('EmailJS not loaded; contact form will not send emails.');
}

/* ---------- UI references ---------- */
const contactOverlay = document.getElementById('contactOverlay');
const contactForm = document.getElementById('contactForm');
const contactError = document.getElementById('contactError');
const sendContactBtn = document.getElementById('sendContact');
const cancelContactBtn = document.getElementById('cancelContact');
const overlayCloseButtons = document.querySelectorAll('.overlay-close[data-target="contactOverlay"], .overlay-close');
const navContactLink = document.querySelector('.nav-right a[href="#"]');
const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'success') {
  const container = toastContainer || document.getElementById('toastContainer') || document.body;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.textContent = message;
  // pointer events allowed on toasts only
  if (!toastContainer) {
    toast.style.position = 'fixed';
    toast.style.top = '16px';
    toast.style.right = '16px';
    toast.style.zIndex = '99999';
  }
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 7000);
}

function setContactError(message) {
  if (!contactError) return;
  if (!message) {
    contactError.style.display = 'none';
    contactError.textContent = '';
    return;
  }
  contactError.style.display = 'block';
  contactError.textContent = message;
  // ensure error is visible to screen readers
  contactError.setAttribute('role', 'alert');
}

/* Overlay open/close with focus management */
function openContactOverlay() {
  contactOverlay.style.display = 'flex';
  contactOverlay.setAttribute('aria-hidden', 'false');
  // focus first input
  const firstInput = contactOverlay.querySelector('input, textarea, button');
  if (firstInput) firstInput.focus();
  // clear previous error
  setContactError('');
}

function closeContactOverlay() {
  contactOverlay.style.display = 'none';
  contactOverlay.setAttribute('aria-hidden', 'true');
  // return focus to contact button (if exists)
  const contactBtn = document.querySelector('.contact-open-btn') || document.querySelector('.nav-right a[href="#"]');
  if (contactBtn) contactBtn.focus();
}

/* hook the nav "Contact" link to open overlay) */
const contactLinks = Array.from(document.querySelectorAll('.nav-right a')).filter(a => /contact/i.test(a.textContent));
if (contactLinks.length) {
  contactLinks.forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      openContactOverlay();
    });
  });
}

/* close handlers (X and cancel) */
cancelContactBtn.addEventListener('click', (e) => {
  e.preventDefault();
  setContactError('');
  closeContactOverlay();
});

contactOverlay.addEventListener('click', (e) => {
  // if clicking on backdrop itself, close overlay
  if (e.target === contactOverlay) {
    setContactError('');
    closeContactOverlay();
  }
});

// close X buttons specifically targeting this overlay
Array.from(document.querySelectorAll('.overlay-close')).forEach(btn => {
  btn.addEventListener('click', (ev) => {
    const target = btn.getAttribute('data-target') || '';
    if (!target || target === 'contactOverlay') {
      setContactError('');
      if (contactOverlay.style.display === 'flex') closeContactOverlay();
      else {
        const mainOverlay = document.getElementById('overlay');
        if (mainOverlay) mainOverlay.style.display = 'none';
      }
    }
  });
});

function validateContactForm() {
  const name = contactForm.name.value.trim();
  const email = contactForm.email.value.trim();
  const message = contactForm.message.value.trim();

  if (!name) return 'Please enter your name.';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) return 'Please enter a valid email address.';
  if (!message || message.length < 6) return 'Message must be at least 6 characters.';
  return null;
}

/* ---------- Submitting the form with EmailJS ---------- */
contactForm.addEventListener('submit', (e) => {
  e.preventDefault();
  setContactError('');
  const validationError = validateContactForm();
  if (validationError) {
    setContactError(validationError);
    return;
  }

  // disable send button while sending
  sendContactBtn.disabled = true;
  sendContactBtn.textContent = 'Sending...';

  // build template params expected by your EmailJS template
  const templateParams = {
    from_name: contactForm.name.value.trim(),
    from_email: contactForm.email.value.trim(),
    message: contactForm.message.value.trim(),
    // add more fields if your template expects them
  };

  // If EmailJS isn't loaded, fail gracefully
  if (!window.emailjs || !emailjs.send) {
    setContactError('Email service unavailable. Please try again later.');
    sendContactBtn.disabled = false;
    sendContactBtn.textContent = 'Send';
    return;
  }

  // send via EmailJS
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then((response) => {
      // success: close overlay, show toast, reset form
      closeContactOverlay();
      contactForm.reset();
      showToast('Message sent. Thanks!', 'success');
    })
    .catch((err) => {
      // failure: keep overlay open, show inline error and toast
      console.error('EmailJS send error:', err);
      setContactError('Failed to send message. Please try again or email us directly.');
      showToast('Failed to send message.', 'error');
    })
    .finally(() => {
      sendContactBtn.disabled = false;
      sendContactBtn.textContent = 'Send';
    });
});

/* ---------- Accessibility: trap focus inside overlay while open (simple) ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // close contact overlay on Escape
    if (contactOverlay.style.display === 'flex') {
      setContactError('');
      closeContactOverlay();
    }
    // also hide the privacy overlay (existing)
    const mainOverlay = document.getElementById('overlay');
    if (mainOverlay && mainOverlay.style.display === 'flex') mainOverlay.style.display = 'none';
  }
});

/* ---------- Ensure the contact overlay is hidden by default ---------- */
contactOverlay.style.display = 'none';
contactOverlay.setAttribute('aria-hidden', 'true');
setContactError('');


    // initial UI
    renderFileListSummary();

    function intersactionAd(){
    (function(s){s.dataset.zone='10291964',s.src='https://groleegni.net/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))
    }
