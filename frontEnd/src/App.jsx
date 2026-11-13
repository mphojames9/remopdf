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
import logo1 from './assets/logo1.webp';
const InvoiceBuilder = React.lazy(() => import('./pages/InvoiceBuilder'));

// High-Performance Lazy Loading for Viewports
const Home = React.lazy(() => import('./pages/Home'));
const Editor = React.lazy(() => import('./pages/Workspace'));
const ZipTool = React.lazy(() => import('./pages/ZipTool'));

/* ==========================================================================
   PREMIUM PAGE LOADER
   Shown while a page's code loads. It also wakes the backend and tells the
   truth about it: the status line says "waking up" only while the server has
   not answered yet, and switches to "ready" the moment it has.
   ========================================================================== */
const LOADER_STAGES = [
  { at: 0, text: 'Loading your tools' },
  { at: 3, text: 'Waking up the server' },
  { at: 9, text: 'Still warming up, almost there' },
  { at: 22, text: 'Thanks for waiting, nearly ready' },
];

const SERVER_URL = 'https://remopdf-backend.onrender.com/';
const WAKE_RETRY_MS = 4000;
const WAKE_MAX_TRIES = 12;

const LOADER_CSS = `
  @keyframes pl-appear { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pl-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes pl-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
  @keyframes pl-reveal {
    0% { clip-path: inset(0 100% 0 0); opacity: 1; }
    50% { clip-path: inset(0 0 0 0); opacity: 1; }
    88% { clip-path: inset(0 0 0 0); opacity: 1; }
    100% { clip-path: inset(0 0 0 0); opacity: 0; }
  }
  @keyframes pl-beam {
    0% { transform: translateX(0); opacity: 0; }
    4% { opacity: 1; }
    50% { transform: translateX(var(--pl-w)); opacity: 1; }
    55%, 100% { transform: translateX(var(--pl-w)); opacity: 0; }
  }
  @keyframes pl-shine { 0%, 50% { background-position: 120% 0; } 82%, 100% { background-position: -20% 0; } }
  @keyframes pl-slide { from { transform: translateX(-100%); } to { transform: translateX(270%); } }
  @keyframes pl-shimmer { from { background-position: 100% 0; } to { background-position: 0% 0; } }
  @keyframes pl-ping { 0% { box-shadow: 0 0 0 0 rgba(224, 20, 20, .5); } 80%, 100% { box-shadow: 0 0 0 8px rgba(224, 20, 20, 0); } }
  @keyframes pl-ok { 0% { transform: scale(.4); } 60% { transform: scale(1.5); } 100% { transform: scale(1); } }
  @keyframes pl-drift-a { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(70px, 40px) scale(1.18); } }
  @keyframes pl-drift-b { 0%, 100% { transform: translate(0, 0) scale(1.1); } 50% { transform: translate(-80px, -30px) scale(.92); } }

  .pl-root {
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; min-height: 100dvh; padding: 24px 16px; overflow: hidden; text-align: center; background: #f8fafc;
    --pl-w: min(220px, 62vw);
    animation: pl-appear .5s ease-out .15s backwards; /* a quick page load never flashes the loader */
  }
  .pl-sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

  .pl-blob { position: absolute; left: 50%; top: 50%; width: 340px; height: 340px; border-radius: 9999px; filter: blur(64px); pointer-events: none; }
  .pl-blob-a { margin: -250px 0 0 -330px; background: #e01414; opacity: .14; animation: pl-drift-a 9s ease-in-out infinite; }
  .pl-blob-b { margin: -90px 0 0 -10px; background: #1d3f8f; opacity: .15; animation: pl-drift-b 11s ease-in-out infinite; }

  .pl-topbar { position: fixed; inset: 0 0 auto 0; z-index: 5; height: 3px; overflow: hidden; background: rgba(224, 20, 20, .12); }
  .pl-topbar::before {
    content: ''; position: absolute; inset: 0 auto 0 0; width: 40%;
    background: linear-gradient(90deg, transparent, #e01414 40%, #0a1630 70%, transparent);
    animation: pl-slide 1.5s cubic-bezier(.4, 0, .2, 1) infinite;
  }

  /* The wordmark is scanned in: a faint ghost of it, a red beam that sweeps across and fills it with colour, a glint over the letters. */
  .pl-logo {
    position: relative; z-index: 1; width: var(--pl-w); aspect-ratio: 3 / 1; opacity: 0; transition: opacity .35s ease;
    animation: pl-float 5s ease-in-out infinite;
  }
  .pl-logo.is-ready { opacity: 1; }
  .pl-logo img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; user-select: none; pointer-events: none; }
  .pl-logo-ghost { filter: grayscale(1); opacity: .16; }
  .pl-logo-live { animation: pl-reveal 3.4s cubic-bezier(.65, 0, .35, 1) infinite; }
  .pl-shine {
    position: absolute; inset: 0;
    -webkit-mask: var(--pl-logo) center / 100% 100% no-repeat; mask: var(--pl-logo) center / 100% 100% no-repeat;
    background: linear-gradient(105deg, transparent 38%, rgba(255, 255, 255, .95) 50%, transparent 62%) 120% 0 / 260% 100% no-repeat;
    animation: pl-shine 3.4s ease-in-out infinite;
  }
  .pl-beam {
    position: absolute; top: -6%; bottom: -6%; left: 0; width: 2px; border-radius: 2px; opacity: 0;
    background: linear-gradient(to bottom, transparent, #e01414 22%, #e01414 78%, transparent);
    box-shadow: 0 0 12px 2px rgba(224, 20, 20, .5);
    animation: pl-beam 3.4s cubic-bezier(.65, 0, .35, 1) infinite;
  }

  .pl-track { position: relative; z-index: 1; width: var(--pl-w); height: 3px; margin-top: 16px; overflow: hidden; border-radius: 9999px; background: rgba(10, 22, 48, .08); }
  .pl-track::before {
    content: ''; position: absolute; inset: 0 auto 0 0; width: 38%; border-radius: inherit;
    background: linear-gradient(90deg, #0a1630, #e01414);
    animation: pl-slide 1.4s cubic-bezier(.4, 0, .2, 1) infinite;
  }

  .pl-statusline { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 9px; height: 22px; margin-top: 14px; font-size: 13.5px; font-weight: 500; animation: pl-in .6s cubic-bezier(.22, 1, .36, 1) .35s backwards; }
  .pl-dot { flex: none; width: 7px; height: 7px; border-radius: 9999px; background: #e01414; animation: pl-ping 1.6s ease-out infinite; }
  .pl-dot-ok { background: #10b981; animation: pl-ok .5s cubic-bezier(.22, 1, .36, 1); }
  .pl-status {
    display: inline-block; color: #64748b;
    background: linear-gradient(100deg, #64748b 35%, #e01414 50%, #64748b 65%) 100% 0 / 250% 100% no-repeat;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    animation: pl-in .45s ease-out, pl-shimmer 2.6s linear infinite;
  }
  .pl-status-ok { background: none; color: #047857; -webkit-text-fill-color: #047857; animation: pl-in .45s ease-out; }

  .pl-notewrap { position: relative; z-index: 1; display: flex; justify-content: center; width: 100%; max-width: 20rem; min-height: 72px; margin-top: 16px; }
  .pl-note {
    display: flex; align-items: flex-start; gap: 10px; padding: 11px 13px; border-radius: 14px; background: #fff; text-align: left;
    font-size: 12.5px; line-height: 1.45; color: #475569;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, .05), 0 12px 26px -16px rgba(15, 23, 42, .22);
    animation: pl-in .5s ease-out;
  }
  .pl-note-icon { display: grid; flex: none; place-items: center; width: 28px; height: 28px; border-radius: 9px; background: #fef2f2; color: #dc2626; font-size: 12px; }

  @media (prefers-reduced-motion: reduce) {
    .pl-root, .pl-blob, .pl-logo, .pl-logo-live, .pl-shine, .pl-topbar::before, .pl-track::before,
    .pl-statusline, .pl-dot, .pl-dot-ok, .pl-status, .pl-note { animation: none; }
    .pl-logo-ghost, .pl-beam { display: none; }
    .pl-topbar::before, .pl-track::before { width: 100%; transform: none; opacity: .5; }
    .pl-status { background: none; -webkit-text-fill-color: currentColor; }
  }
`;

