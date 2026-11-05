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

// The rows of text on the sheet that writes itself. `mark` is the line the highlighter sweeps over.
const SHEET_ROWS = [
  { w: '38%', accent: true },
  { w: '100%' },
  { w: '90%', mark: true },
  { w: '64%' },
  { w: '30%', accent: true },
  { w: '100%' },
  { w: '84%' },
  { w: '52%' },
];
const GHOST_ROWS = ['72%', '100%', '58%', '88%'];

const LOADER_CSS = `
  @keyframes pl-appear { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pl-stage-in { from { opacity: 0; transform: translateY(18px) scale(.94); } to { opacity: 1; transform: none; } }
  @keyframes pl-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes pl-breathe { 0%, 100% { opacity: .6; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.06); } }
  @keyframes pl-sway { 0%, 100% { transform: rotateY(-9deg) rotateX(3deg) translateY(0); } 50% { transform: rotateY(9deg) rotateX(-2deg) translateY(-8px); } }
  @keyframes pl-bob-l { 0%, 100% { transform: translate(-50px, 10px) rotate(-9deg); } 50% { transform: translate(-54px, 3px) rotate(-11deg); } }
  @keyframes pl-bob-r { 0%, 100% { transform: translate(50px, 12px) rotate(8deg); } 50% { transform: translate(54px, 4px) rotate(10deg); } }
  @keyframes pl-draw {
    0% { transform: scaleX(0); opacity: 1; }
    7% { transform: scaleX(1); opacity: 1; }
    88% { transform: scaleX(1); opacity: 1; }
    95%, 100% { transform: scaleX(1); opacity: 0; }
  }
  @keyframes pl-pop {
    0% { transform: scale(0); opacity: 1; }
    5% { transform: scale(1.15); opacity: 1; }
    8%, 88% { transform: scale(1); opacity: 1; }
    95%, 100% { transform: scale(1); opacity: 0; }
  }
  @keyframes pl-mark {
    0%, 38% { transform: scaleX(0); opacity: 1; }
    46%, 82% { transform: scaleX(1); opacity: 1; }
    88%, 100% { transform: scaleX(1); opacity: 0; }
  }
  @keyframes pl-scan {
    0% { transform: translateY(34px); opacity: 0; }
    3% { opacity: 1; }
    40% { transform: translateY(212px); opacity: 1; }
    44%, 100% { transform: translateY(218px); opacity: 0; }
  }
  @keyframes pl-slide { from { transform: translateX(-100%); } to { transform: translateX(250%); } }
  @keyframes pl-shimmer { from { background-position: 100% 0; } to { background-position: 0% 0; } }
  @keyframes pl-ping { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, .55); } 80%, 100% { box-shadow: 0 0 0 9px rgba(245, 158, 11, 0); } }
  @keyframes pl-ok { 0% { transform: scale(.4); } 60% { transform: scale(1.5); } 100% { transform: scale(1); } }

  .pl-root {
    position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 100vh; min-height: 100dvh; padding: 24px 16px; overflow: hidden; text-align: center; background: #f8fafc;
    animation: pl-appear .5s ease-out .15s backwards; /* a quick page load never flashes the loader */
  }
  .pl-grid {
    position: absolute; inset: 0; pointer-events: none;
    background-image: radial-gradient(rgba(15, 23, 42, .11) 1px, transparent 1.3px); background-size: 22px 22px;
    -webkit-mask-image: radial-gradient(ellipse 55% 50% at 50% 42%, #000 15%, transparent 72%);
    mask-image: radial-gradient(ellipse 55% 50% at 50% 42%, #000 15%, transparent 72%);
  }
  .pl-topbar { position: fixed; inset: 0 0 auto 0; z-index: 5; height: 3px; overflow: hidden; background: rgba(251, 191, 36, .16); }
  .pl-topbar::before {
    content: ''; position: absolute; inset: 0 auto 0 0; width: 40%;
    background: linear-gradient(90deg, transparent, #fbbf24 40%, #f59e0b 60%, transparent);
    animation: pl-slide 1.5s cubic-bezier(.4, 0, .2, 1) infinite;
  }

  .pl-stage { position: relative; width: 300px; height: 270px; perspective: 900px; animation: pl-stage-in .8s cubic-bezier(.22, 1, .36, 1) .2s backwards; }
  .pl-glow {
    position: absolute; left: 50%; top: 46%; width: 300px; height: 300px; margin: -150px 0 0 -150px; border-radius: 9999px;
    background: radial-gradient(circle, rgba(251, 191, 36, .4) 0%, rgba(251, 191, 36, 0) 64%); filter: blur(18px);
    animation: pl-breathe 4s ease-in-out infinite;
  }

  .pl-sheet {
    position: absolute; left: 50%; top: 50%; width: 152px; height: 212px; margin: -106px 0 0 -76px; overflow: hidden;
    border-radius: 16px; background: #fff;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, .06), 0 26px 44px -18px rgba(15, 23, 42, .4);
  }
  .pl-ghost { box-shadow: 0 0 0 1px rgba(15, 23, 42, .05), 0 16px 28px -16px rgba(15, 23, 42, .28); }
  .pl-ghost-l { transform: translate(-50px, 10px) rotate(-9deg); animation: pl-bob-l 6s ease-in-out infinite; }
  .pl-ghost-r { transform: translate(50px, 12px) rotate(8deg); animation: pl-bob-r 6.6s ease-in-out infinite; }
  .pl-ghost .pl-body { opacity: .55; }
  .pl-main { position: absolute; inset: 0; animation: pl-sway 7s ease-in-out infinite; }

  .pl-top { display: flex; align-items: center; height: 34px; padding: 0 12px; background: #0f172a; }
  .pl-badge { display: inline-block; padding: 2px 7px; border-radius: 6px; background: #fbbf24; color: #0f172a; font-size: 9px; font-weight: 800; letter-spacing: .04em; line-height: 1.25; }
  .pl-body { display: flex; flex-direction: column; gap: 8px; padding: 14px 12px; }
  .pl-head { display: flex; align-items: center; gap: 10px; height: 30px; }
  .pl-id { display: flex; flex: 1; flex-direction: column; gap: 6px; }
  .pl-rule { height: 1px; margin: 2px 0; background: #e2e8f0; }
  .pl-circ { flex: none; width: 30px; height: 30px; border-radius: 9999px; background: #cbd5e1; }
  .pl-ln { position: relative; height: 5px; border-radius: 9999px; background: #cbd5e1; transform-origin: left center; }
  .pl-ln-accent { background: #fbbf24; }
  .pl-ln-name { height: 6px; background: #94a3b8; }

  /* The sheet writes itself line by line, in step with the scan beam, then the lines fade out and it starts over. */
  .pl-main .pl-ln, .pl-main .pl-rule { animation: pl-draw 5.6s ease-out infinite backwards; animation-delay: calc(var(--i, 0) * .16s + .6s); }
  .pl-main .pl-circ { animation: pl-pop 5.6s ease-out infinite backwards; animation-delay: calc(var(--i, 0) * .16s + .6s); }
  .pl-mark {
    position: absolute; inset: -2px -3px; border-radius: 3px; background: rgba(251, 191, 36, .55); transform-origin: left center;
    animation: pl-mark 5.6s ease-in-out infinite backwards; animation-delay: calc(var(--i, 0) * .16s + .6s);
  }
  .pl-beam {
    position: absolute; left: 50%; top: 50%; width: 200px; height: 2px; margin: -106px 0 0 -100px; opacity: 0;
    background: linear-gradient(90deg, transparent, #fbbf24 12%, #f59e0b 50%, #fbbf24 88%, transparent);
    box-shadow: 0 0 14px 2px rgba(251, 191, 36, .6);
    animation: pl-scan 5.6s linear infinite .4s;
  }
  .pl-beam::before { content: ''; position: absolute; left: 14px; right: 14px; bottom: 2px; height: 46px; background: linear-gradient(to top, rgba(251, 191, 36, .32), rgba(251, 191, 36, 0)); }

  .pl-title { margin-top: 30px; font-size: clamp(1.45rem, 3.4vw, 1.85rem); line-height: 1.15; font-weight: 600; letter-spacing: -.025em; color: #0f172a; animation: pl-in .6s cubic-bezier(.22, 1, .36, 1) .45s backwards; }
  .pl-statusline { display: inline-flex; align-items: center; gap: 10px; height: 24px; margin-top: 12px; font-size: 14.5px; font-weight: 500; animation: pl-in .6s cubic-bezier(.22, 1, .36, 1) .55s backwards; }
  .pl-dot { flex: none; width: 8px; height: 8px; border-radius: 9999px; background: #f59e0b; animation: pl-ping 1.6s ease-out infinite; }
  .pl-dot-ok { background: #10b981; animation: pl-ok .5s cubic-bezier(.22, 1, .36, 1); }
  .pl-status {
    display: inline-block; color: #64748b;
    background: linear-gradient(100deg, #64748b 35%, #d97706 50%, #64748b 65%) 100% 0 / 250% 100% no-repeat;
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    animation: pl-in .45s ease-out, pl-shimmer 2.6s linear infinite;
  }
  .pl-status-ok { background: none; color: #047857; -webkit-text-fill-color: #047857; animation: pl-in .45s ease-out; }

  .pl-notewrap { display: flex; justify-content: center; width: 100%; max-width: 24rem; min-height: 92px; margin-top: 22px; }
  .pl-note {
    display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; border-radius: 18px; background: #fff; text-align: left;
    font-size: 13px; line-height: 1.45; color: #475569;
    box-shadow: 0 0 0 1px rgba(15, 23, 42, .05), 0 14px 30px -16px rgba(15, 23, 42, .22);
    animation: pl-in .5s ease-out;
  }
  .pl-note-icon { display: grid; flex: none; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #fffbeb; color: #d97706; font-size: 14px; }

  @media (max-width: 380px) { .pl-stage { transform: scale(.9); } }
  @media (prefers-reduced-motion: reduce) {
    .pl-root, .pl-stage, .pl-glow, .pl-main, .pl-ghost-l, .pl-ghost-r, .pl-topbar::before,
    .pl-main .pl-ln, .pl-main .pl-rule, .pl-main .pl-circ, .pl-mark, .pl-title, .pl-statusline, .pl-dot, .pl-dot-ok, .pl-status, .pl-note { animation: none; }
    .pl-beam { display: none; }
    .pl-topbar::before { width: 100%; transform: none; opacity: .5; }
    .pl-status { background: none; -webkit-text-fill-color: currentColor; }
  }
`;

