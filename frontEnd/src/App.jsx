import React, { Suspense, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ResumeBuilder from './pages/ResumeBuilder';
import TemplateSlider from './components/Resume/TemplateSlider';
import PremiumToastProvider from './components/PremiumToast';
import PrivacyPolicy from './pages/Privacy';
import Contact from './pages/Contact';
import AboutUs from './pages/AboutUs';
import Terms from './pages/TermsOfUse';
import PremiumFooter from './components/PremiumFooter';
import ResumeHeader from './components/ResumeWelcomeHeader'
import WhyChooseUs from './components/WhyChooseUs'

// High-Performance Lazy Loading for Viewports
const Home = React.lazy(() => import('./pages/Home'));
const Editor = React.lazy(() => import('./pages/Editor'));

/* ==========================================================================
   PREMIUM SKELETON LOADER (Prevents flashing or blank screens during loads)
   ========================================================================== */
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50/50 font-sans animate-in fade-in duration-700 ease-out p-4">
    
    {/* Premium Spinner Assembly */}
    <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
      {/* Ambient Pulsing Glow */}
      <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl animate-pulse"></div>
      
      {/* Static Background Track */}
      <div className="absolute inset-0 rounded-full border-[3px] border-slate-200/50 shadow-inner"></div>
      
      {/* Outer Fast Spin Ring (Amber/Orange) */}
      <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-amber-500 border-l-orange-500 animate-[spin_1.2s_linear_infinite]"></div>
      
      {/* Inner Slow Reverse Spin Ring (Lighter Gold) */}
      <div className="absolute inset-3 rounded-full border-[3px] border-transparent border-b-amber-300 border-r-orange-400 animate-[spin_2s_linear_infinite_reverse] opacity-80"></div>
      
      {/* Center Floating Icon Container */}
      <div className="relative z-10 w-11 h-11 bg-white rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.15)] border border-amber-100 flex items-center justify-center">
        <i className="fa-solid fa-file-pdf text-xl text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-500 drop-shadow-sm animate-pulse"></i>
      </div>
    </div>

    {/* User-Friendly Typography */}
    <div className="text-center space-y-2">
      <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
        Preparing your workspace
      </h3>
      <p className="text-sm font-medium text-slate-500 max-w-xs leading-relaxed mx-auto">
        Gathering your tools and setting things up. This will only take a moment...
      </p>
    </div>
    
  </div>
);




class GlobalErrorBoundary extends Component {
  state = { 
    hasError: false,
    isReloading: false 
  };

  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }

  componentDidCatch(error, errorInfo) { 
    // Keep this for your dev team, users won't see it
    console.error("RemoPDF Core Error:", error, errorInfo); 
  }

  handleReload = () => {
    // Trigger the premium loading animation
    this.setState({ isReloading: true });
    
    // Add a slight delay before reloading so it feels smooth and intentional
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-rose-100 selection:text-rose-900">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(225,29,72,0.08)] border border-slate-100 text-center relative overflow-hidden animate-in fade-in zoom-in-[0.98] duration-700 ease-out">
            
            {/* Ambient Red/Rose Glow */}
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-10"></div>
            
            {/* Premium Icon Container with Pulse Effect */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-40 duration-1000"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-white to-rose-50 border border-rose-100 rounded-full flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-500 drop-shadow-sm"></i>
              </div>
            </div>

            {/* User-Friendly Copy */}
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
              We hit a tiny snag.
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium px-2">
              We're sorry for the interruption. Something unexpected happened, but don't worry—<strong className="text-slate-700 font-bold">your files are perfectly safe</strong>. Let's get you back on track.
            </p>

            {/* Interactive Action Button */}
            <button 
              onClick={this.handleReload}
              disabled={this.state.isReloading}
              className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group disabled:opacity-90 disabled:cursor-wait disabled:hover:translate-y-0 flex items-center justify-center gap-2.5"
            >
              {this.state.isReloading ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin text-lg text-rose-400"></i>
                  <span>Refreshing workspace...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-rotate-right text-rose-400 group-hover:rotate-180 transition-transform duration-500 ease-in-out"></i>
                  <span>Refresh Page</span>
                </>
              )}
            </button>
            
            {/* Micro-copy Bottom */}
            <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              RemoPDF System Recovery
            </p>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}


/* ==========================================================================
   MAIN LAYOUT WRAPPER (Handles conditional UI based on routes)
   ========================================================================== */
const MainLayout = () => {
  const location = useLocation();
  
  // Routes where the footer should NOT be displayed
  const hideFooterRoutes = ['/ResumeBuilder'];
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  return (
    <div className="remopdf-app-scope" style={{ 
      minHeight: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg, #f6f7fb)', 
      color: 'var(--text, #121525)',
      fontFamily: '"Outfit", sans-serif'
    }}>
      <Suspense fallback={<PageLoader />}>
        {/* Main Content Wrapper: Expands to fill viewport forcing footer down */}
        <div style={{ flex: '1 0 auto' }}>
          <Routes>
            {/* Main Dashboard Utilities Route */}
            <Route 
              path="/" 
              element={
                <>
                  <Navbar />
                  <Home />
                  <PremiumToastProvider />
                  <ResumeHeader />
                  {/* Template Slider moved to the bottom */}
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 pt-8">
                    <TemplateSlider />
                  </div>
                  <WhyChooseUs/>
                </>
              } 
            />

            {/* Advanced Workspace Editor Route */}
            <Route path="/editor" element={<Editor />} />
            <Route path="/ResumeBuilder" element={<ResumeBuilder />} />
            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
            <Route path="/Contact" element={<Contact />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms-of-use" element={<Terms />} />
            
            {/* Dynamic Fallback Redirection */}
            {/* Dynamic Fallback Redirection (404 Page) */}
<Route 
  path="*" 
  element={
    <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-amber-100 selection:text-amber-900 animate-in fade-in duration-700">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.08)] border border-slate-100 text-center relative overflow-hidden">
        
        {/* Ambient Background Glow */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-10 pointer-events-none"></div>

        {/* Massive 404 Watermark Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[140px] font-black text-slate-50 opacity-60 select-none z-0 pointer-events-none tracking-tighter leading-none">
          404
        </div>

        {/* Premium Icon Container */}
        <div className="relative z-10 mx-auto w-20 h-20 mb-6 group">
          <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse opacity-40 duration-1000"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-white to-amber-50 border border-amber-100 rounded-full flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-110">
            {/* Using a compass to playfully indicate they are lost */}
            <i className="fa-solid fa-compass text-3xl text-amber-500 drop-shadow-sm"></i>
          </div>
        </div>

        {/* User-Friendly Copy */}
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            Looks like you're lost.
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium px-2">
            The page you're looking for has been moved, renamed, or simply doesn't exist. Let's get you back to your tools.
          </p>

          {/* Action Button */}
          <Link 
            to="/" 
            className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group flex items-center justify-center gap-2.5"
          >
            <i className="fa-solid fa-arrow-left text-amber-400 group-hover:-translate-x-1 transition-transform duration-300"></i>
            <span>Back to Homepage</span>
          </Link>
        </div>
        
      </div>
    </div>
  } 
/>
          </Routes>
        </div>

        {/* Conditionally Render Global Premium Footer */}
        {!shouldHideFooter && <PremiumFooter />}
      </Suspense>
    </div>
  );
};

/* ==========================================================================
   MAIN APPLICATION COMPONENT
   ========================================================================== */
export default function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
        <MainLayout />
      </Router>
    </GlobalErrorBoundary>
  );
}