import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentUser, getToken, loginUser, registerUser, signOut } from '../api/auth';
import * as resumeApi from '../api/resume';

/*
 * Where the resumes are kept:
 *   signed in   -> in the person's account (several resumes per account; one is open in the builder at a
 *                  time), saved a moment after each change
 *   signed out  -> in localStorage on this device, exactly as before (one resume)
 *
 * `mode` says which one is active right now:
 *   'local'      saving to this device (signed out, or the account could not be reached)
 *   'loading'    signed in, fetching the account's resumes; nothing is saved yet, so an empty builder can
 *                never overwrite a real saved resume
 *   'conflict'   signed in, and this device also holds a resume that is not in the account; waiting for the
 *                person to add it to the account or discard it
 *   'switching'  changes are being saved and another resume is being opened; the page is covered meanwhile
 *   'account'    signed in and loaded; every change is saved to the open resume
 *
 * The page keeps its own state. This hook only needs:
 *   payload       everything that makes up the open resume (memoised, so its identity changes only on edits)
 *   applyPayload  (saved) => normalised payload; puts a saved resume into the page
 *   createBlank   () => normalised payload of a new, empty resume
 *   readDevice    () => payload held in localStorage (blank payload when nothing is stored)
 *   writeDevice   (payload) => void
 *   clearDevice   () => void
 *   hasContent    (payload) => boolean; true when the person actually typed something
 */

const SAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 15000;

const BUSY_MESSAGE = 'Wait until your resume has finished loading.';
const UNSAVED_MESSAGE = 'Your latest changes could not be saved, so nothing was changed. Try again in a moment.';
const EXPIRED_MESSAGE = 'Your session expired. Sign in again.';
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';

// Which resume was open last, per account, so a reload (or the next visit) opens the same one.
// It is only an id, not resume content.
const activeKey = (userId) => `resumeBuilder:activeResume:${userId}`;
const readActiveId = (userId) => {
  try {
    return localStorage.getItem(activeKey(userId));
  } catch {
    return null;
  }
};
const writeActiveId = (userId, id) => {
  try {
    localStorage.setItem(activeKey(userId), id);
  } catch {
    /* storage unavailable: the newest resume is opened next time instead */
  }
};

const canSave = (mode) => mode === 'account' || mode === 'switching';

export const getSessionUser = () => (getToken() ? getCurrentUser() : null);

// Saves to resume `id`. If it was deleted elsewhere in the meantime (another device or tab), the work is kept
// as a new resume instead of being lost.
const persist = async (id, snapshot, title) => {
  try {
    return (await resumeApi.saveResume(id, snapshot)).item;
  } catch (err) {
    if (!err || err.status !== 404) throw err;
    return (await resumeApi.createResume({ title, resume: snapshot })).item;
  }
};

// Loader for a brand-new, empty resume (used by "New resume" and when the last resume is deleted).
const blankLoader = (createBlank, title) => async () => {
  const blank = createBlank();
  const { item } = await resumeApi.createResume({ title, resume: blank });
  return { id: item.id, payload: blank, item };
};