// A page of text: a dark header with the PDF badge, then the person, then the sections. `--i` is each item's place in the writing order.
const LoaderSheet = () => (
  <div className="pl-sheet">
    <div className="pl-top">
      <span className="pl-badge">PDF</span>
    </div>
    <div className="pl-body">
      <div className="pl-head">
        <span className="pl-circ" style={{ '--i': 0 }} />
        <div className="pl-id">
          <span className="pl-ln pl-ln-name" style={{ width: '72%', '--i': 1 }} />
          <span className="pl-ln" style={{ width: '46%', '--i': 2 }} />
        </div>
      </div>
      <div className="pl-rule" style={{ '--i': 3 }} />
      {SHEET_ROWS.map((row, k) => (
        <span key={k} className={`pl-ln ${row.accent ? 'pl-ln-accent' : ''}`} style={{ width: row.w, '--i': k + 4 }}>
          {row.mark && <span className="pl-mark" style={{ '--i': k + 4 }} />}
        </span>
      ))}
    </div>
  </div>
);

const GhostSheet = ({ className }) => (
  <div className={`pl-sheet pl-ghost ${className}`}>
    <div className="pl-top">
      <span className="pl-badge">PDF</span>
    </div>
    <div className="pl-body">
      {GHOST_ROWS.map((w, k) => (
        <span key={k} className="pl-ln" style={{ width: w }} />
      ))}
    </div>
  </div>
);

const PageLoader = () => {
  const [stage, setStage] = useState(0);
  const [serverReady, setServerReady] = useState(false);

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
      <div className="pl-grid" aria-hidden="true" />

      {/* A PDF writes itself while a scanner passes over it. Two more pages wait behind it. */}
      <div className="pl-stage" aria-hidden="true">
        <div className="pl-glow" />
        <GhostSheet className="pl-ghost-l" />
        <GhostSheet className="pl-ghost-r" />
        <div className="pl-main">
          <LoaderSheet />
          <div className="pl-beam" />
        </div>
      </div>

      <h1 className="pl-title">Getting RemoPDF ready</h1>
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