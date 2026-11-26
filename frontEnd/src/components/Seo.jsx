import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { LANDING_PAGES } from '../data/landingPages';

// Sets the title, description, canonical link and social tags for the page that is on screen.
// Google runs the site's JavaScript, so it reads these per-page values. index.html carries the home page's values
// for crawlers and link previews that do not run scripts.
// To add a page: add a line to PAGES (keys are lower-case) and to public/sitemap.xml.

const SITE = 'https://www.remopdf.site';
const OG_IMAGE = SITE + '/og-image.png';

const PAGES = {
  '/': {
    path: '/',
    title: 'RemoPDF: Resume Builder, CV Maker & Online PDF Editor',
    description: 'Build an ATS-friendly resume or CV with AI help, then edit, sign, split, compress and lock PDFs online. Start free. Made in South Africa.',
  },
  '/resumebuilder': {
    path: '/ResumeBuilder',
    title: 'Resume & CV Builder with ATS-Friendly Templates | RemoPDF',
    description: 'Choose from 30 ATS-ready resume and CV templates, get AI writing help, and download a clean A4 PDF. Start building in minutes.',
  },
  '/workspace': {
    path: '/Workspace',
    title: 'Edit PDF Online: Edit Text, Sign, Split & Compress | RemoPDF',
    description: 'Edit text in a PDF, add your signature, highlight, rotate or delete pages, split, compress, lock and unlock. Works in your browser.',
  },
  '/invoicebuilder': {
    path: '/InvoiceBuilder',
    title: 'Invoice Generator: Create and Download a PDF Invoice | RemoPDF',
    description: 'Create a professional PDF invoice. Add your details and line items, preview it, then download it to send to your client.',
  },
  '/ziptool': {
    path: '/ZipTool',
    title: 'Zip & Unzip Files Online | RemoPDF',
    description: 'Create a zip file or extract one in your browser or on Android. Pick files or a folder, then download the result.',
  },
  '/about': {
    path: '/about',
    title: 'About RemoPDF | Resume Builder and PDF Editor from South Africa',
    description: 'Learn who built RemoPDF, what it does, and where it is heading.',
  },
  '/contact': {
    path: '/Contact',
    title: 'Contact RemoPDF',
    description: 'Have a question, feedback or a bug to report? Get in touch with RemoPDF.',
  },
  '/privacypolicy': {
    path: '/PrivacyPolicy',
    title: 'Privacy Policy | RemoPDF',
    description: 'How RemoPDF handles your files and personal information.',
  },
  '/terms-of-use': {
    path: '/terms-of-use',
    title: 'Terms of Use | RemoPDF',
    description: 'The terms for using RemoPDF.',
  },
};

// The landing pages (data/landingPages.js) bring their own title and description.
LANDING_PAGES.forEach((l) => {
  PAGES['/' + l.slug] = { path: '/' + l.slug, title: l.title, description: l.description };
});

// The admin panel is private. A page with no path gets a title but is marked noindex and has no canonical link.
PAGES['/admin'] = { path: null, title: 'Admin | RemoPDF', description: 'Private area.' };

const NOT_FOUND = {
  path: null,
  title: 'Page not found | RemoPDF',
  description: 'This page does not exist. Go back to the RemoPDF home page.',
};

function upsert(selector, create, set) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  set(el);
}

const meta = (attr, key, content) =>
  upsert(
    'meta[' + attr + '="' + key + '"]',
    () => {
      const m = document.createElement('meta');
      m.setAttribute(attr, key);
      return m;
    },
    (m) => m.setAttribute('content', content),
  );

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const key = (pathname.replace(/\/+$/, '') || '/').toLowerCase();
    const page = PAGES[key] || NOT_FOUND;
    const url = page.path ? SITE + (page.path === '/' ? '/' : page.path) : null;

    document.title = page.title;
    meta('name', 'description', page.description);
    meta('name', 'robots', page.path ? 'index, follow' : 'noindex, follow');
    meta('property', 'og:title', page.title);
    meta('property', 'og:description', page.description);
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', 'RemoPDF');
    meta('property', 'og:image', OG_IMAGE);
    meta('name', 'twitter:card', 'summary_large_image');
    meta('name', 'twitter:title', page.title);
    meta('name', 'twitter:description', page.description);
    meta('name', 'twitter:image', OG_IMAGE);

    if (url) {
      meta('property', 'og:url', url);
      upsert(
        'link[rel="canonical"]',
        () => {
          const l = document.createElement('link');
          l.setAttribute('rel', 'canonical');
          return l;
        },
        (l) => l.setAttribute('href', url),
      );
    }
  }, [pathname]);

  return null;
}
