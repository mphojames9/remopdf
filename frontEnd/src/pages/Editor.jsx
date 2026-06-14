import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Editor.css';
import * as pdfjsLib from 'pdfjs-dist';

// Dynamically fetch the exact matching worker module
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// --- Premium Feature: Isolated Thumbnail Component ---
function PdfThumbnail({ pdfDoc, pageNum, isActive, onClick }) {
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    async function renderThumb() {
      if (!pdfDoc || !canvasRef.current) return;
      
      // Cancel any ongoing thumbnail render to avoid overlapping context states
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        // Scale down sharply for performance and clarity inside the rail sidebar
        const viewport = page.getViewport({ scale: 0.25 }); 
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const renderTask = page.render({
          canvasContext: ctx,
          viewport: viewport
        });
        
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          console.error(`Thumbnail render failed for page ${pageNum}:`, error);
        }
      }
    }

    renderThumb();

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNum]);

  return (
    <div className={`thumb ${isActive ? 'active' : ''}`} onClick={onClick}>
      <div className="thumbnum">{pageNum}</div>
      <div className="thumbpaper">
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

export default function Editor() {
  // --- Core State ---
  const [pdfDoc, setPdfDoc] = useState(null);
  const [fileObj, setFileObj] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  
  // --- Tools & Layers State ---
  const [activeTool, setActiveTool] = useState('notool'); // 'notool', 'edit', 'text', 'pen'
  const [newTextBoxes, setNewTextBoxes] = useState([]);
  const [extractedText, setExtractedText] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Canvas & Stream Refs ---
  const pdfCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const stageRef = useRef(null);
  const mainRenderTaskRef = useRef(null); // Prevents rapid page swapping collision drops

  // Fixed dimensions mapped to the backend
  const W = 612;
  const H = 792;

  // --- PDF Loading ---
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileObj(file);

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const loadedPdf = await loadingTask.promise;
    
    setPdfDoc(loadedPdf);
    setTotalPages(loadedPdf.numPages);
    setCurrentPage(1);
    setExtractedText([]);
    setNewTextBoxes([]);
  };

  const renderPage = async () => {
    if (!pdfDoc || !pdfCanvasRef.current) return;

    // Cancel current main viewport rendering task if user clicks pages rapidly
    if (mainRenderTaskRef.current) {
      mainRenderTaskRef.current.cancel();
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1 });
      const scaleX = W / viewport.width;
      const scaleY = H / viewport.height;
      const fitScale = Math.min(scaleX, scaleY) * zoom;
      const fitViewport = page.getViewport({ scale: fitScale });
      
      const canvas = pdfCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = W;
      canvas.height = H;
      
      ctx.clearRect(0, 0, W, H);
      
      const offsetX = (W - fitViewport.width) / 2;
      const offsetY = (H - fitViewport.height) / 2;
      ctx.save();
      ctx.translate(offsetX, offsetY);
      
      const renderTask = page.render({
        canvasContext: ctx,
        viewport: fitViewport
      });
      
      mainRenderTaskRef.current = renderTask;
      await renderTask.promise;
      ctx.restore();

      // --- Premium Feature: Extract native text for direct editing ---
      const textContent = await page.getTextContent();
      const blocks = textContent.items.map((item, idx) => {
        const tx = item.transform; 
        const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
        const pdfY = viewport.height - tx[5]; 
        
        return {
          id: `page${currentPage}_${idx}`,
          page_num: currentPage,
          originalText: item.str,
          text: item.str,
          x: tx[4] * scaleX, 
          y: (pdfY - fontHeight) * scaleY, 
          width: item.width * scaleX,
          height: fontHeight * scaleY,
          fontSize: fontHeight * scaleY,
          color: "#111827",
          isEdited: false
        };
      });

      setExtractedText(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const freshBlocks = blocks.filter(b => !existingIds.has(b.id) && b.text.trim() !== "");
        return [...prev, ...freshBlocks];
      });

    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error("Main viewport render runtime failure:", error);
      }
    }
  };

  useEffect(() => {
    renderPage();
  }, [pdfDoc, currentPage, zoom]);

  // --- Tools Interaction ---
  const handleStageClick = (e) => {
    if (activeTool !== 'text') return;

    const rect = pdfCanvasRef.current.getBoundingClientRect();
    // Factor out client bounds scale changes relative to original matrix bounds
    const x = (e.clientX - rect.left) * (W / rect.width);
    const y = (e.clientY - rect.top) * (H / rect.height);

    setNewTextBoxes([
      ...newTextBoxes, 
      { id: Date.now(), text: "", x, y, size: 14, color: "#3B82F6", page_num: currentPage }
    ]);
  };

  const handleExistingTextEdit = (id, newText) => {
    setExtractedText(prev => prev.map(block => 
      block.id === id ? { ...block, text: newText, isEdited: true } : block
    ));
  };

  const handleNewTextEdit = (id, newText) => {
    setNewTextBoxes(prev => prev.map(box => 
      box.id === id ? { ...box, text: newText } : box
    ));
  };

  // --- Communication with Python Backend ---
  const handleSaveToPython = async () => {
    if (!fileObj) return;
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', fileObj);

      const pagesObj = {};
      
      const editsToApply = extractedText.filter(b => b.isEdited && b.text !== b.originalText);
      editsToApply.forEach(edit => {
        const pKey = String(edit.page_num);
        if (!pagesObj[pKey]) pagesObj[pKey] = { replacements: [], texts: [] };
        
        pagesObj[pKey].replacements.push({
          originalText: edit.originalText,
          newText: edit.text,
          x: edit.x,
          y: edit.y,
          width: edit.width,
          height: edit.height,
          fontSize: edit.fontSize,
          color: edit.color
        });
      });

      const newAdditions = newTextBoxes.filter(box => box.text.trim() !== "");
      newAdditions.forEach(box => {
        const pKey = String(box.page_num);
        if (!pagesObj[pKey]) pagesObj[pKey] = { replacements: [], texts: [] };
        
        pagesObj[pKey].texts.push({
          text: box.text,
          x: box.x,
          y: box.y,
          fontSize: box.size,
          color: box.color
        });
      });

      const payload = {
        deletedPages: [],
        pages: pagesObj
      };

      formData.append('edits_json', JSON.stringify(payload));

      const response = await axios.post('http://localhost:8000/api/process-pdf', formData, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'RemoPDF_Edited.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error("Editor save failed", error);
      alert("Failed to save document. Ensure the Python server is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="editor-root">
      <header className="appbar">
        <button className="iconbtn" title="Back">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </button>
        <div className="appmark">
          <div style={{ background: 'var(--primary)', width: '100%', height: '100%', borderRadius: '4px' }}></div>
        </div>
        <div className="titlewrap">
          <div className="title">RemoPDF Premium</div>
          <div className="subtitle">Workspace</div>
        </div>
      </header>

      <main className="layout">
        <aside className="rail">
          <label className="railbtn upload-btn" title="Upload PDF">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input type="file" accept="application/pdf" hidden onChange={handleFileUpload} />
          </label>

          <button className="railbtn" id="saveBtn" title="Save PDF" onClick={handleSaveToPython} disabled={!pdfDoc || isProcessing}>
            {isProcessing ? '...' : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M7 3v6h10V3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <hr style={{ width: '80%', border: '1px solid var(--line)', margin: '12px 0' }} />

          <button className={`railbtn ${activeTool === 'notool' ? 'active' : ''}`} onClick={() => setActiveTool('notool')} title="Select/Move">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <button className={`railbtn ${activeTool === 'edit' ? 'active' : ''}`} onClick={() => setActiveTool('edit')} title="Edit PDF Text">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
               <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </button>

          <button className={`railbtn ${activeTool === 'text' ? 'active' : ''}`} onClick={() => setActiveTool('text')} title="Add New Text">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </aside>

        <aside className="thumbs">
          {pdfDoc && Array.from(new Array(totalPages), (el, index) => (
            <PdfThumbnail 
              key={index}
              pdfDoc={pdfDoc}
              pageNum={index + 1}
              isActive={currentPage === index + 1}
              onClick={() => setCurrentPage(index + 1)}
            />
          ))}
        </aside>

        <section className="viewer">
          <div className="viewerbar">
            <div className="group">
               <div className="seg">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&lt;</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&gt;</button>
              </div>
              <div className="pill"><span>{currentPage}</span> <span className="muted">/</span> <span>{totalPages}</span></div>
            </div>
            <div className="group">
              <div className="seg">
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>-</button>
                <button onClick={() => setZoom(z => Math.min(3, z + 0.1))}>+</button>
              </div>
              <div className="pill"><span className="zoomval">{Math.round(zoom * 100)}%</span></div>
            </div>
          </div>

          <div className="stage" ref={stageRef} onClick={handleStageClick} style={{ cursor: activeTool === 'text' ? 'text' : 'default' }}>
            {/* FIXED: Added explicit layout width and height to map absolute layer coordinates correctly */}
            <div 
              className="page" 
              id="page" 
              style={{ 
                position: 'relative', 
                width: `${W}px`,
                height: `${H}px`,
                transform: `scale(${zoom})`, 
                transformOrigin: 'top center' 
              }}
            >
              <canvas ref={pdfCanvasRef} id="pdfCanvas" style={{ position: 'absolute', inset: 0, zIndex: 1 }}></canvas>
              <canvas ref={drawCanvasRef} id="drawCanvas" style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: activeTool === 'pen' ? 'auto' : 'none' }}></canvas>
              
              {/* Premium Layer: Edit Existing Text */}
              <div className="edit-layer" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: activeTool === 'edit' ? 'auto' : 'none', opacity: activeTool === 'edit' ? 1 : 0 }}>
                {extractedText.filter(b => b.page_num === currentPage).map(block => (
                  <div
                    key={block.id}
                    className="editable-pdf-text"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleExistingTextEdit(block.id, e.target.innerText)}
                    style={{
                      position: 'absolute',
                      left: block.x,
                      top: block.y,
                      width: Math.max(block.width, 20),
                      height: block.height + 4,
                      fontSize: `${block.fontSize}px`,
                      lineHeight: `${block.fontSize}px`,
                      fontFamily: 'sans-serif',
                      color: block.isEdited ? block.color : 'transparent',
                      caretColor: '#3B82F6'
                    }}
                  >
                    {block.text}
                  </div>
                ))}
              </div>

              {/* Layer 5: New React Text Boxes */}
              <div id="textLayer" style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: activeTool === 'text' ? 'auto' : 'none' }}>
                {newTextBoxes.filter(b => b.page_num === currentPage).map((box) => (
                  <input
                    key={box.id}
                    className="text-box editing"
                    type="text"
                    value={box.text}
                    placeholder="Type..."
                    onChange={(e) => handleNewTextEdit(box.id, e.target.value)}
                    style={{
                      position: 'absolute', left: box.x, top: box.y, fontSize: `${box.size}px`, color: box.color,
                      background: 'transparent', border: '1px dashed rgba(59,130,246,0.5)', padding: '2px 4px', outline: 'none',
                    }}
                    autoFocus
                  />
                ))}
              </div>

            </div>
          </div>
        </section>
      </main>
    </div>
  );
}