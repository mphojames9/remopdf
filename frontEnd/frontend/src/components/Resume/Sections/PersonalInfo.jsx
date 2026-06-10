import React, { useState, useRef } from 'react';

// ============================================================================
// REUSABLE INPUT FIELD
// ============================================================================
const InputField = ({ label, name, type = "text", placeholder, icon, value, onChange }) => (
  <div className="flex flex-col group">
    <label className="text-[10px] font-bold text-slate-400 group-focus-within:text-orange-500 uppercase tracking-wider mb-1 ml-1 transition-colors">
      {label}
    </label>
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors">
          {icon}
        </div>
      )}
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs ${icon ? 'pl-9' : ''} focus:bg-white focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all duration-200 outline-none shadow-sm placeholder:text-slate-400`}
      />
    </div>
  </div>
);

export default function PersonalInfo({ data, setData, onNext, nextLabel }) {
  const [showDemographics, setShowDemographics] = useState(false);
  
  // Photo Uploader State
  const fileInputRef = useRef(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const maxSummaryChars = 600;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [name]: value }
    }));
  };

  // --- Photo Upload & Crop Logic ---
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawImage(event.target.result);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
        setShowPhotoModal(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleSavePhoto = () => {
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.src = rawImage;
    img.onload = () => {
      const ratio = Math.max(size / img.width, size / img.height);
      const width = img.width * ratio * zoom;
      const height = img.height * ratio * zoom;
      const cx = (size - width) / 2 + offset.x;
      const cy = (size - height) / 2 + offset.y;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, cx, cy, width, height);
      
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      
      setData(prev => ({
        ...prev,
        personalInfo: { ...prev.personalInfo, photo: croppedBase64 }
      }));
      
      setShowPhotoModal(false);
    };
  };

  const handleRemovePhoto = () => {
    setData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, photo: null }
    }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-sans animate-fade-in flex flex-col h-[540px] max-h-[560px] sm:h-auto sm:max-h-none overflow-hidden bg-white rounded-2xl">
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Main Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto scrollbar-none p-3 xs:p-4 sm:p-8 space-y-5">
        {/* Section Header */}
        <div className="border-b border-slate-100 pb-3">
          <span className="text-orange-500 text-[9px] xs:text-[10px] font-bold uppercase tracking-widest bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">Step 1 of 9</span>
          <h2 className="text-xl xs:text-2xl font-extrabold text-slate-900 tracking-tight mt-2">Header Profile</h2>
          <p className="text-slate-500 mt-0.5 text-[11px] leading-tight">Fill out your primary details to establish your premium brand identity.</p>
        </div>
        
        {/* Card 1: Identity & Avatar */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 xs:p-4 sm:p-6">
          <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 mb-4">1. Identity</h3>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
            {/* Premium Photo Avatar */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div 
                onClick={() => !data.personalInfo.photo && fileInputRef.current.click()}
                className="relative w-20 h-20 xs:w-24 xs:h-24 rounded-full border-4 border-slate-50 shadow-md bg-slate-100 flex items-center justify-center group overflow-hidden cursor-pointer transition-all hover:border-orange-100"
              >
                {data.personalInfo.photo ? (
                  <>
                    <img src={data.personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-slate-900/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => fileInputRef.current.click()} className="text-white text-[9px] font-bold uppercase tracking-wider mb-1 hover:text-orange-400">Change</button>
                      <button onClick={(e) => { e.stopPropagation(); handleRemovePhoto(); }} className="text-white text-[9px] font-bold uppercase tracking-wider hover:text-red-400">Remove</button>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 group-hover:text-orange-500 transition-colors flex flex-col items-center">
                    <svg className="w-6 h-6 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-[9px] font-bold uppercase tracking-widest">Upload</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>

            {/* Form Fields */}
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField label="Full Name" name="fullName" placeholder="e.g. Alexander Wright" value={data.personalInfo.fullName || ''} onChange={handleChange} />
              <InputField label="Professional Title" name="jobTitle" placeholder="e.g. Product Designer" value={data.personalInfo.jobTitle || ''} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Card 2: Contact & Social Links */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 xs:p-4 sm:p-6 space-y-3">
          <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">2. Communication & Socials</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputField label="Email Address" name="email" type="email" placeholder="alexander@domain.com" value={data.personalInfo.email || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
            <InputField label="Phone Number" name="phone" type="tel" placeholder="+1 (555) 019-2834" value={data.personalInfo.phone || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>} />
            <InputField label="Location / City" name="location" placeholder="e.g. San Francisco, CA" value={data.personalInfo.location || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
            <InputField label="Personal Website" name="website" placeholder="e.g. wrightdesign.co" value={data.personalInfo.website || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>} />
            <InputField label="LinkedIn URL" name="linkedin" placeholder="linkedin.com/in/username" value={data.personalInfo.linkedin || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.68a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>} />
            <InputField label="GitHub / Dribbble" name="secondarySocial" placeholder="github.com/username" value={data.personalInfo.secondarySocial || ''} onChange={handleChange} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
          </div>
        </div>

        {/* Card 3: Professional Summary */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 xs:p-4 sm:p-6 space-y-3">
          <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">3. Professional Summary</h3>
          <div className="relative">
            <textarea
              name="summary"
              rows="4"
              maxLength={maxSummaryChars}
              placeholder="Design лидер with 8+ years driving cross-platform projects..."
              value={data.personalInfo.summary || ''}
              onChange={handleChange}
              className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl p-3 focus:bg-white focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 transition-all outline-none resize-none shadow-sm leading-relaxed text-xs placeholder:text-slate-400"
            />
            <div className="absolute bottom-2 right-3 text-[9px] font-semibold text-slate-400">
              {(data.personalInfo.summary || '').length} / {maxSummaryChars}
            </div>
          </div>
        </div>

        {/* Accordion Block: Legal & Demographics */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <button type="button" onClick={() => setShowDemographics(!showDemographics)} className="w-full p-3 xs:p-4 sm:p-6 py-3 flex justify-between items-center hover:bg-slate-50/50 transition-colors text-left">
            <div>
              <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">4. Verifications & Demographics</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">Optional compliance, local standards, or driver licenses.</p>
            </div>
            <div className={`text-slate-400 transform transition-transform duration-200 ${showDemographics ? 'rotate-180' : ''}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          </button>
          {showDemographics && (
            <div className="p-3 xs:p-4 sm:p-6 pt-1 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/20">
              <InputField label="Date of Birth" name="dob" type="date" value={data.personalInfo.dob || ''} onChange={handleChange} />
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Gender Identity</label>
                <div className="relative">
                  <select name="gender" value={data.personalInfo.gender || ''} onChange={handleChange} className="w-full bg-slate-50/50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-xs focus:bg-white focus:ring-4 focus:ring-orange-500/5 focus:border-orange-500 outline-none appearance-none cursor-pointer shadow-sm">
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
                </div>
              </div>
              <InputField label="Driver's License Class" name="drivingLicense" placeholder="e.g. Code B" value={data.personalInfo.drivingLicense || ''} onChange={handleChange} />
              <InputField label="Nationality / Citizenship" name="nationality" placeholder="e.g. South African" value={data.personalInfo.nationality || ''} onChange={handleChange} />
            </div>
          )}
        </div>
      </div>

      {/* Pinned Premium Navigation Footer */}
      <div className="border-t border-slate-100 p-3 xs:p-4 bg-white flex justify-end items-center shrink-0 mt-auto shadow-inner">
        <button 
          onClick={onNext} 
          className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-extrabold shadow-md shadow-orange-500/25 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center gap-2 text-xs tracking-wider uppercase"
        >
          {nextLabel || "Next: Experience"}
          {nextLabel?.includes('Finish') ? (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          )}
        </button>
      </div>

      {/* PHOTO EDITOR MODAL */}
      {showPhotoModal && rawImage && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs overflow-hidden border border-slate-200/50 max-h-[95vh] flex flex-col">
            <div className="p-4 text-center border-b border-slate-100 shrink-0">
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">Perfect Your Photo</h3>
            </div>
            
            <div className="p-4 flex flex-col items-center bg-slate-50/50 relative overflow-hidden flex-1 justify-center min-h-[220px]">
              <div 
                className="relative w-44 h-44 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-200 cursor-move touch-none z-10"
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                <img 
                  src={rawImage} 
                  alt="Preview" 
                  draggable={false}
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center',
                    maxWidth: 'none'
                  }}
                  className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none" 
                />
              </div>

              <div className="w-full mt-4 flex items-center gap-3 px-2 z-10">
                <input 
                  type="range" 
                  min="1" 
                  max="3" 
                  step="0.05" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none accent-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="p-3 flex gap-2 bg-white border-t border-slate-100 shrink-0">
              <button onClick={() => setShowPhotoModal(false)} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs">Cancel</button>
              <button onClick={handleSavePhoto} className="flex-1 px-3 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}