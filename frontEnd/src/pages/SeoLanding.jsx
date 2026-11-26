import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { LANDING_PAGES } from '../data/landingPages';

// One reusable page for every entry in data/landingPages.js. Plain text, real headings and links between pages,
// so search engines can read it without running any of the app.

const FONT = { fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" };
const BTN = 'inline-flex items-center justify-center rounded-full bg-[#d9856b] px-7 py-4 text-[1.0625rem] font-medium text-[#0e1726] transition-colors hover:bg-[#e29a83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0e1726]';

export default function SeoLanding({ page }) {
  const others = LANDING_PAGES.filter((p) => p.slug !== page.slug);

  return (
    <div className="min-h-screen bg-white text-[#0e1726]" style={FONT}>
      <Navbar />
      <main>
        <section className="bg-[radial-gradient(60%_60%_at_85%_0%,rgba(217,133,107,.16),transparent)]">
          <div className="mx-auto max-w-4xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20">
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#b5563a]">{page.eyebrow}</p>
            <h1 className="mt-4 text-[2.4rem] font-light leading-[1.08] tracking-[-0.03em] [text-wrap:balance] sm:text-6xl">{page.h1}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-relaxed text-slate-600 sm:text-xl">{page.intro}</p>
            <div className="mt-9">
              <Link to={page.cta.to} className={BTN}>{page.cta.label}</Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="how" className="border-t border-[#0e1726]/10">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="how" className="text-3xl font-light tracking-[-0.02em] sm:text-4xl">How it works</h2>
            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              {page.steps.map((s, i) => (
                <li key={s.t} className="rounded-2xl border border-[#0e1726]/10 p-6">
                  <span className="text-sm font-medium text-[#b5563a]">Step {i + 1}</span>
                  <h3 className="mt-2 text-xl font-light tracking-tight">{s.t}</h3>
                  <p className="mt-2 text-slate-600">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-labelledby="points" className="bg-[#fbf6f2]">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="points" className="text-3xl font-light tracking-[-0.02em] sm:text-4xl">{page.pointsTitle}</h2>
            <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {page.points.map((p) => (
                <li key={p.t}>
                  <h3 className="text-xl font-light tracking-tight">{p.t}</h3>
                  <p className="mt-1.5 text-slate-600">{p.d}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="faq">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="faq" className="text-3xl font-light tracking-[-0.02em] sm:text-4xl">Questions</h2>
            <div className="mt-8 divide-y divide-[#0e1726]/10 border-y border-[#0e1726]/10">
              {page.faq.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-light">
                    {f.q}
                    <span aria-hidden="true" className="text-2xl text-[#b5563a] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link to={page.cta.to} className={BTN}>{page.cta.label}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0e1726]/10 bg-[#0e1726] text-white/70">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <nav aria-label="More from RemoPDF" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <Link to="/" className="hover:text-white">Home</Link>
            {others.map((p) => (
              <Link key={p.slug} to={'/' + p.slug} className="hover:text-white">{p.nav}</Link>
            ))}
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/Contact" className="hover:text-white">Contact</Link>
            <Link to="/PrivacyPolicy" className="hover:text-white">Privacy</Link>
            <Link to="/terms-of-use" className="hover:text-white">Terms</Link>
          </nav>
          <p className="mt-6 text-xs text-white/40">© {new Date().getFullYear()} RemoPDF</p>
        </div>
      </footer>
    </div>
  );
}
