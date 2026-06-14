import React, { useState, useEffect } from 'react';

// Global trigger function to call from anywhere in your app
export const toast = {
  success: (message, options) => window.dispatchEvent(new CustomEvent('trigger-toast', { detail: { type: 'success', message, ...options } })),
  error: (message, options) => window.dispatchEvent(new CustomEvent('trigger-toast', { detail: { type: 'error', message, ...options } })),
};

export default function PremiumToastProvider() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      // Generate a quick unique ID for each toast
      const id = Math.random().toString(36).substring(2, 9);
      const newToast = { id, ...e.detail };
      
      setToasts((prev) => [...prev, newToast]);

      // Auto-remove after duration (default 5s)
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, e.detail.duration || 10000);
    };

    window.addEventListener('trigger-toast', handleToast);
    return () => window.removeEventListener('trigger-toast', handleToast);
  }, []);

  return (
    // z-[999999] ensures it sits above your z-50 modals and z-[99999] fullscreen previews
    <div className="fixed bottom-6 right-6 z-[999999] flex flex-col gap-3 items-end pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex flex-col gap-2 min-w-[320px] max-w-md p-4 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] backdrop-blur-xl border border-white/60 animate-in slide-in-from-right-8 fade-in duration-500
            ${t.type === 'error' ? 'bg-red-50/80' : 'bg-emerald-50/80'}
          `}
        >
          <div className="flex items-start gap-3">
            {/* Premium Gradient Icon */}
            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-inner border
              ${t.type === 'error' ? 'bg-gradient-to-br from-red-400 to-rose-500 border-red-200 text-white' : 'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-200 text-white'}
            `}>
              <i className={`fa-solid ${t.type === 'error' ? 'fa-triangle-exclamation' : 'fa-check'}`}></i>
            </div>

            {/* Content Body */}
            <div className="flex-1">
              <h4 className={`text-sm font-black tracking-tight ${t.type === 'error' ? 'text-red-900' : 'text-emerald-900'}`}>
                {t.message}
              </h4>
              {t.description && (
                <p className={`text-xs font-medium mt-1 leading-relaxed ${t.type === 'error' ? 'text-red-700/80' : 'text-emerald-700/80'}`}>
                  {t.description}
                </p>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors
                ${t.type === 'error' ? 'hover:bg-red-200/50 text-red-400' : 'hover:bg-emerald-200/50 text-emerald-400'}
              `}
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>

          {/* Action Button (e.g., "Go to Unlock Tool") */}
          {t.action && (
            <div className="mt-2 pl-11">
              <button
                onClick={() => {
                  t.action.onClick();
                  setToasts((prev) => prev.filter((item) => item.id !== t.id)); // Auto-close toast when clicked
                }}
                className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm
                  ${t.type === 'error' ? 'bg-white text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200' : 'bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-100 hover:border-emerald-200'}
                `}
              >
                {t.action.label}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}