import React, { Suspense, Component, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import ResumeBuilder from './pages/ResumeBuilder';
import PremiumToastProvider from './components/PremiumToast';
import PrivacyPolicy from './pages/Privacy';
import Contact from './pages/Contact';
import AboutUs from './pages/AboutUs';
import Terms from './pages/TermsOfUse';
import Workspace from './pages/Workspace';
import axios from 'axios'; // Add this line
import PremiumFooter from './components/PremiumFooter';
import WhyChooseUs from './components/WhyChooseUs';
const InvoiceBuilder = React.lazy(() => import('./pages/InvoiceBuilder'));

// High-Performance Lazy Loading for Viewports
const Home = React.lazy(() => import('./pages/Home'));
const Editor = React.lazy(() => import('./pages/Workspace'));
const ZipTool = React.lazy(() => import('./pages/ZipTool'));

/* ==========================================================================
   PREMIUM PAGE LOADER
   Shown while a page's code loads and while the backend wakes up.
   The status line moves on as the wait gets longer, so it never feels stuck.
   ========================================================================== */
const LOADER_STAGES = [
  { at: 0, text: 'Loading your tools' },
  { at: 3, text: 'Waking up the server' },
  { at: 9, text: 'Still warming up, almost there' },
  { at: 22, text: 'Thanks for waiting, nearly ready' },
];

const PageLoader = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Wake the Render backend as early as possible (GET works where HEAD does not).
    axios.get('https://remopdf-backend.onrender.com/')
      .catch((err) => console.log('Ping failed:', err));

    // Move the status line forward the longer the wait lasts.
    const timers = LOADER_STAGES.slice(1).map((s, i) => setTimeout(() => setStage(i + 1), s.at * 1000));
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-50/50 animate-in fade-in duration-700 ease-out p-4 text-center">
      <style>{`
        @keyframes pl-shuffle {
          0%, 24%  { transform: translateY(0) scale(1); opacity: 1; z-index: 3; }
          33%      { transform: translate(64px, -10px) rotate(9deg) scale(1); opacity: 0; z-index: 3; }
          33.1%    { transform: translateY(-34px) scale(.84); opacity: 0; z-index: 1; }
          38%, 58% { transform: translateY(-34px) scale(.84); opacity: 1; z-index: 1; }
          66%, 91% { transform: translateY(-18px) scale(.92); opacity: 1; z-index: 2; }
          100%     { transform: translateY(0) scale(1); opacity: 1; z-index: 3; }
        }
        @keyframes pl-wash {
          0%, 33% { opacity: 0; }
          33.1%, 58% { opacity: .62; }
          66%, 91% { opacity: .34; }
          100% { opacity: 0; }
        }
        @keyframes pl-breathe { 0%, 100% { opacity: .55; transform: scale(.92); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes pl-shimmer { from { background-position: 100% 0; } to { background-position: 0% 0; } }
        @keyframes pl-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

        .pl-deck { position: relative; width: 120px; height: 150px; }
        .pl-glow {
          position: absolute; left: 50%; top: 50%; width: 160px; height: 160px; margin: -80px 0 0 -80px; border-radius: 9999px;
          background: radial-gradient(circle, rgba(251,191,36,.45) 0%, rgba(251,191,36,0) 66%); filter: blur(14px);
          animation: pl-breathe 3s ease-in-out infinite;
        }
        .pl-card {
          position: absolute; left: 50%; bottom: 0; width: 88px; height: 112px; margin-left: -44px; display: block; overflow: hidden;
          border-radius: 14px; background: #fff; transform-origin: 50% 100%; will-change: transform, opacity;
          box-shadow: 0 0 0 1px rgba(15,23,42,.06), 0 16px 30px -12px rgba(15,23,42,.32);
          animation: pl-shuffle 3s cubic-bezier(.65, 0, .35, 1) infinite;
        }
        .pl-card::after {
          content: ''; position: absolute; inset: 0; background: #fff; pointer-events: none; opacity: 0;
          animation: pl-wash 3s cubic-bezier(.65, 0, .35, 1) infinite; animation-delay: inherit;
        }
        .pl-card:nth-child(2) { animation-delay: 0s; }
        .pl-card:nth-child(3) { animation-delay: -2s; }
        .pl-card:nth-child(4) { animation-delay: -1s; }
        .pl-card-top { display: flex; align-items: center; height: 30px; padding: 0 10px; background: #0f172a; }
        .pl-badge { display: inline-block; padding: 2px 6px; border-radius: 6px; background: #fbbf24; color: #0f172a; font-size: 9px; font-weight: 800; letter-spacing: .04em; line-height: 1.2; }
        .pl-card-body { display: flex; flex-direction: column; gap: 7px; padding: 12px 10px; }
        .pl-ln { display: block; height: 4px; border-radius: 9999px; background: #e2e8f0; }
        .pl-ln-accent { background: #fbbf24; }

        .pl-status {
          display: inline-block; color: #64748b;
          background: linear-gradient(100deg, #64748b 35%, #d97706 50%, #64748b 65%) 100% 0 / 250% 100% no-repeat;
          -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
          animation: pl-in .45s ease-out, pl-shimmer 2.6s linear infinite;
        }
        .pl-note { animation: pl-in .5s ease-out; }

        @media (prefers-reduced-motion: reduce) {
          .pl-glow, .pl-card, .pl-note { animation: none; }
          .pl-card::after { animation: none; }
          .pl-card:nth-child(2) { transform: translateY(0) scale(1); z-index: 3; }
          .pl-card:nth-child(3) { transform: translateY(-18px) scale(.92); z-index: 2; }
          .pl-card:nth-child(3)::after { opacity: .34; }
          .pl-card:nth-child(4) { transform: translateY(-34px) scale(.84); z-index: 1; }
          .pl-card:nth-child(4)::after { opacity: .62; }
          .pl-status { animation: none; background: none; -webkit-text-fill-color: currentColor; }
        }
      `}</style>

      {/* Three PDF pages shuffle like a deck of cards: the front page flicks away and joins the back. */}
      <div className="pl-deck" aria-hidden="true">
        <span className="pl-glow" />
        {[0, 1, 2].map((n) => (
          <span key={n} className="pl-card">
            <span className="pl-card-top"><span className="pl-badge">PDF</span></span>
            <span className="pl-card-body">
              <span className="pl-ln" style={{ width: '78%' }} />
              <span className="pl-ln" style={{ width: '100%' }} />
              <span className="pl-ln" style={{ width: '62%' }} />
              <span className="pl-ln pl-ln-accent" style={{ width: '38%' }} />
              <span className="pl-ln" style={{ width: '88%' }} />
            </span>
          </span>
        ))}
      </div>

      <h3 className="mt-9 text-xl font-bold text-slate-800 tracking-tight">Getting RemoPDF ready</h3>
      <p role="status" aria-live="polite" className="mt-2 h-6 text-sm font-medium">
        <span key={stage} className="pl-status">{LOADER_STAGES[stage].text}</span>
      </p>

      {/* Appears after ~9s so a slow first visit is explained instead of looking broken. */}
      <div className="mt-5 flex min-h-[84px] w-full max-w-sm justify-center">
        {stage >= 2 && (
          <p className="pl-note flex items-start gap-2.5 rounded-2xl bg-white px-4 py-3 text-left text-[13px] leading-snug text-slate-500 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5">
            <i className="fa-solid fa-hourglass-half mt-0.5 text-amber-500" aria-hidden="true"></i>
            <span>Our server naps when it's quiet, so a first visit can take up to a minute. Once it's awake, everything is fast.</span>
          </p>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   NETWORK MONITOR OVERLAY
   ========================================================================== */
const NetworkMonitor = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    
    // 1. Check basic browser network status
    if (!navigator.onLine) {
      setIsOffline(true);
      setTimeout(() => setIsChecking(false), 600);
      return;
    }

    // 2. Verify actual server reachability (Pings your Render backend)
    try {
      await fetch('https://remopdf-backend.onrender.com/', { 
        method: 'HEAD', 
        mode: 'no-cors',
        cache: 'no-store' 
      });
      setIsOffline(false);
    } catch (error) {
      setIsOffline(true);
    } finally {
      setTimeout(() => setIsChecking(false), 600);
    }
  };

  useEffect(() => {
    // Event listeners for immediate network status changes
    window.addEventListener('online', checkConnection);
    window.addEventListener('offline', () => setIsOffline(true));

    // Check connection every minute (60000ms)
    const interval = setInterval(() => {
      checkConnection();
    }, 60000);

    return () => {
      window.removeEventListener('online', checkConnection);
      window.removeEventListener('offline', () => setIsOffline(true));
      clearInterval(interval);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 font-sans animate-in fade-in duration-500">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-100 text-center relative overflow-hidden animate-in zoom-in-[0.95] duration-500 ease-out">
        
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-15"></div>
        
        {/* Premium Icon Container */}
        <div className="relative mx-auto w-20 h-20 mb-6">
          <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-50 duration-1000"></div>
          <div className="relative w-full h-full bg-gradient-to-br from-white to-rose-50 border border-rose-100 rounded-full flex items-center justify-center shadow-inner">
            <i className="fa-solid fa-wifi text-3xl text-rose-500 drop-shadow-sm opacity-50 relative">
              {/* Slash through WiFi icon */}
              <div className="absolute inset-0 flex items-center justify-center transform -rotate-45">
                <div className="w-10 h-1 bg-rose-600 rounded-full shadow-sm"></div>
              </div>
            </i>
          </div>
        </div>

        {/* User-Friendly Copy */}
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
          Connection Lost
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium px-2">
          An active internet connection is required to connect to the server. Please check your network settings and try again.
        </p>

        {/* Interactive Retry Button */}
        <button 
          onClick={checkConnection}
          disabled={isChecking}
          className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group disabled:opacity-90 disabled:cursor-wait disabled:hover:translate-y-0 flex items-center justify-center gap-2.5"
        >
          {isChecking ? (
            <>
              <i className="fa-solid fa-circle-notch animate-spin text-lg text-rose-400"></i>
              <span>Reconnecting...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-rotate-right text-rose-400 group-hover:rotate-180 transition-transform duration-500 ease-in-out"></i>
              <span>Retry Connection</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

/* ==========================================================================
   GLOBAL ERROR BOUNDARY
   ========================================================================== */
class GlobalErrorBoundary extends Component {
  state = { 
    hasError: false,
    isReloading: false 
  };

  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }

  componentDidCatch(error, errorInfo) { 
    console.error("RemoPDF Core Error:", error, errorInfo); 
  }

  handleReload = () => {
    this.setState({ isReloading: true });
    setTimeout(() => {
      window.location.href = '/';
    }, 800);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-rose-100 selection:text-rose-900">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(225,29,72,0.08)] border border-slate-100 text-center relative overflow-hidden animate-in fade-in zoom-in-[0.98] duration-700 ease-out">
            <div className="absolute -top-20 -right-20 w-48 h-48 bg-rose-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-10"></div>
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-40 duration-1000"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-white to-rose-50 border border-rose-100 rounded-full flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-triangle-exclamation text-3xl text-rose-500 drop-shadow-sm"></i>
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
              We hit a tiny snag.
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium px-2">
              We're sorry for the interruption. Something unexpected happened, but don't worry, <strong className="text-slate-700 font-bold">your files are perfectly safe</strong>. Let's get you back on track.
            </p>
            <button 
              onClick={this.handleReload}
              disabled={this.state.isReloading}
              className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group disabled:opacity-90 disabled:cursor-wait disabled:hover:translate-y-0 flex items-center justify-center gap-2.5"
            >
              {this.state.isReloading ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin text-lg text-rose-400"></i>
                  <span>Refreshing Workspace...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-rotate-right text-rose-400 group-hover:rotate-180 transition-transform duration-500 ease-in-out"></i>
                  <span>Refresh Page</span>
                </>
              )}
            </button>
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
   MAIN LAYOUT WRAPPER 
   ========================================================================== */
const MainLayout = () => {
  const location = useLocation();
  const hideFooterRoutes = ['/ResumeBuilder', '/Workspace'];
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
        <div style={{ flex: '1 0 auto' }}>
          <Routes>
            <Route path="/" element={<><Home /><PremiumToastProvider /></>} />
            <Route path="/Workspace" element={<Workspace />} />
            <Route path="/ResumeBuilder" element={<ResumeBuilder />} />
            <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
            <Route path="/Contact" element={<Contact />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/terms-of-use" element={<Terms />} />
            <Route path="/ZipTool" element={<ZipTool />} />
            <Route path="/InvoiceBuilder" element={<InvoiceBuilder />} />

            {/* Dynamic Fallback Redirection (404 Page) */}
            <Route path="*" element={
              <div className="min-h-[80vh] flex items-center justify-center bg-slate-50 p-4 font-sans selection:bg-amber-100 selection:text-amber-900 animate-in fade-in duration-700">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(245,158,11,0.08)] border border-slate-100 text-center relative overflow-hidden">
                  <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400 rounded-full mix-blend-multiply filter blur-[70px] opacity-10 pointer-events-none"></div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[140px] font-black text-slate-50 opacity-60 select-none z-0 pointer-events-none tracking-tighter leading-none">404</div>
                  <div className="relative z-10 mx-auto w-20 h-20 mb-6 group">
                    <div className="absolute inset-0 bg-amber-100 rounded-full animate-pulse opacity-40 duration-1000"></div>
                    <div className="relative w-full h-full bg-gradient-to-br from-white to-amber-50 border border-amber-100 rounded-full flex items-center justify-center shadow-inner transition-transform duration-500 group-hover:scale-110">
                      <i className="fa-solid fa-compass text-3xl text-amber-500 drop-shadow-sm"></i>
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">Looks like you're lost.</h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium px-2">The page you're looking for has been moved, renamed, or simply doesn't exist. Let's get you back to your tools.</p>
                    <Link to="/" className="relative w-full h-14 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(15,23,42,0.5)] hover:shadow-[0_10px_30px_-5px_rgba(15,23,42,0.7)] hover:-translate-y-0.5 transition-all duration-300 overflow-hidden group flex items-center justify-center gap-2.5">
                      <i className="fa-solid fa-arrow-left text-amber-400 group-hover:-translate-x-1 transition-transform duration-300"></i>
                      <span>Back to Homepage</span>
                    </Link>
                  </div>
                </div>
              </div>
            } />
          </Routes>
        </div>
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
      <NetworkMonitor />
      <Router>
        <MainLayout />
      </Router>
    </GlobalErrorBoundary>
  );
}