const PageLoader = () => {
  const [stage, setStage] = useState(0);
  const [serverReady, setServerReady] = useState(false);
  // The logo fades in once its file is here, so it never pops in half way through the scan.
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let retry;

    // Wake the Render backend as early as possible (GET works where HEAD does not). If it does not answer, ask again a few times.
    const wake = (attempt) => {
      axios.get(SERVER_URL)
        .then(() => {
          if (alive) setServerReady(true);
        })
        .catch((err) => {
          // Any real answer from the app (even a 404) means it is awake; a gateway error while it starts up is not.
          if (err?.response && err.response.status < 500) {
            if (alive) setServerReady(true);
            return;
          }
          console.log('Ping failed:', err);
          if (alive && attempt < WAKE_MAX_TRIES) retry = setTimeout(() => wake(attempt + 1), WAKE_RETRY_MS);
        });
    };
    wake(1);

    // Move the status line forward the longer the wait lasts.
    const timers = LOADER_STAGES.slice(1).map((s, i) => setTimeout(() => setStage(i + 1), s.at * 1000));

    return () => {
      alive = false;
      clearTimeout(retry);
      timers.forEach(clearTimeout);
    };
  }, []);

  const statusText = serverReady ? 'Server is ready, opening your tools' : LOADER_STAGES[stage].text;

  return (
    <div className="pl-root" aria-busy="true">
      <style>{LOADER_CSS}</style>
      <div className="pl-topbar" aria-hidden="true" />
      <span className="pl-blob pl-blob-a" aria-hidden="true" />
      <span className="pl-blob pl-blob-b" aria-hidden="true" />
      <h1 className="pl-sr">Getting RemoPDF ready</h1>

      {/* The RemoPDF wordmark, scanned in over and over while the page loads. */}
      <div className={`pl-logo ${logoReady ? 'is-ready' : ''}`} style={{ '--pl-logo': `url("${logo1}")` }} aria-hidden="true">
        <img className="pl-logo-ghost" src={logo1} alt="" decoding="async" />
        <img className="pl-logo-live" src={logo1} alt="" decoding="async" onLoad={() => setLogoReady(true)} onError={() => setLogoReady(true)} />
        <span className="pl-shine" />
        <span className="pl-beam" />
      </div>
      <div className="pl-track" aria-hidden="true" />

      <p role="status" aria-live="polite" className="pl-statusline">
        <span className={`pl-dot ${serverReady ? 'pl-dot-ok' : ''}`} aria-hidden="true" />
        <span key={statusText} className={`pl-status ${serverReady ? 'pl-status-ok' : ''}`}>{statusText}</span>
      </p>

      {/* Appears after ~9s, and only while the server is still asleep, so a slow first visit is explained instead of looking broken. */}
      <div className="pl-notewrap">
        {!serverReady && stage >= 2 && (
          <p className="pl-note">
            <span className="pl-note-icon" aria-hidden="true">
              <i className="fa-solid fa-hourglass-half"></i>
            </span>
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