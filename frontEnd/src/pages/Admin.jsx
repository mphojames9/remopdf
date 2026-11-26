import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import logo1 from '../assets/logo1.webp';
import { getCurrentUser, getToken, loginWithGoogle, signOut, wakeServer } from '../api/auth';
import { friendlyAuthError, getGoogleIdToken, isSignInCancelled } from '../api/googleAuth';
import { deleteUser, getAdminStats, getUserDetail, listUsers, updateUser } from '../api/admin';

/*
  Admin panel, at /admin. It lists the accounts in the database and lets an admin search them, open one, rename it,
  make or remove an admin, suspend or reinstate it, and delete it.

  Nothing here decides who is allowed in: every request goes to /api/admin on the server, which checks the account's
  role in the database each time. This page only reacts to the answer (401 = sign in, 403 = not an admin).
  The first admin is made with ADMIN_EMAILS in server/.env (see server/lib/admins.js).
*/

const FONT = { fontFamily: "'Outfit', ui-sans-serif, system-ui, sans-serif" };
const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------ small helpers ------------------------------ */

const fullName = (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email;
const initialOf = (u) => (u.firstName || u.email || '?').trim().charAt(0).toUpperCase();

const fmtDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';

const fmtDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never';

// "Today", "Yesterday", "5 days ago", then the date once it is more than a month old.
const ago = (value) => {
  if (!value) return 'Never';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(value);
};

const money = (amount, currency) => {
  const value = (Number(amount) || 0) / 100; // the server stores the smallest unit (cents)
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: currency || 'ZAR' }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency || ''}`.trim();
  }
};

const PLAN_NAMES = { '7d': '7 days', '14d': '14 days', '30d': '30 days' };
const planLabel = (plan) => PLAN_NAMES[plan] || (plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : 'Premium');

const number = (value) => Number(value || 0).toLocaleString('en-ZA');

const authLost = (err) => err?.status === 401 || err?.status === 403;

/* ------------------------------ small pieces ------------------------------ */

const TONES = {
  gray: 'border-neutral-200 bg-white text-neutral-600',
  black: 'border-neutral-900 bg-neutral-900 text-white',
  orange: 'border-orange-300 bg-orange-50 text-orange-700',
  red: 'border-red-300 bg-red-50 text-red-700',
};

const Badge = ({ tone = 'gray', children }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}>
    {children}
  </span>
);

const Avatar = ({ user, size = 'h-9 w-9 text-sm' }) => (
  <span className={`grid shrink-0 place-items-center rounded-full border border-neutral-200 bg-neutral-50 font-medium text-neutral-700 ${size}`}>
    {initialOf(user)}
  </span>
);

const UserBadges = ({ user }) => (
  <>
    {user.role === 'admin' && <Badge tone="black">Admin</Badge>}
    {user.disabled && <Badge tone="red">Suspended</Badge>}
  </>
);

const PlanBadge = ({ user }) =>
  user.premium ? <Badge tone="orange">Premium · {user.daysLeft}d</Badge> : <Badge>Free</Badge>;

const StatCard = ({ label, value, tone }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-4">
    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
    <p className={`mt-1 text-3xl font-light ${tone || 'text-neutral-900'}`}>{value === null ? '–' : number(value)}</p>
  </div>
);

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const buttonDark = `${buttonBase} border-neutral-900 bg-neutral-900 text-white hover:bg-black`;
const buttonLight = `${buttonBase} border-neutral-300 bg-white text-neutral-800 hover:border-neutral-900`;
const buttonDanger = `${buttonBase} border-red-300 bg-white text-red-600 hover:border-red-600 hover:bg-red-50`;
const buttonDangerSolid = `${buttonBase} border-red-600 bg-red-600 text-white hover:bg-red-700`;
const inputClass =
  'w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900';

// Full-screen message for "checking", "sign in", "not an admin" and "could not reach the server".
function Gate({ title, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafb] p-4" style={FONT}>
      <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center sm:p-10">
        <img src={logo1} alt="RemoPDF" className="mx-auto mb-6 h-8 w-auto" />
        <h1 className="mb-2 text-2xl font-light tracking-tight text-neutral-900">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ one account, opened ------------------------------ */

function UserDrawer({ id, selfId, onClose, onChanged, onDeleted, onAuthLost, notify }) {
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  useEffect(() => {
    let alive = true;
    getUserDetail(id)
      .then((data) => {
        if (!alive) return;
        setDetail(data);
        setFirst(data.user.firstName);
        setLast(data.user.lastName);
      })
      .catch((err) => {
        if (!alive) return;
        if (authLost(err)) onAuthLost(err.status);
        else setLoadError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [id, onAuthLost]);

  // Escape closes it, and the page behind it stays still while it is open.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const user = detail?.user || null;
  const isSelf = Boolean(user) && user.id === selfId;

  // Runs one change on the account and shows the answer.
  const apply = async (name, changes, doneMessage) => {
    setBusy(name);
    setActionError('');
    try {
      const { user: updated } = await updateUser(id, changes);
      setDetail((current) => ({ ...current, user: updated }));
      setFirst(updated.firstName);
      setLast(updated.lastName);
      onChanged(updated);
      notify(doneMessage);
    } catch (err) {
      if (authLost(err)) onAuthLost(err.status);
      else setActionError(err.message);
    } finally {
      setBusy('');
    }
  };

  const saveName = () => apply('name', { firstName: first, lastName: last }, 'Name updated.');

  const toggleAdmin = () => {
    const makeAdmin = user.role !== 'admin';
    const question = makeAdmin
      ? `Give ${fullName(user)} full admin access? They will be able to manage every account.`
      : `Remove admin access from ${fullName(user)}?`;
    if (!window.confirm(question)) return;
    apply('role', { role: makeAdmin ? 'admin' : 'user' }, makeAdmin ? 'Admin access granted.' : 'Admin access removed.');
  };

  const toggleSuspend = () => {
    const suspend = !user.disabled;
    if (suspend && !window.confirm(`Suspend ${fullName(user)}? They will be signed out and cannot sign in until you reinstate them.`)) return;
    apply('suspend', { disabled: suspend }, suspend ? 'Account suspended.' : 'Account reinstated.');
  };

  const remove = async () => {
    setBusy('delete');
    setActionError('');
    try {
      await deleteUser(id);
      notify('Account deleted.');
      onDeleted(id);
    } catch (err) {
      if (authLost(err)) onAuthLost(err.status);
      else {
        setActionError(err.message);
        setBusy('');
      }
    }
  };

  const nameChanged = Boolean(user) && (first.trim() !== user.firstName || last.trim() !== user.lastName);
  const canDelete = Boolean(user) && !isSelf && user.role !== 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 md:items-center md:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Account details"
        className="flex w-full max-w-2xl flex-col overflow-hidden border border-neutral-200 bg-white md:max-h-[90vh] md:rounded-3xl"
        style={FONT}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-lg font-light tracking-tight text-neutral-900">Account</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {!user && !loadError && <p className="py-10 text-center text-sm text-neutral-500">Loading account…</p>}
          {loadError && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>}

          {user && (
            <div className="space-y-7">
              {/* Who */}
              <div className="flex items-center gap-4">
                <Avatar user={user} size="h-14 w-14 text-xl" />
                <div className="min-w-0">
                  <p className="truncate text-xl font-light text-neutral-900">{fullName(user)}</p>
                  <p className="truncate text-sm text-neutral-500">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <UserBadges user={user} />
                    <PlanBadge user={user} />
                  </div>
                </div>
              </div>

              {/* Facts */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border border-neutral-200 p-4 text-sm">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Joined</dt>
                  <dd className="mt-0.5 text-neutral-900">{fmtDate(user.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Last sign-in</dt>
                  <dd className="mt-0.5 text-neutral-900">{fmtDateTime(user.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Plan</dt>
                  <dd className="mt-0.5 text-neutral-900">
                    {user.premium ? `Premium until ${fmtDate(user.premiumUntil)} (${user.daysLeft} days left)` : 'Free'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Saved resumes</dt>
                  <dd className="mt-0.5 text-neutral-900">{user.resumes}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Email verified</dt>
                  <dd className="mt-0.5 text-neutral-900">{user.emailVerified ? 'Yes' : 'No'}</dd>
                </div>
                {detail.phone && (
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">Phone (unverified)</dt>
                    <dd className="mt-0.5 text-neutral-900">{detail.phone}</dd>
                  </div>
                )}
              </dl>

              {/* Name */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-neutral-900">Name</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={inputClass} value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} placeholder="First name" aria-label="First name" />
                  <input className={inputClass} value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} placeholder="Last name" aria-label="Last name" />
                </div>
                <button type="button" className={`${buttonDark} mt-3`} disabled={!nameChanged || !first.trim() || busy !== ''} onClick={saveName}>
                  {busy === 'name' ? 'Saving…' : 'Save name'}
                </button>
              </section>

              {/* Access */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-neutral-900">Access</h3>
                {isSelf ? (
                  <p className="text-sm text-neutral-500">This is your own account, so its role cannot be changed or suspended here.</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    <button type="button" className={buttonLight} disabled={busy !== '' || (user.role === 'admin' && user.isEnvAdmin)} onClick={toggleAdmin}>
                      {busy === 'role' ? 'Working…' : user.role === 'admin' ? 'Remove admin access' : 'Make admin'}
                    </button>
                    <button
                      type="button"
                      className={user.disabled ? buttonDark : buttonDanger}
                      disabled={busy !== '' || (!user.disabled && user.role === 'admin')}
                      onClick={toggleSuspend}
                    >
                      {busy === 'suspend' ? 'Working…' : user.disabled ? 'Reinstate account' : 'Suspend account'}
                    </button>
                  </div>
                )}
                {!isSelf && user.role === 'admin' && (
                  <p className="mt-3 text-xs text-neutral-500">
                    {user.isEnvAdmin
                      ? 'This address is listed in ADMIN_EMAILS on the server, so remove it from that list to take its admin access away.'
                      : 'Remove admin access before suspending or deleting this account.'}
                  </p>
                )}
              </section>

              {/* Resumes */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-neutral-900">Resumes</h3>
                {detail.resumes.length === 0 ? (
                  <p className="text-sm text-neutral-500">No saved resumes.</p>
                ) : (
                  <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 text-sm">
                    {detail.resumes.map((resume) => (
                      <li key={resume.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="min-w-0 truncate text-neutral-900">{resume.title}</span>
                        <span className="shrink-0 text-xs text-neutral-500">{resume.template ? `${resume.template} · ` : ''}{fmtDate(resume.updatedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Payments */}
              <section>
                <h3 className="mb-3 text-sm font-medium text-neutral-900">Payments</h3>
                {detail.payments.length === 0 ? (
                  <p className="text-sm text-neutral-500">No payments.</p>
                ) : (
                  <ul className="divide-y divide-neutral-200 rounded-2xl border border-neutral-200 text-sm">
                    {detail.payments.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="text-neutral-900">
                            {planLabel(payment.plan)} · {money(payment.amount, payment.currency)}
                          </p>
                          <p className="truncate text-xs text-neutral-500">{fmtDate(payment.paidAt || payment.createdAt)} · {payment.reference}</p>
                        </div>
                        <Badge tone={payment.status === 'success' ? 'black' : payment.status === 'failed' ? 'red' : 'gray'}>{payment.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Delete */}
              <section className="rounded-2xl border border-red-200 p-4">
                <h3 className="text-sm font-medium text-red-700">Delete account</h3>
                {!canDelete ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    {isSelf ? 'You cannot delete your own account here.' : 'Remove admin access before this account can be deleted.'}
                  </p>
                ) : !deleting ? (
                  <>
                    <p className="mt-1 text-xs text-neutral-500">Deletes the account and its saved resumes for good. Payment records are kept.</p>
                    <button type="button" className={`${buttonDanger} mt-3`} disabled={busy !== ''} onClick={() => setDeleting(true)}>
                      Delete account…
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-neutral-600">
                      This cannot be undone. Type <span className="font-medium text-neutral-900">{user.email}</span> to confirm.
                    </p>
                    <input className={`${inputClass} mt-3`} value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={user.email} aria-label="Type the email address to confirm" autoComplete="off" />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button type="button" className={buttonDangerSolid} disabled={busy !== '' || confirmEmail.trim().toLowerCase() !== user.email} onClick={remove}>
                        {busy === 'delete' ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button type="button" className={buttonLight} disabled={busy !== ''} onClick={() => { setDeleting(false); setConfirmEmail(''); }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </section>

              {actionError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ the list ------------------------------ */

const FILTER_TABS = [
  ['all', 'All'],
  ['premium', 'Premium'],
  ['free', 'Free'],
  ['admin', 'Admins'],
  ['suspended', 'Suspended'],
];

function UserManager({ me, stats, refreshStats, onAuthLost, onSignOut }) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState({ search: '', filter: 'all', sort: 'newest', page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const requestId = useRef(0);

  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Typing in the search box waits a moment, then searches from page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      const search = searchText.trim();
      setQuery((current) => (current.search === search ? current : { ...current, search, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Only the newest request may fill the list, so a slow old answer never replaces a newer one.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setListError('');
    try {
      const result = await listUsers(query);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id !== requestId.current) return;
      if (authLost(err)) onAuthLost(err.status);
      else setListError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, onAuthLost]);

  useEffect(() => {
    load();
  }, [load]);

  const closeDrawer = useCallback(() => setOpenId(null), []);

  // An account changed in the drawer: show it in the list straight away, and refresh the numbers at the top.
  const handleChanged = useCallback(
    (user) => {
      setData((current) => (current ? { ...current, items: current.items.map((item) => (item.id === user.id ? { ...item, ...user } : item)) } : current));
      refreshStats();
    },
    [refreshStats]
  );

  const handleDeleted = useCallback(() => {
    setOpenId(null);
    refreshStats();
    load();
  }, [refreshStats, load]);

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const firstShown = total === 0 ? 0 : (query.page - 1) * (data?.limit || 20) + 1;
  const lastShown = firstShown + items.length - (total === 0 ? 0 : 1);

  return (
    <div className="min-h-screen bg-[#fafafb] text-[#0e1726] antialiased" style={FONT}>
      {/* Top bar */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo1} alt="RemoPDF" className="h-7 w-auto" />
            <span className="rounded-full border border-neutral-900 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wider text-neutral-900">Admin</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden max-w-[220px] truncate text-sm text-neutral-500 md:block">{me?.email}</span>
            <Link to="/" className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-800 transition-colors hover:border-neutral-900">Site</Link>
            <button type="button" onClick={onSignOut} className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-800 transition-colors hover:border-neutral-900">Sign out</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-light tracking-tight text-neutral-900">Users</h1>
        <p className="mt-1 text-sm text-neutral-500">Everyone with an account, read live from the database.</p>

        {/* Numbers */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total users" value={stats ? stats.users : null} />
          <StatCard label="Premium" value={stats ? stats.premium : null} tone="text-orange-600" />
          <StatCard label="Free" value={stats ? stats.free : null} />
          <StatCard label="New, 7 days" value={stats ? stats.newLast7Days : null} />
          <StatCard label="Active, 7 days" value={stats ? stats.activeLast7Days : null} />
          <StatCard label="Suspended" value={stats ? stats.suspended : null} tone={stats && stats.suspended > 0 ? 'text-red-600' : undefined} />
        </div>

        {/* Search, sort, filter */}
        <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:w-80 lg:flex-none">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-hidden="true"></i>
              <input className={`${inputClass} pl-9`} type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search users" aria-label="Search users" />
            </div>
            <select
              value={query.sort}
              onChange={(e) => setQuery((current) => ({ ...current, sort: e.target.value, page: 1 }))}
              aria-label="Sort users"
              className="h-[42px] shrink-0 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="recent">Active</option>
              <option value="name">Name</option>
            </select>
            <button type="button" onClick={() => { load(); refreshStats(); }} aria-label="Refresh" className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-neutral-900">
              <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`} aria-hidden="true"></i>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {FILTER_TABS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setQuery((current) => ({ ...current, filter: value, page: 1 }))}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  query.filter === value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {listError && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{listError}</p>
        )}

        {/* List */}
        <div className={`mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
          {!data && loading && <p className="px-4 py-12 text-center text-sm text-neutral-500">Loading users…</p>}
          {data && items.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-neutral-500">{query.search || query.filter !== 'all' ? 'No users match that.' : 'No users yet.'}</p>
          )}

          {items.length > 0 && (
            <>
              {/* Phones: one card per account */}
              <ul className="divide-y divide-neutral-200 md:hidden">
                {items.map((u) => (
                  <li key={u.id}>
                    <button type="button" onClick={() => setOpenId(u.id)} className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-neutral-50">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-900">{fullName(u)}</p>
                          <p className="truncate text-xs text-neutral-500">{u.email}</p>
                        </div>
                        <i className="fa-solid fa-chevron-right text-xs text-neutral-400" aria-hidden="true"></i>
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <PlanBadge user={u} />
                        <UserBadges user={u} />
                        <span className="text-xs text-neutral-500">Joined {fmtDate(u.createdAt)} · Last sign-in: {ago(u.lastLoginAt)}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              {/* Larger screens: a table */}
              <table className="hidden w-full text-left text-sm md:table">
                <thead>
                  <tr className="border-b border-neutral-200 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Last sign-in</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {items.map((u) => (
                    <tr key={u.id} onClick={() => setOpenId(u.id)} className="cursor-pointer transition-colors hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-neutral-900">{fullName(u)}</p>
                            <p className="truncate text-xs text-neutral-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><PlanBadge user={u} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{fmtDate(u.createdAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-neutral-600">{ago(u.lastLoginAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <UserBadges user={u} />
                          {u.role !== 'admin' && !u.disabled && <span className="text-neutral-400">–</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-400"><i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        {/* Pages */}
        {data && total > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-600">
            <p>
              {number(firstShown)}–{number(lastShown)} of {number(total)}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className={buttonLight} disabled={query.page <= 1 || loading} onClick={() => setQuery((c) => ({ ...c, page: c.page - 1 }))}>
                Previous
              </button>
              <span className="px-1 text-xs text-neutral-500">Page {query.page} of {data.pages}</span>
              <button type="button" className={buttonLight} disabled={query.page >= data.pages || loading} onClick={() => setQuery((c) => ({ ...c, page: c.page + 1 }))}>
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {openId && (
        <UserDrawer
          key={openId}
          id={openId}
          selfId={me?.id}
          onClose={closeDrawer}
          onChanged={handleChanged}
          onDeleted={handleDeleted}
          onAuthLost={onAuthLost}
          notify={notify}
        />
      )}

      {toast && (
        <div role="status" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-neutral-900 bg-neutral-900 px-5 py-2.5 text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ the page: who may see it ------------------------------ */

export default function Admin() {
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
        /* the numbers are a bonus: the list still works */
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

  // Called by the list or the account window when the server says the sign-in stopped working mid-session.
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
      <Gate title="Checking access">
        <p className="text-sm text-neutral-500">{slow ? 'The server is waking up. This can take up to a minute.' : 'One moment…'}</p>
      </Gate>
    );
  }

  if (phase === 'signedOut') {
    return (
      <Gate title="Admin sign-in">
        <p className="mb-6 text-sm leading-relaxed text-neutral-500">Sign in with the Gmail account that has admin access.</p>
        <button type="button" onClick={handleSignIn} disabled={signingIn} className={`${buttonDark} w-full`}>
          <i className="fa-brands fa-google" aria-hidden="true"></i>
          {signingIn ? 'Signing in…' : 'Continue with Google'}
        </button>
        {message && <p role="alert" className="mt-4 text-sm text-red-600">{message}</p>}
        <Link to="/" className="mt-6 inline-block text-sm text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">Back to RemoPDF</Link>
      </Gate>
    );
  }

  if (phase === 'forbidden') {
    const email = getCurrentUser()?.email;
    return (
      <Gate title="No admin access">
        <p className="mb-6 text-sm leading-relaxed text-neutral-500">
          {email ? <><span className="text-neutral-800">{email}</span> is not an administrator.</> : 'This account is not an administrator.'} Sign in with a different account, or go back to the site.
        </p>
        <button type="button" onClick={handleSignOut} className={`${buttonDark} w-full`}>Sign out</button>
        <Link to="/" className="mt-6 inline-block text-sm text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">Back to RemoPDF</Link>
      </Gate>
    );
  }

  if (phase === 'error') {
    return (
      <Gate title="Could not load">
        <p className="mb-6 text-sm leading-relaxed text-neutral-500">{message || 'Something went wrong. Please try again.'}</p>
        <button type="button" onClick={() => { setPhase('checking'); setSlow(false); check(); }} className={`${buttonDark} w-full`}>Try again</button>
      </Gate>
    );
  }

  return <UserManager me={getCurrentUser()} stats={stats} refreshStats={refreshStats} onAuthLost={handleAuthLost} onSignOut={handleSignOut} />;
}
