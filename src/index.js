const overlay = document.getElementById('pdfOverlay');
  const openBtn = document.querySelector('.tool-card'); // merge card
  const closeBtn = document.getElementById('closeOverlay');

  const uploadZone = document.getElementById('uploadZone');
  const pdfInput = document.getElementById('pdfInput');
  const pdfList = document.getElementById('pdfList');
  const mergeBtn = document.getElementById('mergeBtn');

  let pdfFiles = [];

  const pdfjsLib = window.pdfjsLib;

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';



  /* Open / Close */
  openBtn.addEventListener('click', () => overlay.classList.add('active'));
  closeBtn.addEventListener('click', () => overlay.classList.remove('active'));

  /* Upload */
  uploadZone.addEventListener('click', () => pdfInput.click());

  pdfInput.addEventListener('change', e => {
    [...e.target.files].forEach(addFile);
  });

  uploadZone.addEventListener('dragover', e => {
    e.preventDefault();
    uploadZone.style.background = '#eef2ff';
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.background = '';
  });

  uploadZone.addEventListener('drop', e => {
    e.preventDefault();
    uploadZone.style.background = '';
    [...e.dataTransfer.files].forEach(addFile);
  });

  function addFile(file) {
    if (file.type !== 'application/pdf') return;

    pdfFiles.push(file);
    renderList();
  }

  /* Preview */
  function renderList() {
    pdfList.innerHTML = '';
    pdfFiles.forEach((file, index) => {
      const li = document.createElement('li');
      li.className = 'pdf-item';
      li.innerHTML = `
      <span>${file.name}</span>
      <button onclick="removeFile(${index})">✕</button>
    `;
      pdfList.appendChild(li);
    });

    mergeBtn.disabled = pdfFiles.length < 2;
  }

  window.removeFile = index => {
    pdfFiles.splice(index, 1);
    renderList();
  };

  /* Merge */
  mergeBtn.addEventListener('click', async () => {
    mergeBtn.textContent = 'Merging...';

    const mergedPdf = await PDFLib.PDFDocument.create();
    let totalPages = 0;

    for (const file of pdfFiles) {
      const bytes = await file.arrayBuffer();
      const pdf = await PDFLib.PDFDocument.load(bytes);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
      totalPages += pages.length;
    }

    const mergedBytes = await mergedPdf.save();
    download(mergedBytes, 'merged.pdf');

    showToast(`Merged ${pdfFiles.length} PDFs • ${totalPages} pages`);

    // Fade out overlay
    overlay.classList.add('fade-out');

    setTimeout(() => {
      overlay.classList.remove('active', 'fade-out');
      resetOverlay();
    }, 350);

    mergeBtn.textContent = 'Merge & Download';
  });


  /* Download */
  function download(bytes, name) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
  }

  /* ===========================
     SPLIT PDF OVERLAY (JS ONLY)
     =========================== */

  const splitBtn = document.getElementById('splitBtn');

  splitBtn.addEventListener('click', openSplitOverlay);

  function openSplitOverlay() {
    // Prevent duplicates
    if (document.getElementById('splitOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'splitOverlay';
    overlay.className = 'overlay active';

    overlay.innerHTML = `
    <div class="overlay-backdrop"></div>

    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>Split PDF</h2>
        <button class="close-split" aria-label="Close">✕</button>
      </header>

      <div class="upload-zone split-upload">
        <input type="file" id="splitPdfInput" accept=".pdf" hidden>
        <svg viewBox="0 0 24 24">
        <path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path>
      </svg>
        <p><strong>Drop a PDF here</strong> or click to upload</p>
        <span>Pages will be split into separate files</span>
      </div>

      <button class="merge-btn" id="splitActionBtn" disabled>
        Split & Download
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    /* Close logic */
    overlay.querySelector('.close-split').addEventListener('click', () => closeSplitOverlay(overlay));
    overlay.querySelector('.overlay-backdrop').addEventListener('click', () => closeSplitOverlay(overlay));

    /* Upload click */
    const uploadZone = overlay.querySelector('.split-upload');
    const input = overlay.querySelector('#splitPdfInput');
    const actionBtn = overlay.querySelector('#splitActionBtn');

    uploadZone.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      if (input.files.length) {
        actionBtn.disabled = false;
      }
    });
  }

  /* Close with animation */
  function closeSplitOverlay(overlay) {
    overlay.classList.add('fade-out');

    setTimeout(() => {
      overlay.remove();
    }, 350);
  }

  /* ===========================
     SPLIT PDF ACTION
     =========================== */

  document.addEventListener('click', async (e) => {
    if (e.target.id !== 'splitActionBtn') return;

    const overlay = document.getElementById('splitOverlay');
    const input = overlay.querySelector('#splitPdfInput');
    const btn = e.target;

    if (!input.files.length) return;

    btn.textContent = 'Splitting...';
    btn.disabled = true;

    const file = input.files[0];
    const bytes = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(bytes);
    const totalPages = pdf.getPageCount();

    const zip = new JSZip();

    for (let i = 0; i < totalPages; i++) {
      const newPdf = await PDFLib.PDFDocument.create();
      const [page] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(page);

      const pdfBytes = await newPdf.save();
      zip.file(`page-${i + 1}.pdf`, pdfBytes);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    download(zipBlob, 'split-pages.zip');

    showToast(`Split successful • ${totalPages} pages`);

    /* Smooth close */
    overlay.classList.add('fade-out');

    setTimeout(() => {
      overlay.remove();
    }, 350);
  });




  function showToast(message) {
    const toast = document.getElementById('toast');
    const text = document.getElementById('toastText');

    text.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 5000);
  }

  /* ===========================
     PDF TO JPG OVERLAY
     =========================== */

  const toImagesBtn = document.getElementById('toImages');

  toImagesBtn.addEventListener('click', () => {
    if (document.getElementById('imagesOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'imagesOverlay';
    overlay.className = 'overlay active';

    overlay.innerHTML = `
    <div class="overlay-backdrop"></div>

    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>PDF to JPG</h2>
        <button class="close-images">✕</button>
      </header>

      <div class="upload-zone images-upload">
        <input type="file" id="imagesPdfInput" accept=".pdf" hidden>
        <svg viewBox="0 0 24 24">
        <path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path>
      </svg>
        <p><strong>Drop PDF here</strong> or click to upload</p>
        <span>Each page becomes a JPG</span>
      </div>

      <button class="merge-btn" id="imagesActionBtn" disabled>
        Convert & Download
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    overlay.querySelector('.close-images')
      .addEventListener('click', () => closeImagesOverlay());

    overlay.querySelector('.overlay-backdrop')
      .addEventListener('click', () => closeImagesOverlay());

    const zone = overlay.querySelector('.images-upload');
    const input = overlay.querySelector('#imagesPdfInput');
    const btn = overlay.querySelector('#imagesActionBtn');

    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      if (!input.files.length) return;
      btn.disabled = false;
    });

  });

  function closeImagesOverlay() {
    const overlay = document.getElementById('imagesOverlay');
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  }

  /* ===========================
     PDF → JPG CONVERSION
     =========================== */

  document.addEventListener('click', async e => {
    if (e.target.id !== 'imagesActionBtn') return;

    const overlay = document.getElementById('imagesOverlay');
    const input = overlay.querySelector('#imagesPdfInput');
    const btn = e.target;

    btn.textContent = 'Converting...';
    btn.disabled = true;

    const file = input.files[0];
    const buffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const totalPages = pdf.numPages;

    const zip = new JSZip();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum);

      const viewport = page.getViewport({ scale: 2 }); // quality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const blob = await new Promise(res =>
        canvas.toBlob(res, 'image/jpeg', 0.95)
      );

      zip.file(`page-${pageNum}.jpg`, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    download(zipBlob, 'pdf-images.zip');

    showToast(`Converted ${totalPages} pages to JPG`);

    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  });


  /* ===========================
     COMPRESS PDF OVERLAY
     =========================== */

  const compressBtn = document.getElementById('compressBtn');

  compressBtn.addEventListener('click', openCompressOverlay);

  function openCompressOverlay() {
    if (document.getElementById('compressOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'compressOverlay';
    overlay.className = 'overlay active';

    overlay.innerHTML = `
  <div class="overlay-backdrop"></div>

  <div class="overlay-panel">
    <header class="overlay-header">
      <h2>Compress PDF</h2>
      <button class="close-compress">✕</button>
    </header>

    <div class="upload-zone compress-upload">
      <input type="file" id="compressPdfInput" accept=".pdf" hidden>
      <svg viewBox="0 0 24 24">
        <path d="M12 16V4M7 9l5-5 5 5M4 20h16"></path>
      </svg>
      <p><strong>Drop PDF here</strong> or click to upload</p>
      <span>High-quality smart compression</span>
    </div>

    <!-- ✅ Progress -->
    <div class="progress-wrap" hidden>
      <div class="progress-text" id="compressProgressText">Preparing…</div>
      <div class="progress-bar">
        <div class="progress-fill" id="compressProgressFill"></div>
      </div>
    </div>

    <button class="merge-btn" id="compressActionBtn" disabled>
      Compress & Download
    </button>
  </div>
`;


    document.body.appendChild(overlay);

    /* Close */
    overlay.querySelector('.close-compress')
      .addEventListener('click', () => closeCompressOverlay());

    overlay.querySelector('.overlay-backdrop')
      .addEventListener('click', () => closeCompressOverlay());

    /* Upload */
    const zone = overlay.querySelector('.compress-upload');
    const input = overlay.querySelector('#compressPdfInput');
    const btn = overlay.querySelector('#compressActionBtn');

    zone.addEventListener('click', () => input.click());

    input.addEventListener('change', () => {
      if (input.files.length) btn.disabled = false;
    });
  }

  function closeCompressOverlay() {
    const overlay = document.getElementById('compressOverlay');
    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  }


  document.addEventListener('click', async e => {
    if (e.target.id !== 'compressActionBtn') return;

    const overlay = document.getElementById('compressOverlay');
    const input = overlay.querySelector('#compressPdfInput');
    const btn = e.target;

    const progressWrap = overlay.querySelector('.progress-wrap');
    const progressFill = overlay.querySelector('#compressProgressFill');
    const progressText = overlay.querySelector('#compressProgressText');

    if (!input.files.length) return;

    btn.disabled = true;
    btn.textContent = 'Compressing…';
    progressWrap.hidden = false;

    const file = input.files[0];
    const originalBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: originalBuffer }).promise;
    const totalPages = pdf.numPages;

    const newPdf = await PDFLib.PDFDocument.create();

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      progressText.textContent = `Compressing page ${pageNum} of ${totalPages}`;
      progressFill.style.width =
        `${Math.round((pageNum - 1) / totalPages * 100)}%`;

      const page = await pdf.getPage(pageNum);

      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(1.6, 1200 / baseViewport.width);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const isTextHeavy =
        (await page.getTextContent()).items.length > 200;

      const blob = await new Promise(res =>
        canvas.toBlob(
          b => res(b),
          isTextHeavy ? 'image/png' : 'image/jpeg',
          isTextHeavy ? undefined : 0.82
        )
      );

      if (!blob) continue;

      const imageBytes = await blob.arrayBuffer();

      const image = isTextHeavy
        ? await newPdf.embedPng(imageBytes)
        : await newPdf.embedJpg(imageBytes);

      const pdfPage = newPdf.addPage([image.width, image.height]);
      pdfPage.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height
      });
    }

    progressFill.style.width = '100%';
    progressText.textContent = 'Finalizing PDF…';

    const compressedBytes = await newPdf.save();

    const beforeMB = (originalBuffer.byteLength / 1024 / 1024).toFixed(2);
    const afterMB = (compressedBytes.byteLength / 1024 / 1024).toFixed(2);

    download(compressedBytes, 'compressed.pdf');
    showToast(`Compressed ${beforeMB} MB → ${afterMB} MB`);

    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  });

  const reveals = document.querySelectorAll(
    '.feature-card, .stat-box, .cta-wrap, .footer-grid > div, .showcase-row'
  );


  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal', 'show');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  reveals.forEach(el => {
    el.classList.add('reveal');
    revealObserver.observe(el);
  });

  /* ================= PARALLAX EFFECT ================= */
  const parallaxEls = document.querySelectorAll('.cta-wrap');

  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    parallaxEls.forEach(el => {
      el.style.transform = `translateY(${y * -0.05}px)`;
    });
  });

  /* ================= COUNTER ANIMATION ================= */
  const counters = document.querySelectorAll('.stat-box strong');

  const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const target = parseInt(el.textContent.replace(/\D/g, ''));
      const isPercent = el.textContent.includes('%');
      const isPlus = el.textContent.includes('+');

      const startTime = performance.now();
      const duration = 1500;

      function animate(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.floor(progress * target);
        el.textContent =
          value + (isPercent ? '%' : isPlus ? '+' : '');

        if (progress < 1) requestAnimationFrame(animate);
      }

      requestAnimationFrame(animate);
      counterObserver.unobserve(el);
    });
  }, { threshold: 0.6 });

  counters.forEach(c => counterObserver.observe(c));

  /* ================= FAQ ACCORDION ================= */
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');

      // close others
      document.querySelectorAll('.faq-item').forEach(i => {
        if (i !== item) i.classList.remove('active');
      });

      item.classList.toggle('active');
    });
  });

  /* ===========================
     IMAGES → PDF OVERLAY
     =========================== */

  const imagesToPdfBtn = document.getElementById('imagesToPdfBtn');

  imagesToPdfBtn.addEventListener('click', () => {
    if (document.getElementById('imgPdfOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'imgPdfOverlay';
    overlay.className = 'overlay active';

    overlay.innerHTML = `
    <div class="overlay-backdrop"></div>

    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>Images to PDF</h2>
        <button class="close-imgpdf">✕</button>
      </header>

      <div class="upload-zone imgpdf-upload">
        <input type="file" id="imgPdfInput" accept="image/*" multiple hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>
        </svg>
        <p><strong>Drop images here</strong> or click to upload</p>
        <span>JPG, PNG supported</span>
      </div>

      <button class="merge-btn" id="imgPdfActionBtn" disabled>
        Convert & Download
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    /* Close */
    overlay.querySelector('.close-imgpdf').onclick = closeImgPdf;
    overlay.querySelector('.overlay-backdrop').onclick = closeImgPdf;

    const zone = overlay.querySelector('.imgpdf-upload');
    const input = overlay.querySelector('#imgPdfInput');
    const btn = overlay.querySelector('#imgPdfActionBtn');

    zone.onclick = () => input.click();
    input.onchange = () => btn.disabled = !input.files.length;

    async function closeImgPdf() {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 350);
    }
  });

  document.addEventListener('click', async e => {
    if (e.target.id !== 'imgPdfActionBtn') return;

    const overlay = document.getElementById('imgPdfOverlay');
    const input = overlay.querySelector('#imgPdfInput');
    const btn = e.target;

    btn.textContent = 'Converting…';
    btn.disabled = true;

    const pdf = await PDFLib.PDFDocument.create();

    for (const file of input.files) {
      const bytes = await file.arrayBuffer();

      const img = file.type.includes('png')
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);

      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, {
        x: 0,
        y: 0,
        width: img.width,
        height: img.height
      });
    }

    const pdfBytes = await pdf.save();
    download(pdfBytes, 'images.pdf');

    showToast(`Converted ${input.files.length} images to PDF`);

    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  });

  /* ===========================
     COMPRESS IMAGES OVERLAY
     =========================== */

  const compressImagesBtn = document.getElementById('compressImagesBtn');
  let imageQuality = 0.7; // DEFAULT – ACTUALLY COMPRESSES

  compressImagesBtn.addEventListener('click', () => {
    if (document.getElementById('imgCompressOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'imgCompressOverlay';
    overlay.className = 'overlay active';

    overlay.innerHTML = `
    <div class="overlay-backdrop"></div>

    <div class="overlay-panel">
      <header class="overlay-header">
        <h2>Compress Images</h2>
        <button class="close-img-compress">✕</button>
      </header>

      <div class="upload-zone img-compress-upload">
        <input type="file" id="imgCompressInput" accept="image/*" multiple hidden>
        <svg viewBox="0 0 24 24">
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>
        </svg>
        <p><strong>Drop images here</strong> or click to upload</p>
        <span>PNG, JPG, WEBP</span>
      </div>

      <div class="quality-wrap">
        <div class="quality-head">
          <span>Quality</span>
          <strong id="qualityValue">70%</strong>
        </div>

        <input
          type="range"
          id="qualitySlider"
          min="20"
          max="90"
          value="70"
        />

        <div class="quality-scale">
          <span>Smaller</span>
          <span>Balanced</span>
          <span>Better</span>
        </div>
      </div>

      <button class="merge-btn" id="imgCompressActionBtn" disabled>
        Compress & Download
      </button>
    </div>
  `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#imgCompressInput');
    const btn = overlay.querySelector('#imgCompressActionBtn');
    const slider = overlay.querySelector('#qualitySlider');
    const qualityLabel = overlay.querySelector('#qualityValue');

    slider.oninput = () => {
      imageQuality = slider.value / 100;
      qualityLabel.textContent = `${slider.value}%`;
    };

    overlay.querySelector('.img-compress-upload').onclick = () => input.click();
    input.onchange = () => btn.disabled = !input.files.length;

    overlay.querySelector('.close-img-compress').onclick = close;
    overlay.querySelector('.overlay-backdrop').onclick = close;

    function close() {
      overlay.classList.add('fade-out');
      setTimeout(() => overlay.remove(), 350);
    }
  });

  /* ===========================
     IMAGE COMPRESSION LOGIC
     =========================== */

  document.addEventListener('click', async e => {
    if (e.target.id !== 'imgCompressActionBtn') return;

    const overlay = document.getElementById('imgCompressOverlay');
    const input = overlay.querySelector('#imgCompressInput');
    const btn = e.target;

    btn.textContent = 'Compressing…';
    btn.disabled = true;

    const zip = new JSZip();
    let before = 0;
    let after = 0;

    for (const file of input.files) {
      before += file.size;

      const img = await loadImage(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // ✅ FORCE DOWNSCALE
      const MAX_WIDTH = 1600;
      let { width, height } = img;

      if (width > MAX_WIDTH) {
        height = height * (MAX_WIDTH / width);
        width = MAX_WIDTH;
      }

      canvas.width = Math.floor(width);
      canvas.height = Math.floor(height);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // ✅ FORCE JPEG + REAL QUALITY DROP
      const blob = await new Promise(res =>
        canvas.toBlob(res, 'image/jpeg', imageQuality)
      );

      after += blob.size;
      zip.file(file.name.replace(/\.\w+$/, '.jpg'), blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    download(zipBlob, 'compressed-images.zip');

    showToast(
      `Images compressed: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB`
    );

    overlay.classList.add('fade-out');
    setTimeout(() => overlay.remove(), 350);
  });

  /* ===========================
     HELPERS
     =========================== */

  function loadImage(file) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = URL.createObjectURL(file);
    });
  }

  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  let lastScrollY = window.scrollY;

  // Toggle menu
  toggle.addEventListener('click', () => {
    links.classList.toggle('open');
  });

  // Auto-close menu on scroll
  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    // Close if menu is open and user scrolls
    if (links.classList.contains('open') && currentScroll !== lastScrollY) {
      links.classList.remove('open');
    }

    lastScrollY = currentScroll;
  }, { passive: true });

  const EMAILJS_SERVICE_ID = 'service_a7c5ag9';
const EMAILJS_TEMPLATE_ID = 'template_5bc1mt5';
const EMAILJS_PUBLIC_KEY = 'drD2CBWiRuBzQGBEO';

emailjs.init(EMAILJS_PUBLIC_KEY);

const overlayContact = document.getElementById('overlay-contact');
const openContactBtn = document.getElementById('overlay-contact-open');
const closeContactBtn = document.getElementById('overlay-contact-close');
const contactForm = document.getElementById('overlay-contact-form');
const contactStatus = document.getElementById('overlay-contact-status');
const contactBackdrop = overlayContact.querySelector('.overlay-contact-backdrop');

openContactBtn.onclick = () => {
  overlayContact.classList.remove('hidden');
  requestAnimationFrame(() => overlayContact.classList.add('show'));
};

function closeOverlayContact() {
  overlayContact.classList.remove('show');
  setTimeout(() => overlayContact.classList.add('hidden'), 400);
}

closeContactBtn.onclick = closeOverlayContact;
contactBackdrop.onclick = closeOverlayContact;

contactForm.onsubmit = (e) => {
  e.preventDefault();
  contactStatus.textContent = 'Sending…';

  emailjs.sendForm(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    contactForm
  ).then(() => {
    contactStatus.textContent = 'Message sent ✔';
    contactForm.reset();
  }).catch(() => {
    contactStatus.textContent = 'Failed to send ✖';
  });
};

document.addEventListener('DOMContentLoaded', () => {

  const form = document.getElementById('overlay-contact-form');
  const status = document.getElementById('overlay-contact-status');
  const sendBtn = form.querySelector('.overlay-contact-send');

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  function showError(field, message) {
    field.classList.add('error');

    let err = field.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      field.parentElement.appendChild(err);
    }
    err.textContent = message;
  }

  function clearError(field) {
    field.classList.remove('error');
    const err = field.parentElement.querySelector('.field-error');
    if (err) err.remove();
  }

  function validate() {
    let valid = true;

    const name = form.elements['name'];
    const email = form.elements['email'];
    const message = form.elements['message'];

    clearError(name);
    clearError(email);
    clearError(message);

    if (!name.value.trim()) {
      showError(name, 'Name is required');
      valid = false;
    }

    if (!email.value.trim()) {
      showError(email, 'Email is required');
      valid = false;
    } else if (!emailRegex.test(email.value)) {
      showError(email, 'Enter a valid email address');
      valid = false;
    }

    if (message.value.trim().length < 5) {
      showError(message, 'Message must be at least 5 characters');
      valid = false;
    }

    sendBtn.disabled = !valid;
    return valid;
  }

  // Live validation
  form.addEventListener('input', validate);

  // Submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = '';

    if (!validate()) {
      status.textContent = 'Please fix the errors above.';
      return;
    }

    sendBtn.disabled = true;
    status.textContent = 'Sending…';

    emailjs.sendForm(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      form
    ).then(() => {
      status.textContent = 'Message sent successfully ✔';
      form.reset();
      sendBtn.disabled = false;
    }).catch(() => {
      status.textContent = 'Failed to send. Try again.';
      sendBtn.disabled = false;
    });
  });

});

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelector('.editor')
    .addEventListener('click', () => {
      window.location.href = './editor/index.html';
    });
});


 const cards = document.querySelectorAll(".tool-card");

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  cards.forEach(card => observer.observe(card));

  cards.forEach(card => {
  card.addEventListener("mousemove", e => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--y", `${e.clientY - rect.top}px`);
  });
});

window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-5DVQSP1FKH');
