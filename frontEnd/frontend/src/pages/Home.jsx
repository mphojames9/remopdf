import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mergePdfs, splitPdf, compressPdf, imagesToPdf, pdfToImages, getPdfPreviews, removePdfPages, compressImages, pdfToWord, pdfToExcel, addPasswordToPdf, verifyPdfPassword, removePdfPassword, changePdfPassword, pdfToPpt } from '../api/client';
import './Home.css';

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [isChangeDragActive, setIsChangeDragActive] = useState(false);
  const [isPptDragActive, setIsPptDragActive] = useState(false);
  const [isUnlockDragActive, setIsUnlockDragActive] = useState(false);
  
  // Modal states
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splitFile, setSplitFile] = useState(null);

  const [isCompressModalOpen, setIsCompressModalOpen] = useState(false);
  const [compressFile, setCompressFile] = useState(null);
  const [compressQuality, setCompressQuality] = useState(50); 
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);

  const [isPdfToImgModalOpen, setIsPdfToImgModalOpen] = useState(false);
  const [pdfToImgFiles, setPdfToImgFiles] = useState([]);
  const [imageFormat, setImageFormat] = useState('png');

  const [isRemovePagesModalOpen, setIsRemovePagesModalOpen] = useState(false);
  const [removePagesFiles, setRemovePagesFiles] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [activeKeptPages, setActiveKeptPages] = useState([]); // Array of arrays containing kept index numbers
  const [downloadMode, setDownloadMode] = useState('single'); // 'single' | 'multiple'
  const [fullScreenPreviewUrl, setFullScreenPreviewUrl] = useState(null);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);

  // Premium Image Compressor States
  const [isImgCompressModalOpen, setIsImgCompressModalOpen] = useState(false);
  const [imgCompressFiles, setImgCompressFiles] = useState([]);
  const [imgCompressQuality, setImgCompressQuality] = useState(60);

  // Word Converter States
  const [isPdfToWordModalOpen, setIsPdfToWordModalOpen] = useState(false);
  const [pdfToWordFiles, setPdfToWordFiles] = useState([]);

  // Excel Converter States
  const [isPdfToExcelModalOpen, setIsPdfToExcelModalOpen] = useState(false);
  const [pdfToExcelFiles, setPdfToExcelFiles] = useState([]);

  // Password Protection States
  const [isProtectModalOpen, setIsProtectModalOpen] = useState(false);
  const [protectFile, setProtectFile] = useState(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Unlock / Remove Password States
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockFile, setUnlockFile] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockPreviewUrl, setUnlockPreviewUrl] = useState(null);
  const [isPasswordError, setIsPasswordError] = useState(false);

  // Change Password States
  const [isChangePwdModalOpen, setIsChangePwdModalOpen] = useState(false);
  const [changeFile, setChangeFile] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changePreviewUrl, setChangePreviewUrl] = useState(null);
  const [isChangeError, setIsChangeError] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // PDF to PowerPoint States
  const [isPdfToPptModalOpen, setIsPdfToPptModalOpen] = useState(false);
  const [pdfToPptFiles, setPdfToPptFiles] = useState([]);
  const [pptProtectedError, setPptProtectedError] = useState(null); // Stores the encrypted filename
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopToolsOpen, setIsDesktopToolsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isProtectDragActive, setIsProtectDragActive] = useState(false);
  const [isExcelDragActive, setIsExcelDragActive] = useState(false);
  const [isWordDragActive, setIsWordDragActive] = useState(false);
  const [isImgDragActive, setIsImgDragActive] = useState(false);
  const [isRemovePagesDragActive, setIsRemovePagesDragActive] = useState(false);
  const [isPdfToImgDragActive, setIsPdfToImgDragActive] = useState(false);
  const [isImageDragActive, setIsImageDragActive] = useState(false);

  // Comprehensive list of document tools
