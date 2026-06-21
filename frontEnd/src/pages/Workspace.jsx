import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

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
      
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
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
    <div 
      className={`relative flex flex-col items-center gap-2 cursor-pointer group ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`} 
      onClick={onClick}
    >
      <div className={`text-xs font-semibold transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {pageNum}
      </div>
      <div className={`w-full bg-white aspect-[8.5/11] rounded-lg shadow-sm border transition-all duration-200 overflow-hidden ${isActive ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-50' : 'border-slate-200 group-hover:shadow-md group-hover:border-indigo-300'}`}>
        <canvas ref={canvasRef} className="w-full h-full block rounded-md" />
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
  
  // --- Premium Gate State ---
  const [showPremiumGate, setShowPremiumGate] = useState(true);

  // --- Tools & Layers State ---
  const [activeTool, setActiveTool] = useState('notool'); 
  const [newTextBoxes, setNewTextBoxes] = useState([]);
  const [extractedText, setExtractedText] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Canvas & Stream Refs ---
  const pdfCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const stageRef = useRef(null);
  const mainRenderTaskRef = useRef(null);

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
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-800 font-sans overflow-hidden relative">
      
      {/* --- Premium "Coming Soon" Gate --- */}
      {showPremiumGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4 animate-overlay">
          <div className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-modal">
            
            {/* Ambient Animated Background Blobs */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-fuchsia-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1.5s' }}></div>

            <div className="relative p-10 flex flex-col items-center text-center">
              
              {/* Premium Icon Badge */}
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <span className="text-xs font-bold tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 mb-3">
                Unlocking September 1st
              </span>
              
              <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">
                Elevate Your Workflow.
              </h2>
              
              <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
                We're putting the final polish on RemoPDF Premium. Prepare for buttery-smooth native text editing, advanced layering, and pixel-perfect exports. The wait is almost over.
              </p>

              <div className="w-full flex flex-col gap-3">              
                <Link to="/" className="w-full py-3.5 px-4 bg-transparent text-slate-500 hover:text-slate-800 text-sm font-semibold rounded-xl transition-colors duration-300">
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Header */}
      <header className="flex items-center h-14 bg-white border-b border-slate-200 px-4 shrink-0 z-20 shadow-sm">
        <Link 
          to="/" 
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          title="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        
        <div className="w-8 h-8 bg-indigo-600 rounded-lg shadow-inner ml-3 mr-3 flex items-center justify-center">
          <span className="text-white font-bold text-lg leading-none select-none">R</span>
        </div>
        
        <div className="flex flex-col justify-center">
          <div className="text-sm font-bold text-slate-900 leading-tight">RemoPDF Premium</div>
          <div className="text-xs font-medium text-slate-500 leading-tight">Workspace</div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Toolbar (Rail) */}
        <aside className="w-16 flex flex-col items-center py-4 gap-4 bg-white border-r border-slate-200 z-10 shadow-[1px_0_10px_rgba(0,0,0,0.02)] shrink-0">
          <label className="p-2.5 rounded-xl transition-all duration-200 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer" title="Upload PDF">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
          </label>

          <button 
            className={`p-2.5 rounded-xl transition-all duration-200 ${!pdfDoc || isProcessing ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
            title="Save PDF" 
            onClick={handleSaveToPython} 
            disabled={!pdfDoc || isProcessing}
          >
            {isProcessing ? (
              <span className="text-xs font-bold animate-pulse">...</span>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M7 3v6h10V3" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          <div className="w-8 h-px bg-slate-200 my-1"></div>

          <button 
            className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === 'notool' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
            onClick={() => setActiveTool('notool')} 
            title="Select/Move"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <button 
             className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === 'edit' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
             onClick={() => setActiveTool('edit')} 
             title="Edit PDF Text"
          >
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
               <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
               <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </button>

          <button 
             className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === 'text' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'}`}
             onClick={() => setActiveTool('text')} 
             title="Add New Text"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </aside>

        {/* Thumbnails Panel */}
        <aside className="w-56 bg-slate-50/50 border-r border-slate-200 overflow-y-auto p-4 flex flex-col gap-6 shrink-0 custom-scrollbar">
          {pdfDoc && Array.from(new Array(totalPages), (el, index) => (
            <PdfThumbnail 
              key={index}
              pdfDoc={pdfDoc}
              pageNum={index + 1}
              isActive={currentPage === index + 1}
              onClick={() => setCurrentPage(index + 1)}
            />
          ))}
          {!pdfDoc && (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm font-medium text-center px-4">
              Upload a PDF to view thumbnails
            </div>
          )}
        </aside>

        {/* Central Viewer */}
        <section className="flex-1 flex flex-col relative bg-[#f1f5f9] overflow-hidden">
          
          {/* Floating Viewer Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 h-12 bg-white/90 backdrop-blur-md border border-slate-200/80 rounded-2xl flex items-center gap-4 px-3 z-20 shadow-lg shadow-slate-200/50">
            {/* Pagination Controls */}
            <div className="flex items-center bg-slate-100/80 rounded-xl p-1">
              <button 
                className="w-8 h-8 flex items-center justify-center text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                &lt;
              </button>
              <div className="px-3 text-sm font-semibold text-slate-600 flex items-center gap-1 select-none">
                <span className="text-indigo-600">{currentPage}</span> 
                <span className="text-slate-400 font-medium">/</span> 
                <span>{totalPages}</span>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center text-sm font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>

            <div className="w-px h-5 bg-slate-200"></div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-100/80 rounded-xl p-1">
              <button 
                className="w-8 h-8 flex items-center justify-center text-lg font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 leading-none"
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              >
                -
              </button>
              <div className="px-2 text-sm font-semibold text-slate-600 min-w-[3.5rem] text-center select-none">
                {Math.round(zoom * 100)}%
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center text-lg font-medium text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200 leading-none"
                onClick={() => setZoom(z => Math.min(3, z + 0.1))}
              >
                +
              </button>
            </div>
          </div>

          {/* Stage / Canvas Wrapper */}
          <div 
            className="flex-1 overflow-auto p-8 pt-24 custom-scrollbar flex items-start justify-center" 
            ref={stageRef} 
            onClick={handleStageClick} 
            style={{ cursor: activeTool === 'text' ? 'text' : 'default' }}
          >
            {/* The Page Container */}
            <div 
              className="bg-white shadow-xl shadow-slate-300/60 rounded-sm ring-1 ring-slate-900/5 mx-auto transition-transform duration-200" 
              style={{ 
                position: 'relative', 
                width: `${W}px`,
                height: `${H}px`,
                transform: `scale(${zoom})`, 
                transformOrigin: 'top center' 
              }}
            >
              <canvas ref={pdfCanvasRef} style={{ position: 'absolute', inset: 0, zIndex: 1 }}></canvas>
              <canvas ref={drawCanvasRef} style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: activeTool === 'pen' ? 'auto' : 'none' }}></canvas>
              
              {/* Premium Layer: Edit Existing Text */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: activeTool === 'edit' ? 'auto' : 'none', opacity: activeTool === 'edit' ? 1 : 0 }}>
                {extractedText.filter(b => b.page_num === currentPage).map(block => (
                  <div
                    key={block.id}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => handleExistingTextEdit(block.id, e.target.innerText)}
                    className="hover:ring-2 hover:ring-indigo-300 hover:bg-indigo-50/30 focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all duration-150 rounded-sm"
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
                      caretColor: '#4f46e5'
                    }}
                  >
                    {block.text}
                  </div>
                ))}
              </div>

              {/* Layer: New React Text Boxes */}
              <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: activeTool === 'text' ? 'auto' : 'none' }}>
                {newTextBoxes.filter(b => b.page_num === currentPage).map((box) => (
                  <input
                    key={box.id}
                    type="text"
                    value={box.text}
                    placeholder="Type..."
                    onChange={(e) => handleNewTextEdit(box.id, e.target.value)}
                    className="absolute bg-white/50 backdrop-blur-[2px] border border-blue-400/80 rounded-md px-1.5 py-0.5 text-blue-900 shadow-sm focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none placeholder:text-blue-300"
                    style={{
                      left: box.x, 
                      top: box.y, 
                      fontSize: `${box.size}px`, 
                      color: box.color,
                    }}
                    autoFocus
                  />
                ))}
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* Global styles for custom scrollbar and premium animations */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @keyframes fadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(12px); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-overlay {
          animation: fadeIn 0.7s ease-out forwards;
        }
        .animate-modal {
          opacity: 0;
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.15s;
        }
      `}} />
    </div>
  );
}