export default function useResumeProfile({ payload, applyPayload, createBlank, readDevice, writeDevice, clearDevice, hasContent }) {
  const [user, setUser] = useState(getSessionUser);
  const [mode, setModeState] = useState(() => (getSessionUser() ? 'loading' : 'local'));
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error | offline | expired
  const [conflict, setConflictState] = useState(null); // { device, busy?, error? } while mode === 'conflict'
  const [retryTick, setRetryTick] = useState(0);
  const [resumes, setResumes] = useState([]); // [{ id, title, name, profession, template, updatedAt }]
  const [resumeLimit, setResumeLimit] = useState(10);
  const [activeId, setActiveIdState] = useState(null);

  // The newest values, so timers and async callbacks never act on stale ones.
  const modeRef = useRef(mode);
  const payloadRef = useRef(payload);
  payloadRef.current = payload;
  const callbacks = useRef({});
  callbacks.current = { applyPayload, createBlank, readDevice, writeDevice, clearDevice, hasContent };
  const userIdRef = useRef(null);
  userIdRef.current = user ? user.id : null;
  const resumesRef = useRef(resumes);
  resumesRef.current = resumes;

  const activeIdRef = useRef(null);
  const conflictRef = useRef(null);
  const lastSavedRef = useRef(null); // JSON of what the account holds for the open resume right now
  const saveChainRef = useRef(Promise.resolve()); // saves run one after another, never overlapping
  const saveTimerRef = useRef(null);
  const retryTimerRef = useRef(null);

  const setMode = useCallback((next) => {
    modeRef.current = next;
    setModeState(next);
  }, []);

  const setConflict = useCallback((next) => {
    conflictRef.current = next;
    setConflictState(next);
  }, []);

  const setActiveId = useCallback((id) => {
    activeIdRef.current = id;
    setActiveIdState(id);
    if (id && userIdRef.current) writeActiveId(userIdRef.current, id);
  }, []);

  const forgetResumes = useCallback(() => {
    setResumes([]);
    activeIdRef.current = null;
    setActiveIdState(null);
  }, []);

  // The page asks this before writing to localStorage.
  const writesToDevice = useCallback(() => modeRef.current === 'local', []);

  const stopTimers = () => {
    clearTimeout(saveTimerRef.current);
    clearTimeout(retryTimerRef.current);
  };

  /* The session is no longer valid (token expired): back to a signed-out builder. */
  const endSession = useCallback(({ keepWork }) => {
    stopTimers();
    signOut();
    setUser(null);
    setMode('local');
    setConflict(null);
    forgetResumes();
    setSaveState('expired');
    // Work in the page goes to the device so nothing is lost. While loading, the page holds no work yet
    // (it is blank), so the device copy is shown instead.
    if (keepWork) callbacks.current.writeDevice(payloadRef.current);
    else callbacks.current.applyPayload(callbacks.current.readDevice());
  }, [setMode, setConflict, forgetResumes]);

  // What a failed call to the account means for the person: an expired session ends the session,
  // anything else is reported with the server's own wording.
  const failed = useCallback((err) => {
    if (err && err.status === 401) {
      endSession({ keepWork: true });
      return { ok: false, message: EXPIRED_MESSAGE };
    }
    return { ok: false, message: (err && err.message) || GENERIC_MESSAGE };
  }, [endSession]);

  /* ---------------------------- saving to the account ---------------------------- */

  // Resolves to true when the account holds the latest changes of the open resume, false when it could not.
  const runSave = useCallback(() => {
    const id = activeIdRef.current;
    const snapshot = payloadRef.current;
    const json = JSON.stringify(snapshot);
    if (!id) return Promise.resolve(true);
    if (json === lastSavedRef.current) {
      setSaveState('saved');
      return Promise.resolve(true);
    }
    setSaveState('saving');

    const job = saveChainRef.current.then(async () => {
      if (!canSave(modeRef.current)) return false;
      try {
        const title = (resumesRef.current.find((r) => r.id === id) || {}).title;
        const item = await persist(id, snapshot, title);
        // Same resume: its list entry is refreshed (name, profession, last edited). If it had been deleted
        // elsewhere, the new copy takes its place.
        setResumes((list) => (list.some((r) => r.id === id) ? list.map((r) => (r.id === id ? item : r)) : [item, ...list]));
        if (activeIdRef.current === id) {
          lastSavedRef.current = json;
          if (item.id !== id) setActiveId(item.id);
        }
        // The account holds it now, so no copy is left on this device.
        callbacks.current.clearDevice();
        if (payloadRef.current === snapshot) setSaveState('saved');
        return true;
      } catch (err) {
        if (err && err.status === 401) {
          endSession({ keepWork: true });
          return false;
        }
        // Server unreachable or failing: keep a copy on this device and try again shortly.
        callbacks.current.writeDevice(snapshot);
        setSaveState('error');
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => setRetryTick((n) => n + 1), RETRY_DELAY_MS);
        return false;
      }
    });
    saveChainRef.current = job.catch(() => {});
    return job;
  }, [endSession, setActiveId]);

  // Pushes pending changes to the account right now instead of waiting for the delay.
  const flushSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    clearTimeout(retryTimerRef.current);
    return runSave();
  }, [runSave]);

  // Save a moment after the person stops changing things.
  useEffect(() => {
    if (!user || mode !== 'account') return undefined;
    saveTimerRef.current = setTimeout(runSave, SAVE_DELAY_MS);
    return () => clearTimeout(saveTimerRef.current);
  }, [payload, user, mode, retryTick, runSave]);

  useEffect(() => () => stopTimers(), []);

  /* --------------------------- loading from the account --------------------------- */

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    setMode('loading');

    (async () => {
      const { applyPayload: apply, createBlank: blank, readDevice: read, clearDevice: clear, hasContent: has } = callbacks.current;
      try {
        const { items, limit } = await resumeApi.listResumes();
        if (cancelled) return;

        const device = read();
        const deviceHasWork = has(device);
        let list = items;
        let openId;
        let shown;
        let leftOnDevice = null; // a resume on this device that is not in the account yet

        if (list.length === 0) {
          // First time in this account: the resume made on this device (or a blank one) becomes the first resume.
          const first = deviceHasWork ? device : blank();
          const { item } = await resumeApi.createResume({ resume: first });
          if (cancelled) return;
          list = [item];
          openId = item.id;
          shown = apply(first);
          if (deviceHasWork) clear();
        } else {
          // Reopen the resume that was open last time on this device, or else the one edited most recently.
          const stored = readActiveId(user.id);
          openId = list.some((r) => r.id === stored) ? stored : list[0].id;
          const { resume } = await resumeApi.fetchResume(openId);
          if (cancelled) return;
          shown = apply(resume);
          if (deviceHasWork) {
            // The same resume is no problem; a different one is the person's to keep or discard.
            if (JSON.stringify(shown) === JSON.stringify(device)) clear();
            else leftOnDevice = device;
          }
        }

        setResumeLimit(limit);
        setResumes(list);
        setActiveId(openId);
        lastSavedRef.current = JSON.stringify(shown);

        if (leftOnDevice) {
          setConflict({ device: leftOnDevice });
          setMode('conflict');
          return;
        }
        setSaveState('saved');
        setMode('account');
      } catch (err) {
        if (cancelled) return;
        if (err && err.status === 401) {
          endSession({ keepWork: false });
        } else {
          // Could not reach the account: work on this device until the page is reloaded.
          callbacks.current.applyPayload(callbacks.current.readDevice());
          setMode('local');
          setSaveState('offline');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Runs when someone signs in (or a saved session is found on load), not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  /* The device holds a resume that is not in the account: 'add' saves it as a new resume and opens it,
     'discard' removes it from this device. */
  const resolveConflict = useCallback(async (choice) => {
    const current = conflictRef.current;
    if (!current || current.busy) return;

    if (choice === 'add') {
      setConflict({ ...current, busy: true, error: '' });
      try {
        const title = `Resume ${resumesRef.current.length + 1}`;
        const { item } = await resumeApi.createResume({ title, resume: current.device });
        const shown = callbacks.current.applyPayload(current.device);
        setResumes((list) => [item, ...list]);
        setActiveId(item.id);
        lastSavedRef.current = JSON.stringify(shown);
        callbacks.current.clearDevice();
      } catch (err) {
        if (err && err.status === 401) {
          endSession({ keepWork: false });
          return;
        }
        // Stay on the question: the resume is still on this device, so nothing is lost.
        setConflict({ ...current, busy: false, error: (err && err.message) || GENERIC_MESSAGE });
        return;
      }
    } else {
      callbacks.current.clearDevice();
    }
    setConflict(null);
    setSaveState('saved');
    setMode('account');
  }, [setMode, setConflict, setActiveId, endSession]);

  /* ----------------------------- working with several resumes ----------------------------- */

  /*
   * Saves the open resume, then swaps the page to another one. `load` is async and resolves to
   * { id, payload, item? }; `item` is a resume that is new to the list. If saving fails nothing is swapped,
   * so the changes on screen are never replaced before they are safe.
   */
  const switchTo = useCallback(async (load) => {
    if (modeRef.current !== 'account') return { ok: false, message: BUSY_MESSAGE };

    setMode('switching'); // covers the page and keeps the debounced save from firing meanwhile
    const saved = await flushSave();
    if (!saved) {
      // An expired session has already ended the session (mode is 'local' then); otherwise carry on editing.
      if (modeRef.current === 'switching') setMode('account');
      return { ok: false, message: UNSAVED_MESSAGE };
    }

    try {
      const { id, payload: next, item } = await load();
      const shown = callbacks.current.applyPayload(next);
      if (item) setResumes((list) => [item, ...list.filter((r) => r.id !== item.id)]);
      setActiveId(id);
      lastSavedRef.current = JSON.stringify(shown);
      setSaveState('saved');
      setMode('account');
      return { ok: true };
    } catch (err) {
      if (modeRef.current === 'switching') setMode('account');
      return failed(err);
    }
  }, [setMode, flushSave, setActiveId, failed]);

  const openResume = useCallback((id) => {
    if (id === activeIdRef.current) return Promise.resolve({ ok: true });
    return switchTo(async () => {
      try {
        const { resume } = await resumeApi.fetchResume(id);
        return { id, payload: resume };
      } catch (err) {
        // Deleted on another device: it should not stay in the list.
        if (err && err.status === 404) setResumes((list) => list.filter((r) => r.id !== id));
        throw err;
      }
    });
  }, [switchTo]);

  const createNewResume = useCallback(
    () => switchTo(blankLoader(callbacks.current.createBlank, `Resume ${resumesRef.current.length + 1}`)),
    [switchTo]
  );

  const renameResume = useCallback(async (id, title) => {
    try {
      const { item } = await resumeApi.renameResume(id, title);
      setResumes((list) => list.map((r) => (r.id === id ? item : r)));
      return { ok: true };
    } catch (err) {
      return failed(err);
    }
  }, [failed]);

  const duplicateResume = useCallback(async (id) => {
    if (modeRef.current !== 'account') return { ok: false, message: BUSY_MESSAGE };
    // A copy of the open resume must include what was typed a moment ago.
    if (id === activeIdRef.current && !(await flushSave())) return { ok: false, message: UNSAVED_MESSAGE };
    try {
      const { item } = await resumeApi.duplicateResume(id);
      setResumes((list) => [item, ...list]);
      return { ok: true };
    } catch (err) {
      return failed(err);
    }
  }, [flushSave, failed]);

  const removeResume = useCallback(async (id) => {
    if (modeRef.current !== 'account') return { ok: false, message: BUSY_MESSAGE };

    const wasOpen = id === activeIdRef.current;
    if (wasOpen) {
      // Open another resume (or a fresh one when this was the last) BEFORE deleting, so the resume on screen
      // is never deleted while it is still being edited, and a failure here deletes nothing.
      const other = resumesRef.current.find((r) => r.id !== id);
      const opened = await (other
        ? openResume(other.id)
        : switchTo(blankLoader(callbacks.current.createBlank, 'My resume')));
      if (!opened.ok) return opened;
    }

    try {
      await resumeApi.deleteResume(id);
    } catch (err) {
      // 404 means it was already gone, which is what was asked for.
      if (!err || err.status !== 404) return failed(err);
    }
    setResumes((list) => list.filter((r) => r.id !== id));
    return { ok: true, switched: wasOpen };
  }, [openResume, switchTo, failed]);

  /* ------------------------------ signing in and out ------------------------------ */

  const beginSession = (nextUser) => {
    stopTimers();
    setMode('loading'); // stop writing to the device straight away
    setSaveState('idle');
    forgetResumes();
    setUser(nextUser);
  };

  const signIn = useCallback(async (credentials) => {
    beginSession(await loginUser(credentials));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const register = useCallback(async (details) => {
    beginSession(await registerUser(details));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOutUser = useCallback(async () => {
    // Push the last changes to the account first (if that fails they stay on this device).
    if (modeRef.current === 'account') {
      await flushSave();
    }
    stopTimers();
    signOut();
    setUser(null);
    setConflict(null);
    forgetResumes();
    setSaveState('idle');
    setMode('local');
    // A signed-out builder shows what is on this device: blank, unless a save failed or a guest draft exists.
    callbacks.current.applyPayload(callbacks.current.readDevice());
  }, [flushSave, setMode, setConflict, forgetResumes]);

  const statusText = {
    saving: 'Saving…',
    saved: 'Saved to your account',
    error: 'Could not save. Retrying…',
    offline: 'Cannot reach your account. Saving on this device.',
    expired: 'Session expired. Saved on this device. Sign in again.',
  }[saveState] || '';

  // The most resumes this account may keep depends on Premium, so the builder asks for it again whenever
  // Premium starts or runs out. A failed check leaves the limit as it was.
  const refreshLimit = useCallback(async () => {
    try {
      const { limit } = await resumeApi.listResumes();
      setResumeLimit(limit);
    } catch {
      /* keep the limit already known */
    }
  }, []);

  return {
    user,
    mode,
    conflict,
    statusText: user || saveState === 'expired' ? statusText : '',
    resumes,
    activeId,
    resumeLimit,
    refreshLimit,
    writesToDevice,
    signIn,
    register,
    signOutUser,
    resolveConflict,
    openResume,
    createNewResume,
    renameResume,
    duplicateResume,
    removeResume,
  };
}
