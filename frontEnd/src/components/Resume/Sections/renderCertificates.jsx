import React from 'react';
import { padLast, endGroup } from '../Templates/templateShared';
import { renderAchievements } from './richText';
import { formatRange } from './dateFormat';

// Builds the Certificates section as a flat list of blocks, the same way renderExtraSections
// does for Projects / References, so it paginates and gets edit-mode marking like the rest.
// Returns { certificates: [...] } so a template can merge it into its `extras` map:
//
//   const extras = {
//     ...renderExtraSections({ ... }),
//     ...renderCertificates({ certificates, headingClass, headingStyle }),
//   };
//
// Each template passes its own headingClass / headingStyle so the heading matches the rest.
// The date is always shown as "Jan 2020" (see dateFormat.js), whatever the template.
// Optional: dateClass / dateStyle restyle the date (e.g. an outlined pill); without them it stays small grey text.
// The description supports bold, italic and bullets (same rich text as the job and education lines).
const DEFAULT_DATE_CLASS = 'text-[11px] text-slate-500 whitespace-nowrap';

const renderCertificates = ({ certificates, headingClass, headingStyle = {}, dateClass = DEFAULT_DATE_CLASS, dateStyle }) => {
  const items = (certificates?.items || []).filter((c) => c.name || c.issuer);
  if (!certificates?.enabled || items.length === 0) return { certificates: [] };

  return {
    certificates: endGroup([
      <h3 key="certificates-h" className={headingClass} style={headingStyle}>Certificates</h3>,
      ...items.flatMap((c) => {
        const hasDescription = Boolean(c.description && String(c.description).trim());
        // The last line above the description gets a little room underneath it.
        const lastLine = c.link ? 'link' : (c.name && c.issuer) ? 'issuer' : 'title';
        const gap = (line) => (hasDescription && lastLine === line ? ' mb-2' : '');

        return padLast([
          <div key={`certificate-${c.id}-title`} className={`flex justify-between items-baseline gap-3${gap('title')}`}>
            <p className="font-bold text-slate-900 text-sm break-words">{c.name || c.issuer}</p>
            {c.date && <p className={dateClass} style={dateStyle}>{formatRange(c.date)}</p>}
          </div>,
          c.name && c.issuer && (
            <p key={`certificate-${c.id}-issuer`} className={`text-xs text-slate-600 mt-0.5${gap('issuer')}`}>{c.issuer}</p>
          ),
          c.link && (
            <p key={`certificate-${c.id}-link`} className={`text-[11px] text-slate-500 mt-0.5 break-all${gap('link')}`}>{c.link}</p>
          ),
          ...(hasDescription ? renderAchievements(c.description, `certificate-${c.id}-desc`) : []),
        ], 'mb-3');
      }),
    ]),
  };
};

export default renderCertificates;
