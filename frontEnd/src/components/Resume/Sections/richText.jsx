import React from 'react';

/**
 * Tiny formatting language used by the achievements box:
 *   **bold**   *italic*   ***bold italic***
 *   a line that starts with "- " (or "• ") is a bullet
 * Text is stored as a plain string and turned into React elements here, so
 * nothing is ever injected as raw HTML.
 */

const INLINE_SOURCE = String.raw`\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*([^*\s](?:[^*]*[^*\s])?)\*`;

// Turns one line of text into strings and <strong>/<em> elements.
export const renderInline = (text, keyPrefix = 'r') => {
  const re = new RegExp(INLINE_SOURCE, 'g'); // fresh regex: this function calls itself
  const out = [];
  let last = 0;
  let n = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const key = `${keyPrefix}-${n++}`;
    if (match[1] !== undefined) {
      out.push(<strong key={key} className="font-bold"><em>{match[1]}</em></strong>);
    } else if (match[2] !== undefined) {
      out.push(<strong key={key} className="font-bold">{renderInline(match[2], key)}</strong>);
    } else {
      out.push(<em key={key} className="italic">{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
};

const BULLET_LINE = /^\s*[-•*]\s+(.*)$/;
const EMPTY_BULLET = /^\s*[-•*]\s*$/;

// [{ bullet: boolean, text: string }] with blank lines and empty bullets dropped.
export const parseBlocks = (text) =>
  String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '' && !EMPTY_BULLET.test(line))
    .map((line) => {
      const match = BULLET_LINE.exec(line);
      return match ? { bullet: true, text: match[1] } : { bullet: false, text: line.trim() };
    });

/**
 * One flat element per bullet / paragraph. Every element is a plain div or p, so
 * the resume paginator can treat each one as its own atom and split a long
 * achievements list across pages.
 */
export const renderAchievements = (text, keyPrefix = 'ach') =>
  parseBlocks(text).map((block, i) => {
    const key = `${keyPrefix}-${i}`;
    return block.bullet ? (
      <div key={key} className="flex gap-2 text-xs leading-relaxed text-slate-600 mb-1">
        <span aria-hidden="true" className="shrink-0 select-none">•</span>
        <span className="min-w-0 break-words">{renderInline(block.text, key)}</span>
      </div>
    ) : (
      <p key={key} className="text-xs leading-relaxed text-slate-600 mb-1">
        {renderInline(block.text, key)}
      </p>
    );
  });
