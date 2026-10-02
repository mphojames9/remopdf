import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Rich-text field for achievements, summaries and descriptions.
//
// What you see in the box is what you get: bold text looks bold, italic text looks italic and
// bullets are real bullets. There is no separate preview.
//
// The value is still a plain string, so everything that already reads it keeps working (resume
// templates, the writing assistant, the AI suggestions):
//
//   **bold**    *italic*    ***bold and italic***    "- " at the start of a line = a bullet
//
// If your templates mark italics some other way, change ITALIC below. Nothing else needs to change.

const BOLD = '**';
const ITALIC = '*';

const DEFAULT_PLACEHOLDER = 'Describe what you did and what you achieved. Use the bullet button for a list.';

/* -------------------------------------------------------------------------- */
/*                          Text  ->  what the box shows                      */
/* -------------------------------------------------------------------------- */

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A marked-up run must start and end with a non-space, so "5 * 3 * 2" stays plain text.
const INNER = '(\\S(?:[\\s\\S]*?\\S)?)';
const B = escapeRegex(BOLD);
const I = escapeRegex(ITALIC);
const INLINE_SOURCE = `${I}${B}${INNER}${B}${I}|${B}${INNER}${B}|${I}${INNER}${I}`;

const inlineToHtml = (text) => {
  const re = new RegExp(INLINE_SOURCE, 'g');
  let out = '';
  let last = 0;
  let match = re.exec(text);
  while (match !== null) {
    out += escapeHtml(text.slice(last, match.index));
    if (match[1] !== undefined) out += `<b><i>${escapeHtml(match[1])}</i></b>`;
    else if (match[2] !== undefined) out += `<b>${inlineToHtml(match[2])}</b>`;
    else out += `<i>${escapeHtml(match[3])}</i>`;
    last = match.index + match[0].length;
    match = re.exec(text);
  }
  return out + escapeHtml(text.slice(last));
};

const BULLET_LINE = /^[ \t]*[-•][ \t]+(.*)$/;

const markdownToHtml = (md) => {
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  let html = '';
  let inList = false;
  lines.forEach((line) => {
    const bullet = line.match(BULLET_LINE);
    if (bullet) {
      if (!inList) {
        html += '<ul>';
        inList = true;
      }
      html += `<li>${inlineToHtml(bullet[1]) || '<br>'}</li>`;
      return;
    }
    if (inList) {
      html += '</ul>';
      inList = false;
    }
    html += `<div>${inlineToHtml(line) || '<br>'}</div>`;
  });
  if (inList) html += '</ul>';
  return html;
};

/* -------------------------------------------------------------------------- */
/*                          What the box holds  ->  text                      */
/* -------------------------------------------------------------------------- */

