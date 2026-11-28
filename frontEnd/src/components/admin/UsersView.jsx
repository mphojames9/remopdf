import { useCallback, useEffect, useRef, useState } from 'react';
import { listUsers } from '../../api/admin';
import { Alert, Avatar, EmptyState, PlanBadge, Skeleton, UserBadges, ago, authLost, buttonLight, fmtDate, fullName, inputClass, number } from './ui';

/*
  The Users screen: search, filter tabs with live counts, sorting, and the list itself (a table on larger screens, one card
  per account on phones). Clicking an account opens it in the side panel (components/admin/UserPanel.jsx).
  `reloadKey` goes up whenever an account was changed in the panel, which makes this list read the database again.
*/

const FILTER_TABS = [
  ['all', 'All', 'users'],
  ['premium', 'Premium', 'premium'],
  ['free', 'Free', 'free'],
  ['admin', 'Admins', 'admins'],
  ['suspended', 'Suspended', 'suspended'],
];

const SORTS = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['recent', 'Active'],
  ['name', 'A–Z'],
];

const COLUMNS = ['User', 'Plan', 'Joined', 'Last sign-in', 'Status'];

export default function UsersView({ stats, initialFilter = 'all', initialSort = 'newest', reloadKey, onOpenUser, onRefresh, onAuthLost }) {
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState({ search: '', filter: initialFilter, sort: initialSort, page: 1 });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

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
    setError('');
    try {
      const result = await listUsers(query);
      if (id === requestId.current) setData(result);
    } catch (err) {
      if (id !== requestId.current) return;
      if (authLost(err)) onAuthLost(err.status);
      else setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [query, onAuthLost]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const items = data?.items || [];
  const total = data?.total ?? 0;
  const limit = data?.limit || 20;
  const firstShown = total === 0 ? 0 : (query.page - 1) * limit + 1;
  const lastShown = total === 0 ? 0 : firstShown + items.length - 1;
  const filtered = query.search !== '' || query.filter !== 'all';
  const showSkeleton = !data && loading;

  const clearFilters = () => {
    setSearchText('');
    setQuery((current) => ({ ...current, search: '', filter: 'all', page: 1 }));
  };

  return (
    <div className="space-y-5">
      <div className="adm-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-neutral-900 sm:text-4xl">Users</h1>
          <p className="mt-1 text-sm text-neutral-500">{stats ? `${number(stats.users)} accounts` : 'Everyone with an account'}, read live from the database.</p>
        </div>
      </div>

      {/* Search, sort and filters */}
      <div className="adm-rise space-y-3" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400" aria-hidden="true"></i>
            <input className={`${inputClass} h-11 pl-10`} type="search" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search users" aria-label="Search users" />
          </div>
          <select
            value={query.sort}
            onChange={(e) => setQuery((current) => ({ ...current, sort: e.target.value, page: 1 }))}
            aria-label="Sort users"
            className="adm-input h-11 shrink-0 rounded-xl border border-neutral-300 bg-white px-3 text-sm text-neutral-800 outline-none focus:border-neutral-900"
            title="Sort users"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={onRefresh} aria-label="Refresh" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-300 bg-white text-neutral-700 transition-colors hover:border-neutral-900">
            <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`} aria-hidden="true"></i>
          </button>
        </div>

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter users">
          {FILTER_TABS.map(([value, label, statKey]) => {
            const active = query.filter === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setQuery((current) => ({ ...current, filter: value, page: 1 }))}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                  active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900'
                }`}
              >
                {label}
                {stats && <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'}`}>{number(stats[statKey])}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {/* List */}
      <div className={`adm-rise overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-opacity ${loading && data ? 'opacity-60' : ''}`} style={{ animationDelay: '120ms' }}>
        {showSkeleton && (
          <div className="divide-y divide-neutral-200">
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-3 px-4 py-4">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-44" /><Skeleton className="h-3 w-64 max-w-full" /></div>
                <Skeleton className="hidden h-6 w-20 rounded-full md:block" />
              </div>
            ))}
          </div>
        )}

        {data && items.length === 0 && (
          <EmptyState
            icon={filtered ? 'fa-magnifying-glass' : 'fa-users'}
            title={filtered ? 'No users match that' : 'No users yet'}
            action={filtered ? <button type="button" className={buttonLight} onClick={clearFilters}>Clear search and filters</button> : null}
          >
            {filtered ? 'Try a different name, email or filter.' : 'Accounts appear here as soon as someone signs in.'}
          </EmptyState>
        )}

        {items.length > 0 && (
          <>
            {/* Phones: one card per account */}
            <ul className="divide-y divide-neutral-200 md:hidden">
              {items.map((u) => (
                <li key={u.id}>
                  <button type="button" onClick={() => onOpenUser(u.id)} className="block w-full px-4 py-4 text-left transition-colors active:bg-neutral-50">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{fullName(u)}</p>
                        <p className="truncate text-xs text-neutral-500">{u.email}</p>
                      </div>
                      <i className="fa-solid fa-chevron-right text-xs text-neutral-400" aria-hidden="true"></i>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <PlanBadge user={u} />
                      <UserBadges user={u} />
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">Joined {fmtDate(u.createdAt)} · Last sign-in: {ago(u.lastLoginAt)}</p>
                  </button>
                </li>
              ))}
            </ul>

            {/* Larger screens: a table */}
            <table className="hidden w-full text-left text-sm md:table">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                  {COLUMNS.map((column) => (
                    <th key={column} className="px-5 py-3 font-medium">{column}</th>
                  ))}
                  <th className="w-10 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {items.map((u) => (
                  <tr key={u.id} onClick={() => onOpenUser(u.id)} className="group cursor-pointer transition-colors hover:bg-neutral-50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar user={u} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-neutral-900">{fullName(u)}</p>
                          <p className="truncate text-xs text-neutral-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5"><PlanBadge user={u} /></td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-neutral-600">{fmtDate(u.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-neutral-600">{ago(u.lastLoginAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        <UserBadges user={u} />
                        {u.role !== 'admin' && !u.disabled && <span className="text-xs text-neutral-500">Active</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right text-neutral-300 transition-colors group-hover:text-neutral-900"><i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Pages */}
      {data && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600">
          <p>
            Showing <span className="font-medium text-neutral-900">{number(firstShown)}–{number(lastShown)}</span> of {number(total)}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className={buttonLight} disabled={query.page <= 1 || loading} onClick={() => setQuery((c) => ({ ...c, page: c.page - 1 }))}>
              <i className="fa-solid fa-chevron-left text-xs" aria-hidden="true"></i>Previous
            </button>
            <span className="hidden px-1 text-xs text-neutral-500 sm:inline">Page {query.page} of {data.pages}</span>
            <button type="button" className={buttonLight} disabled={query.page >= data.pages || loading} onClick={() => setQuery((c) => ({ ...c, page: c.page + 1 }))}>
              Next<i className="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
