import { useCallback, useEffect, useRef, useState } from 'react';
import { deleteUser, getUserDetail, grantPremium, removePremium, updateUser } from '../../api/admin';
import {
  Alert,
  Avatar,
  Badge,
  ConfirmDialog,
  DAY_MS,
  Dialog,
  FONT,
  PlanBadge,
  Skeleton,
  UserBadges,
  authLost,
  buttonDanger,
  buttonDangerSolid,
  buttonDark,
  buttonLight,
  fieldLabel,
  fmtDate,
  fmtDateShort,
  fmtDateTime,
  fullName,
  inputClass,
  money,
  planLabel,
} from './ui';

/*
  One account, opened from the Overview or the Users screen. A panel that slides in from the right (full screen on phones)
  with three tabs: Overview (details and resumes), Premium (status, add or remove days, payment history) and Manage
  (name, admin access, suspending, deleting). Every change is confirmed in an in-page window and answered with a message.
  Changing Premium needs the access code (ADMIN_ACCESS_CODE on the server).
*/

/* ------------------------------ confirmation windows that need more than a button ------------------------------ */

function DeleteDialog({ user, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  return (
    <ConfirmDialog
      title="Delete this account?"
      icon="fa-trash"
      iconTone="red"
      confirmLabel="Delete permanently"
      busyLabel="Deleting…"
      confirmClass={buttonDangerSolid}
      disabled={typed.trim().toLowerCase() !== user.email.toLowerCase()}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <p>
        This permanently deletes <span className="font-medium text-neutral-900">{fullName(user)}</span> and their saved resumes. It cannot be undone. Payment records are kept.
      </p>
      <label className="block">
        <span className={fieldLabel}>
          Type <span className="font-semibold text-neutral-900">{user.email}</span> to confirm
        </span>
        <input data-autofocus className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={user.email} autoComplete="off" spellCheck={false} />
      </label>
    </ConfirmDialog>
  );
}

// Adds Premium days (mode "grant") or ends Premium now (mode "revoke"). Both ask for the access code.
function PremiumDialog({ mode, user, id, onCancel, onDone, onAuthLost }) {
  const isGrant = mode === 'grant';
  const room = user.canAddDays;
  const [days, setDays] = useState(String(Math.min(30, Math.max(1, room))));
  const [note, setNote] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef(null);

  const count = Number(days);
  const validDays = Number.isInteger(count) && count >= 1 && count <= room;
  const startsFrom = user.premium && user.premiumUntil ? new Date(user.premiumUntil).getTime() : Date.now();
  const name = fullName(user);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      const detail = isGrant ? await grantPremium(id, { days: count, note, accessCode: code }) : await removePremium(id, { note, accessCode: code });
      onDone(detail, isGrant ? `${count} Premium ${count === 1 ? 'day' : 'days'} added for ${name}.` : `Premium removed for ${name}.`);
    } catch (err) {
      if (authLost(err)) {
        onAuthLost(err.status);
        return;
      }
      setError(err.message || 'Something went wrong. Please try again.');
      if (err.code === 'ACCESS_CODE') {
        setCode('');
        codeRef.current?.focus();
      }
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={isGrant ? (user.premium ? 'Add Premium days' : 'Activate Premium') : 'Remove Premium?'}
      icon={isGrant ? 'fa-crown' : 'fa-triangle-exclamation'}
      iconTone={isGrant ? 'orange' : 'red'}
      confirmLabel={isGrant ? (validDays ? `Add ${count} ${count === 1 ? 'day' : 'days'}` : 'Add days') : 'Remove Premium'}
      busyLabel={isGrant ? 'Adding…' : 'Removing…'}
      confirmClass={isGrant ? buttonDark : buttonDangerSolid}
      disabled={code.trim() === '' || (isGrant && !validDays)}
      busy={busy}
      error={error}
      onConfirm={submit}
      onCancel={onCancel}
    >
      {isGrant ? (
        <>
          <p>
            {user.premium
              ? `${name} has ${user.daysLeft} ${user.daysLeft === 1 ? 'day' : 'days'} of Premium left. The new days start when those end.`
              : `${name} is on the free plan. Premium starts straight away.`}
          </p>
          <div>
            <span className={fieldLabel}>Number of days</span>
            <div className="mb-2 flex flex-wrap gap-2">
              {[7, 14, 30, 60, 90].filter((d) => d <= room).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(String(d))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${count === d ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-700 hover:border-neutral-900'}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <input data-autofocus className={inputClass} type="number" inputMode="numeric" min={1} max={room} value={days} onChange={(e) => setDays(e.target.value)} aria-label="Number of days" />
            <p className="mt-1.5 text-xs text-neutral-500">Up to {room} more {room === 1 ? 'day' : 'days'} can be added right now.</p>
          </div>
          {validDays && (
            <p className="rounded-xl border border-orange-200 bg-orange-50 px-3.5 py-3 text-orange-800">
              Premium will run until <span className="font-medium">{fmtDate(startsFrom + count * DAY_MS)}</span>.
            </p>
          )}
          {days !== '' && !validDays && <Alert tone="warning">Enter a whole number from 1 to {room}.</Alert>}
        </>
      ) : (
        <Alert tone="warning">
          This ends Premium for <span className="font-medium">{name}</span> right now and cancels the {user.daysLeft} {user.daysLeft === 1 ? 'day' : 'days'} they have left. Their payment records are kept and marked as removed.
        </Alert>
      )}

      <label className="block">
        <span className={fieldLabel}>Reason (optional)</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder={isGrant ? 'e.g. Beta tester' : 'e.g. Refunded'} autoComplete="off" />
      </label>

      <label className="block">
        <span className={fieldLabel}>Your access code</span>
        <input
          ref={codeRef}
          data-autofocus={isGrant ? undefined : ''}
          className={inputClass}
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Needed to change Premium"
          autoComplete="new-password"
          spellCheck={false}
        />
      </label>
    </Dialog>
  );
}

/* ------------------------------ small layout pieces ------------------------------ */

const TABS = [
  ['overview', 'Overview', 'fa-id-card'],
  ['premium', 'Premium', 'fa-crown'],
  ['manage', 'Manage', 'fa-sliders'],
];

const Card = ({ className = '', children }) => <div className={`rounded-2xl border border-neutral-200 bg-white ${className}`}>{children}</div>;
const SectionTitle = ({ children }) => <h3 className="mb-3 text-sm font-medium text-neutral-900">{children}</h3>;

// One line of a details list: a label on the left, the value on the right.
const Detail = ({ label, children }) => (
  <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
    <dt className="shrink-0 text-neutral-500">{label}</dt>
    <dd className="min-w-0 break-words text-right text-neutral-900">{children}</dd>
  </div>
);

// One row of a settings list: what it is, what it does, and the button.
const SettingRow = ({ title, description, children }) => (
  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{description}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

function PaymentRow({ payment }) {
  const kind = payment.revoked ? 'removed' : payment.byAdmin ? 'gift' : payment.status;
  const chip = {
    removed: 'bg-red-50 text-red-600',
    gift: 'bg-orange-100 text-orange-600',
    success: 'bg-neutral-900 text-white',
    failed: 'bg-red-50 text-red-600',
    pending: 'bg-neutral-100 text-neutral-600',
  }[kind] || 'bg-neutral-100 text-neutral-600';
  const icon = { removed: 'fa-ban', gift: 'fa-gift', success: 'fa-credit-card', failed: 'fa-xmark', pending: 'fa-clock' }[kind] || 'fa-credit-card';

  return (
    <li className="flex items-start gap-3 px-4 py-3.5">
      <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm ${chip}`}>
        <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-neutral-900">
          {payment.byAdmin ? `Admin gift · ${payment.accessDays} ${payment.accessDays === 1 ? 'day' : 'days'}` : `${planLabel(payment.plan)} · ${money(payment.amount, payment.currency)}`}
        </p>
        <p className="truncate text-xs text-neutral-500">{fmtDate(payment.paidAt || payment.createdAt)} · {payment.reference}</p>
        {payment.note && <p className="mt-1 text-xs text-neutral-500">“{payment.note}”</p>}
      </div>
      {payment.revoked ? <Badge tone="red">Removed</Badge> : <Badge tone={payment.status === 'success' ? 'black' : payment.status === 'failed' ? 'red' : 'gray'}>{payment.status}</Badge>}
    </li>
  );
}

/* ------------------------------ the panel ------------------------------ */

export default function UserPanel({ id, selfId, premiumReady, maxBankedDays, onClose, onChanged, onDeleted, onAuthLost, notify }) {
  const [detail, setDetail] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  // Which confirmation window is open: 'admin' | 'suspend' | 'delete' | 'grant' | 'revoke' | null
  const [dialog, setDialog] = useState(null);
  const closeDialog = useCallback(() => setDialog(null), []);

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

  // Escape closes it (a confirmation window on top catches Escape first), and the page behind stays still while it is open.
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
  const name = user ? fullName(user) : '';

  // Runs one change on the account. Throws when it fails so the window that asked can show why.
  const apply = async (changes, doneMessage) => {
    try {
      const { user: updated } = await updateUser(id, changes);
      setDetail((current) => ({ ...current, user: updated }));
      setFirst(updated.firstName);
      setLast(updated.lastName);
      onChanged(updated);
      notify(doneMessage);
    } catch (err) {
      if (authLost(err)) {
        onAuthLost(err.status);
        return;
      }
      throw err;
    }
  };

  // Used by the confirmation windows: change, then close the window.
  const applyAndClose = async (changes, doneMessage) => {
    await apply(changes, doneMessage);
    setDialog(null);
  };

  const saveName = async () => {
    setSaving(true);
    try {
      await apply({ firstName: first, lastName: last }, 'Name updated.');
    } catch (err) {
      notify(err.message || 'Could not save the name.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await deleteUser(id);
    } catch (err) {
      if (authLost(err)) {
        onAuthLost(err.status);
        return;
      }
      throw err;
    }
    setDialog(null);
    notify('Account deleted.');
    onDeleted(id);
  };

  // A premium change came back: show the new account, payments and all.
  const premiumDone = (fresh, message) => {
    setDetail(fresh);
    onChanged(fresh.user);
    setDialog(null);
    notify(message);
  };

  const nameChanged = Boolean(user) && (first.trim() !== user.firstName || last.trim() !== user.lastName);
  const canDelete = Boolean(user) && !isSelf && user.role !== 'admin';
  const daysShare = user ? Math.min(100, Math.round((user.daysLeft / maxBankedDays) * 100)) : 0;

  return (
    <div className="adm-fade fixed inset-0 z-50 bg-black/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Account details"
        className="adm-slide absolute inset-y-0 right-0 flex w-full flex-col bg-white sm:max-w-[560px] sm:border-l sm:border-neutral-200"
        style={FONT}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3.5">
          <h2 className="text-base font-light tracking-tight text-neutral-900">Account</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900">
            <i className="fa-solid fa-xmark" aria-hidden="true"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!user && !loadError && (
            <div className="space-y-5 p-5">
              <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-60" /></div></div>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {loadError && <div className="p-5"><Alert>{loadError}</Alert></div>}

          {user && (
            <>
              {/* Who */}
              <div className="px-5 pb-5 pt-6">
                <div className="flex items-center gap-4">
                  <Avatar user={user} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-2xl font-light tracking-tight text-neutral-900">{name}</p>
                    <p className="truncate text-sm text-neutral-500">{user.email}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <UserBadges user={user} />
                      <PlanBadge user={user} />
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    ['Joined', fmtDateShort(user.createdAt)],
                    ['Last sign-in', fmtDateShort(user.lastLoginAt)],
                    ['Resumes', String(user.resumes)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
                      <p className="mt-0.5 truncate text-sm text-neutral-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div role="tablist" className="sticky top-0 z-10 flex gap-1 border-b border-neutral-200 bg-white px-3 sm:px-5">
                {TABS.map(([value, label, icon]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setTab(value)}
                    className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm transition-colors ${
                      tab === value ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <i className={`fa-solid ${icon} text-xs ${tab === value && value === 'premium' ? 'text-orange-500' : ''}`} aria-hidden="true"></i>
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-6 p-5" key={tab}>
                {/* ---------- Overview ---------- */}
                {tab === 'overview' && (
                  <>
                    <section>
                      <SectionTitle>Details</SectionTitle>
                      <Card>
                        <dl className="divide-y divide-neutral-200">
                          <Detail label="Email">{user.email}</Detail>
                          <Detail label="Email verified">{user.emailVerified ? <Badge tone="black">Verified</Badge> : <Badge>Not verified</Badge>}</Detail>
                          {detail.phone && <Detail label="Phone (unverified)">{detail.phone}</Detail>}
                          <Detail label="Joined">{fmtDateTime(user.createdAt)}</Detail>
                          <Detail label="Last sign-in">{fmtDateTime(user.lastLoginAt)}</Detail>
                          <Detail label="Plan">{user.premium ? `Premium until ${fmtDate(user.premiumUntil)}` : 'Free'}</Detail>
                        </dl>
                      </Card>
                    </section>

                    <section>
                      <SectionTitle>Resumes</SectionTitle>
                      {detail.resumes.length === 0 ? (
                        <Card className="px-4 py-8 text-center text-sm text-neutral-500">No saved resumes yet.</Card>
                      ) : (
                        <Card>
                          <ul className="divide-y divide-neutral-200">
                            {detail.resumes.map((resume) => (
                              <li key={resume.id} className="flex items-center gap-3 px-4 py-3.5 text-sm">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-600"><i className="fa-solid fa-file-lines" aria-hidden="true"></i></span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-neutral-900">{resume.title}</p>
                                  <p className="text-xs text-neutral-500">{resume.template ? `${resume.template} · ` : ''}Edited {fmtDate(resume.updatedAt)}</p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </Card>
                      )}
                    </section>
                  </>
                )}

                {/* ---------- Premium ---------- */}
                {tab === 'premium' && (
                  <>
                    <Card className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium text-neutral-500">Current plan</p>
                          <p className="mt-1 text-3xl font-light tracking-tight text-neutral-900">{user.premium ? 'Premium' : 'Free'}</p>
                        </div>
                        <span className={`grid h-11 w-11 place-items-center rounded-2xl text-lg ${user.premium ? 'bg-orange-100 text-orange-600' : 'bg-neutral-100 text-neutral-400'}`}>
                          <i className="fa-solid fa-crown" aria-hidden="true"></i>
                        </span>
                      </div>

                      <div className="mt-5">
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-neutral-200">
                          <div className="bg-orange-500 transition-all duration-500" style={{ width: `${daysShare}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
                          <span>{user.premium ? `${user.daysLeft} ${user.daysLeft === 1 ? 'day' : 'days'} left` : 'No Premium days'}</span>
                          <span>{user.premium ? `Until ${fmtDate(user.premiumUntil)}` : `Up to ${maxBankedDays} days can be added`}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <button type="button" className={buttonDark} disabled={!premiumReady || user.canAddDays < 1} onClick={() => setDialog('grant')}>
                          <i className="fa-solid fa-plus text-xs" aria-hidden="true"></i>
                          {user.premium ? 'Add days' : 'Activate Premium'}
                        </button>
                        {user.premium && (
                          <button type="button" className={buttonDanger} disabled={!premiumReady} onClick={() => setDialog('revoke')}>
                            Remove Premium
                          </button>
                        )}
                      </div>

                      {!premiumReady ? (
                        <Alert tone="info" className="mt-4">
                          Premium tools are switched off. Add <span className="font-mono text-xs">ADMIN_ACCESS_CODE</span> to the server settings to turn them on.
                        </Alert>
                      ) : (
                        <p className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                          <i className="fa-solid fa-lock" aria-hidden="true"></i>
                          {user.canAddDays < 1 ? `Already at the ${maxBankedDays}-day maximum. ` : ''}Changing Premium needs your access code.
                        </p>
                      )}
                    </Card>

                    <section>
                      <SectionTitle>Payment history</SectionTitle>
                      {detail.payments.length === 0 ? (
                        <Card className="px-4 py-8 text-center text-sm text-neutral-500">No payments yet.</Card>
                      ) : (
                        <Card>
                          <ul className="divide-y divide-neutral-200">
                            {detail.payments.map((payment) => (
                              <PaymentRow key={payment.id} payment={payment} />
                            ))}
                          </ul>
                        </Card>
                      )}
                    </section>
                  </>
                )}

                {/* ---------- Manage ---------- */}
                {tab === 'manage' && (
                  <>
                    <section>
                      <SectionTitle>Name</SectionTitle>
                      <Card className="p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block"><span className={fieldLabel}>First name</span><input className={inputClass} value={first} onChange={(e) => setFirst(e.target.value)} maxLength={60} /></label>
                          <label className="block"><span className={fieldLabel}>Last name</span><input className={inputClass} value={last} onChange={(e) => setLast(e.target.value)} maxLength={60} /></label>
                        </div>
                        <button type="button" className={`${buttonDark} mt-4`} disabled={!nameChanged || !first.trim() || saving} onClick={saveName}>
                          {saving ? 'Saving…' : 'Save name'}
                        </button>
                      </Card>
                    </section>

                    <section>
                      <SectionTitle>Access</SectionTitle>
                      {isSelf ? (
                        <Alert tone="info">This is your own account, so its role cannot be changed or suspended here.</Alert>
                      ) : (
                        <Card>
                          <div className="divide-y divide-neutral-200">
                            <SettingRow title="Admin access" description="An admin can use this panel and manage every account.">
                              <button type="button" className={buttonLight} disabled={user.role === 'admin' && user.isEnvAdmin} onClick={() => setDialog('admin')}>
                                {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                              </button>
                            </SettingRow>
                            <SettingRow title="Account status" description={user.disabled ? 'Suspended. This person cannot sign in.' : 'Active. Suspending signs this person out everywhere.'}>
                              <button type="button" className={user.disabled ? buttonDark : buttonDanger} disabled={!user.disabled && user.role === 'admin'} onClick={() => setDialog('suspend')}>
                                {user.disabled ? 'Reinstate' : 'Suspend'}
                              </button>
                            </SettingRow>
                          </div>
                        </Card>
                      )}
                      {!isSelf && user.role === 'admin' && (
                        <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                          {user.isEnvAdmin
                            ? 'This address is listed in ADMIN_EMAILS on the server, so remove it from that list to take its admin access away.'
                            : 'Remove admin access before suspending or deleting this account.'}
                        </p>
                      )}
                    </section>

                    <section>
                      <SectionTitle>Danger zone</SectionTitle>
                      <div className="rounded-2xl border border-red-200 bg-white">
                        <SettingRow
                          title="Delete account"
                          description={
                            canDelete
                              ? 'Deletes the account and its saved resumes for good. Payment records are kept.'
                              : isSelf
                                ? 'You cannot delete your own account here.'
                                : 'Remove admin access before this account can be deleted.'
                          }
                        >
                          <button type="button" className={buttonDanger} disabled={!canDelete} onClick={() => setDialog('delete')}>
                            Delete…
                          </button>
                        </SettingRow>
                      </div>
                    </section>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Confirmation windows */}
      {user && dialog === 'admin' && (
        <ConfirmDialog
          title={user.role === 'admin' ? 'Remove admin access?' : 'Make this person an admin?'}
          icon="fa-user-shield"
          iconTone={user.role === 'admin' ? 'orange' : 'dark'}
          confirmLabel={user.role === 'admin' ? 'Remove admin access' : 'Make admin'}
          busyLabel="Saving…"
          onConfirm={() => (user.role === 'admin' ? applyAndClose({ role: 'user' }, `${name} is no longer an admin.`) : applyAndClose({ role: 'admin' }, `${name} is now an admin.`))}
          onCancel={closeDialog}
        >
          {user.role === 'admin' ? (
            <p><span className="font-medium text-neutral-900">{name}</span> will lose access to this admin panel straight away.</p>
          ) : (
            <p><span className="font-medium text-neutral-900">{name}</span> will be able to see every account, and to suspend, delete and make other people admins. Only do this for someone you trust.</p>
          )}
        </ConfirmDialog>
      )}

      {user && dialog === 'suspend' && (
        <ConfirmDialog
          title={user.disabled ? 'Reinstate this account?' : 'Suspend this account?'}
          icon={user.disabled ? 'fa-user-check' : 'fa-ban'}
          iconTone={user.disabled ? 'dark' : 'red'}
          confirmLabel={user.disabled ? 'Reinstate account' : 'Suspend account'}
          busyLabel="Saving…"
          confirmClass={user.disabled ? buttonDark : buttonDangerSolid}
          onConfirm={() => (user.disabled ? applyAndClose({ disabled: false }, `${name} was reinstated.`) : applyAndClose({ disabled: true }, `${name} was suspended.`))}
          onCancel={closeDialog}
        >
          {user.disabled ? (
            <p><span className="font-medium text-neutral-900">{name}</span> will be able to sign in again straight away.</p>
          ) : (
            <p><span className="font-medium text-neutral-900">{name}</span> will be signed out everywhere and cannot sign in until you reinstate the account. Nothing is deleted.</p>
          )}
        </ConfirmDialog>
      )}

      {user && dialog === 'delete' && <DeleteDialog user={user} onConfirm={remove} onCancel={closeDialog} />}

      {user && (dialog === 'grant' || dialog === 'revoke') && (
        <PremiumDialog mode={dialog} user={user} id={id} onCancel={closeDialog} onDone={premiumDone} onAuthLost={onAuthLost} />
      )}
    </div>
  );
}
