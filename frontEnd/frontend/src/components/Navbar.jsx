import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide if scrolling down and past 50px, show if scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return (
    <nav 
      className={`fixed top-0 w-full flex justify-between items-center py-3 lg:py-4 px-4 lg:px-12 bg-white/70 backdrop-blur-2xl border-b border-slate-200/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] z-[70] transition-all duration-500 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{ fontFamily: "'Outfit', 'Metropolis', sans-serif" }}
    >
      
      {/* Left side: Brand/Logo */}
      <div className="nav-logo shrink-0 relative z-[70]">
        <Link to="/" className="flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-lg">
          <img 
            src="/images/tittleIcon.png" 
            alt="RemoPDF" 
            className="w-7 h-7 lg:w-9 lg:h-9 object-contain" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <span className="font-medium text-[1.1rem] lg:text-xl text-slate-900 tracking-tight">
            Remo<span className="text-[#ff2d2d] font-normal">PDF</span>
          </span>
        </Link>
      </div>

      {/* Center: Navigation Links */}
      <div className="hidden lg:flex items-center gap-10">
        <Link 
          to="/about" 
          className="text-[0.95rem] font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900"
        >
          About Us
        </Link>
        <Link 
          to="/PrivacyPolicy" 
          className="text-[0.95rem] font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900"
        >
          Privacy
        </Link>
        <Link 
          to="/terms-of-use" 
          className="text-[0.95rem] font-medium tracking-wide transition-colors duration-200 text-slate-500 hover:text-slate-900"
        >
          T&C
        </Link>
      </div>

      {/* Right side: Upgraded Premium Contact Button */}
      <div className="flex items-center gap-3 shrink-0 relative z-[70]">
        <Link 
          to="/contact" 
          className="group relative flex items-center gap-2 px-5 lg:px-6 py-2 lg:py-2.5 rounded-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 text-white text-[12px] lg:text-sm font-medium tracking-wide shadow-[0_4px_15px_rgba(0,0,0,0.1)] border border-slate-700/80 hover:shadow-[0_6px_20px_rgba(249,115,22,0.15)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
        >
          {/* Sweeping Shine Hover Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out" />
          
          {/* Button Text */}
          <span className="relative z-10">Contact Us</span>
          
          {/* Upgraded Minimalist Arrow Icon */}
          <svg 
            className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:translate-x-1" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

    </nav>
  );
}