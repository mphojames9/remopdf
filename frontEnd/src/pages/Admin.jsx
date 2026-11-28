import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, getToken, loginWithGoogle, signOut, wakeServer } from '../api/auth';
import { friendlyAuthError, getGoogleIdToken, isSignInCancelled } from '../api/googleAuth';
import { getAdminStats } from '../api/admin';
import Overview from '../components/admin/Overview';
import UsersView from '../components/admin/UsersView';
import UserPanel from '../components/admin/UserPanel';
import { AdminStyles, BrandLogo, FONT, ThemeProvider, ThemeToggle, Toast, buttonDark, fullName, number } from '../components/admin/ui';

/*
  Admin panel, at /admin. Two screens: Overview (numbers, sign-ups, newest accounts) and Users (search, filter, open an
  account to rename it, make or remove an admin, suspend it, delete it, or activate, extend or remove its Premium).
  Premium changes also need the access code (ADMIN_ACCESS_CODE on the server) and every change is confirmed in an
  in-page window. Light and dark theme with a toggle (components/admin/ui.jsx); the RemoPDF logo switches with it:
  logo1.webp (navy and red) on light surfaces, logo.webp (white and red) on dark ones.

  Nothing here decides who is allowed in: every request goes to /api/admin on the server, which checks the account's
  role in the database each time. This page only reacts to the answer (401 = sign in, 403 = not an admin).
  The first admin is made with ADMIN_EMAILS in server/.env (see server/lib/admins.js).
*/

const AdminTag = () => (
  <span className="rounded-full border border-neutral-900 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-neutral-900">Admin</span>
);

/* ------------------------------ the screens around it: checking, sign-in, no access ------------------------------ */

