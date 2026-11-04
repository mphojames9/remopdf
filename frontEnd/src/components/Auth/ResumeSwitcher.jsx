import React, { useEffect, useRef, useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  The signed-in person's resumes: a button that shows the open one, and a   */
/*  dialog to open another, start a new one, rename, copy or delete.          */
/* -------------------------------------------------------------------------- */

const ring = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d9856b]/50';

const timeAgo = (iso) => {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(then).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const Icon = ({ children }) => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const IconDoc = () => <Icon><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Icon>;
const IconChevron = () => <Icon><path d="m6 9 6 6 6-6" /></Icon>;
const IconPencil = () => <Icon><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Icon>;
const IconCopy = () => <Icon><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></Icon>;
const IconTrash = () => <Icon><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></Icon>;
const IconPlus = () => <Icon><path d="M12 5v14" /><path d="M5 12h14" /></Icon>;
const IconClose = () => <Icon><path d="M6 6l12 12" /><path d="M18 6 6 18" /></Icon>;

// Shows which resume is open. `block` stretches it across the width (used in the small-screen bar).
export function ResumeSwitcherButton({ title, onClick, block = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className={`inline-flex max-w-full items-center justify-between gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${ring} ${block ? 'w-full' : 'sm:max-w-xs'}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <IconDoc />
        <span className="truncate">{title || 'My resumes'}</span>
      </span>
      <IconChevron />
    </button>
  );
}

const IconButton = ({ label, onClick, disabled, danger = false, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
      danger ? 'hover:bg-rose-50 hover:text-rose-600' : 'hover:bg-slate-100 hover:text-slate-800'
    } ${ring}`}
  >
    {children}
  </button>
);

/*
 * Every action prop returns a promise of { ok, message? } (see useResumeProfile):
 *   onOpen(id)  onCreate()  onRename(id, title)  onDuplicate(id)  onDelete(id) -> { ok, switched? }
 */
export function ResumeManagerDialog({ open, resumes, activeId, limit, onClose, onOpen, onCreate, onRename, onDuplicate, onDelete }) {
  const [renamingId, setRenamingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRenamingId(null);
    setConfirmId(null);
    setMessage('');
    if (closeRef.current) closeRef.current.focus();
  }, [open]);

  if (!open) return null;

  const atLimit = resumes.length >= limit;

  // Runs one action: buttons are disabled meanwhile, and a failure is shown instead of being lost.
  const run = async (action) => {
    setBusy(true);
    setMessage('');
    const result = await action();
    setBusy(false);
    if (!result.ok) setMessage(result.message || 'Something went wrong. Please try again.');
    return result;
  };

  const choose = async (id) => {
    if (id === activeId) return onClose();
    const result = await run(() => onOpen(id));
    return result.ok ? onClose() : undefined;
  };

  const create = async () => {
    const result = await run(onCreate);
    if (result.ok) onClose();
  };

  const startRename = (resume) => {
    setConfirmId(null);
    setMessage('');
    setDraft(resume.title);
    setRenamingId(resume.id);
  };

  const submitRename = async (resume) => {
    const title = draft.trim();
    if (!title) {
      setMessage('Enter a name for this resume.');
      return;
    }
    if (title === resume.title) {
      setRenamingId(null);
      return;
    }
    const result = await run(() => onRename(resume.id, title));
    if (result.ok) setRenamingId(null);
  };

  const duplicate = (id) => run(() => onDuplicate(id));

  const remove = async (id) => {
    const result = await run(() => onDelete(id));
    if (!result.ok) return;
    setConfirmId(null);
    if (result.switched) onClose();
  };

  const onKeyDown = (event) => {
    if (event.key !== 'Escape' || busy) return;
    event.stopPropagation();
    if (renamingId) setRenamingId(null);
    else if (confirmId) setConfirmId(null);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-manager-title"
        onKeyDown={onKeyDown}
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="resume-manager-title" className="text-base font-semibold text-slate-900">My resumes</h2>
            <p className="mt-0.5 text-xs text-slate-500">{resumes.length} of {limit} resumes</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close"
            onClick={onClose}
            disabled={busy}
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 ${ring}`}
          >
            <IconClose />
          </button>
        </div>

        <ul className="pro-scroll -mr-1 mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1" aria-busy={busy}>
          {resumes.map((resume) => {
            const isOpen = resume.id === activeId;
            const details = [resume.name, resume.profession].filter(Boolean).join(' · ') || 'No details yet';

            return (
              <li
                key={resume.id}
                className={`rounded-2xl border px-3 py-2.5 ${isOpen ? 'border-[#d9856b] bg-[#d9856b]/5' : 'border-slate-200'}`}
              >
                {renamingId === resume.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={draft}
                      maxLength={80}
                      aria-label="Resume name"
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') submitRename(resume);
                      }}
                      className={`min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 ${ring}`}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => submitRename(resume)}
                      className={`rounded-full bg-[#d9856b] px-4 py-2 text-xs font-semibold text-white hover:bg-[#c9765c] disabled:opacity-60 ${ring}`}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setRenamingId(null)}
                      className={`rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${ring}`}
                    >
                      Cancel
                    </button>
                  </div>
                ) : confirmId === resume.id ? (
                  <div>
                    <p className="text-sm text-slate-700">
                      Delete <span className="font-semibold">“{resume.title}”</span>?{' '}
                      {resumes.length === 1
                        ? 'You will start again with a blank resume.'
                        : 'This cannot be undone.'}
                    </p>
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setConfirmId(null)}
                        className={`rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 ${ring}`}
                      >
                        Keep it
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => remove(resume.id)}
                        className={`rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60 ${ring}`}
                      >
                        {busy ? 'Deleting…' : 'Delete resume'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => choose(resume.id)}
                      aria-current={isOpen ? 'true' : undefined}
                      className={`min-w-0 flex-1 rounded-xl px-1 py-0.5 text-left disabled:cursor-not-allowed ${ring}`}
                    >
                      <span className="block truncate text-sm font-semibold text-slate-900">{resume.title}</span>
                      <span className="block truncate text-xs text-slate-500">{details}</span>
                      <span className={`block text-xs ${isOpen ? 'font-medium text-[#c9765c]' : 'text-slate-400'}`}>
                        {isOpen ? 'Open now' : `Edited ${timeAgo(resume.updatedAt)}`}
                      </span>
                    </button>
                    <IconButton label={`Rename ${resume.title}`} disabled={busy} onClick={() => startRename(resume)}><IconPencil /></IconButton>
                    <IconButton label={`Make a copy of ${resume.title}`} disabled={busy || atLimit} onClick={() => duplicate(resume.id)}><IconCopy /></IconButton>
                    <IconButton label={`Delete ${resume.title}`} danger disabled={busy} onClick={() => { setRenamingId(null); setMessage(''); setConfirmId(resume.id); }}><IconTrash /></IconButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {message && (
          <p role="alert" className="mt-3 text-sm text-rose-600">{message}</p>
        )}

        <div className="mt-4">
          <button
            type="button"
            disabled={busy || atLimit}
            onClick={create}
            className={`flex w-full items-center justify-center gap-2 rounded-full bg-[#d9856b] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c9765c] disabled:cursor-not-allowed disabled:opacity-60 ${ring}`}
          >
            <IconPlus />
            New resume
          </button>
          {atLimit && (
            <p className="mt-2 text-center text-xs text-slate-500">
              You can keep up to {limit} resumes. Delete one to add another.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResumeManagerDialog;
