import { useEffect, useState } from 'react';
import { listUsers } from '../../api/admin';
import { Alert, Avatar, Skeleton, UserBadges, PlanBadge, ago, authLost, fullName, number } from './ui';

/*
  The first screen: the numbers that matter, new sign-ups for the last two weeks, how many people are on Premium, and the
  newest accounts. Everything here can be clicked through to the Users screen (or straight to one account).
*/

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const KPI_TONES = {
  dark: 'bg-neutral-900 text-white',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-50 text-red-600',
  neutral: 'bg-neutral-100 text-neutral-700',
};

function Kpi({ icon, tone, label, value, hint, onClick, delay = 0 }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`adm-rise block w-full rounded-2xl border border-neutral-200 bg-white p-4 text-left transition-colors sm:p-5 ${onClick ? 'hover:border-neutral-900' : ''}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm ${KPI_TONES[tone]}`}>
          <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
        </span>
      </div>
      <div className="mt-3 text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl">
        {value === null ? <Skeleton className="h-9 w-16" /> : number(value)}
      </div>
      <p className="mt-1 min-h-4 text-xs text-neutral-500">{hint}</p>
    </Tag>
  );
}

const dayLabel = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', timeZone: 'UTC' });

function SignupsCard({ data }) {
  const total = data ? data.reduce((sum, day) => sum + day.count, 0) : 0;
  const max = data ? Math.max(1, ...data.map((day) => day.count)) : 1;

  return (
    <section className="adm-rise rounded-2xl border border-neutral-200 bg-white p-5 lg:col-span-2" style={{ animationDelay: '160ms' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-light tracking-tight text-neutral-900">New sign-ups</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Accounts created each day, last 14 days</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-light tracking-tight text-neutral-900">{data ? number(total) : '–'}</p>
          <p className="text-xs text-neutral-500">in total</p>
        </div>
      </div>

      {!data ? (
        <Skeleton className="mt-6 h-44 w-full" />
      ) : (
        <>
          <div className="mt-6 flex h-40 items-stretch gap-1.5 sm:gap-2" role="img" aria-label={`${total} new accounts in the last 14 days`}>
            {data.map((day, index) => {
              const today = index === data.length - 1;
              const height = day.count === 0 ? 3 : Math.max(8, Math.round((day.count / max) * 100));
              return (
                <div key={day.date} className="flex min-w-0 flex-1 items-end pt-4" title={`${dayLabel(day.date)}: ${day.count}`}>
                  <div className={`relative w-full rounded-t-md transition-all ${today ? 'bg-orange-500' : day.count ? 'bg-neutral-900' : 'bg-neutral-200'}`} style={{ height: `${height}%` }}>
                    {day.count > 0 && <span className="absolute inset-x-0 -top-4 text-center text-[10px] tabular-nums text-neutral-500">{day.count}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5 sm:gap-2" aria-hidden="true">
            {data.map((day, index) => (
              <span key={day.date} className={`min-w-0 flex-1 text-center text-[10px] text-neutral-400 ${index % 2 === 1 ? 'invisible sm:visible' : ''}`}>
                {Number(day.date.slice(8))}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PlansCard({ stats, onOpenUsers }) {
  const total = stats?.users || 0;
  const share = total ? Math.round(((stats?.premium || 0) / total) * 100) : 0;
  const rows = [
    { label: 'Admins', value: stats?.admins, filter: 'admin', icon: 'fa-user-shield' },
    { label: 'Suspended', value: stats?.suspended, filter: 'suspended', icon: 'fa-ban' },
  ];

  return (
    <section className="adm-rise rounded-2xl border border-neutral-200 bg-white p-5" style={{ animationDelay: '220ms' }}>
      <h2 className="text-lg font-light tracking-tight text-neutral-900">Plans</h2>
      <p className="mt-0.5 text-xs text-neutral-500">How many people are on Premium</p>

      <div className="mt-5 flex items-end gap-2">
        <span className="text-4xl font-light tracking-tight text-neutral-900">{stats ? `${share}%` : '–'}</span>
        <span className="pb-1 text-sm text-neutral-500">on Premium</span>
      </div>
      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-neutral-200">
        <div className="bg-orange-500 transition-all duration-500" style={{ width: `${share}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" />Premium {stats ? number(stats.premium) : '–'}</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" />Free {stats ? number(stats.free) : '–'}</span>
      </div>

      <div className="mt-5 divide-y divide-neutral-200 border-t border-neutral-200">
        {rows.map((row) => (
          <button key={row.filter} type="button" onClick={() => onOpenUsers(row.filter)} className="flex w-full items-center gap-3 py-3 text-left text-sm transition-colors hover:text-neutral-900">
            <i className={`fa-solid ${row.icon} w-4 text-center text-neutral-400`} aria-hidden="true"></i>
            <span className="flex-1 text-neutral-700">{row.label}</span>
            <span className="font-medium text-neutral-900">{stats ? number(row.value) : '–'}</span>
            <i className="fa-solid fa-chevron-right text-[10px] text-neutral-400" aria-hidden="true"></i>
          </button>
        ))}
      </div>
    </section>
  );
}

function LatestSignups({ reloadKey, onOpenUser, onOpenUsers, onAuthLost }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    listUsers({ sort: 'newest', limit: 5 })
      .then((result) => {
        if (!alive) return;
        setItems(result.items);
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        if (authLost(err)) onAuthLost(err.status);
        else setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [reloadKey, onAuthLost]);

  return (
    <section className="adm-rise rounded-2xl border border-neutral-200 bg-white" style={{ animationDelay: '280ms' }}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="text-lg font-light tracking-tight text-neutral-900">Latest sign-ups</h2>
          <p className="mt-0.5 text-xs text-neutral-500">The five newest accounts</p>
        </div>
        <button type="button" onClick={() => onOpenUsers('all')} className="flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-800 transition-colors hover:border-neutral-900">
          View all <i className="fa-solid fa-arrow-right text-xs" aria-hidden="true"></i>
        </button>
      </div>

      {error && <div className="px-5 pb-5"><Alert>{error}</Alert></div>}
      {!items && !error && (
        <div className="divide-y divide-neutral-200 border-t border-neutral-200">
          {[0, 1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-56 max-w-full" /></div>
            </div>
          ))}
        </div>
      )}
      {items && items.length === 0 && <p className="border-t border-neutral-200 px-5 py-10 text-center text-sm text-neutral-500">No accounts yet.</p>}
      {items && items.length > 0 && (
        <ul className="divide-y divide-neutral-200 border-t border-neutral-200">
          {items.map((user) => (
            <li key={user.id}>
              <button type="button" onClick={() => onOpenUser(user.id)} className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50">
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{fullName(user)}</p>
                  <p className="truncate text-xs text-neutral-500">{user.email}</p>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex"><UserBadges user={user} /><PlanBadge user={user} /></div>
                <span className="shrink-0 text-xs text-neutral-500">{ago(user.createdAt)}</span>
                <i className="fa-solid fa-chevron-right text-[10px] text-neutral-400" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Overview({ me, stats, reloadKey, onOpenUsers, onOpenUser, onAuthLost }) {
  const first = me?.firstName ? `, ${me.firstName}` : '';
  const total = stats?.users || 0;
  const share = total ? Math.round(((stats?.premium || 0) / total) * 100) : 0;
  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div className="adm-rise">
        <p className="text-sm text-neutral-500">{today}</p>
        <h1 className="mt-1 text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl">{greeting()}{first}</h1>
      </div>

      {stats && !stats.premiumTools && (
        <Alert tone="info">
          Premium tools are switched off. Add <span className="font-mono text-xs">ADMIN_ACCESS_CODE</span> to the server settings to activate, extend or remove Premium from here.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Kpi icon="fa-users" tone="dark" label="Total users" value={stats ? stats.users : null} hint={stats ? `${number(stats.admins)} ${stats.admins === 1 ? 'admin' : 'admins'}` : ''} onClick={() => onOpenUsers('all')} delay={0} />
        <Kpi icon="fa-crown" tone="orange" label="Premium" value={stats ? stats.premium : null} hint={stats ? `${share}% of all users` : ''} onClick={() => onOpenUsers('premium')} delay={40} />
        <Kpi icon="fa-user-plus" tone="neutral" label="New this week" value={stats ? stats.newLast7Days : null} hint="Joined in 7 days" onClick={() => onOpenUsers('all', 'newest')} delay={80} />
        <Kpi icon="fa-bolt" tone="neutral" label="Active this week" value={stats ? stats.activeLast7Days : null} hint="Signed in this week" onClick={() => onOpenUsers('all', 'recent')} delay={120} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SignupsCard data={stats?.signupsByDay} />
        <PlansCard stats={stats} onOpenUsers={onOpenUsers} />
      </div>

      <LatestSignups reloadKey={reloadKey} onOpenUser={onOpenUser} onOpenUsers={onOpenUsers} onAuthLost={onAuthLost} />
    </div>
  );
}