const documentTools = [
  {
    name: "Edit PDF",
    action: () => setIsEditPdfModalOpen(true)
  },
  {
    name: "Merge PDFs",
    action: () => setIsMergeModalOpen(true)
  },
  {
    name: "Split PDF",
    action: () => setIsSplitModalOpen(true)
  },
  {
    name: "Compress PDF",
    action: () => setIsCompressModalOpen(true)
  },
  {
    name: "PDF to Word",
    action: () => setIsPdfToWordModalOpen(true)
  },
  {
    name: "Word to PDF",
    action: () => setIsWordToPdfModalOpen(true)
  },
  {
    name: "Sign Document",
    action: () => setIsSignModalOpen(true)
  },
  {
    name: "Protect PDF",
    action: () => setIsProtectModalOpen(true)
  },
  {
    name: "Unlock PDF",
    action: () => setIsUnlockModalOpen(true)
  },
  {
    name: "Change Password",
    action: () => setIsChangePwdModalOpen(true)
  },
  {
    name: "PDF to Excel",
    action: () => setIsPdfToExcelModalOpen(true)
  },
  {
    name: "PDF to Image",
    action: () => setIsPdfToImgModalOpen(true)
  },
  {
    name: "Image to PDF",
    action: () => setIsImageModalOpen(true)
  },
  {
    name: "PDF to PowerPoint",
    action: () => setIsPdfToPptModalOpen(true)
  }
];

  // Close desktop dropdown when clicking outside (crucial for touch devices)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDesktopToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  

  const handleSplit = async () => {
    if (!splitFile) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await splitPdf(splitFile, setProgress); 
      closeOverlay();
    } catch (error) {
      console.error("Split failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleMerge = async () => {
    setIsProcessing(true);
    setProgress(0);
    try {
      await mergePdfs(selectedFiles, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("Merge failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleCompress = async () => {
    if (!compressFile) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await compressPdf(compressFile, compressQuality, setProgress); 
      closeOverlay();
    } catch (error) {
      console.error("Compression failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleImageToPdf = async () => {
    if (imageFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await imagesToPdf(imageFiles, setProgress); 
      closeOverlay();
    } catch (error) {
      console.error("Image conversion failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handlePdfToImagesSubmit = async () => {
    if (pdfToImgFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await pdfToImages(pdfToImgFiles, imageFormat, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("PDF to Image conversion failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleRemovePagesFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setRemovePagesFiles(files);
    setIsLoadingPreviews(true);
    try {
      const data = await getPdfPreviews(files);
      setPreviewData(data);
      // Initialize state to keep all pages by default
      const initialKept = data.map(fileObj => fileObj.pages.map(p => p.page_index));
      setActiveKeptPages(initialKept);
    } catch (err) {
      console.error("Failed to generate document thumbnails", err);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  const handleCompressImages = async () => {
    if (imgCompressFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await compressImages(imgCompressFiles, imgCompressQuality, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("Image compression failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handlePdfToWord = async () => {
    if (pdfToWordFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await pdfToWord(pdfToWordFiles, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("PDF to Word conversion failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handlePdfToExcel = async () => {
    if (pdfToExcelFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await pdfToExcel(pdfToExcelFiles, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("PDF to Excel conversion failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleProtectPdf = async () => {
    if (!protectFile || !pdfPassword) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await addPasswordToPdf(protectFile, pdfPassword, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("PDF Encryption failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleVerifyPassword = async () => {
    if (!unlockFile || !unlockPassword) return;
    setIsProcessing(true);
    setIsPasswordError(false);
    try {
      const data = await verifyPdfPassword(unlockFile, unlockPassword);
      if (data.success) {
        setUnlockPreviewUrl(data.thumbnail);
      } else if (data.is_encrypted === false) {
        setUnlockPreviewUrl('NOT_ENCRYPTED'); // Handle files that didn't actually have a password
      }
    } catch (error) {
      console.error("Verification failed", error);
      setIsPasswordError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!unlockFile || (!unlockPassword && unlockPreviewUrl !== 'NOT_ENCRYPTED')) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await removePdfPassword(unlockFile, unlockPassword || '', setProgress);
      closeOverlay();
    } catch (error) {
      console.error("Removal failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleChangeVerify = async () => {
    if (!changeFile || !oldPassword) return;
    setIsProcessing(true);
    setIsChangeError(false);
    try {
      // Reusing the secure verification endpoint
      const data = await verifyPdfPassword(changeFile, oldPassword);
      if (data.success) {
        setChangePreviewUrl(data.thumbnail);
      } else if (data.is_encrypted === false) {
        setChangePreviewUrl('NOT_ENCRYPTED'); 
      }
    } catch (error) {
      console.error("Verification failed", error);
      setIsChangeError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!changeFile || !newPassword || (!oldPassword && changePreviewUrl !== 'NOT_ENCRYPTED')) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await changePdfPassword(changeFile, oldPassword || '', newPassword, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("Password change failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

const handlePdfToPpt = async () => {
    if (pdfToPptFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    setPptProtectedError(null);
    try {
      await pdfToPpt(pdfToPptFiles, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("PDF to PPT conversion failed", error);
      // Catch the custom encryption flag we created in the backend
      if (error && error.detail && error.detail.startsWith("ENCRYPTED:")) {
        const filename = error.detail.split("ENCRYPTED:")[1];
        setPptProtectedError(filename);
      }
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const goToUnlockTool = () => {
    // Closes the PPT modal and opens the Remove Password modal instantly
    setIsPdfToPptModalOpen(false);
    setPdfToPptFiles([]);
    setPptProtectedError(null);
    setIsUnlockModalOpen(true); 
  };
  const togglePageSelection = (fileIndex, pageIndex) => {
    setActiveKeptPages(prev => {
      const updated = [...prev];
      const currentFilePages = updated[fileIndex];
      if (currentFilePages.includes(pageIndex)) {
        updated[fileIndex] = currentFilePages.filter(p => p !== pageIndex);
      } else {
        updated[fileIndex] = [...currentFilePages, pageIndex].sort((a, b) => a - b);
      }
      return updated;
    });
  };

  const handleRemovePagesSubmit = async () => {
    if (removePagesFiles.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    try {
      await removePdfPages(removePagesFiles, activeKeptPages, downloadMode, setProgress);
      closeOverlay();
    } catch (error) {
      console.error("Page removal action failed", error);
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };



  const closeOverlay = () => {
    setIsMergeModalOpen(false);
    setIsSplitModalOpen(false);
    setIsCompressModalOpen(false);
    setIsImageModalOpen(false);
    setIsPdfToImgModalOpen(false);
    setIsRemovePagesModalOpen(false); // Add this
    setIsImgCompressModalOpen(false); // <-- Add this
    setIsPdfToWordModalOpen(false);
    setIsPdfToExcelModalOpen(false);
    setIsProtectModalOpen(false);
    setProtectFile(null);
    setPdfPassword('');
    setShowPassword(false);
    setSelectedFiles([]); 
    setSplitFile(null);
    setImageFiles([]);
    setPdfToImgFiles([]);
    setCompressFile(null);
    setImgCompressFiles([]); // <-- Add this
    setImageFormat('png');
    setRemovePagesFiles([]); // Add this
    setPreviewData([]); // Add this
    setActiveKeptPages([]); // Add this
    setPdfToWordFiles([]); // Add this
    setPdfToExcelFiles([]);
    setDownloadMode('single'); // Add this
    setFullScreenPreviewUrl(null); // Add this
    setIsLoadingPreviews(false); // Add this
    setImgCompressQuality(60); // <-- Add this
    setProgress(0);
    // Add these inside your closeOverlay function
    setIsUnlockModalOpen(false);
    setUnlockFile(null);
    setUnlockPassword('');
    setUnlockPreviewUrl(null);
    setIsPasswordError(false);
    // Add these inside your closeOverlay function
    setIsChangePwdModalOpen(false);
    setChangeFile(null);
    setOldPassword('');
    setNewPassword('');
    setChangePreviewUrl(null);
    setIsChangeError(false);
    setShowOldPassword(false);
    setShowNewPassword(false);
    // Add inside closeOverlay
    setIsPdfToPptModalOpen(false);
    setPdfToPptFiles([]);
    setPptProtectedError(null);
    
  };

  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      // Calculate scroll progress from 0 to 1 over the first 80 pixels of scrolling
      // Once you scroll past 80px, it locks at exactly 1.
      const currentScroll = window.scrollY;
      const progress = Math.min(currentScroll / 80, 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Trigger once on mount in case the page is reloaded while already scrolled down
    handleScroll(); 
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Apply a subtle cubic "ease-out" curve so the morphing feels buttery and premium
  const easeProgress = 1 - Math.pow(1 - scrollProgress, 3);

  return (
    <div className="app-container">
      <nav 
  style={{
    // Morph from 72px (top-18) to 0px
    top: `${72 * (1 - easeProgress)}px`, 
    
    // Morph side margins from 24px to 0px 
    // (Using clamp ensures it looks great on both mobile and desktop)
    left: `calc(clamp(16px, 3vw, 40px) * ${1 - easeProgress})`,
    right: `calc(clamp(16px, 3vw, 40px) * ${1 - easeProgress})`,
    
    // Morph from rounded-2xl (16px) to sharp corners (0px)
    borderRadius: `${16 * (1 - easeProgress)}px`,
  }}
  // Adjusted py-3 md:py-4 down to py-2 md:py-2.5 to reduce height
  className="fixed z-50 bg-white/85 backdrop-blur-md border border-gray-100 font-sans tracking-wide shadow-[0_4px_30px_rgba(0,0,0,0.03)] py-1 md:py-1.5 px-6 md:px-12"
>
      
      {/* Container: Responsive padding down to 330px */}
      <div className="flex justify-between items-center px-4 py-3 sm:px-8 sm:py-4 max-w-7xl mx-auto">
        
        {/* Brand */}
        <div className="nav-brand text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2 z-50 relative">
          <i className="fa-solid fa-file-pdf text-red-500 drop-shadow-sm"></i>
                <div className="nav-logo">
                  <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img 
                      src="/images/tittleIcon.png" 
                      alt="Logo" 
                      style={{ width: '32px', height: '32px' }} 
                      // Fix: Changed onerror to camelCase onError
                      onError={(e) => { e.target.style.display = 'none'; }} 
                    />
                    <span style={{ fontWeight: '700', fontSize: '1.25rem', color: 'var(--text, #121525)' }}>
                      Remo<span style={{ color: 'var(--brand, #ff2d2d)' }}>PDF</span>
                    </span>
                  </Link>
                </div>
        </div>

        {/* Desktop Links */}
        <div className="nav-links hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
          
          {/* Touch-Friendly Animated Dropdown */}
          <div 
            className="relative" 
            ref={dropdownRef}
            onMouseEnter={() => setIsDesktopToolsOpen(true)}
            onMouseLeave={() => setIsDesktopToolsOpen(false)}
          >
            <button 
              className={`flex items-center gap-1.5 py-2 transition-colors ${isDesktopToolsOpen ? 'text-red-500' : 'hover:text-gray-900'}`}
              onClick={() => setIsDesktopToolsOpen(!isDesktopToolsOpen)}
              aria-expanded={isDesktopToolsOpen}
            >
              Tools
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${isDesktopToolsOpen ? '-rotate-180 text-red-500' : 'opacity-70'}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* 2-Column Dropdown Menu */}
            <div className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 transition-all duration-300 transform ${isDesktopToolsOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-3'}`}>
              <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-xl overflow-hidden p-3">
                <div className="grid grid-cols-2 gap-1">
                  {documentTools.map((tool) => (
                    <button
  key={tool.name}
  onClick={() => {
    tool.action();
    setIsDesktopToolsOpen(false);
  }}
  className="block w-full text-left px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
>
  {tool.name}
</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Link 
  to="/ResumeBuilder" 
  className="hover:text-gray-900 transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-gray-900 after:transition-all hover:after:w-full"
>
  Resume Builder
</Link>
          
          {/* Unique "Ripple Expand" Button for Pricing */}
          <a href="#premium" className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full hover:border-amber-400 transition-all duration-300 group shadow-sm hover:shadow-md">
            <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-gradient-to-r from-amber-400 to-orange-400 rounded-full group-hover:w-56 group-hover:h-56 opacity-15"></span>
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-amber-200"></span>
            <span className="relative tracking-wider text-xs uppercase">Pricing</span>
          </a>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden relative z-50 p-2 text-gray-600 hover:text-gray-900 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle Menu"
        >
          <div className="w-5 h-4 flex flex-col justify-between">
            <span className={`block h-[2px] w-full bg-current transform transition duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block h-[2px] w-full bg-current transition duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block h-[2px] w-full bg-current transform transition duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </div>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      <div className={`md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl overflow-y-auto transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="flex flex-col px-4 py-4 space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Document Tools</p>
            <div className="grid grid-cols-2 gap-2">
              {documentTools.map((tool) => (
                <button
                  key={tool.name}
                  onClick={() => {
                    tool.action();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-2 py-2 text-sm font-medium text-gray-600 hover:text-red-500 bg-gray-50 rounded-md"
                >
                  {tool.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-px bg-gray-100 w-full"></div>
          <a href="#resume-section" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Resume Builder</a>
          <a href="#premium" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2 text-sm font-bold text-amber-600 hover:text-amber-700">Pricing</a>

          {/* New About / Legal Section */}
          <div className="h-px bg-gray-100 w-full"></div>
          <div className="space-y-1 pb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 mb-2">Company & Legal</p>
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">About Us</a>
            <a href="#privacy" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">Privacy Policy</a>
            <a href="#terms" onClick={() => setIsMobileMenuOpen(false)} className="block px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">T&S</a>
          </div>

        </div>
      </div>

    </nav>

{/* Hero Section Container */}
      <header className="relative min-h-[90vh] flex flex-col justify-center items-center text-center pt-32 pb-20 overflow-hidden bg-slate-50 px-4">
        
        {/* Animated Ambient Background Blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob pointer-events-none"></div>
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-red-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-2000 pointer-events-none"></div>
        <div className="absolute -bottom-8 left-1/3 w-72 h-72 bg-amber-100 rounded-full mix-blend-multiply filter blur-[80px] opacity-40 animate-blob animation-delay-4000 pointer-events-none"></div>

        <div className="max-w-5xl mx-auto relative z-10 w-full">
          
          {/* Animated Premium Badge */}
          <div className="flex justify-center mb-8">
            <span 
              className="group relative inline-flex items-center justify-center px-5 py-2 text-xs font-bold tracking-[0.2em] uppercase text-amber-700 bg-white/80 backdrop-blur-md border border-amber-200/60 rounded-full shadow-[0_0_15px_rgba(251,191,36,0.2)] hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all duration-300 cursor-default"
              style={{ fontFamily: 'var(--Project-Font, "Outfit", Metropolis, sans-serif)' }}
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
              Ultimate PDF & Career Toolkit
            </span>
          </div>
          
          {/* Main Heading with Shifting Gradient Text */}
          <h1 
            className="font-bold text-gray-900 tracking-tight mb-8 whitespace-pre-line text-4xl sm:text-5xl md:text-[64px] md:leading-[76px]"
            style={{ fontFamily: 'var(--Project-Font, "Outfit", Metropolis, sans-serif)' }}
          >
            Supercharge Your <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 bg-size-200 animate-gradient-shift drop-shadow-sm">
              PDFs & Resumes
            </span>
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-base sm:text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto font-light leading-relaxed"
            style={{ fontFamily: 'var(--Project-Font, "Outfit", Metropolis, sans-serif)' }}
          >
            Simplify your document workflows. Merge, split, compress, and edit PDFs, or build a stunning, ATS-friendly resume in seconds.
          </p>

          {/* Dynamic Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-6">
            
            {/* Primary Action Button */}
            <button 
              className="relative w-full sm:w-auto px-8 py-4 bg-gray-900 text-white font-medium rounded-full overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_40px_rgba(249,115,22,0.3)] transition-all duration-300 transform hover:-translate-y-1 group"
              style={{ fontFamily: 'var(--Project-Font, "Outfit", Metropolis, sans-serif)' }}
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-size-200 animate-gradient-shift opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Premium Access
              </span>
            </button>

            {/* Requested "Build Resume" Button with Arrow Animation */}
            <button 
              className="w-full sm:w-auto px-8 py-4 bg-white/70 backdrop-blur-md text-gray-900 font-bold rounded-full border border-gray-200 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all duration-300 transform hover:-translate-y-1 group flex items-center justify-center gap-3"
              style={{ fontFamily: 'var(--Project-Font, "Outfit", Metropolis, sans-serif)' }}
            >
              <span>Build Resume</span>
              {/* Arrow that slides to the right on hover */}
              <svg 
                className="w-5 h-5 text-orange-500 transform group-hover:translate-x-1.5 transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </button>

          </div>
        </div>
      </header>
{/* Tools Section */}
      <main className="tools-wrapper relative max-w-7xl mx-auto px-4 py-24 sm:py-32" id="tools-grid">
        
        {/* Subtle Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tight">Powerful Document Tools</h2>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto">Everything you need to modify, secure, and convert your PDFs in one place.</p>
        </div>

        <div className="tools-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          
          {/* Merge PDF */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(239,68,68,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsMergeModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-red-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100/50 text-red-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-red-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-layer-group"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-red-600 transition-colors duration-300">Merge PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Combine multiple PDFs into a single document exactly the way you want.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Split PDF */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(34,197,94,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsSplitModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-green-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 text-green-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-green-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-scissors"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors duration-300">Split PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Extract or separate pages into individual, high-quality files.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(34,197,94,0.3)] hover:bg-green-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Compress PDF */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(59,130,246,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsCompressModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-blue-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-file-zipper"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors duration-300">Compress PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Reduce heavy file sizes instantly while preserving perfect quality.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:bg-blue-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Image to PDF */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(168,85,247,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsImageModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 text-purple-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-purple-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-image"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors duration-300">Image to PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Convert PNG, JPG, or WEBP images into a perfectly structured PDF.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(168,85,247,0.3)] hover:bg-purple-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* PDF to Image */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(14,165,233,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsPdfToImgModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-sky-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-50 to-sky-100/50 text-sky-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-sky-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-file-image"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-sky-600 transition-colors duration-300">PDF to Image</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Extract all pages from multiple PDF files into crisp PNG or JPEG images.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:bg-sky-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Page Manager */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsRemovePagesModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-500 flex items-center justify-center text-2xl mb-6 shadow-inner border border-amber-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-bezier-curve"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors duration-300">Page Manager</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Remove pages across multiple files instantly with real-time visual controls.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:bg-amber-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Image Compressor */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(245,158,11,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsImgCompressModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/50 text-amber-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-amber-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-images"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-amber-600 transition-colors duration-300">Image Compressor</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Decompress and optimize batch images using ultra-efficient slider encoding.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(245,158,11,0.3)] hover:bg-amber-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* PDF to Word */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(99,102,241,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsPdfToWordModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-indigo-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-indigo-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-file-word"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors duration-300">PDF to Word</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Convert PDFs to editable Word documents (.docx) keeping fonts and layouts intact.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-indigo-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(99,102,241,0.3)] hover:bg-indigo-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* PDF to Excel */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(16,185,129,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsPdfToExcelModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-emerald-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-emerald-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-file-excel"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-emerald-600 transition-colors duration-300">PDF to Excel</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Extract tables and financial data into clean, formatted Excel (.xlsx) spreadsheets.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(16,185,129,0.3)] hover:bg-emerald-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Protect PDF (Premium - Violet Theme) */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsProtectModalOpen(true)}
          >
            <div className="absolute top-6 right-6 bg-violet-600 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 z-20">
              <i className="fa-solid fa-crown text-[10px]"></i> Premium
            </div>
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-violet-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 text-violet-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-violet-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-shield-halved"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors duration-300">Protect PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Encrypt your document with high-security AES-256 passwords to prevent unauthorized access.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:bg-violet-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Unlock PDF (Premium - Violet Theme) */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsUnlockModalOpen(true)}
          >
            <div className="absolute top-6 right-6 bg-violet-600 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 z-20">
              <i className="fa-solid fa-crown text-[10px]"></i> Premium
            </div>
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-violet-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 text-violet-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-violet-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-lock-open"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors duration-300">Unlock PDF</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Remove security passwords from protected PDFs permanently for easy access.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:bg-violet-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* Change Password (Premium - Violet Theme) */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(139,92,246,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsChangePwdModalOpen(true)}
          >
            <div className="absolute top-6 right-6 bg-violet-600 text-white text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full font-bold shadow-sm flex items-center gap-1.5 z-20">
              <i className="fa-solid fa-crown text-[10px]"></i> Premium
            </div>
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-violet-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 text-violet-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-violet-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-key"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-violet-600 transition-colors duration-300">Change Password</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Update or swap the security password of an encrypted PDF instantly.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-violet-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(139,92,246,0.3)] hover:bg-violet-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

          {/* PDF to PowerPoint */}
          <article 
            className="group relative overflow-hidden rounded-[2.5rem] bg-white p-8 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(249,115,22,0.25)] hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col min-h-[280px]"
            onClick={() => setIsPdfToPptModalOpen(true)}
          >
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-orange-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-0 group-hover:opacity-15 transition-opacity duration-500"></div>
            <div className="relative z-10 flex-1">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/50 text-orange-600 flex items-center justify-center text-2xl mb-6 shadow-inner border border-orange-200/50 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                <i className="fa-solid fa-file-powerpoint"></i>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors duration-300">PDF to PPTX</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">Turn your PDF documents into high-quality, presentation-ready PowerPoint slides.</p>
            </div>
            <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-20">
              <div className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-[0_4px_15px_rgba(249,115,22,0.3)] hover:bg-orange-600 transition-all duration-300">
                Open Tool <i className="fa-solid fa-arrow-right -rotate-45 group-hover:rotate-0 transition-transform duration-300"></i>
              </div>
            </div>
          </article>

        </div>
      </main>

{/* --- MERGE MODAL --- */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shadow-inner border border-red-200/50">
                  <i className="fa-solid fa-layer-group text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-500"></i>
                </div>
                Merge PDFs
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-red-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              {/* Interactive Upload Zone - Spatial UI */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed border-red-200/60 bg-gradient-to-b from-red-50/30 to-transparent p-8 text-center transition-all duration-500 hover:border-red-400/60 hover:shadow-[0_0_30px_rgba(239,68,68,0.1)] ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setSelectedFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input type="file" multiple accept=".pdf" id="pdf-upload" className="hidden" onChange={(e) => setSelectedFiles(Array.from(e.target.files))} disabled={isProcessing}/>
                <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  
                  {selectedFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/60 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white max-h-40 overflow-y-auto transform transition-all group-hover:scale-[1.02]">
                      <div className="flex justify-between items-center mb-3">
                        <p className="font-extrabold text-sm text-gray-900 tracking-tight">Selected Assets</p>
                        <span className="bg-gradient-to-r from-red-500 to-rose-500 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">{selectedFiles.length}</span>
                      </div>
                      <ul className="text-xs font-semibold text-gray-500 space-y-2">
                        {selectedFiles.map((f, i) => (
                          <li key={i} className="truncate flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                            <i className="fa-solid fa-file-pdf text-red-400"></i> {f.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="transform transition-all duration-500 group-hover:-translate-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center text-red-500 mb-4 border border-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-red-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className="fa-solid fa-cloud-arrow-up text-2xl relative z-10 group-hover:scale-110 transition-transform duration-500"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">Drop files here</h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">or click to browse your device</p>
                    </div>
                  )}
                  
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {selectedFiles.length > 0 ? 'Add More Files' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Dynamic Progress Bar & Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-red-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin"></i> Merging Data...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                      <div className="absolute top-0 right-0 bottom-0 left-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripes_1s_linear_infinite]"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleMerge} 
                  disabled={selectedFiles.length < 2} 
                  className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform duration-300"></i> Merge Documents
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SPLIT MODAL --- */}
     {isSplitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(34,197,94,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center shadow-inner border border-green-200/50">
                  <i className="fa-solid fa-scissors text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500"></i>
                </div>
                Split PDF
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-green-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed border-green-200/60 bg-gradient-to-b from-green-50/30 to-transparent p-8 text-center transition-all duration-500 hover:border-green-400/60 hover:shadow-[0_0_30px_rgba(34,197,94,0.1)] ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setSplitFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input type="file" accept=".pdf" id="pdf-split-upload" className="hidden" onChange={(e) => setSplitFile(e.target.files[0])} disabled={isProcessing} />
                <label htmlFor="pdf-split-upload" className="cursor-pointer flex flex-col items-center">
                  {splitFile ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all group-hover:scale-[1.02]">
                      <p className="font-extrabold text-xs text-green-900 uppercase tracking-wider mb-2">Target File</p>
                      <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                         <i className="fa-solid fa-file-pdf text-green-500 text-xl"></i>
                         <p className="text-sm font-semibold text-gray-700 truncate">{splitFile.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="transform transition-all duration-500 group-hover:-translate-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center text-green-500 mb-4 border border-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-green-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className="fa-solid fa-file-pdf text-2xl relative z-10 group-hover:scale-110 transition-transform duration-500"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">Select PDF to Split</h3>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-green-100 text-green-600 hover:bg-green-50 hover:border-green-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {splitFile ? 'Change File' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-green-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-scissors fa-fade"></i> Processing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleSplit} 
                  disabled={!splitFile} 
                  className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(34,197,94,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-zipper group-hover:scale-110 transition-transform duration-300"></i> Split & Download ZIP
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- COMPRESS MODAL --- */}
      {isCompressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-inner border border-blue-200/50">
                  <i className="fa-solid fa-file-zipper text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500"></i>
                </div>
                Compress PDF
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-blue-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed border-blue-200/60 bg-gradient-to-b from-blue-50/30 to-transparent p-8 text-center transition-all duration-500 hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    setCompressFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input type="file" accept=".pdf" id="pdf-compress-upload" className="hidden" onChange={(e) => setCompressFile(e.target.files[0])} disabled={isProcessing} />
                <label htmlFor="pdf-compress-upload" className="cursor-pointer flex flex-col items-center">
                  {compressFile ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all group-hover:scale-[1.02]">
                      <p className="font-extrabold text-xs text-blue-900 uppercase tracking-wider mb-2">Target File</p>
                      <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                         <i className="fa-solid fa-file-pdf text-blue-500 text-xl"></i>
                         <p className="text-sm font-semibold text-gray-700 truncate">{compressFile.name}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="transform transition-all duration-500 group-hover:-translate-y-2">
                      <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center text-blue-500 mb-4 border border-slate-100 relative overflow-hidden">
                        <div className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className="fa-solid fa-minimize text-2xl relative z-10 group-hover:scale-110 transition-transform duration-500"></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">Select Heavy PDF</h3>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {compressFile ? 'Change File' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Neumorphic Slider */}
              <div className="bg-white/60 backdrop-blur-md border border-white rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-black text-gray-800 tracking-tight">Compression Engine</label>
                  <span className="text-xs font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 px-3 py-1 rounded-full shadow-md">{compressQuality}% Ratio</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="100" 
                  value={compressQuality} 
                  onChange={(e) => setCompressQuality(e.target.value)} 
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-indigo-500 transition-all" 
                  disabled={isProcessing} 
                />
              </div>

              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-blue-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-compress fa-fade"></i> Optimizing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleCompress} 
                  disabled={!compressFile} 
                  className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-bolt group-hover:text-yellow-300 transition-colors duration-300"></i> Compress & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


{/* --- PREMIUM IMAGE TO PDF MODAL --- */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-[95vw] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(168,85,247,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center shadow-inner border border-purple-200/50">
                  <i className="fa-solid fa-image text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-fuchsia-500"></i>
                </div>
                Image to PDF
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-purple-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isImageDragActive ? 'border-purple-500 bg-purple-50/80 scale-[1.02] shadow-[0_0_30px_rgba(168,85,247,0.15)]' : 'border-purple-200/60 bg-gradient-to-b from-purple-50/30 to-transparent hover:border-purple-400/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsImageDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsImageDragActive(false);
                  if (e.dataTransfer.files) {
                    setImageFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input 
                  type="file" multiple accept="image/*" id="image-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setImageFiles(Array.from(e.target.files));
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {imageFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all">
                      <p className="font-extrabold text-xs text-purple-900 uppercase tracking-wider mb-2">Selected Images ({imageFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {imageFiles.map((f, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3 border border-slate-100">
                            <i className="fa-solid fa-image text-purple-500"></i>
                            <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isImageDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isImageDragActive ? 'bg-purple-100 text-purple-600 border-purple-200 scale-110' : 'bg-white text-purple-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isImageDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isImageDragActive ? 'Drop to upload!' : 'Upload Images'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select JPG, PNG or WEBP</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-purple-100 text-purple-600 hover:bg-purple-50 hover:border-purple-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {imageFiles.length > 0 ? 'Change Selection' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-purple-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin"></i> Converting...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleImageToPdf} 
                  disabled={imageFiles.length === 0} 
                  className="group relative w-full h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(168,85,247,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform duration-300"></i> Convert & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}  

{/* --- PREMIUM PDF TO IMAGE MODAL --- */}
      {isPdfToImgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-[95vw] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-inner border border-blue-200/50">
                  <i className="fa-solid fa-file-image text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500"></i>
                </div>
                PDF to Image
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-blue-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isPdfToImgDragActive ? 'border-blue-500 bg-blue-50/80 scale-[1.02] shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'border-blue-200/60 bg-gradient-to-b from-blue-50/30 to-transparent hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsPdfToImgDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsPdfToImgDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsPdfToImgDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsPdfToImgDragActive(false);
                  if (e.dataTransfer.files) {
                    setPdfToImgFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input 
                  type="file" multiple accept=".pdf" id="pdf-to-img-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setPdfToImgFiles(Array.from(e.target.files));
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-to-img-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {pdfToImgFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all">
                      <p className="font-extrabold text-xs text-blue-900 uppercase tracking-wider mb-2">Selected Files ({pdfToImgFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {pdfToImgFiles.map((f, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3 border border-slate-100">
                            <i className="fa-solid fa-file-pdf text-blue-500"></i>
                            <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isPdfToImgDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isPdfToImgDragActive ? 'bg-blue-100 text-blue-600 border-blue-200 scale-110' : 'bg-white text-blue-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isPdfToImgDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isPdfToImgDragActive ? 'Drop to upload!' : 'Upload PDF Documents'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select PDF files to convert</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {pdfToImgFiles.length > 0 ? 'Change Selection' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Format Selector */}
              <div className="bg-white/50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-2">
                <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Output Format</label>
                <select 
                  value={imageFormat} 
                  onChange={(e) => setImageFormat(e.target.value)}
                  className="w-full h-12 border border-slate-200 rounded-xl px-4 bg-white text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none"
                  disabled={isProcessing}
                >
                  <option value="png">High Quality PNG (.png)</option>
                  <option value="jpeg">Standard JPEG (.jpg)</option>
                </select>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-blue-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin"></i> Converting...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handlePdfToImagesSubmit} 
                  disabled={pdfToImgFiles.length === 0} 
                  className="group relative w-full h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-bolt group-hover:text-yellow-300 transition-colors duration-300"></i> Convert & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}


{/* --- PREMIUM REMOVE PAGES MODAL --- */}
{isRemovePagesModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
    <div 
      className="relative max-w-4xl w-[95vw] h-[90vh] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out flex flex-col" 
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="relative z-10 flex justify-between items-center mb-8 shrink-0">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shadow-inner border border-amber-200/50">
            <i className="fa-solid fa-bezier-curve text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500"></i>
          </div>
          Page Manager
        </h2>
        <div className="flex items-center gap-4">
          <span className="hidden sm:block bg-amber-500/10 text-amber-600 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider border border-amber-200">Pro Features Active</span>
          <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-200 transition-all duration-300 flex items-center justify-center">
            <i className="fa-solid fa-xmark text-slate-400 group-hover:text-amber-500 group-hover:rotate-90 transition-all duration-300"></i>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
        
        {/* Upload Area */}
        <div 
          className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
            ${(isProcessing || isLoadingPreviews) ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
            ${isRemovePagesDragActive ? 'border-amber-500 bg-amber-50/80 scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-transparent hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]'}
          `}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsRemovePagesDragActive(true); }}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsRemovePagesDragActive(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsRemovePagesDragActive(false); }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsRemovePagesDragActive(false);
            if (e.dataTransfer.files) {
               // Assuming your logic requires passing the file list to your existing handler
               const event = { target: { files: e.dataTransfer.files } };
               handleRemovePagesFileChange(event);
            }
          }}
        >
          <input type="file" multiple accept=".pdf" id="remove-pages-upload" className="hidden" onChange={handleRemovePagesFileChange} disabled={isProcessing || isLoadingPreviews}/>
          <label htmlFor="remove-pages-upload" className="cursor-pointer flex flex-col items-center">
            <div className={`w-16 h-16 rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500 ${isRemovePagesDragActive ? 'bg-amber-100 scale-110' : 'bg-white'}`}>
              <i className="fa-solid fa-file-pdf text-2xl text-amber-500 relative z-10"></i>
            </div>
            <h3 className="font-bold text-gray-900 text-base">{isRemovePagesDragActive ? 'Drop PDFs here' : 'Upload PDF Documents'}</h3>
            <p className="text-gray-400 text-xs mt-1 font-medium">Select files to manage pages or merge</p>
          </label>
        </div>

        {/* Loading State */}
        {isLoadingPreviews && (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-sm font-bold text-amber-700 animate-pulse">Generating Secure Previews...</p>
          </div>
        )}

        {/* Previews Grid */}
        {previewData.length > 0 && !isLoadingPreviews && (
          <div className="space-y-6 animate-in fade-in duration-700">
            {previewData.map((fileObj, fileIndex) => (
              <div key={fileIndex} className="bg-white/50 border border-slate-100 rounded-3xl p-6 shadow-sm">
                <h4 className="font-black text-gray-800 text-sm mb-4 flex items-center gap-2">
                  <i className="fa-regular fa-file-pdf text-amber-500"></i> {fileObj.filename}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                  {fileObj.pages.map((page) => {
                    const isKept = activeKeptPages[fileIndex]?.includes(page.page_index);
                    return (
                      <div key={page.page_index} className={`relative rounded-2xl overflow-hidden p-2 border-2 transition-all duration-300 ${isKept ? 'border-transparent bg-white shadow-lg' : 'border-red-200 bg-red-50/50 opacity-60 grayscale'}`}>
                        <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden relative">
                          <img src={page.thumbnail} alt={`Page ${page.page_index + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button onClick={() => setFullScreenPreviewUrl(page.thumbnail)} className="w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                              <i className="fa-solid fa-expand text-xs"></i>
                            </button>
                            <button onClick={() => togglePageSelection(fileIndex, page.page_index)} className={`w-8 h-8 ${isKept ? 'bg-red-500' : 'bg-green-500'} text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform`}>
                              <i className={`fa-solid ${isKept ? 'fa-trash-can' : 'fa-arrow-rotate-left'}`}></i>
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest text-center">Page {page.page_index + 1}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Config Mode Toggle */}
            <div className="bg-white border border-amber-100 rounded-2xl p-6 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
              <div>
                <p className="font-black text-gray-900 text-sm">Output Configuration</p>
                <p className="text-xs text-gray-500 font-medium">Choose how to package your result</p>
              </div>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto">
                {['single', 'multiple'].map((mode) => (
                  <button 
                    key={mode}
                    onClick={() => setDownloadMode(mode)}
                    className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs font-black rounded-xl transition-all ${downloadMode === mode ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {mode === 'single' ? 'Merge into 1 PDF' : 'Keep Separate (ZIP)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Action */}
      <div className="shrink-0 pt-6 border-t border-slate-100 mt-2">
        {isProcessing ? (
          <div className="w-full h-14 bg-amber-500/10 rounded-2xl flex items-center justify-between px-6 animate-pulse">
            <span className="font-bold text-amber-700">Compiling...</span>
            <span className="font-black text-amber-700">{progress}%</span>
          </div>
        ) : (
          <button 
            onClick={handleRemovePagesSubmit} 
            disabled={previewData.length === 0 || activeKeptPages.every(arr => arr.length === 0)} 
            className="w-full h-14 rounded-2xl bg-gray-900 text-white font-bold hover:shadow-[0_10px_30px_-10px_rgba(245,158,11,0.5)] transition-all hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Apply Structural Edits
          </button>
        )}
      </div>
    </div>
  </div>
)}

      {/* --- FULLSCREEN COMPONENT MODAL OVERLAY --- */}
      {fullScreenPreviewUrl && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setFullScreenPreviewUrl(null)}>
          <div className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setFullScreenPreviewUrl(null)} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white transition flex items-center justify-center"><i className="fa-solid fa-xmark"></i></button>
            <img src={fullScreenPreviewUrl} alt="Fullscreen View" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

{/* --- PREMIUM IMAGE COMPRESS MODAL --- */}
      {isImgCompressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center shadow-inner border border-amber-200/50">
                  <i className="fa-solid fa-images text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-500"></i>
                </div>
                Compress
              </h2>
              <span className="bg-amber-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider shadow-sm">Premium 2026</span>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isImgDragActive ? 'border-amber-500 bg-amber-50/80 scale-[1.02] shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-amber-200/60 bg-gradient-to-b from-amber-50/30 to-transparent hover:border-amber-400/60 hover:shadow-[0_0_30px_rgba(245,158,11,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsImgDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsImgDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsImgDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsImgDragActive(false);
                  if (e.dataTransfer.files) {
                    setImgCompressFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input 
                  type="file" multiple accept="image/*" id="img-compress-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setImgCompressFiles(Array.from(e.target.files));
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="img-compress-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {imgCompressFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all">
                      <p className="font-extrabold text-xs text-amber-900 uppercase tracking-wider mb-2">Selected Files ({imgCompressFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {imgCompressFiles.map((f, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3 border border-slate-100">
                            <i className="fa-solid fa-image text-amber-500"></i>
                            <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isImgDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isImgDragActive ? 'bg-amber-100 text-amber-600 border-amber-200 scale-110' : 'bg-white text-amber-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-amber-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isImgDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isImgDragActive ? 'Drop to upload!' : 'Upload Images'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select JPG, PNG or WEBP files</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-amber-100 text-amber-600 hover:bg-amber-50 hover:border-amber-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {imgCompressFiles.length > 0 ? 'Change Selection' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Quality Slider */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Compression Quality</label>
                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg uppercase tracking-wide border border-amber-100">{imgCompressQuality}%</span>
                </div>
                <input 
                  type="range" min="10" max="100" value={imgCompressQuality} 
                  onChange={(e) => setImgCompressQuality(parseInt(e.target.value))} 
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-all hover:h-3"
                  disabled={isProcessing}
                />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider px-1">
                  <span>Smaller File</span>
                  <span>Higher Quality</span>
                </div>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-amber-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-compress fa-fade"></i> Optimizing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleCompressImages} 
                  disabled={imgCompressFiles.length === 0} 
                  className="group relative w-full h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(245,158,11,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-wand-magic-sparkles group-hover:-translate-y-1 transition-transform duration-300"></i> Optimize & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{/* --- PDF TO WORD MODAL --- */}
      {isPdfToWordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center shadow-inner border border-blue-200/50">
                  <i className="fa-solid fa-file-word text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500"></i>
                </div>
                PDF to Word
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-blue-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isWordDragActive ? 'border-blue-500 bg-blue-50/80 scale-[1.02] shadow-[0_0_30px_rgba(37,99,235,0.15)]' : 'border-blue-200/60 bg-gradient-to-b from-blue-50/30 to-transparent hover:border-blue-400/60 hover:shadow-[0_0_30px_rgba(37,99,235,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsWordDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsWordDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsWordDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsWordDragActive(false);
                  if (e.dataTransfer.files) {
                    setPdfToWordFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input 
                  type="file" multiple accept=".pdf" id="pdf-to-word-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setPdfToWordFiles(Array.from(e.target.files));
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-to-word-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {pdfToWordFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all">
                      <p className="font-extrabold text-xs text-blue-900 uppercase tracking-wider mb-2">Selected Files ({pdfToWordFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {pdfToWordFiles.map((f, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3 border border-slate-100">
                            <i className="fa-solid fa-file-pdf text-blue-500"></i>
                            <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isWordDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isWordDragActive ? 'bg-blue-100 text-blue-600 border-blue-200 scale-110' : 'bg-white text-blue-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isWordDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isWordDragActive ? 'Drop files to process!' : 'Upload PDF Documents'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select one or more PDF files</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-blue-100 text-blue-600 hover:bg-blue-50 hover:border-blue-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {pdfToWordFiles.length > 0 ? 'Change Selection' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-circle-info text-blue-500 mt-1"></i>
                <p className="text-[11px] text-blue-900 leading-relaxed font-bold">
                  Layouts and images will be mapped to editable elements. Heavy documents may take a few extra seconds to reconstruct.
                </p>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-blue-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-pen-nib fa-fade"></i> Reconstructing...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handlePdfToWord} 
                  disabled={pdfToWordFiles.length === 0} 
                  className="group relative w-full h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-word group-hover:-translate-y-1 transition-transform duration-300"></i> Convert & Download ZIP
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{/* --- PDF TO EXCEL MODAL --- */}
      {isPdfToExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(16,185,129,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center shadow-inner border border-emerald-200/50">
                  <i className="fa-solid fa-file-excel text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500"></i>
                </div>
                PDF to Excel
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-emerald-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isExcelDragActive ? 'border-emerald-500 bg-emerald-50/80 scale-[1.02] shadow-[0_0_30px_rgba(16,185,129,0.15)]' : 'border-emerald-200/60 bg-gradient-to-b from-emerald-50/30 to-transparent hover:border-emerald-400/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsExcelDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsExcelDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsExcelDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExcelDragActive(false);
                  if (e.dataTransfer.files) {
                    setPdfToExcelFiles(Array.from(e.dataTransfer.files));
                  }
                }}
              >
                <input 
                  type="file" multiple accept=".pdf" id="pdf-to-excel-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files) {
                      setPdfToExcelFiles(Array.from(e.target.files));
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-to-excel-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {pdfToExcelFiles.length > 0 ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all">
                      <p className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider mb-2">Selected Files ({pdfToExcelFiles.length})</p>
                      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                        {pdfToExcelFiles.map((f, i) => (
                          <div key={i} className="bg-slate-50 p-2 rounded-lg flex items-center gap-3 border border-slate-100">
                            <i className="fa-solid fa-file-pdf text-emerald-500"></i>
                            <span className="text-xs font-semibold text-gray-700 truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isExcelDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isExcelDragActive ? 'bg-emerald-100 text-emerald-600 border-emerald-200 scale-110' : 'bg-white text-emerald-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isExcelDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isExcelDragActive ? 'Drop to upload!' : 'Upload Data Documents'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select PDFs containing tables or lists</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-emerald-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {pdfToExcelFiles.length > 0 ? 'Change Selection' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Info Banner */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <i className="fa-solid fa-chart-simple text-emerald-500 mt-1"></i>
                <p className="text-[11px] text-emerald-900 leading-relaxed font-bold">
                  Pro-tip: This tool automatically scans for grids. Tabular data will be extracted into rows/columns, ignoring non-data formatting.
                </p>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                  <div className="flex justify-between text-xs font-black text-emerald-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-table-cells fa-fade"></i> Parsing Data...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handlePdfToExcel} 
                  disabled={pdfToExcelFiles.length === 0} 
                  className="group relative w-full h-14 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(16,185,129,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-file-excel group-hover:-translate-y-1 transition-transform duration-300"></i> Extract to Excel & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{/* --- PROTECT PDF MODAL --- */}
      {isProtectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(79,70,229,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center shadow-inner border border-indigo-200/50">
                  <i className="fa-solid fa-shield-halved text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500"></i>
                </div>
                Protect PDF
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-indigo-600 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Upload Area */}
              <div 
                className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                  ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                  ${isProtectDragActive ? 'border-indigo-500 bg-indigo-50/80 scale-[1.02] shadow-[0_0_30px_rgba(79,70,229,0.15)]' : 'border-indigo-200/60 bg-gradient-to-b from-indigo-50/30 to-transparent hover:border-indigo-400/60 hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]'}
                `}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsProtectDragActive(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsProtectDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsProtectDragActive(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsProtectDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setProtectFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input 
                  type="file" accept=".pdf" id="pdf-protect-upload" className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setProtectFile(e.target.files[0]);
                    }
                  }} 
                  disabled={isProcessing}
                />
                <label htmlFor="pdf-protect-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                  {protectFile ? (
                    <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all group-hover:scale-[1.02]">
                      <p className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider mb-2">Target File</p>
                      <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                        <i className="fa-solid fa-file-pdf text-indigo-500 text-xl"></i>
                        <div className="overflow-hidden flex-1">
                          <p className="text-sm font-semibold text-gray-700 truncate">{protectFile.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{(protectFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={`transform transition-all duration-500 ${isProtectDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                      <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                        ${isProtectDragActive ? 'bg-indigo-100 text-indigo-600 border-indigo-200 scale-110' : 'bg-white text-indigo-500 border-slate-100'}
                      `}>
                        <div className="absolute inset-0 bg-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isProtectDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                      </div>
                      <h3 className="font-bold text-gray-900 text-base">
                        {isProtectDragActive ? 'Drop file to secure it!' : 'Choose PDF File'}
                      </h3>
                      <p className="text-gray-400 text-xs mt-1 font-medium">Select a single document to encrypt</p>
                    </div>
                  )}
                  <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                    {protectFile ? 'Change Document' : 'Browse Files'}
                  </div>
                </label>
              </div>

              {/* Password Input */}
              <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Set Encryption Password</label>
                <div className="relative flex items-center bg-white/60 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <span className="absolute left-4 text-gray-400 text-sm">
                    <i className="fa-solid fa-key"></i>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter strong password..."
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    disabled={isProcessing}
                    className="w-full h-12 pl-11 pr-12 text-sm bg-transparent border-2 border-white rounded-xl focus:outline-none focus:border-indigo-400 transition-all font-bold text-gray-800"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-400 hover:text-indigo-600 transition-colors text-sm">
                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              {isProcessing ? (
                <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300 mt-2">
                  <div className="flex justify-between text-xs font-black text-indigo-600 mb-2 tracking-wide uppercase">
                    <span className="flex items-center gap-2"><i className="fa-solid fa-lock fa-fade"></i> Encrypting...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={handleProtectPdf} 
                  disabled={!protectFile || !pdfPassword} 
                  className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] transition-all duration-500 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-lock group-hover:-translate-y-1 transition-transform duration-300"></i> Encrypt & Download
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{/* --- UNLOCK PDF MODAL --- */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50 flex items-center justify-center shadow-inner border border-cyan-200/50">
                  <i className="fa-solid fa-lock-open text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500"></i>
                </div>
                Unlock PDF
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-cyan-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Step 1: Upload (Hidden if preview is active) */}
              {!unlockPreviewUrl && (
                <div 
                  className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                    ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                    ${isUnlockDragActive ? 'border-cyan-500 bg-cyan-50/80 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.15)]' : 'border-cyan-200/60 bg-gradient-to-b from-cyan-50/30 to-transparent hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)]'}
                  `}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsUnlockDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsUnlockDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsUnlockDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsUnlockDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setUnlockFile(e.dataTransfer.files[0]);
                      setUnlockPreviewUrl(null); 
                      setIsPasswordError(false);
                    }
                  }}
                >
                  <input 
                    type="file" accept=".pdf" id="pdf-unlock-upload" className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUnlockFile(e.target.files[0]);
                        setUnlockPreviewUrl(null); 
                        setIsPasswordError(false);
                      }
                    }} 
                    disabled={isProcessing}
                  />
                  <label htmlFor="pdf-unlock-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    {unlockFile ? (
                      <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all group-hover:scale-[1.02]">
                        <p className="font-extrabold text-xs text-cyan-900 uppercase tracking-wider mb-2">Target File</p>
                        <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                          <i className="fa-solid fa-file-shield text-cyan-500 text-xl"></i>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-gray-700 truncate">{unlockFile.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{(unlockFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`transform transition-all duration-500 ${isUnlockDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                        <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                          ${isUnlockDragActive ? 'bg-cyan-100 text-cyan-600 border-cyan-200 scale-110' : 'bg-white text-cyan-500 border-slate-100'}
                        `}>
                          <div className="absolute inset-0 bg-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isUnlockDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base">
                          {isUnlockDragActive ? 'Drop file to decrypt!' : 'Choose Locked PDF'}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 font-medium">Select a single protected document</p>
                      </div>
                    )}
                    <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-cyan-100 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                      {unlockFile ? 'Change Document' : 'Browse Files'}
                    </div>
                  </label>
                </div>
              )}

              {/* Step 2: Password Input */}
              {unlockFile && !unlockPreviewUrl && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Enter Current Password</label>
                  <div className="relative flex items-center bg-white/60 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <span className="absolute left-4 text-gray-400 text-sm">
                      <i className="fa-solid fa-key"></i>
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Current document password..."
                      value={unlockPassword}
                      onChange={(e) => { setUnlockPassword(e.target.value); setIsPasswordError(false); }}
                      disabled={isProcessing}
                      className={`w-full h-12 pl-11 pr-12 text-sm bg-transparent border-2 rounded-xl focus:outline-none transition-all font-bold ${isPasswordError ? 'border-red-400 focus:border-red-500 text-red-900' : 'border-white focus:border-cyan-400 text-gray-800'}`}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 text-gray-400 hover:text-cyan-600 transition-colors text-sm">
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {isPasswordError && <p className="text-xs font-bold text-red-500 mt-1 animate-in slide-in-from-left-2"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Incorrect password. Try again.</p>}

                  <button 
                    onClick={handleVerifyPassword} 
                    disabled={!unlockPassword || isProcessing} 
                    className="group relative w-full h-14 mt-4 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.5)] transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isProcessing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...</> : 'Unlock & Preview'}
                    </span>
                  </button>
                </div>
              )}

              {/* Step 3: Success Preview & Download */}
              {unlockPreviewUrl && (
                <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-500">
                  <div className="bg-white/60 backdrop-blur-md border border-white rounded-[1.5rem] p-4 flex items-center justify-between shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-full flex items-center justify-center text-xl shadow-inner">
                        <i className="fa-solid fa-check"></i>
                      </div>
                      <div>
                        <p className="font-black text-gray-900 text-sm">Access Granted</p>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Document decrypted successfully</p>
                      </div>
                    </div>
                  </div>

                  {unlockPreviewUrl !== 'NOT_ENCRYPTED' && (
                    <div className="border border-white bg-white/40 backdrop-blur-sm rounded-[1.5rem] p-3 shadow-inner">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2 text-center">Document Preview</p>
                      <div className="aspect-[3/4] w-full max-w-[180px] mx-auto bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm group relative">
                        <img src={unlockPreviewUrl} alt="PDF Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      </div>
                    </div>
                  )}

                  {isProcessing ? (
                    <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between text-xs font-black text-cyan-600 mb-2 tracking-wide uppercase">
                        <span className="flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin"></i> Removing Security...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleRemovePassword}
                      className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(6,182,212,0.5)] transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-download group-hover:-translate-y-1 transition-transform duration-300"></i> Remove Password & Download
                      </span>
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- CHANGE PASSWORD MODAL --- */}
      {isChangePwdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(244,63,94,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-100 to-rose-50 flex items-center justify-center shadow-inner border border-rose-200/50">
                  <i className="fa-solid fa-key text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500"></i>
                </div>
                Change Password
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-rose-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Step 1: Upload */}
              {!changePreviewUrl && (
                <div 
                  className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                    ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                    ${isChangeDragActive ? 'border-rose-500 bg-rose-50/80 scale-[1.02] shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 'border-rose-200/60 bg-gradient-to-b from-rose-50/30 to-transparent hover:border-rose-400/60 hover:shadow-[0_0_30px_rgba(244,63,94,0.1)]'}
                  `}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsChangeDragActive(true); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsChangeDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsChangeDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsChangeDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setChangeFile(e.dataTransfer.files[0]);
                      setChangePreviewUrl(null); 
                      setIsChangeError(false);
                    }
                  }}
                >
                  <input 
                    type="file" accept=".pdf" id="pdf-change-upload" className="hidden" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setChangeFile(e.target.files[0]);
                        setChangePreviewUrl(null); 
                        setIsChangeError(false);
                      }
                    }} 
                    disabled={isProcessing}
                  />
                  <label htmlFor="pdf-change-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                    {changeFile ? (
                      <div className="w-full text-left bg-white/80 backdrop-blur-md p-4 rounded-xl shadow-sm border border-white transform transition-all group-hover:scale-[1.02]">
                        <p className="font-extrabold text-xs text-rose-900 uppercase tracking-wider mb-2">Target File</p>
                        <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border border-slate-100">
                          <i className="fa-solid fa-file-pdf text-rose-500 text-xl"></i>
                          <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-gray-700 truncate">{changeFile.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{(changeFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={`transform transition-all duration-500 ${isChangeDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                        <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                          ${isChangeDragActive ? 'bg-rose-100 text-rose-600 border-rose-200 scale-110' : 'bg-white text-rose-500 border-slate-100'}
                        `}>
                          <div className="absolute inset-0 bg-rose-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isChangeDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                        </div>
                        <h3 className="font-bold text-gray-900 text-base">
                          {isChangeDragActive ? 'Drop file to secure it!' : 'Choose Target PDF'}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 font-medium">Select the encrypted file you want to update</p>
                      </div>
                    )}
                    <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-rose-100 text-rose-600 hover:bg-rose-50 hover:border-rose-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                      {changeFile ? 'Change Document' : 'Browse Files'}
                    </div>
                  </label>
                </div>
              )}

              {/* Step 2: Verify Old Password */}
              {changeFile && !changePreviewUrl && (
                <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Enter Current Password</label>
                  <div className="relative flex items-center bg-white/60 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <span className="absolute left-4 text-gray-400 text-sm">
                      <i className="fa-solid fa-lock"></i>
                    </span>
                    <input
                      type={showOldPassword ? 'text' : 'password'}
                      placeholder="Current document password..."
                      value={oldPassword}
                      onChange={(e) => { setOldPassword(e.target.value); setIsChangeError(false); }}
                      disabled={isProcessing}
                      className={`w-full h-12 pl-11 pr-12 text-sm bg-transparent border-2 rounded-xl focus:outline-none transition-all font-bold ${isChangeError ? 'border-red-400 focus:border-red-500 text-red-900' : 'border-white focus:border-rose-400 text-gray-800'}`}
                    />
                    <button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-4 text-gray-400 hover:text-rose-600 transition-colors text-sm">
                      <i className={`fa-solid ${showOldPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                  {isChangeError && <p className="text-xs font-bold text-red-500 mt-1 animate-in slide-in-from-left-2"><i className="fa-solid fa-triangle-exclamation mr-1"></i> Incorrect password. Try again.</p>}

                  <button 
                    onClick={handleChangeVerify} 
                    disabled={!oldPassword || isProcessing} 
                    className="group relative w-full h-14 mt-4 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(244,63,94,0.5)] transition-all duration-500 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isProcessing ? <><i className="fa-solid fa-circle-notch fa-spin"></i> Verifying...</> : 'Verify Access'}
                    </span>
                  </button>
                </div>
              )}

              {/* Step 3: Success Preview & New Password Generation */}
              {changePreviewUrl && (
                <div className="flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex gap-4 items-stretch bg-white/60 backdrop-blur-md p-4 rounded-[1.5rem] border border-white shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    {/* Tiny Preview Box */}
                    {changePreviewUrl !== 'NOT_ENCRYPTED' && (
                      <div className="w-16 h-20 rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white flex-shrink-0">
                        <img src={changePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    {/* Status Text */}
                    <div className="flex-1 flex flex-col justify-center">
                      <p className="font-black text-emerald-600 text-sm flex items-center gap-2"><i className="fa-solid fa-shield-check text-lg"></i> Access Verified</p>
                      <p className="text-xs text-gray-500 font-medium leading-tight mt-1">You may now apply a new high-security layer to this document.</p>
                    </div>
                  </div>

                  {/* New Password Input */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black text-gray-800 tracking-tight uppercase">Set New Password</label>
                    <div className="relative flex items-center bg-white/60 backdrop-blur-md rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                      <span className="absolute left-4 text-rose-500 text-sm">
                        <i className="fa-solid fa-key"></i>
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="Enter robust new password..."
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={isProcessing}
                        className="w-full h-12 pl-11 pr-12 text-sm bg-transparent border-2 border-white rounded-xl focus:outline-none focus:border-rose-400 transition-all font-bold text-gray-800"
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-4 text-gray-400 hover:text-rose-600 transition-colors text-sm">
                        <i className={`fa-solid ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  {isProcessing ? (
                    <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300 mt-2">
                      <div className="flex justify-between text-xs font-black text-rose-600 mb-2 tracking-wide uppercase">
                        <span className="flex items-center gap-2"><i className="fa-solid fa-lock fa-fade"></i> Encrypting...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleChangePasswordSubmit}
                      disabled={!newPassword}
                      className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(244,63,94,0.5)] transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-floppy-disk group-hover:-translate-y-1 transition-transform duration-300"></i> Update Security & Download
                      </span>
                    </button>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* --- PDF TO POWERPOINT MODAL --- */}
      {isPdfToPptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-500" onClick={closeOverlay}>
          <div 
            className="relative max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-[0_20px_60px_-15px_rgba(249,115,22,0.2)] border border-white/60 overflow-hidden animate-in fade-in zoom-in-[0.98] slide-in-from-bottom-4 duration-500 ease-out" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-400 rounded-full mix-blend-multiply filter blur-[80px] opacity-30 pointer-events-none animate-pulse"></div>

            <div className="relative z-10 flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center shadow-inner border border-orange-200/50">
                  <i className="fa-solid fa-file-powerpoint text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500"></i>
                </div>
                PDF to PPTX
              </h2>
              <button onClick={closeOverlay} className="group w-10 h-10 rounded-full bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 transition-all duration-300 flex items-center justify-center">
                <i className="fa-solid fa-xmark text-slate-400 group-hover:text-orange-500 group-hover:rotate-90 transition-all duration-300"></i>
              </button>
            </div>
            
            <div className="relative z-10 flex flex-col gap-6">
              
              {/* Conditional Rendering: Show Error Alert OR Upload Area */}
              {pptProtectedError ? (
                <div className="bg-white/60 backdrop-blur-md border border-red-200 rounded-3xl p-8 text-center animate-in zoom-in-95 duration-500 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="w-20 h-20 bg-gradient-to-br from-red-50 to-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner border border-red-200/50">
                    <i className="fa-solid fa-lock animate-pulse"></i>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Protected Document</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed mb-6 px-2">The file <span className="font-bold text-red-500 truncate inline-block max-w-[150px] align-bottom">"{pptProtectedError}"</span> requires a password. We cannot map it to slides.</p>
                  
                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={goToUnlockTool}
                      className="group relative w-full h-12 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.5)] transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        Take me to Unlock PDF
                      </span>
                    </button>
                    <button 
                      onClick={() => { setPptProtectedError(null); setPdfToPptFiles([]); }}
                      className="w-full h-12 rounded-2xl bg-white border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 hover:text-gray-900 transition-all duration-300"
                    >
                      Upload a Different File
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div 
                    className={`group relative overflow-hidden rounded-[2rem] border-2 border-dashed transition-all duration-500 p-8 text-center
                      ${isProcessing ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
                      ${isPptDragActive ? 'border-orange-500 bg-orange-50/80 scale-[1.02] shadow-[0_0_30px_rgba(249,115,22,0.15)]' : 'border-orange-200/60 bg-gradient-to-b from-orange-50/30 to-transparent hover:border-orange-400/60 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]'}
                    `}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsPptDragActive(true); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsPptDragActive(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsPptDragActive(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsPptDragActive(false);
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        setPdfToPptFiles(Array.from(e.dataTransfer.files));
                      }
                    }}
                  >
                    <input 
                      type="file" multiple accept=".pdf" id="pdf-to-ppt-upload" className="hidden" 
                      onChange={(e) => setPdfToPptFiles(Array.from(e.target.files))} 
                      disabled={isProcessing}
                    />
                    <label htmlFor="pdf-to-ppt-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
                      {pdfToPptFiles.length > 0 ? (
                        <div className="w-full text-left bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-white max-h-40 overflow-y-auto transform transition-all group-hover:scale-[1.02]">
                          <div className="flex justify-between items-center mb-3">
                            <p className="font-extrabold text-sm text-gray-900 tracking-tight">Selected Assets</p>
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-2.5 py-1 rounded-lg text-xs font-black shadow-sm">{pdfToPptFiles.length}</span>
                          </div>
                          <ul className="text-xs font-semibold text-gray-500 space-y-2">
                            {pdfToPptFiles.map((f, i) => (
                              <li key={i} className="truncate flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                <i className="fa-solid fa-file-pdf text-orange-400"></i> {f.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className={`transform transition-all duration-500 ${isPptDragActive ? '-translate-y-2' : 'group-hover:-translate-y-2'}`}>
                          <div className={`w-16 h-16 mx-auto rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.04)] flex items-center justify-center mb-4 border relative overflow-hidden transition-all duration-500
                            ${isPptDragActive ? 'bg-orange-100 text-orange-600 border-orange-200 scale-110' : 'bg-white text-orange-500 border-slate-100'}
                          `}>
                            <div className="absolute inset-0 bg-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <i className={`fa-solid fa-cloud-arrow-up text-2xl relative z-10 transition-transform duration-500 ${isPptDragActive ? 'animate-bounce' : 'group-hover:scale-110'}`}></i>
                          </div>
                          <h3 className="font-bold text-gray-900 text-base">
                            {isPptDragActive ? 'Drop assets to convert!' : 'Upload Presentations'}
                          </h3>
                          <p className="text-gray-400 text-xs mt-1 font-medium">Select PDF files to map onto slides</p>
                        </div>
                      )}
                      <div className="mt-6 px-6 py-2.5 rounded-xl bg-white border border-orange-100 text-orange-600 hover:bg-orange-50 hover:border-orange-200 font-bold text-xs shadow-sm transition-all duration-300 transform group-hover:scale-105">
                        {pdfToPptFiles.length > 0 ? 'Add More Files' : 'Browse Files'}
                      </div>
                    </label>
                  </div>

                  {isProcessing ? (
                    <div className="progress-container bg-slate-50 p-4 rounded-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between text-xs font-black text-orange-600 mb-2 tracking-wide uppercase">
                        <span className="flex items-center gap-2"><i className="fa-solid fa-circle-notch fa-spin"></i> Generating PPTX...</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-300 relative" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={handlePdfToPpt} 
                      disabled={pdfToPptFiles.length === 0} 
                      className="group relative w-full h-14 mt-2 rounded-2xl bg-gray-900 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.5)] transition-all duration-500 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 disabled:hidden"></div>
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <i className="fa-solid fa-wand-magic-sparkles group-hover:rotate-12 transition-transform duration-300"></i> Convert to PPTX & Download
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}