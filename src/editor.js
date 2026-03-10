
    /* ======================================

    /* ---------- PDF.JS WORKER ---------- */
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

    /* ---------- STATE ---------- */
    const state = {
      pdf: null,
      page: 1,
      total: 0,
      zoom: 1,
      minZoom: 0.5,
      maxZoom: 2,
      textMode: false
    };
    // ✅ per-page rotation (degrees)
    const pageRotation = {};
    const deletedPages = new Set();



    /* ---------- ELEMENTS ---------- */
    const canvas = document.getElementById("pdfCanvas");
    const ctx = canvas.getContext("2d");
    const drawCanvas = document.getElementById("drawCanvas");
    const eraseCanvas = document.getElementById("eraseCanvas");

    const drawCtx = drawCanvas.getContext("2d");
    const eraseCtx = eraseCanvas.getContext("2d");

    drawCtx.lineCap = eraseCtx.lineCap = "round";
    drawCtx.lineJoin = eraseCtx.lineJoin = "round";

    // 🔥 eraser mode
    eraseCtx.globalCompositeOperation = "source-over";

    const textLayer = document.getElementById("textLayer");

    const uploadBtn = document.getElementById("uploadBtn");
    const pdfInput = document.getElementById("pdfInput");
    const textTool = document.getElementById("textTool");

    const zoomInBtn = document.getElementById("zoomIn");
    const zoomOutBtn = document.getElementById("zoomOut");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    const pageNowEl = document.getElementById("pageNow");
    const pageTotalEl = document.getElementById("pageTotal");
    const zoomLabel = document.getElementById("zoomLabel");
    const rotateBtn = document.getElementById("rotateBtn");
    const el = document.createElement("div");
    const noTool = document.querySelector('#notool')

    const stage = document.getElementById("stage");
    const page = document.getElementById("page");

    const penState = {
      tool: "pen", // "pen" | "eraser"
      size: 8
    };
    const toolPen = document.querySelector('[title="Sign"]');
    const toolEraser = document.querySelector('[title="Signature"]');
    const toolText = document.getElementById("textTool");
    const toolMove = document.getElementById("moveBtn");

    const sizeSliderWrap = document.getElementById("inkSizeWrap");
    let selectedImage = null;


    const eraserBtn = document.querySelector('[title="Signature"]');
    const penBtn = document.querySelector('[title="Sign"]');
    const rotateHandle = document.createElement("div");
    const handle = document.createElement("div");
    const imageBtn = document.getElementById('imageTool');
    const imageInput = document.getElementById('imageInput');
    const imageLayer = document.getElementById('imageLayer');
    let points = [];

    /* ---------- Bottom Image Controls ---------- */

    const imageBottomBar = document.createElement("div");
    imageBottomBar.className = "image-bottom-bar";
    document.querySelector('.layout').appendChild(imageBottomBar);


    const undoStack = [];
    const redoStack = [];

    const uploadOverlay = document.getElementById("uploadOverlay");
    const overlayUploadBtn = document.getElementById("overlayUploadBtn");

    const uploadProgress = document.getElementById("uploadProgress");
    const progressFill = uploadProgress.querySelector(".progress-fill");
    let isDraggingImage = false;
    let startX = 0;
    let startY = 0;
    let imgStartLeft = 0;
    let imgStartTop = 0;


    function startLoadingProgress() {
      overlayUploadBtn.style.display = "none";
      uploadProgress.classList.remove("hidden");

      setProgress(5);
    }

    function setProgress(value) {
      progressFill.style.width = `${value}%`;
    }

    function finishLoadingProgress() {
      setProgress(100);
      setTimeout(() => {
        uploadOverlay.classList.add("hidden");
      }, 300);
    }


    // open file picker
    overlayUploadBtn.onclick = () => pdfInput.click();

    // show overlay when no PDF
    function showUploadOverlay() {
      uploadOverlay.classList.remove("hidden");
    }

    function hideUploadOverlay() {
      uploadOverlay.classList.add("hidden");
    }


    /* ===============================
       JS-CREATED UPLOAD OVERLAY
       =============================== */

    const uploadUI = (() => {
      const overlay = document.createElement("div");
      overlay.id = "jsUploadOverlay";

      overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: none;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(circle at 30% 20%, rgba(79,70,229,.18), transparent 60%),
      radial-gradient(circle at 70% 80%, rgba(34,197,94,.18), transparent 60%),
      rgba(15,23,42,.7);
    backdrop-filter: blur(16px);
    transition: opacity .35s ease;
  `;

      overlay.innerHTML = `
    <div style="
      width: min(90vw, 420px);
      background: linear-gradient(180deg,#fff,#f8fafc);
      border-radius: 22px;
      padding: 34px 30px;
      text-align: center;
      box-shadow: 0 40px 90px rgba(0,0,0,.35);
      animation: uploadPop .6s cubic-bezier(.2,.8,.2,1);
    ">
      <div style="
        width: 72px;
        height: 72px;
        margin: 0 auto 16px;
        border-radius: 18px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg,#4f46e5,#6366f1);
        color: white;
        font-size: 28px;
        font-weight: 700;
        box-shadow: 0 18px 36px rgba(79,70,229,.5);
      ">⬆</div>

      <div id="uploadStatusText" style="
        font-size: 16px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 18px;
      ">Preparing upload…</div>

      <div style="
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #e5e7eb;
        overflow: hidden;
      ">
        <div id="uploadProgressFill" style="
          height: 100%;
          width: 0%;
          background: linear-gradient(90deg,#4f46e5,#22c55e);
          transition: width .25s ease;
        "></div>
      </div>
    </div>
  `;

      const style = document.createElement("style");
      style.textContent = `
    @keyframes uploadPop {
      from { transform: translateY(24px) scale(.96); opacity: 0; }
      to { transform: none; opacity: 1; }
    }
  `;

      document.head.appendChild(style);
      document.body.appendChild(overlay);

      const fill = overlay.querySelector("#uploadProgressFill");
      const text = overlay.querySelector("#uploadStatusText");

      return {
        show(msg = "Loading PDF…") {
          text.textContent = msg;
          fill.style.width = "0%";
          overlay.style.display = "flex";
          overlay.style.opacity = "1";
        },
        setProgress(v, msg) {
          fill.style.width = `${v}%`;
          if (msg) text.textContent = msg;
        },
        hide() {
          overlay.style.opacity = "0";
          setTimeout(() => overlay.style.display = "none", 300);
          applyZoom();
        }
      };
    })();


    /* ======================================
       LOAD PDF
       ====================================== */
    let originalPdfBytes = null;


    async function loadPDF(file) {
      uploadUI.setProgress(10, "Reading file…");

      const buffer = await file.arrayBuffer();
      uploadUI.setProgress(30, "Parsing PDF…");

      originalPdfBytes = buffer.slice(0);
      const pdfJsBytes = buffer.slice(0);

      state.pdf = await pdfjsLib.getDocument({ data: pdfJsBytes }).promise;
      uploadUI.setProgress(55, "Preparing pages…");

      state.total = state.pdf.numPages;
      state.page = 1;
      pageTotalEl.textContent = state.total;

      await render();
      uploadUI.setProgress(75, "Rendering thumbnails…");

      await renderThumbnails();
      uploadUI.setProgress(95, "Finalizing…");

      snapshot();

      uploadUI.setProgress(100, "Ready");

      setTimeout(() => {
        uploadUI.hide();          // JS overlay
        hideUploadOverlay();      // ✅ HTML overlay

        uploadBtn.classList.remove("active");
        uploadBtn.style.pointerEvents = "";
      }, 350);

    }


    function bindImageSelection(el) {
      el.addEventListener("mousedown", e => {
        e.stopPropagation();
        selectImage(el);
      });
    }

    function selectImage(el) {
      clearImageSelection();

      selectedImage = el;
      el.classList.add("selected");

      showImageControls(el); // 🔥 REQUIRED

    }


    function clearImageSelection() {
      imageLayer.querySelectorAll(".image-item.selected")
        .forEach(el => el.classList.remove("selected"));
      selectedImage = null;
    }

    function showImageControls(selectedImageItem) {

      imageBottomBar.innerHTML = "";

      // ----- CREATE ROTATE HANDLE -----
      const rotateHandle = document.createElement("div");
      rotateHandle.className = "image-rotate-handle";

      rotateHandle.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
      <path d="M21 12a9 9 0 1 1-3-6.7"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
      <path d="M21 3v6h-6"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

      imageBottomBar.appendChild(rotateHandle);
      makeRotatable(selectedImageItem, rotateHandle);


      // ----- CREATE DELETE BUTTON -----
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "image-delete-btn";
      deleteBtn.textContent = "✕";

      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        selectedImageItem.remove();
        hideImageControls();
        snapshot();
      };

      imageBottomBar.appendChild(deleteBtn);

      imageBottomBar.classList.add("show");
    }


    function hideImageControls() {
      imageBottomBar.classList.remove("show");
    }



    function getAngle(cx, cy, x, y) {
      return Math.atan2(y - cy, x - cx) * (180 / Math.PI);
    }

    function makeRotatable(el, handle) {
      let startAngle = 0;
      let startRotation = 0;
      let activePointerId = null;

      handle.onpointerdown = null;

      handle.addEventListener("pointerdown", (e) => {

        e.preventDefault();
        e.stopPropagation();

        activePointerId = e.pointerId;
        handle.setPointerCapture(activePointerId);

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        startAngle = getAngle(cx, cy, e.clientX, e.clientY);
        startRotation = parseFloat(el.dataset.rotate || "0");

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
      });

      function onMove(e) {
        if (e.pointerId !== activePointerId) return;

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        const currentAngle = getAngle(cx, cy, e.clientX, e.clientY);
        const delta = currentAngle - startAngle;
        const rotation = startRotation + delta;

        el.dataset.rotate = rotation;
        el.style.transform = `rotate(${rotation}deg)`;
      }

      function onUp(e) {
        if (e.pointerId !== activePointerId) return;

        handle.releasePointerCapture(activePointerId);
        activePointerId = null;

        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);

        rotateHandle.style.transition = "transform 0.4s ease-out";
        rotateHandle.style.transform = "rotate(180deg)";
        setTimeout(() => {
          rotateHandle.style.transform = "";
        }, 400);


        snapshot(); // ✅ ONE undo entry
      }
    }
    /* ======================================
       RESIZE INK CANVASES (ONCE PER SIZE)
       ====================================== */

    let _inkCanvasW = 0;
    let _inkCanvasH = 0;

    function resizeInkCanvasesOnce(width, height) {
      if (_inkCanvasW === width && _inkCanvasH === height) return;

      _inkCanvasW = width;
      _inkCanvasH = height;

      drawCanvas.width = width;
      drawCanvas.height = height;

      eraseCanvas.width = width;
      eraseCanvas.height = height;

      // preserve drawing quality
      drawCtx.lineCap = eraseCtx.lineCap = "round";
      drawCtx.lineJoin = eraseCtx.lineJoin = "round";
    }


    /* ======================================
       RENDER PAGE
       ====================================== */
    async function render() {
      const pdfPage = await state.pdf.getPage(state.page);

      // --- 1. get real PDF size ---
      const rawViewport = pdfPage.getViewport({ scale: 1 });
      let pdfRotation = 0;

      // if landscape → rotate PDF internally
      if (rawViewport.width > rawViewport.height) {
        pdfRotation = 90;
      }

      // store rotation for saving / thumbnails
      pageRotation[state.page] = pdfRotation;

      // --- 2. create viewport with internal rotation ---
      const viewport = pdfPage.getViewport({
        scale: 1,
        rotation: pdfRotation
      });

      // --- 3. FORCE editor page to your template size ---
      normalizePageContainer();

      // --- 4. resize canvases to match your template ---
      const W = 611;
      const H = 791;

      pdfCanvas.width = W;
      pdfCanvas.height = H;
      drawCanvas.width = W;
      drawCanvas.height = H;
      eraseCanvas.width = W;
      eraseCanvas.height = H;

      textLayer.style.width = W + "px";
      textLayer.style.height = H + "px";
      imageLayer.style.width = W + "px";
      imageLayer.style.height = H + "px";

      // --- 5. render PDF scaled INTO that box ---
      const scaleX = W / viewport.width;
      const scaleY = H / viewport.height;
      const baseFitScale = Math.min(scaleX, scaleY);

      // 🔥 APPLY ZOOM HERE — SAFE
      const fitScale = baseFitScale * state.zoom;

      const fitViewport = pdfPage.getViewport({
        scale: fitScale,
        rotation: pdfRotation
      });


      const ctx = pdfCanvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // 🔥 CENTER DRAW
      const offsetX = (W - fitViewport.width) / 2;
      const offsetY = (H - fitViewport.height) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);

      await pdfPage.render({
        canvasContext: ctx,
        viewport: fitViewport
      }).promise;

      ctx.restore();


      // --- 6. ALWAYS keep container clean ---
      normalizePageContainer();
    }

    function applyZoom() {
      page.style.transform =
        `scale(${state.zoom}) rotate(${pageRotation[state.page] || 0}deg)`;

      zoomLabel.textContent = Math.round(state.zoom * 100) + "%";
    }



    function applyPageRotation() {
      const pageEl = document.getElementById("page");
      const rot = pageRotation[state.page] || 0;

      pageEl.style.transformOrigin = "center center";
      pageEl.style.transform =
        `scale(${state.zoom}) rotate(${rot}deg)`;

      pageEl.classList.toggle("rotated", rot !== 0);
    }


    function isPageRotated() {
      return (pageRotation[state.page] || 0) !== 0;
    }

    function showEditBlockedToast() {
      const toast = document.getElementById("toast");

      toast.innerHTML = `
    <div class="icon">⚠</div>
    <div class="content">
      <div class="title">Editing disabled</div>
      <div class="desc">
        Editing is not allowed when the page is rotated.
      </div>
    </div>
  `;

      toast.classList.add("show");

      clearTimeout(toast._hideTimer);
      toast._hideTimer = setTimeout(() => {
        toast.classList.remove("show");
      }, 3000);
    }

    /* ======================================
       TEXT TOOL
       ====================================== */
    function addText(x, y) {
      const el = document.createElement("div");
      el.className = "text-box editing placeholder";
      el.contentEditable = true;
      el.dataset.placeholder = "Type here";
      el.textContent = el.dataset.placeholder;

      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.color = "rgba(17,24,39,.45)";

      makeDraggable(el);
      textLayer.appendChild(el);
      el.focus();
      bindTextHistory(el);

      let committed = false; // 🔒 only becomes true after typing

      // ✅ first actual input commits the text box
      el.addEventListener("beforeinput", (e) => {
        if (!committed && e.inputType.startsWith("insert")) {
          committed = true;
          el.classList.remove("placeholder");
          el.textContent = "";
          el.style.color = fontColorInput.value;
          snapshot();

        }
      });

      // ❌ if user never typed, delete it
      el.addEventListener("blur", () => {
        el.classList.remove("editing");
        if (!committed || !el.textContent.trim()) {
          el.remove();
        }
      });

      el.addEventListener("focus", () => {
        el.classList.add("editing");
      });
    }

    function makeDraggable(el) {
      let startX, startY, origX, origY;
      let moved = false;

      const moveHandler = (e) => {
        e.preventDefault();
        const dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
        const dy = (e.touches ? e.touches[0].clientY : e.clientY) - startY;

        if (dx !== 0 || dy !== 0) moved = true;

        el.style.left = origX + dx + "px";
        el.style.top = origY + dy + "px";
      };

      const upHandler = (e) => {
        document.removeEventListener("mousemove", moveHandler);
        document.removeEventListener("mouseup", upHandler);
        document.removeEventListener("touchmove", moveHandler);
        document.removeEventListener("touchend", upHandler);

        if (moved) snapshot();
      };

      el.addEventListener("mousedown", (e) => {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        origX = el.offsetLeft;
        origY = el.offsetTop;
        moved = false;
        document.addEventListener("mousemove", moveHandler);
        document.addEventListener("mouseup", upHandler);
      });

      el.addEventListener("touchstart", (e) => {
        e.preventDefault();
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        origX = el.offsetLeft;
        origY = el.offsetTop;
        moved = false;
        document.addEventListener("touchmove", moveHandler);
        document.addEventListener("touchend", upHandler);
      });
    }


    uploadBtn.onclick = () => {
      uploadBtn.classList.add("active");
      uploadBtn.style.pointerEvents = "none";
      pdfInput.click();
    };


    pdfInput.onchange = e => {

      const file = e.target.files[0];
      if (!file) {
        uploadBtn.classList.remove("active");
        uploadBtn.style.pointerEvents = "";
        uploadUI.hide();
        return;
      }

      uploadUI.show("Reading file…");
      loadPDF(file);
    };



    textTool.onclick = () => {
      state.textMode = !state.textMode;
      textTool.classList.toggle("active", state.textMode);
      document.body.classList.toggle("text-mode", state.textMode);
    };

    textLayer.addEventListener("mousedown", e => {
      if (!state.textMode) return;

      if (isPageRotated()) {
        e.preventDefault();
        showEditBlockedToast();
        return;
      }

      if (!state.textMode) return;
      if (e.target !== textLayer) return;

      e.preventDefault();

      const rect = textLayer.getBoundingClientRect();

      const x = (e.clientX - rect.left) / state.zoom;
      const y = (e.clientY - rect.top) / state.zoom;

      addText(x, y);
    });

    const rotatePageBtn = document.querySelector(
      '.railbtn[title="Rotate"]'
    );
    rotatePageBtn.onclick = () => {
      const p = state.page;

      pageRotation[p] = ((pageRotation[p] || 0) + 90) % 360;

      applyPageRotation();
      snapshot(); // ✅ undo support
    };

    function getPagePoint(e) {
      const rect = page.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / state.zoom,
        y: (e.clientY - rect.top) / state.zoom
      };
    }


    zoomInBtn.onclick = () => {
      if (state.zoom >= state.maxZoom) return;
      state.zoom += 0.1;
      applyZoom();
    };

    zoomOutBtn.onclick = () => {
      if (state.zoom <= state.minZoom) return;
      state.zoom -= 0.1;
      applyZoom();
    };

    prevBtn.onclick = () => {
      if (state.page > 1) {
        state.page--;
        render();
      }
    };

    nextBtn.onclick = () => {
      if (state.page < state.total) {
        state.page++;
        render();
      }
    };

    function makeResizable(el, handle) {
      let startX, startY, startW, startH;
      let activePointerId = null;

      handle.style.touchAction = "none"; // 🔥 REQUIRED

      handle.addEventListener("pointerdown", e => {
        e.preventDefault();
        e.stopPropagation();

        activePointerId = e.pointerId;
        handle.setPointerCapture(activePointerId);

        startX = e.clientX;
        startY = e.clientY;
        startW = el.offsetWidth;
        startH = el.offsetHeight;

        handle.addEventListener("pointermove", onMove);
        handle.addEventListener("pointerup", onUp);
        handle.addEventListener("pointercancel", onUp);
      });

      function onMove(e) {
        if (e.pointerId !== activePointerId) return;

        el.style.width = startW + (e.clientX - startX) + "px";
        el.style.height = startH + (e.clientY - startY) + "px";
      }

      function onUp(e) {
        if (e.pointerId !== activePointerId) return;

        handle.releasePointerCapture(activePointerId);
        activePointerId = null;

        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);

        snapshot(); // ✅ undo entry
      }
    }

    const pageEl = document.getElementById("page");

    pageEl.addEventListener("mousedown", (e) => {
      if (isPageRotated()) {
        e.preventDefault();
        e.stopPropagation();
        showEditBlockedToast();
        return false;
      }
    }, true);



    /* ======================================
       OPTIONAL: CTRL + WHEEL ZOOM
       ====================================== */
    canvas.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) return; // Only zoom with Ctrl + Wheel
      e.preventDefault();

      const delta = Math.sign(e.deltaY);
      state.zoom += delta > 0 ? -0.05 : 0.05;
      state.zoom = Math.min(state.maxZoom, Math.max(state.minZoom, state.zoom));
      render();
    }, { passive: false });

    // Implement pinch-to-zoom for touch
    let touchStartDistance = 0;
    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        touchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        touchStartDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    stage.addEventListener("touchmove", (e) => {
      if (e.touches.length !== 2) return;

      e.preventDefault();

      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );

      const delta = dist - touchStartDistance;

      state.zoom += delta / 300;
      state.zoom = Math.min(state.maxZoom, Math.max(state.minZoom, state.zoom));

      touchStartDistance = dist;

      applyZoom();
    }, { passive: false });

    function normalizePageContainer() {
      const pageEl = document.getElementById("page");

      // 🔒 lock the editor container to ONE state
      pageEl.style.width = "611px";
      pageEl.style.height = "791px";
      pageEl.style.transformOrigin = "center center";
      pageEl.style.transform = "scale(0.9) rotate(0deg)";
    }


    canvas.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        const touchMoveDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const zoomChange = touchMoveDistance - touchStartDistance;
        state.zoom += zoomChange / 500; // Adjust the zoom sensitivity
        state.zoom = Math.min(state.maxZoom, Math.max(state.minZoom, state.zoom));
        touchStartDistance = touchMoveDistance; // Update the distance for next move
        render();
      }
    });
    /* ======================================
   TEXT TOOLBAR (Bottom Center)
   ====================================== */
    const textBar = document.getElementById("textBar");
    const boldBtn = document.querySelector('[data-cmd="bold"]');
    const italicBtn = document.querySelector('[data-cmd="italic"]');
    const fontFamilySelect = document.getElementById("fontFamilySelect");
    const fontSizeSelect = document.getElementById("fontSizeSelect");
    const underlineSelect = document.getElementById("underlineSelect");

    let activeTextBox = null;

    function showTextBar(show) {
      textBar.classList.toggle("show", !!show);
      textBar.setAttribute("aria-hidden", show ? "false" : "true");
    }

    function setUnderlineStyle(el, mode) {
      if (!el) return;

      if (mode === "none") {
        el.style.textDecorationLine = "none";
        el.style.textDecorationStyle = "solid";
        el.style.textDecorationThickness = "auto";
        return;
      }

      el.style.textDecorationLine = "underline";
      if (mode === "single") {
        el.style.textDecorationStyle = "solid";
        el.style.textDecorationThickness = "auto";
      } else if (mode === "double") {
        // double underline
        el.style.textDecorationStyle = "double";
        el.style.textDecorationThickness = "auto";
      } else if (mode === "dotted") {
        el.style.textDecorationStyle = "dotted";
        el.style.textDecorationThickness = "2px";
      }
    }

    function syncToolbarUI() {
      const el = activeTextBox;
      if (!el) {
        boldBtn.classList.remove("is-on");
        italicBtn.classList.remove("is-on");
        return;
      }

      const isBold = (el.style.fontWeight === "700" || el.style.fontWeight === "bold");
      const isItalic = (el.style.fontStyle === "italic");

      boldBtn.classList.toggle("is-on", isBold);
      italicBtn.classList.toggle("is-on", isItalic);

      // keep dropdowns in sync (best effort)
      if (el.style.fontFamily) fontFamilySelect.value = el.style.fontFamily;
      if (el.style.fontSize) fontSizeSelect.value = parseInt(el.style.fontSize, 10) || fontSizeSelect.value;

      // underline sync (best effort)
      const line = (el.style.textDecorationLine || "");
      const style = (el.style.textDecorationStyle || "");
      if (!line || line === "none") underlineSelect.value = "none";
      else if (style === "double") underlineSelect.value = "double";
      else if (style === "dotted") underlineSelect.value = "dotted";
      else underlineSelect.value = "single";
    }

    /* Show toolbar only when Text tool is active */
    const _oldTextToolClick = textTool.onclick;
    textTool.onclick = () => {
      _oldTextToolClick(); // keeps your existing toggle logic
      showTextBar(state.textMode);
      if (!state.textMode) activeTextBox = null;
      syncToolbarUI();
    };

    /* When user clicks a text box, set it active */
    textLayer.addEventListener("mousedown", (e) => {
      const box = e.target.closest(".text-box");
      if (box) {
        activeTextBox = box;
        syncToolbarUI();
      }
    }, true);

    /* When you create a new box, make it active and apply current toolbar settings */
    const _oldAddText = addText;
    addText = function (x, y) {
      _oldAddText(x, y);
      const boxes = textLayer.querySelectorAll(".text-box");
      const el = boxes[boxes.length - 1];
      activeTextBox = el;

      // apply current toolbar dropdown values
      el.style.fontFamily = fontFamilySelect.value;
      el.style.fontSize = fontSizeSelect.value + "px";
      setUnderlineStyle(el, underlineSelect.value);

      syncToolbarUI();
    };

    /* Buttons */
    boldBtn.addEventListener("click", () => {
      if (!activeTextBox) return;
      const nowBold = !(activeTextBox.style.fontWeight === "700" || activeTextBox.style.fontWeight === "bold");
      activeTextBox.style.fontWeight = nowBold ? "700" : "400";
      syncToolbarUI();
      snapshot();
    });

    italicBtn.addEventListener("click", () => {
      if (!activeTextBox) return;
      const nowItalic = activeTextBox.style.fontStyle !== "italic";
      activeTextBox.style.fontStyle = nowItalic ? "italic" : "normal";
      syncToolbarUI();
      snapshot();
    });

    fontFamilySelect.addEventListener("change", () => {
      if (!activeTextBox) return;
      activeTextBox.style.fontFamily = fontFamilySelect.value;
      snapshot();
    });

    fontSizeSelect.addEventListener("change", () => {
      if (!activeTextBox) return;
      activeTextBox.style.fontSize = fontSizeSelect.value + "px";
      snapshot();
    });

    underlineSelect.addEventListener("change", () => {
      if (!activeTextBox) return;
      setUnderlineStyle(activeTextBox, underlineSelect.value);
      snapshot();
    });

    const fontColorBtn = document.getElementById("fontColorBtn");
    const bgColorBtn = document.getElementById("bgColorBtn");

    const fontColorPop = document.getElementById("fontColorPop");
    const bgColorPop = document.getElementById("bgColorPop");

    const fontColorInput = document.getElementById("fontColorInput");
    const bgColorInput = document.getElementById("bgColorInput");

    const fontColorSwatch = document.getElementById("fontColorSwatch");
    const bgColorSwatch = document.getElementById("bgColorSwatch");

    function closePops() {
      fontColorPop.classList.remove("show");
      bgColorPop.classList.remove("show");
    }

    document.addEventListener("click", (e) => {
      const textBox = e.target.closest(".text-box");
      if (!textBox) return;

      // enable text mode
      document.body.classList.add("text-mode");

      // allow editing
      textBox.classList.add("editing");
      textBox.focus();

      // place caret at end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(textBox);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    });

    fontColorBtn.onclick = e => {
      e.stopPropagation();
      closePops();
      fontColorPop.classList.toggle("show");
    };

    bgColorBtn.onclick = e => {
      e.stopPropagation();
      closePops();
      bgColorPop.classList.toggle("show");
    };

    document.addEventListener("click", closePops);

    fontColorPop.onclick = e => {
      const chip = e.target.closest(".tf-chip");
      if (!chip || !activeTextBox) return;
      activeTextBox.style.color = chip.dataset.color;
      fontColorSwatch.style.background = chip.dataset.color;
    };

    bgColorPop.onclick = e => {
      const chip = e.target.closest(".tf-chip");
      if (!chip || !activeTextBox) return;
      activeTextBox.style.background = chip.dataset.color;
      bgColorSwatch.style.background = chip.dataset.color;
    };

    fontColorInput.oninput = () => {
      if (!activeTextBox) return;
      activeTextBox.style.color = fontColorInput.value;
      fontColorSwatch.style.background = fontColorInput.value;
    };

    bgColorInput.oninput = () => {
      if (!activeTextBox) return;
      activeTextBox.style.background = bgColorInput.value;
      bgColorSwatch.style.background = bgColorInput.value;
    };

    const menuBtn = document.querySelector('.menu-btn');
    const rail = document.querySelector('aside.rail');

    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      rail.classList.toggle('open');
    });

    document.getElementById("saveBtn").onclick = async () => {
      if (!originalPdfBytes) return;

      const pdfDoc = await PDFLib.PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      // ✅ REMOVE DELETED PAGES FROM PDF
      const sortedDeleted = [...deletedPages].sort((a, b) => b - a);

      sortedDeleted.forEach(index => {
        if (index >= 0 && index < pdfDoc.getPageCount()) {
          pdfDoc.removePage(index);
        }
      });


      const page = pages[state.page - 1];
      const rot = pageRotation[state.page] || 0;
      page.setRotation(PDFLib.degrees(rot));

      const { width, height } = page.getSize();

      const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

      /* ===============================
         1. SAVE TEXT (unchanged)
         =============================== */
      document.querySelectorAll(".text-box").forEach(el => {
        if (!el.textContent || !el.textContent.trim()) return;

        const x = parseFloat(el.style.left);
        const y = height - parseFloat(el.style.top) - 14;

        const size = parseInt(el.style.fontSize || "14", 10);
        const { r, g, b } = cssColorToRgb(el.style.color);

        page.drawText(el.textContent, {
          x,
          y,
          size,
          font,
          color: PDFLib.rgb(r, g, b)
        });
      });
      flattenImagesToCanvas();
      /* ===============================
         2. SAVE SIGNATURE / INK
         =============================== */
      const inkImage = getInkImage();

      if (inkImage) {
        const pngBytes = await fetch(inkImage).then(r => r.arrayBuffer());
        const pngEmbed = await pdfDoc.embedPng(pngBytes);

        const pngDims = pngEmbed.scale(1);

        page.drawImage(pngEmbed, {
          x: 0,
          y: 0,
          width: pngDims.width,
          height: pngDims.height
        });
      }

      /* ===============================
         3. DOWNLOAD
         =============================== */
      const pdfBytes = await pdfDoc.save();
      downloadPDF(pdfBytes, "edited.pdf");
    };

    function flattenImagesToCanvas() {
      const ctx = drawCanvas.getContext("2d");

      imageLayer.querySelectorAll(".image-item").forEach(item => {
        const img = item.querySelector("img");

        // ✅ HARD GUARDS (this fixes your error)
        if (!img) return;
        if (!img.complete) return;
        if (!img.naturalWidth) return;

        const x = item.offsetLeft;
        const y = item.offsetTop;
        const w = item.offsetWidth;
        const h = item.offsetHeight;

        const rotation = parseFloat(item.dataset.rotate || "0") * Math.PI / 180;

        // 🔄 apply rotation correctly
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotation);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      });
    }



    const bottomBar = document.querySelector('.image-bottom-bar')
    bottomBar.appendChild(rotateHandle);


    bindImageSelection(el);
    imageLayer.appendChild(el);
    snapshot();


    imageLayer.appendChild(el);
    snapshot();

    rotateHandle.className = "image-rotate-handle";
    bottomBar.appendChild(rotateHandle);


    function downloadPDF(bytes, filename) {
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      a.remove();
      URL.revokeObjectURL(url);

      /* =========================
         SHOW SUCCESS TOAST
         ========================= */
      const pageCount = state.total || 1;

      showToast({
        title: "Download complete",
        message: `${pageCount} page${pageCount > 1 ? "s" : ""} saved successfully`
      });
    }


    function cssColorToRgb(color) {
      if (!color) return { r: 0, g: 0, b: 0 };

      // HEX format: #rrggbb
      if (color.startsWith("#")) {
        return {
          r: parseInt(color.slice(1, 3), 16) / 255,
          g: parseInt(color.slice(3, 5), 16) / 255,
          b: parseInt(color.slice(5, 7), 16) / 255
        };
      }

      // RGB / RGBA format
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return {
          r: parseInt(match[1], 10) / 255,
          g: parseInt(match[2], 10) / 255,
          b: parseInt(match[3], 10) / 255
        };
      }

      // fallback
      return { r: 0, g: 0, b: 0 };
    }

    function snapshot() {
      cleanupTextBoxes();

      redoStack.length = 0;

      undoStack.push({
        text: textLayer.innerHTML,
        images: imageLayer.innerHTML,
        draw: drawCanvas.toDataURL(),
        erase: eraseCanvas.toDataURL(),
        rotation: JSON.stringify(pageRotation),

        // ✅ NEW — STORE PAGE DELETIONS
        deletedPages: JSON.stringify([...deletedPages]),

        // ✅ NEW — STORE PAGE COUNT
        total: state.total,
      });

      if (undoStack.length > 50) undoStack.shift();
    }


    function restoreState(state) {
      if (!state) return;

      textLayer.innerHTML = state.text;
      imageLayer.innerHTML = state.images || ""; // ✅ RESTORE IMAGES

      // ✅ RESTORE deleted pages
      deletedPages.clear();

      try {
        if (state.deletedPages) {
          const arr = JSON.parse(state.deletedPages);
          if (Array.isArray(arr)) {
            arr.forEach(p => deletedPages.add(p));
          }
        }
      } catch (err) {
        console.warn("Failed to restore deletedPages", err);
      }


      if (state.total !== undefined) {

        // ✅ Ensure global state object exists
        if (!window.state) window.state = {};

        if (Number.isFinite(state.total)) {
          window.state.total = state.total;
          pageTotalEl.textContent = state.total;
        }

      }
      renderThumbnails();

      // re-bind image behaviors
      imageLayer.querySelectorAll(".image-item").forEach(item => {
        const resizer = item.querySelector(".image-resizer");
        const rotateHandle = item.querySelector(".image-rotate-handle");

        makeDraggable(item);
        makeResizable(item, resizer);
        if (rotateHandle) makeRotatable(item, rotateHandle);
        bindImageSelection(item);

        const delBtn = item.querySelector(".image-delete-btn");
        if (delBtn) {
          delBtn.onclick = e => {
            e.stopPropagation();
            item.remove();
            selectedImage = null;
            snapshot();
          };
        }
      });

      restoreCanvas(drawCtx, state.draw);
      restoreCanvas(eraseCtx, state.erase);
      if (state.rotation) {
        Object.keys(pageRotation).forEach(k => delete pageRotation[k]);
        Object.assign(pageRotation, JSON.parse(state.rotation));
        applyPageRotation();
      }


      activeTextBox = null;
      syncToolbarUI();
      selectedImage = null;   // ✅ HERE
      // 🔥 ALWAYS rebuild thumbnails from real PDF state

    }


    function restoreCanvas(ctx, src) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = src;
    }


    function restore(html) {
      textLayer.innerHTML = html;

      document.querySelectorAll('.text-box[data-empty="1"]').forEach(el => {
        if (el.parentNode) el.remove();
      });

      cleanupTextBoxes();
      activeTextBox = null;
      syncToolbarUI();
    }

    undoBtn.onclick = () => {
      if (undoStack.length < 2) return;

      // move current state to redo
      redoStack.push(undoStack.pop());

      // restore previous state
      const prev = undoStack[undoStack.length - 1];
      restoreState(prev);
    };

    redoBtn.onclick = () => {
      if (!redoStack.length) return;

      const next = redoStack.pop();
      undoStack.push(next);
      restoreState(next);
    };


    document.addEventListener("keydown", e => {

      // 🗑 DELETE IMAGE
      if ((e.key === "Delete" || e.key === "Backspace") && selectedImage) {
        e.preventDefault();
        selectedImage.remove();
        selectedImage = null;
        snapshot(); // ✅ undo support
        return;
      }

      if (!e.ctrlKey) return;

      if (e.key === "z") {
        e.preventDefault();
        undoBtn.click();
      }

      if (e.key === "y") {
        e.preventDefault();
        redoBtn.click();
      }
    });


    function bindTextHistory(el) {
      let before = el.textContent;

      el.addEventListener("focus", () => {
        before = el.textContent;
      });

      el.addEventListener("blur", () => {
        if (el.textContent !== before) {
          snapshot(); // ✅ real edit
        }
      });
    }

    function cleanupTextBoxes() {
      document.querySelectorAll(".text-box").forEach(el => {
        // If empty, just mark — DO NOT remove here
        if (!el.textContent || !el.textContent.trim()) {
          el.dataset.empty = "1";
        } else {
          delete el.dataset.empty;
        }

        // strip UI-only state
        el.classList.remove("editing", "placeholder");
        el.style.border = "none";
        el.style.background = "transparent";
      });
    }

    const thumbsEl = document.getElementById("thumbs");

    async function renderThumbnails() {
      thumbsEl.innerHTML = "";

      for (let i = 1; i <= state.total; i++) {
        const page = await state.pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: ctx,
          viewport
        }).promise;

        const thumb = document.createElement("div");
        thumb.className = "thumb" + (i === 1 ? " active" : "");
        thumb.dataset.page = i;

        thumb.innerHTML = `
  <div class="thumbnum">${i}</div>

  <button class="thumb-delete" title="Delete page">✕</button>

  <div class="thumbpaper"></div>
`;


        thumb.querySelector(".thumbpaper").appendChild(canvas);

        /* ===== DELETE PAGE BUTTON ===== */
        thumb.querySelector(".thumb-delete").onclick = async (e) => {
          e.stopPropagation();
          const pageToDelete = Number(thumb.dataset.page);
          deletePage(pageToDelete);
          snapshot();
        };


        thumb.onclick = () => {
          document
            .querySelectorAll(".thumb")
            .forEach(t => t.classList.remove("active"));

          thumb.classList.add("active");
          state.page = i;
          render();
        };

        thumbsEl.appendChild(thumb);
      }
      bindThumbnailEvents();
    }

    function bindThumbnailEvents() {

      document.querySelectorAll(".thumb").forEach(thumb => {

        const delBtn = thumb.querySelector(".thumb-delete");

        if (delBtn) {
          delBtn.onclick = (e) => {
            e.stopPropagation();

            const pageToDelete = Number(thumb.dataset.page);
            deletePage(pageToDelete);
            snapshot(); // ✅ ensure deletion is undoable
          };
        }

        thumb.onclick = () => {
          document.querySelectorAll(".thumb")
            .forEach(t => t.classList.remove("active"));

          thumb.classList.add("active");
          state.page = Number(thumb.dataset.page);
          render();
        };
      });
    }



    function deletePage(pageNum) {

      // ✅ store deleted page index (PDF uses zero-based)
      deletedPages.add(pageNum - 1);

      /* 1️⃣ Remove thumbnail element */
      const thumb = document.querySelector(`.thumb[data-page="${pageNum}"]`);
      if (thumb) thumb.remove();

      /* 2️⃣ Reduce total */
      state.total--;

      /* 3️⃣ Re-number remaining thumbnails */
      const thumbs = document.querySelectorAll(".thumb");

      thumbs.forEach((t, index) => {
        const newPage = index + 1;

        t.dataset.page = newPage;
        t.querySelector(".thumbnum").textContent = newPage;
      });

      /* 4️⃣ Fix current page selection */
      if (state.page === pageNum) {

        state.page = Math.max(1, pageNum - 1);

        document
          .querySelectorAll(".thumb")
          .forEach(t => t.classList.remove("active"));

        const newActive = document.querySelector(`.thumb[data-page="${state.page}"]`);
        if (newActive) newActive.classList.add("active");

        render();
      }

      /* 5️⃣ Update page indicator */
      pageTotalEl.textContent = state.total;

      snapshot();
    }



    let safetyToolSet = false;

    function setInkListeners(enable) {

      if (enable) {
        eraseCanvas.addEventListener("mousedown", inkDown);
        eraseCanvas.addEventListener("mousemove", inkMove);
        window.addEventListener("mouseup", inkUp);
        eraseCanvas.addEventListener("mouseup", inkUp);

        eraseCanvas.addEventListener("touchstart", inkDown);
        eraseCanvas.addEventListener("touchmove", inkMove);
        eraseCanvas.addEventListener("touchend", inkUp);

      } else {
        eraseCanvas.removeEventListener("mousedown", inkDown);
        eraseCanvas.removeEventListener("mousemove", inkMove);
        window.removeEventListener("mouseup", inkUp);
        eraseCanvas.removeEventListener("mouseup", inkUp);

        eraseCanvas.removeEventListener("touchstart", inkDown);
        eraseCanvas.removeEventListener("touchmove", inkMove);
        eraseCanvas.removeEventListener("touchend", inkUp);
      }
    }



    let drawing = false;
    let lastX = 0;
    let lastY = 0;
    let hasMoved = false;

    function getInkPos(e) {
      const r = eraseCanvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
      return { x: x / state.zoom, y: y / state.zoom };
    }

    // Start drawing or erasing
    function inkDown(e) {
      e.preventDefault();
      if (state.textMode) return;

      drawing = true;
      hasMoved = false;
      points = [];
      const p = getInkPos(e);
      points.push(p);

      const ctx = penState.tool === "eraser" ? eraseCtx : drawCtx;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }


    // Draw or erase while moving
    function inkMove(e) {
      if (!drawing) return;

      hasMoved = true;
      const p = getInkPos(e);
      points.push(p);

      if (points.length < 3) return;

      const isEraser = penState.tool === "eraser";
      const ctx = isEraser ? eraseCtx : drawCtx;

      ctx.lineWidth = penState.size;
      ctx.strokeStyle = isEraser
        ? "#ffffff"
        : (penState.color || "#000000");

      const p0 = points[points.length - 3];
      const p1 = points[points.length - 2];
      const p2 = points[points.length - 1];

      const mid1 = {
        x: (p0.x + p1.x) / 2,
        y: (p0.y + p1.y) / 2
      };
      const mid2 = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };

      ctx.beginPath();
      ctx.moveTo(mid1.x, mid1.y);
      ctx.quadraticCurveTo(p1.x, p1.y, mid2.x, mid2.y);
      ctx.stroke();
    }

    // Stop drawing or erasing
    function inkUp() {
      if (!drawing) return;
      drawing = false;
      points = [];

      if (hasMoved) snapshot();
      hasMoved = false;
    }

    const inkSizeUI = document.getElementById("inkSizeUI");
    const inkSizeSlider = document.getElementById("inkSizeSlider");
    const inkSizeValue = document.getElementById("inkSizeValue");

    /* sync slider -> pen state */
    inkSizeSlider.addEventListener("input", () => {
      const size = Number(inkSizeSlider.value);
      penState.size = size;
      inkSizeValue.textContent = size;
    });

    /* helper */
    function showInkSizeUI(show) {
      inkSizeUI.classList.toggle("hidden", !show);
    }

    notool.onclick = () => {
      textToolCheck = false;
      safetyToolSet = false;
      activateTool("notool", noTool);
      setInkListeners(safetyToolSet);
      setTimeout(() => {
        noTool.classList.add('active');
      }, 100);
    }

    penBtn.onclick = () => {
      textToolCheck = false;

      safetyToolSet = !safetyToolSet;

      // ✅ Toggle active class
      if (safetyToolSet === true) {
        setTimeout(() => {
          penBtn.classList.add("active");
          activateTool("pen", penBtn);
        }, 100);

      } else {
        setTimeout(() => {
          penBtn.classList.remove("active");
          activateTool("notool", noTool);
        }, 1000);

      }

      setInkListeners(safetyToolSet);


      penState.tool = "pen";
      penState.color = "#000000";

      penState.size = 2;
      inkSizeSlider.value = 2;
      inkSizeValue.textContent = "2";
    };

    let textToolCheck = false;

    textTool.onclick = () => {
      safetyToolSet = false;
      textToolCheck = !textToolCheck;

      // ✅ Toggle active class
      if (textToolCheck === true) {
        setTimeout(() => {
          penBtn.classList.add("active");
          activateTool("text", textTool);
        }, 100);

      } else {
        setTimeout(() => {
          penBtn.classList.remove("active");
          activateTool("notool", noTool);
        }, 1000);
      }
      //setInkListeners(safetyToolSet);

    };

    let activeTool = null;

    function activateTool(toolName, btn) {
      // 1️⃣ clear active state from ALL buttons
      document.querySelectorAll(".railbtn")
        .forEach(b => b.classList.remove("active"));

      // 2️⃣ set active border on the button we pass in
      if (btn) btn.classList.add("active");

      activeTool = toolName;

      // 3️⃣ reset modes
      state.textMode = false;
      penState.tool = null;

      // 4️⃣ hide all tool UIs
      showInkSizeUI(false);
      showTextToolbar(false);
      document.body.classList.remove("text-mode");

      // 5️⃣ activate tool logic
      switch (toolName) {
        case "pen":
          penState.tool = "pen";
          showInkSizeUI(true);
          break;

        case "eraser":
          penState.tool = "eraser";
          showInkSizeUI(true);
          break;

        case "text":
          state.textMode = true;
          document.body.classList.add("text-mode");
          showTextToolbar(true);
          break;

        case "move":
          break;

        case "image":
          break;
      }
    }

    const toolButtons = document.querySelectorAll(".railbtn");

    toolButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        // if clicking the SAME active button → deactivate it
        if (btn === activeTool) {
          btn.classList.remove("active");
          activeTool = null;
          return;
        }

        // deactivate all buttons
        toolButtons.forEach(b => b.classList.remove("active"));

        // activate clicked button
        activeTool = btn;
      });
    });



    function showSizeSlider(show) {
      sizeSliderWrap.style.opacity = show ? "1" : "0";
      sizeSliderWrap.style.pointerEvents = show ? "auto" : "none";
    }

    function showTextToolbar(show) {
      if (!textBar) return; // safety
      textBar.classList.toggle("show", show);
      textBar.setAttribute("aria-hidden", show ? "false" : "true");
    }

    window.addEventListener("DOMContentLoaded", () => {
      const rail = document.querySelector("aside.rail");
      const menuBtn = document.querySelector(".menu-btn");

      rail.classList.add("open");
      menuBtn.classList.add("active");
    });

    function getInkImage() {
      // merge draw + erase canvases into one image
      const temp = document.createElement("canvas");
      temp.width = drawCanvas.width;
      temp.height = drawCanvas.height;

      const tctx = temp.getContext("2d");

      // draw both layers
      tctx.drawImage(drawCanvas, 0, 0);
      tctx.drawImage(eraseCanvas, 0, 0);

      return temp.toDataURL("image/png");
    }

    function showToast({ title, message }) {
      const toast = document.getElementById("toast");
      if (!toast) return;

      toast.innerHTML = `
    <div class="icon">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M20 6 9 17l-5-5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="content">
      <div class="title">${title}</div>
      <div class="desc">${message}</div>
    </div>
  `;

      toast.classList.add("show");

      clearTimeout(toast._timer);
      toast._timer = setTimeout(() => {
        toast.classList.remove("show");
      }, 4200);
    }


    imageBtn.addEventListener("click", () => {
      activateTool("image", imageBtn);
      imageInput.click();
    });


    imageInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => createImageItem(reader.result);
      reader.readAsDataURL(file);

      imageInput.value = '';
    });

    function createImageItem(src) {
      const wrapper = document.createElement('div');
      wrapper.className = 'image-item';
      wrapper.dataset.rotate = "0";

      wrapper.style.left = '100px';
      wrapper.style.top = '100px';
      wrapper.style.width = '160px';
      wrapper.style.height = '160px';

      const img = document.createElement('img');
      img.src = src;

      const resizer = document.createElement('div');
      resizer.className = 'image-resizer';

      const rotateHandle = document.createElement('div');
      rotateHandle.className = 'image-rotate-handle';

      wrapper.appendChild(img);
      wrapper.appendChild(resizer);
      // 🔄 rotate SVG inside handle
      rotateHandle.innerHTML = `
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
    <path
      d="M21 12a9 9 0 1 1-3-6.7"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
    <path
      d="M21 3v6h-6"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
`;

      imageLayer.appendChild(wrapper);

      makeDraggable(wrapper);
      makeResizable(wrapper, resizer);
      bindImageSelection(wrapper);

      snapshot();
    }


    imageLayer.addEventListener("pointerdown", (e) => {
      if (
        e.target.closest(".image-resizer") ||
        e.target.closest(".image-rotate-handle")
      ) return;

      const img = e.target.closest(".image-item");
      if (!img) return;

      e.preventDefault();
      e.stopPropagation();

      // select image
      document.querySelectorAll(".image-item").forEach(i =>
        i.classList.remove("selected")
      );
      img.classList.add("selected");
      selectedImage = img;
      showImageControls(img);

      // capture pointer
      img.setPointerCapture(e.pointerId);

      const rect = page.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      startX = (e.clientX - rect.left) / state.zoom;
      startY = (e.clientY - rect.top) / state.zoom;

      imgStartLeft = img.offsetLeft;
      imgStartTop = img.offsetTop;

      isDraggingImage = true;
    });


    imageLayer.addEventListener("pointermove", (e) => {
      if (!isDraggingImage || !selectedImage) return;

      e.preventDefault();

      const rect = page.getBoundingClientRect();

      const x = (e.clientX - rect.left) / state.zoom;
      const y = (e.clientY - rect.top) / state.zoom;

      selectedImage.style.left =
        imgStartLeft + (x - startX) + "px";
      selectedImage.style.top =
        imgStartTop + (y - startY) + "px";
    });


    imageLayer.addEventListener("pointerup", endImageDrag);
    imageLayer.addEventListener("pointercancel", endImageDrag);

    function endImageDrag(e) {
      if (!selectedImage) return;

      try {
        selectedImage.releasePointerCapture(e.pointerId);
      } catch { }

      isDraggingImage = false;
    }

    document.addEventListener("pointermove", (e) => {
      if (isDraggingImage) e.preventDefault();
    }, { passive: false });


    stage.addEventListener("wheel", (e) => {
      if (!e.ctrlKey) return;

      e.preventDefault();

      const delta = Math.sign(e.deltaY);
      state.zoom += delta > 0 ? -0.1 : 0.1;
      state.zoom = Math.min(state.maxZoom, Math.max(state.minZoom, state.zoom));

      applyZoom();
    }, { passive: false });


    /* click on EMPTY space */
    stage.addEventListener("mousedown", (e) => {
      // if clicking on image or its children → ignore
      if (e.target.closest(".image-item")) return;

      clearImageSelection();
      hideImageControls();

      // OPTIONAL: reset active tool here
      // setActiveTool("move");  // if you have a tool system
    });

    /* also clear when clicking directly on page background */
    page.addEventListener("mousedown", (e) => {
      if (e.target !== page) return;
      clearImageSelection();

    });

    uploadOverlay.addEventListener("dragover", e => {
      e.preventDefault();
      uploadOverlay.style.backgroundColor = "rgba(15,23,42,.75)";
    });

    uploadOverlay.addEventListener("dragleave", () => {
      uploadOverlay.style.backgroundColor = "";
    });

    uploadOverlay.addEventListener("drop", e => {
      e.preventDefault();
      uploadOverlay.style.backgroundColor = "";

      const file = e.dataTransfer.files[0];
      if (!file || file.type !== "application/pdf") return;

      startLoadingProgress();      // ✅ START PROGRESS
      loadPDF(file);
    });



    // Show upload overlay on initial load
    showUploadOverlay();

    setProgress(0);
    uploadProgress.classList.add("hidden");
    overlayUploadBtn.style.display = "";

    document.addEventListener("DOMContentLoaded", () => {
      currentTool = null;
      document.querySelectorAll(".railbtn").forEach(b => b.classList.remove("active"));
    });



    function hideImageControls() {
      imageBottomBar.classList.remove("show");
    }


    function makeRotatable(imageItem, rotateHandle) {

      let startAngle = 0;
      let currentRotation = parseFloat(imageItem.dataset.rotate || 0);

      function getAngle(cx, cy, ex, ey) {
        return Math.atan2(ey - cy, ex - cx) * 180 / Math.PI;
      }

      rotateHandle.addEventListener("pointerdown", (e) => {

        e.stopPropagation();
        rotateHandle.setPointerCapture(e.pointerId);

        const rect = imageItem.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        startAngle = getAngle(centerX, centerY, e.clientX, e.clientY);

        function onMove(ev) {

          const newAngle = getAngle(centerX, centerY, ev.clientX, ev.clientY);
          const delta = newAngle - startAngle;

          const finalRotation = currentRotation + delta;

          imageItem.style.transform = `rotate(${finalRotation}deg)`;
          imageItem.dataset.rotate = finalRotation;

          /* ===== ROTATION ANIMATION ===== */
          if (delta > 0) {
            rotateHandle.classList.add("rotating-cw");
            rotateHandle.classList.remove("rotating-ccw");
          } else if (delta < 0) {
            rotateHandle.classList.add("rotating-ccw");
            rotateHandle.classList.remove("rotating-cw");
          }
        }

        function onUp(ev) {

          currentRotation = parseFloat(imageItem.dataset.rotate || 0);

          rotateHandle.classList.remove("rotating-cw", "rotating-ccw");

          rotateHandle.releasePointerCapture(ev.pointerId);

          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
        }

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }
