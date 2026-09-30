import React, { useRef } from 'react';
import { renderAchievements } from './richText';

/* Shared rich-text box (bold, italic, bullets + live preview) used by Work History and Education. */

const DEFAULT_PLACEHOLDER = '- Grew monthly sales by 30%\n- Led a team of 8 reps';

const ToolbarButton = ({ label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className="min-h-[30px] min-w-[30px] px-2 inline-flex items-center justify-center rounded-sm border border-slate-200 bg-white text-xs text-slate-700 hover:border-amber-400 hover:text-amber-600 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-300"
  >
    {children}
  </button>
);

const AchievementsField = ({ id, value, onChange, label = 'Achievements', placeholder = DEFAULT_PLACEHOLDER }) => {
  const ref = useRef(null);
  const text = value || '';

  const apply = (nextValue, selStart, selEnd) => {
    onChange(nextValue);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selStart, selEnd);
    });
  };

  const wrap = (marker) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const m = marker.length;
    const isBold = marker === '**';
    const markedBefore = isBold ? text.slice(s - 2, s) === '**' : text[s - 1] === '*' && text[s - 2] !== '*';
    const markedAfter = isBold ? text.slice(e, e + 2) === '**' : text[e] === '*' && text[e + 1] !== '*';

    if (s !== e && markedBefore && markedAfter) {
      apply(text.slice(0, s - m) + text.slice(s, e) + text.slice(e + m), s - m, e - m);
      return;
    }
    if (s === e) {
      const placeholder = isBold ? 'bold' : 'italic';
      apply(text.slice(0, s) + marker + placeholder + marker + text.slice(e), s + m, s + m + placeholder.length);
      return;
    }
    apply(text.slice(0, s) + marker + text.slice(s, e) + marker + text.slice(e), s + m, e + m);
  };

  const toggleBullets = () => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const lineStart = text.lastIndexOf('\n', s - 1) + 1;
    let lineEnd = text.indexOf('\n', e);
    if (lineEnd === -1) lineEnd = text.length;

    const bullet = /^(\s*)[-•*]\s+/;
    const lines = text.slice(lineStart, lineEnd).split('\n');
    const targets = lines.filter((l) => l.trim() !== '' || lines.length === 1);
    const allBulleted = targets.length > 0 && targets.every((l) => bullet.test(l));

    const nextLines = lines.map((l) => {
      if (allBulleted) return l.replace(bullet, '$1');
      if (l.trim() === '' && lines.length > 1) return l;
      return bullet.test(l) ? l : `- ${l}`;
    });
    const block = nextLines.join('\n');
    apply(text.slice(0, lineStart) + block + text.slice(lineEnd), lineStart, lineStart + block.length);
  };

  const handleKeyDown = (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey) {
      const key = ev.key.toLowerCase();
      if (key === 'b') { ev.preventDefault(); wrap('**'); return; }
      if (key === 'i') { ev.preventDefault(); wrap('*'); return; }
    }

    if (ev.key !== 'Enter' || ev.shiftKey || ev.nativeEvent.isComposing) return;
    const el = ref.current;
    if (!el || el.selectionStart !== el.selectionEnd) return;
    const s = el.selectionStart;
    const lineStart = text.lastIndexOf('\n', s - 1) + 1;
    const beforeCaret = text.slice(lineStart, s);

    if (/^\s*[-•*]\s+$/.test(beforeCaret)) {
      ev.preventDefault();
      apply(text.slice(0, lineStart) + text.slice(s), lineStart, lineStart);
      return;
    }
    const withContent = /^(\s*)([-•*])\s+\S/.exec(beforeCaret);
    if (withContent) {
      ev.preventDefault();
      const insert = `\n${withContent[1]}${withContent[2]} `;
      apply(text.slice(0, s) + insert + text.slice(s), s + insert.length, s + insert.length);
    }
  };

  const previewAtoms = renderAchievements(text, `${id}-preview`);

  return (
    <div className="flex flex-col w-full">
      <div className="flex justify-between items-end mb-1.5">
        <label htmlFor={id} className="text-xs font-bold text-slate-800">
          {label}
        </label>
        <div className="flex gap-1" role="toolbar">
          <ToolbarButton label="Bold (Ctrl+B)" onClick={() => wrap('**')}>
            <span className="font-extrabold">B</span>
          </ToolbarButton>
          <ToolbarButton label="Italic (Ctrl+I)" onClick={() => wrap('*')}>
            <span className="italic font-semibold font-serif">I</span>
          </ToolbarButton>
          <ToolbarButton label="Bullet list" onClick={toggleBullets}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="5" cy="7" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
              <circle cx="5" cy="17" r="1.3" fill="currentColor" stroke="none" />
              <path strokeLinecap="round" strokeWidth="2" d="M10 7h10M10 12h10M10 17h10" />
            </svg>
          </ToolbarButton>
        </div>
      </div>

      <textarea
        id={id}
        ref={ref}
        value={text}
        rows={4}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full min-h-[100px] resize-y bg-white border ${
          text ? 'border-amber-300 text-slate-900' : 'border-slate-200 text-slate-900'
        } rounded-sm py-2 px-3 text-xs leading-relaxed focus:outline-none focus:border-amber-500 transition-all shadow-none placeholder-slate-400`}
      />

      {previewAtoms.length > 0 && (
        <div className="mt-2 rounded-sm border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">Preview</p>
          <div className="text-xs text-slate-700">{previewAtoms}</div>
        </div>
      )}
    </div>
  );
};

export default AchievementsField;
