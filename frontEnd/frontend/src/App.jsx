import React, { Suspense, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/Navbar';
import ResumeBuilder from './pages/ResumeBuilder';

// High-Performance Lazy Loading for Viewports
const Home = React.lazy(() => import('./pages/Home'));
const Editor = React.lazy(() => import('./pages/Editor'));

/* ==========================================================================
   PREMIUM SKELETON LOADER (Prevents flashing or blank screens during loads)
   ========================================================================== */
const PageLoader = () => (
  <div className="premium-loader-container" style={{
    display: 'flex', flexDirection: 'column', justifyContent: 'center',
    alignItems: 'center', minHeight: '80vh', background: '#f6f7fb', gap: '16px'
  }}>
    <div className="spinner" style={{
      width: '48px', height: '48px', border: '4px solid #e7e9f2',
      borderTop: '4px solid #ff2d2d', borderRadius: '50%', animation: 'spin 1s linear infinite'
    }} />
    <p style={{ color: '#6b7280', fontFamily: '"Outfit", sans-serif', fontWeight: '500' }}>
      Loading RemoPDF Engine...
    </p>
    <style>{`
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    `}</style>
  </div>
);

/* ==========================================================================
   GLOBAL ERROR BOUNDARY (Catches breaking exceptions gracefully)
   ========================================================================== */
class GlobalErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, errorInfo) { console.error("RemoPDF Core Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: '100px 20px', background: '#f6f7fb', minHeight: '100vh', fontFamily: '"Outfit", sans-serif' }}>
          <h2 style={{ color: '#121525', fontSize: '2rem' }}>Something went sideways.</h2>
          <p style={{ color: '#6b7280', margin: '12px 0 24px' }}>Don't worry, your documents are completely safe.</p>
          <button onClick={() => window.location.href = '/'} style={{ background: '#ff2d2d', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}>
            Reload RemoPDF Engine
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ==========================================================================
   MAIN APPLICATION COMPONENT
   ========================================================================== */
export default function App() {
  return (
    <GlobalErrorBoundary>
      <Router>
        <div className="remopdf-app-scope" style={{ 
          minHeight: '100vh', 
          background: 'var(--bg, #f6f7fb)', 
          color: 'var(--text, #121525)',
          fontFamily: '"Outfit", sans-serif'
        }}>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main Dashboard Utilities Route */}
              <Route 
                path="/" 
                element={
                  <>
                    <Navbar />
                    <Home />
                  </>
                } 
              />

              {/* Advanced Workspace Editor Route (Immersive UI without global nav header) */}
              <Route path="/editor" element={<Editor />} />
              <Route path="/ResumeBuilder" element={<ResumeBuilder />} />
              
              {/* Dynamic Fallback Redirection */}
              <Route 
                path="*" 
                element={
                  <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                    <h2>404 - Utility Route Missing</h2>
                    <Link to="/" style={{ color: '#ff2d2d', fontWeight: '600', textDecoration: 'none' }}>
                      ← Back to Safe Terminal
                    </Link>
                  </div>
                } 
              />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </GlobalErrorBoundary>
  );
}