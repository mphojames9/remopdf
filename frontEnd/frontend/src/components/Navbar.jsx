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
      className={`w-full flex justify-between items-center py-4 px-6 md:px-12 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_20px_rgba(0,0,0,0.02)] z-50 font-sans transition-all duration-500 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      
      {/* Left side: Brand/Logo */}
      <div className="text-lg font-bold tracking-tight text-slate-950">
        
      </div>

      {/* Center: Navigation Links */}
      <div className="hidden md:flex items-center gap-8">
        <Link 
          to="/about" 
          className="text-[0.9rem] text-slate-500 hover:text-slate-950 font-medium tracking-wide transition-colors duration-200"
        >
          About Us
        </Link>
        <Link 
          to="/privacy" 
          className="text-[0.9rem] text-slate-500 hover:text-slate-950 font-medium tracking-wide transition-colors duration-200"
        >
          Privacy
        </Link>
        <Link 
          to="/terms" 
          className="text-[0.9rem] text-slate-500 hover:text-slate-950 font-medium tracking-wide transition-colors duration-200"
        >
          T&C
        </Link>
      </div>

      {/* Right side: Upgraded Premium Contact Button */}
      <div className="flex items-center">
        <Link 
          to="/contact" 
          className="group relative flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 text-white text-xs md:text-sm font-semibold tracking-wide shadow-[0_2px_15px_rgba(0,0,0,0.1)] border border-slate-700/80 hover:shadow-[0_4px_25px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
        >
          {/* Sweeping Shine Hover Effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out" />
          
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