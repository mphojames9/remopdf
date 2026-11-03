# RemoPDF

**Edit, sign, organize and protect PDFs. Build an ATS-friendly resume. Make invoices. Zip and unzip files.**
One toolkit that runs in the browser and as an Android app, with the heavy lifting done on your device.

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![React Router](https://img.shields.io/badge/React_Router-CA4245?logo=reactrouter&logoColor=white)
![pdf-lib](https://img.shields.io/badge/pdf--lib-F40F02)
![PDF.js](https://img.shields.io/badge/PDF.js-FF5722)
![Capacitor](https://img.shields.io/badge/Capacitor-119EFF?logo=capacitor&logoColor=white)

---

## Contents

- [What's inside](#whats-inside)
- [Privacy and where your files go](#privacy-and-where-your-files-go)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Routes](#routes)
- [How it works](#how-it-works)
- [Android app](#android-app)
- [Limits and browser support](#limits-and-browser-support)
- [Data saved in your browser](#data-saved-in-your-browser)
- [Contributing](#contributing)
- [Attribution](#attribution)

---

## What's inside

RemoPDF is four tools behind one landing page.

### PDF editor

Open a PDF and change it right on the page.

| Capability | Details |
| --- | --- |
| **Edit existing text** | Click a line and type. The editor samples the original font style and colour from the rendered page, so edits blend in. Helvetica, Times New Roman and Courier, in sizes from 10 to 32. |
| **Add text** | Place new text anywhere on a page. |
| **Highlight** | Five marker colours with adjustable opacity (10% to 80%). On touch screens it is press-and-hold on a word, drag to extend, lift to keep. The page auto-scrolls near the edge, and a plain one-finger drag still scrolls. |
| **Sign** | Draw a signature on the pad and place it on the page. |
| **Add images** | Place PNG or JPG images on any page. |
| **Manage pages** | Thumbnail sidebar, drag to reorder, delete, rotate left or right, and add pages from other PDFs or from PNG, JPG and WebP images. |
| **Undo and redo** | Step back and forward through your edits. |
| **Page numbers** | Six positions, four formats (`1`, `Page 1`, `1 / 10`, `Page 1 of 10`), sizes 8 to 20 pt and a custom start number. Numbers follow the final page order, not the original file. |
| **Watermark** | Stamp a watermark on every page at download time. |
| **Password protect and unlock** | Lock a PDF with a password, or enter the password to open and unlock an encrypted one. |
| **Download your way** | Merge everything into one PDF, split into one PDF per page (delivered as a `.zip`), or export every page as PNG or JPG. |

### Resume builder

A guided builder for resumes that applicant tracking systems (ATS) can read.

- **Six-step flow:** Heading, Work history, Education, Skills, Summary, then Finalize, with a progress indicator.
- **30 layouts** (sidebar, timeline, executive, minimal, creative and more), each previewed with realistic sample content.
- **Accent colours:** ten swatches, grayscale, a custom colour picker, or each template's own default.
- **Make it yours:** reorder sections by dragging, hide sections and bring them back later, add a photo, and choose a page-number style.
- **Click to edit:** in the preview, click any section to jump into its form.
- **Import** an existing resume and keep editing it.
- **Clean output:** A4 pages with clear section headings and readable text, rendered to a real PDF.
- **Autosave:** your work and your place in the flow are kept in the browser.

### Invoice builder

- Business and client details, a company logo (PNG or JPG), invoice number, issue and due dates, and a currency symbol.
- Line items with quantity and rate, plus discount and tax percentages. Totals update as you type.
- A **live A4 preview** that paginates exactly like the exported PDF, so what you see is what downloads.
- One-click PDF download, named `Invoice-<number>.pdf`.
- The draft is saved automatically.

### Zip and unzip

- **Zip** a folder (desktop) or a set of picked files (Android) into a single `.zip`, with progress.
- **Unzip** an archive and keep its folder structure, writing straight into a folder you choose where the browser allows it.
- Zip entry paths are sanitised, so `..` segments and absolute paths in an archive cannot escape the target folder.

---

## Privacy and where your files go

Most of the work happens on your device. Documents are parsed, edited and exported with `pdf-lib` and PDF.js in the browser, resumes and invoices are rendered locally, and zipping and unzipping never leave the device.

Two PDF operations need the backend, because `pdf-lib` cannot do them:

| Operation | API client function |
| --- | --- |
| Adding a password to a PDF | `addPasswordToPdf` |
| Exporting pages as PNG or JPG | `pdfToImages` |

Both live in `src/api/client.js`, next to the shared `downloadBlob` helper. Unlocking an encrypted PDF does **not** use the backend: it runs in the browser with `@cantoo/pdf-lib`.

---

## Tech stack

| Area | Tools |
| --- | --- |
| UI | React, React Router, Tailwind-style utility classes |
| PDF editing and export | `pdf-lib`, `@cantoo/pdf-lib` (decrypting encrypted files only) |
| PDF rendering and text layer | `pdfjs-dist` v4 or newer (ESM worker) |
| Archives | `jszip` for the Zip tool, plus a small built-in zip writer for the editor's "split into pages" download |
| Mobile | Capacitor (Android), with `@capacitor/filesystem` for saving files |
| Icons and fonts | Inline SVG, Font Awesome 6 (`fa-solid` classes) and the Outfit typeface, expected to be loaded in `index.html` |

---

## Getting started

**Prerequisites:** a current Node.js LTS release and npm.

```bash
git clone <your-repo-url>
cd remopdf
npm install
npm run dev
```

Make sure these runtime packages are installed:

```bash
npm i react react-dom react-router-dom pdf-lib @cantoo/pdf-lib pdfjs-dist jszip
```

The password and image-export features call the backend through `src/api/client.js`. Point that module at your API before using them.

Create a production build with:

```bash
npm run build
```

---

## Project structure

Inferred from the import paths in the source.

```text
src/
├── api/
│   └── client.js                # downloadBlob, addPasswordToPdf, pdfToImages
├── assets/                      # logo, screenshots, demo photos (.webp)
├── components/
│   ├── Navbar.jsx
│   ├── TemplateShowcase.jsx     # resume layout carousel (lazy-loaded on Home)
│   └── Resume/
│       ├── Sections/            # PersonalInfo, ExperienceField, EducationField,
│       │                        # SkillsField, Summary, AdditionalSections,
│       │                        # ResumeUpload, ResumePhoto, BuilderSidebar, ...
│       └── Templates/           # the 30 layouts + shared tokens (DEFAULT_ACCENT, ...)
├── pages/
│   ├── Home.jsx                 # landing page
│   ├── Workspace.jsx            # PDF editor
│   ├── ResumeBuilder.jsx
│   ├── InvoiceBuilder.jsx
│   └── ZipTool.jsx
└── utils/
    └── resumePdf.js             # buildResumePdf: A4 DOM pages -> PDF bytes
```

---

## Routes

| Path | Page |
| --- | --- |
| `/` | Home (landing page, ATS explainer, template gallery, FAQ) |
| `/Workspace` | PDF editor |
| `/ResumeBuilder` | Resume builder |
| `/PrivacyPolicy` | Privacy policy |
| `/terms-of-use` | Terms of use |

The Invoice builder and the Zip tool are registered in your router alongside these.

---

## How it works

A few design decisions worth knowing before you change things.

**The editor works on the real PDF text layer.** Pages are rendered with PDF.js, and its text layer drives editing and highlighting. Highlights are stored as ratios of the page, so they stay put when you zoom, and everything is written into the file with `pdf-lib` at download time. Watermarks, page numbers and passwords are applied last, at download, so they never end up baked into your working copy.

**Touch highlighting does not use native text selection.** On touch screens the browser hands selection to handles a web page cannot observe. Instead, a pointer-event gesture (press-and-hold, drag, lift) builds the range itself.

**Splitting does not need a zip library.** "Split into pages" uses a tiny writer that stores PDFs uncompressed with a CRC-32, since PDFs are already compressed.

**Resume templates are code-split.** `TemplateShowcase` pulls in every layout, so Home loads it as its own chunk only when the Templates section is about to scroll into view. On small screens the gallery is a centred, swipeable carousel, and its thumbnails are pre-built in idle time so slides never appear blank.

**The resume PDF is the preview.** `buildResumePdf` renders the `.a4-page` nodes from the preview into PDF bytes, so the download matches what you see on screen.

**The invoice preview paginates like the PDF.** Each block (header, parties, table head, one per line item, totals, notes) is measured off-screen, then dealt onto A4 sheets using the same margins and page-break rule as the PDF generator. A block that does not fit moves to the next sheet.

**Platform detection is explicit.** The Zip tool branches on whether it is running inside Capacitor, not on screen size, because the file APIs differ completely between the browser and the Android WebView.

---

## Android app

The same React code runs inside a Capacitor WebView.

- **Saving files:** the Zip tool writes to `Documents/RemoPDF` using the Capacitor Filesystem plugin. If the OS blocks that (Android 11 and newer restrict `Documents`), it falls back to the native download listener and saves to `Downloads/RemoPDF`.
- **Install the plugin** for whole-archive extraction. Without `@capacitor/filesystem`, unzipping falls back to saving files one at a time.
- **Download listener contract:** the fallback emits a data URL in the form `data:<mime>;name=<encoded-filename>;base64,<payload>`. `MainActivity.saveBase64ToDownloads()` parses exactly this shape and saves via MediaStore, so keep the two in sync.
- **File choosers:** Android ignores `webkitdirectory`, so the Zip tool picks multiple files instead of a folder. Picked files are read into memory once, up front, because `content://` streams can only be read a single time.

Typical Capacitor workflow after a web build:

```bash
npx cap sync android
npx cap open android
```

---

## Limits and browser support

| Item | Web | Android |
| --- | --- | --- |
| Maximum zip or archive size | 500 MB | 150 MB |
| Unzip to a chosen folder | Browsers with the File System Access API (`showDirectoryPicker`, e.g. Chromium) | Capacitor Filesystem plugin |
| Unzip fallback | Saves each file as a separate download | First 25 files, one at a time |
| Folder picker for zipping | Yes | No (multi-file picker) |

Animated sections respect `prefers-reduced-motion`.

---

## Data saved in your browser

Drafts live in `localStorage`, so closing the tab does not lose your work.

| Key | Holds |
| --- | --- |
| `invoice-builder:draft` | Everything in the invoice, including the logo |
| `resumeBuilder:resumeData` | Resume content |
| `resumeBuilder:currentStepIndex`, `resumeBuilder:completedSteps` | Place in the six-step flow |
| `resumeBuilder:selectedTemplate`, `resumeBuilder:selectedColor` | Chosen layout and accent colour |
| `resumeBuilder:sectionOrder`, `resumeBuilder:hiddenSections` | Section order and hidden sections |
| `resumeBuilder:pageNumbers` | Page-number style |

---

## Contributing

1. Fork the repository and create a feature branch.
2. Make your change and check it at phone width and desktop width, with and without reduced motion.
3. Open a pull request that says what changed and why.

---

## Attribution

This site incorporates information from [O\*NET Web Services](https://services.onetcenter.org/) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). O\*NET® is a trademark of USDOL/ETA. The O\*NET badge and credit are required and are shown in the site footer, so keep them when you restyle it.
