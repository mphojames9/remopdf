const overlay = document.getElementById('pdfOverlay');
const openBtn = document.querySelector('.tool-card'); // merge card
const closeBtn = document.getElementById('closeOverlay');

const uploadZone = document.getElementById('uploadZone');
const pdfInput = document.getElementById('pdfInput');
const pdfList = document.getElementById('pdfList');
const mergeBtn = document.getElementById('mergeBtn');

let pdfFiles = [];
/* ===========================
   PDF.JS SETUP (REQUIRED)
   =========================== */

/* ===========================
   PDF.JS SETUP (CORRECT)
   =========================== */

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