function Gate({ icon, title, children }) {
  return (
    <div className="adm-page flex min-h-screen items-center justify-center p-4" style={FONT}>
      <AdminStyles />
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="adm-pop w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 sm:p-10">
        <div className="mb-8 flex items-center justify-between">
          <BrandLogo className="-my-2 h-12" />
          <AdminTag />
        </div>
        <span className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-xl text-orange-600">
          <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
        </span>
        <h1 className="mb-2 text-3xl font-light tracking-tight text-neutral-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}

const gateText = 'text-sm leading-relaxed text-neutral-500';
const gateLink = 'mt-6 inline-flex items-center gap-2 text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline';

/* ------------------------------ the panel ------------------------------ */

const NAV = [
  ['overview', 'Overview', 'fa-chart-simple'],
  ['users', 'Users', 'fa-users'],
];

function Shell({ me, stats, refreshStats, onAuthLost, onSignOut }) {
  const [view, setView] = useState('overview');
  const [usersStart, setUsersStart] = useState({ filter: 'all', sort: 'newest', key: 0 });
  const [openId, setOpenId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState(null); // { message, tone: 'success' | 'error' }
  const toastTimer = useRef(null);

  const notify = useCallback((message, tone = 'success') => {
    setToast({ message, tone });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3500);
  }, []);
  const closeToast = useCallback(() => setToast(null), []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Opens the Users screen, optionally already filtered or sorted (the numbers on the Overview are links).
  const openUsers = useCallback((filter = 'all', sort = 'newest') => {
    setUsersStart((current) => ({ filter, sort, key: current.key + 1 }));
    setView('users');
    window.scrollTo?.({ top: 0 });
  }, []);

  const showView = (next) => {
    if (next === 'users') openUsers();
    else {
      setView(next);
      window.scrollTo?.({ top: 0 });
    }
  };

  const closePanel = useCallback(() => setOpenId(null), []);

  // An account changed in the panel: the numbers and the lists read the database again.
  const handleChanged = useCallback(() => {
    refreshStats();
    setReloadKey((key) => key + 1);
  }, [refreshStats]);

  const handleDeleted = useCallback(() => {
    setOpenId(null);
    refreshStats();
    setReloadKey((key) => key + 1);
  }, [refreshStats]);

  const refreshAll = useCallback(() => {
    refreshStats();
    setReloadKey((key) => key + 1);
  }, [refreshStats]);

  const counts = { overview: null, users: stats ? stats.users : null };

  return (
    <div className="adm-page min-h-screen text-neutral-900 antialiased lg:flex" style={FONT}>
      <AdminStyles />

      {/* Sidebar: larger screens */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center justify-between gap-2 px-1 pb-5 pt-1">
          <BrandLogo className="-my-1.5 h-11" />
          <AdminTag />
        </div>

        <nav className="space-y-1" aria-label="Admin sections">
          {NAV.map(([value, label, icon]) => {
            const active = view === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => showView(value)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}
              >
                <i className={`fa-solid ${icon} w-4 text-center ${active ? 'text-orange-500' : ''}`} aria-hidden="true"></i>
                <span className="flex-1 text-left">{label}</span>
                {counts[value] !== null && (
                  <span className={`rounded-full px-2 text-[11px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{number(counts[value])}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-1">
          <Link to="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
            <i className="fa-solid fa-arrow-up-right-from-square w-4 text-center text-xs" aria-hidden="true"></i>
            Back to RemoPDF
          </Link>
          <ThemeToggle variant="switch" />
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-medium text-[#111]">{(me?.firstName || me?.email || 'A').trim().charAt(0).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-neutral-900">{me ? fullName(me) : 'Admin'}</p>
              <p className="truncate text-xs text-neutral-500">{me?.email}</p>
            </div>
            <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900">
              <i className="fa-solid fa-right-from-bracket" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar: phones and tablets */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo className="-my-1.5 h-10" />
            <AdminTag />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link to="/" aria-label="Back to RemoPDF" className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-700 transition-colors hover:border-neutral-900">
              <i className="fa-solid fa-arrow-up-right-from-square text-sm" aria-hidden="true"></i>
            </Link>
            <button type="button" onClick={onSignOut} aria-label="Sign out" className="grid h-10 w-10 place-items-center rounded-xl border border-neutral-200 text-neutral-700 transition-colors hover:border-neutral-900">
              <i className="fa-solid fa-right-from-bracket text-sm" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {view === 'overview' ? (
            <Overview me={me} stats={stats} reloadKey={reloadKey} onOpenUsers={openUsers} onOpenUser={setOpenId} onAuthLost={onAuthLost} />
          ) : (
            <UsersView
              key={usersStart.key}
              stats={stats}
              initialFilter={usersStart.filter}
              initialSort={usersStart.sort}
              reloadKey={reloadKey}
              onOpenUser={setOpenId}
              onRefresh={refreshAll}
              onAuthLost={onAuthLost}
            />
          )}
        </main>
      </div>

      {/* Bottom tabs: phones and tablets */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-neutral-200 bg-white lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} aria-label="Admin sections">
        {NAV.map(([value, label, icon]) => {
          const active = view === value;
          return (
            <button key={value} type="button" onClick={() => showView(value)} aria-current={active ? 'page' : undefined} className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? 'text-neutral-950' : 'text-neutral-500'}`}>
              {active && <span className="absolute inset-x-8 top-0 h-0.5 rounded-b-full bg-orange-500" />}
              <i className={`fa-solid ${icon} text-base ${active ? 'text-orange-500' : ''}`} aria-hidden="true"></i>
              {label}
            </button>
          );
        })}
      </nav>

      {openId && (
        <UserPanel
          key={openId}
          id={openId}
          selfId={me?.id}
          premiumReady={Boolean(stats?.premiumTools)}
          maxBankedDays={stats?.maxBankedDays || 90}
          onClose={closePanel}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
          onAuthLost={onAuthLost}
          notify={notify}
        />
      )}

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}

/* ------------------------------ the page: who may see it ------------------------------ */

// The theme lives above everything, so the sign-in screens and the panel share it.
export default function Admin() {
  return (
    <ThemeProvider>
      <AdminPage />
    </ThemeProvider>
  );
}

function AdminPage() {
  // 'checking' | 'signedOut' | 'forbidden' | 'error' | 'ready'
  const [phase, setPhase] = useState('checking');
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [slow, setSlow] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const refreshStats = useCallback(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {
        /* the numbers are a bonus: the lists still work */
      });
  }, []);

  // Asks the server whether this sign-in is an admin's. The server is the only judge.
  const check = useCallback(async () => {
    if (!getToken()) {
      setPhase('signedOut');
      return;
    }
    // Render's free plan sleeps; wait for it to wake instead of showing an error.
    await wakeServer({ onSlow: () => setSlow(true) });
    try {
      setStats(await getAdminStats());
      setPhase('ready');
    } catch (err) {
      if (err.status === 401) {
        signOut(); // the saved sign-in no longer works
        setPhase('signedOut');
      } else if (err.status === 403) {
        setPhase('forbidden');
      } else {
        setMessage(err.message);
        setPhase('error');
      }
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  // Called when the server says the sign-in stopped working mid-session.
  const handleAuthLost = useCallback((status) => {
    if (status === 401) {
      signOut();
      setPhase('signedOut');
    } else {
      setPhase('forbidden');
    }
  }, []);

  const handleSignIn = async () => {
    setSigningIn(true);
    setMessage('');
    try {
      const idToken = await getGoogleIdToken(); // straight from the click, or the browser blocks the pop-up
      await loginWithGoogle(idToken);
      setPhase('checking');
      await check();
    } catch (err) {
      if (!isSignInCancelled(err)) setMessage(friendlyAuthError(err));
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = () => {
    signOut();
    setStats(null);
    setPhase('signedOut');
  };

  if (phase === 'checking') {
    return (
      <Gate icon="fa-shield-halved" title="Checking access">
        <p className={gateText}>{slow ? 'The server is waking up. This can take up to a minute.' : 'One moment…'}</p>
        <div className="mt-6 h-1 overflow-hidden rounded-full bg-neutral-200"><div className="h-full w-1/3 animate-pulse rounded-full bg-orange-500" /></div>
      </Gate>
    );
  }

  if (phase === 'signedOut') {
    return (
      <Gate icon="fa-lock" title="Admin sign-in">
        <p className={`mb-7 ${gateText}`}>Sign in with the Gmail account that has admin access.</p>
        <button type="button" onClick={handleSignIn} disabled={signingIn} className={`${buttonDark} w-full py-3`}>
          <i className="fa-brands fa-google" aria-hidden="true"></i>
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>
        {message && <p role="alert" className="mt-4 text-sm text-red-600">{message}</p>}
        <Link to="/" className={gateLink}><i className="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>Back to RemoPDF</Link>
      </Gate>
    );
  }

  if (phase === 'forbidden') {
    const email = getCurrentUser()?.email;
    return (
      <Gate icon="fa-ban" title="No admin access">
        <p className={`mb-7 ${gateText}`}>
          {email ? <><span className="text-neutral-800">{email}</span> is not an administrator.</> : 'This account is not an administrator.'} Sign in with a different account, or go back to the site.
        </p>
        <button type="button" onClick={handleSignOut} className={`${buttonDark} w-full py-3`}>Sign out</button>
        <Link to="/" className={gateLink}><i className="fa-solid fa-arrow-left text-xs" aria-hidden="true"></i>Back to RemoPDF</Link>
      </Gate>
    );
  }

  if (phase === 'error') {
    return (
      <Gate icon="fa-triangle-exclamation" title="Could not load">
        <p className={`mb-7 ${gateText}`}>{message || 'Something went wrong. Please try again.'}</p>
        <button type="button" onClick={() => { setPhase('checking'); setSlow(false); check(); }} className={`${buttonDark} w-full py-3`}>Try again</button>
      </Gate>
    );
  }

  return <Shell me={getCurrentUser()} stats={stats} refreshStats={refreshStats} onAuthLost={handleAuthLost} onSignOut={handleSignOut} />;
}
