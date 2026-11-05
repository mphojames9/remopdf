// Talks to the accounts server (server/ folder), hosted on Render. To point at a local server while developing, set
// VITE_ACCOUNTS_URL=http://localhost:5000 in your front-end .env. VITE_API_URL is NOT used here: it belongs to the AI backend.
const API_URL = String(import.meta.env?.VITE_ACCOUNTS_URL || 'https://remopdf-server.onrender.com').replace(/\/+$/, '');

const TOKEN_KEY = 'remopdf:authToken';
const USER_KEY = 'remopdf:authUser';

// "Remember me" keeps the sign-in in localStorage; otherwise it lasts until the tab is closed.
const stores = () => [window.localStorage, window.sessionStorage];

const saveSession = ({ token, user }, remember) => {
  try {
    clearSession();
    const store = remember ? window.localStorage : window.sessionStorage;
    store.setItem(TOKEN_KEY, token);
    store.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* Storage can be blocked (private mode). The account still exists; the person just has to sign in again later. */
  }
};

const clearSession = () => {
  stores().forEach((store) => {
    try {
      store.removeItem(TOKEN_KEY);
      store.removeItem(USER_KEY);
    } catch {
      /* ignore */
    }
  });
};

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) throw new Error((data && data.message) || 'Something went wrong. Please try again.');
  return data;
}

/** Creates the account (saved in MongoDB) and signs the person in. Throws an Error with a readable message. */
export async function registerUser({ firstName, lastName, email, password, phoneToken }) {
  const data = await post('/api/auth/register', { firstName, lastName, email, password, phoneToken });
  saveSession(data, true);
  return data.user;
}

/** Signs in to an existing account. Throws an Error with a readable message. */
export async function loginUser({ email, password, remember }) {
  const data = await post('/api/auth/login', { email, password, remember: !!remember });
  saveSession(data, !!remember);
  return data.user;
}

export const getToken = () => {
  try {
    return window.localStorage.getItem(TOKEN_KEY) || window.sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

export const getCurrentUser = () => {
  try {
    const raw = window.localStorage.getItem(USER_KEY) || window.sessionStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Asks the server who the saved token belongs to, so the name shown is current and an expired
 * sign-in is cleared. Offline or a server hiccup keeps the saved name instead of signing the person out.
 */
export async function refreshUser() {
  const token = getToken();
  if (!token) return null;
  let res;
  try {
    res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    return getCurrentUser();
  }
  if (res.status === 401) {
    clearSession();
    return null;
  }
  if (!res.ok) return getCurrentUser();
  try {
    const { user } = await res.json();
    // Update the saved copy in whichever store holds the sign-in.
    const store = window.localStorage.getItem(TOKEN_KEY) ? window.localStorage : window.sessionStorage;
    store.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch {
    return getCurrentUser();
  }
}

export const signOut = clearSession;