const BLOCK_TAGS = new Set(['DIV', 'P', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

const styleOf = (el, parent) => {
  let bold = parent.bold;
  let italic = parent.italic;
  const weight = el.style && el.style.fontWeight;
  if (weight) bold = weight === 'bold' || weight === 'bolder' || parseInt(weight, 10) >= 600;
  else if (el.tagName === 'B' || el.tagName === 'STRONG') bold = true;
  const fontStyle = el.style && el.style.fontStyle;
  if (fontStyle) italic = fontStyle === 'italic' || fontStyle === 'oblique';
  else if (el.tagName === 'I' || el.tagName === 'EM') italic = true;
  return { bold, italic };
};

const collectRuns = (node, style, runs) => {
  if (node.nodeType === 3) {
    const text = node.data.replace(/\u00a0/g, ' ').replace(/[\u200b\ufeff]/g, '');
    if (text) runs.push({ text, bold: style.bold, italic: style.italic });
    return;
  }
  if (node.nodeType !== 1) return;
  if (node.tagName === 'BR') {
    runs.push({ br: true });
    return;
  }
  const next = styleOf(node, style);
  Array.from(node.childNodes).forEach((child) => collectRuns(child, next, runs));
};

// Spaces at the edges of a run go outside the markers: "**word **" would not read as bold.
const wrapRun = ({ text, bold, italic }) => {
  if (!bold && !italic) return text;
  const [, lead, core, trail] = text.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!core) return text;
  const open = (italic ? ITALIC : '') + (bold ? BOLD : '');
  const close = (bold ? BOLD : '') + (italic ? ITALIC : '');
  return `${lead}${open}${core}${close}${trail}`;
};

const runsToMarkdown = (runs) => {
  const list = runs.slice();
  // The browser parks one <br> at the end of an empty or finished line; that is not a line break.
  if (list.length > 0 && list[list.length - 1].br) list.pop();
  const merged = [];
  list.forEach((run) => {
    const prev = merged[merged.length - 1];
    if (!run.br && prev && !prev.br && prev.bold === run.bold && prev.italic === run.italic) prev.text += run.text;
    else merged.push({ ...run });
  });
  return merged.map((run) => (run.br ? '\n' : wrapRun(run))).join('');
};

const domToMarkdown = (root) => {
  const lines = [];
  const lineFrom = (nodes) => {
    const runs = [];
    nodes.forEach((n) => collectRuns(n, { bold: false, italic: false }, runs));
    return runsToMarkdown(runs);
  };
  const walk = (parent) => {
    let loose = [];
    const flush = () => {
      if (loose.length > 0) lines.push(lineFrom(loose));
      loose = [];
    };
    Array.from(parent.childNodes).forEach((node) => {
      const isBlock = node.nodeType === 1 && BLOCK_TAGS.has(node.tagName);
      if (!isBlock) {
        loose.push(node);
        return;
      }
      flush();
      if (node.tagName === 'UL' || node.tagName === 'OL') {
        Array.from(node.childNodes).forEach((li) => {
          if (li.nodeType === 1 && li.tagName === 'LI') lines.push(`- ${lineFrom(Array.from(li.childNodes))}`);
        });
      } else if (node.querySelector('ul, ol, div, p')) {
        walk(node);
      } else {
        lines.push(lineFrom(Array.from(node.childNodes)));
      }
    });
    flush();
  };
  walk(root);
  return lines
    .join('\n')
    // no dangling blank lines or empty bullets at the end
    .replace(/(?:\n[ \t]*(?:[-•][ \t]*)?)+$/, '')
    .replace(/^[ \t]*[-•][ \t]*$/, '');
};

const isEmptyDom = (el) => !el.textContent.replace(/[\s\u200b\ufeff]/g, '') && !el.querySelector('ul, ol');

/* -------------------------------------------------------------------------- */
/*                                   Toolbar                                  */
/* -------------------------------------------------------------------------- */

const NONE = { bold: false, italic: false, list: false };

const ToolButton = ({ label, active, onRun, children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    // keep the caret and selection in the box when a button is pressed
    onMouseDown={(e) => e.preventDefault()}
    onClick={onRun}
    className={`w-8 h-8 flex items-center justify-center rounded-sm border text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d9856b] ${
      active
        ? 'bg-[#d9856b]/15 border-[#d9856b] text-[#8f4631]'
        : 'bg-white border-slate-200 text-slate-600 hover:border-[#d9856b]'
    }`}
  >
    {children}
  </button>
);

const ListIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
    <line x1="9" y1="6" x2="20" y2="6" />
    <line x1="9" y1="12" x2="20" y2="12" />
    <line x1="9" y1="18" x2="20" y2="18" />
    <circle cx="4.5" cy="6" r="1" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1" fill="currentColor" />
  </svg>
);

/* -------------------------------------------------------------------------- */
/*                                    Field                                   */
/* -------------------------------------------------------------------------- */

const AchievementsField = ({
  id,
  label = 'Achievements',
  placeholder = DEFAULT_PLACEHOLDER,
  minHeightClass = 'min-h-[100px]',
  value,
  onChange,
}) => {
  const text = typeof value === 'string' ? value : '';
  const editorRef = useRef(null);
  const lastValue = useRef(null); // the last text the box produced or was given
  const [empty, setEmpty] = useState(!text.trim());
  const [active, setActive] = useState(NONE);
  const labelId = `${id || 'rich-field'}-label`;

  // Text that did not come from typing (a spelling fix, an AI idea, a reset) is shown in the box.
  // Text the box itself produced is left alone, so the caret never jumps while typing.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el || text === lastValue.current) return;
    el.innerHTML = markdownToHtml(text);
    lastValue.current = text;
    setEmpty(isEmptyDom(el));
  }, [text]);

  // Highlight Bold / Italic / Bullets for wherever the caret is.
  useEffect(() => {
    const update = () => {
      const el = editorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) return;
      try {
        const next = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          list: document.queryCommandState('insertUnorderedList'),
        };
        setActive((prev) => (prev.bold === next.bold && prev.italic === next.italic && prev.list === next.list ? prev : next));
      } catch {
        /* queryCommandState is not available: the buttons simply do not light up */
      }
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    const md = domToMarkdown(el);
    lastValue.current = md;
    setEmpty(isEmptyDom(el));
    if (md !== text && onChange) onChange(md);
  };

  // Typing "- " (or "* ") at the start of a line turns it into a bullet, like in a word processor.
  const startListFromShortcut = () => {
    const el = editorRef.current;
    const sel = window.getSelection();
    if (!el || !sel || !sel.isCollapsed || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
    let top = sel.anchorNode;
    while (top.parentNode && top.parentNode !== el) top = top.parentNode;
    if (top === el) return;
    if (top.nodeType === 1 && (top.tagName === 'UL' || top.tagName === 'OL')) return;
    if (top.nodeType === 3 && top.previousSibling) return;
    if (!/^[-•*][ \u00a0]$/.test(top.textContent)) return;
    const range = document.createRange();
    range.selectNodeContents(top);
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('delete');
    document.execCommand('insertUnorderedList');
  };

  const handleInput = () => {
    startListFromShortcut();
    emit();
  };

  const run = (command) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(command, false, null);
    emit();
  };

  // Pasting keeps the text, not the source's fonts and colours. Bullets and **bold** in pasted
  // text come through as bullets and bold.
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = ((e.clipboardData || window.clipboardData).getData('text/plain') || '').replace(/\r\n?/g, '\n');
    if (!pasted) return;
    if (!pasted.includes('\n') && !pasted.includes('*')) {
      document.execCommand('insertText', false, pasted);
    } else {
      document.execCommand('insertHTML', false, pasted.includes('\n') ? markdownToHtml(pasted) : inlineToHtml(pasted));
    }
    emit();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-3">
        <span
          id={labelId}
          className="text-xs font-bold text-slate-800"
          onClick={() => editorRef.current && editorRef.current.focus()}
        >
          {label}
        </span>
        <div className="flex items-center gap-1" role="toolbar" aria-label={`${label} formatting`}>
          <ToolButton label="Bold (Ctrl+B)" active={active.bold} onRun={() => run('bold')}>
            <span className="font-bold">B</span>
          </ToolButton>
          <ToolButton label="Italic (Ctrl+I)" active={active.italic} onRun={() => run('italic')}>
            <span className="italic font-serif text-sm">I</span>
          </ToolButton>
          <ToolButton label="Bullet list" active={active.list} onRun={() => run('insertUnorderedList')}>
            <ListIcon />
          </ToolButton>
        </div>
      </div>

      <div className="relative border border-slate-200 rounded-sm bg-white focus-within:border-[#d9856b] transition-colors">
        {empty && (
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 px-3 py-2 text-xs leading-relaxed text-slate-400 whitespace-pre-line pointer-events-none"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-labelledby={labelId}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onBlur={() => setActive(NONE)}
          className={`${minHeightClass} px-3 py-2 text-xs leading-relaxed text-slate-900 whitespace-pre-wrap break-words focus:outline-none [&_ul]:list-disc [&_ul]:pl-5`}
        />
      </div>
    </div>
  );
};

export default AchievementsField;
