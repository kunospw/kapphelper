const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiConfigured = Boolean(BASE_URL);

const ACCESS_TOKEN_KEY = 'kapphelper.accessToken';
const REFRESH_TOKEN_KEY = 'kapphelper.refreshToken';

// Access token lives in memory only (module-level, cleared on reload); the
// refresh token is the one persisted, so a reload re-derives a fresh access
// token instead of holding the longer-lived credential in memory longer than
// needed.
let accessToken = null;

export function getStoredRefreshToken() {
  try { return localStorage.getItem(REFRESH_TOKEN_KEY); } catch { return null; }
}

function setTokens({ accessToken: next, refreshToken } = {}) {
  accessToken = next ?? null;
  try {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (!next) localStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch { /* localStorage unavailable (private mode etc.) — token just won't survive reload */ }
}

export function clearTokens() {
  accessToken = null;
  try { localStorage.removeItem(REFRESH_TOKEN_KEY); localStorage.removeItem(ACCESS_TOKEN_KEY); } catch { /* ignore */ }
}

async function raw(path, { method = 'GET', body, auth = true } = {}) {
  if (!apiConfigured) throw new Error('VITE_API_BASE_URL is not set.');
  const headers = { 'Content-Type': 'application/json' };
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

async function refreshAccessToken() {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) throw new Error('No session to restore.');
  const payload = await raw('/api/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false });
  setTokens({ accessToken: payload.accessToken });
  return payload;
}

export async function login(email, password) {
  const payload = await raw('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
  setTokens(payload);
  return payload.user;
}

export async function logout() {
  const refreshToken = getStoredRefreshToken();
  try { await raw('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }); } catch { /* best-effort */ }
  clearTokens();
}

// Restores a session on page load from the persisted refresh token, without
// requiring the user to log in again every time they reload the tab.
export async function restoreSession() {
  const { user } = await refreshAccessToken();
  return user;
}

export async function apiFetch(path, options = {}) {
  try {
    return await raw(path, options);
  } catch (error) {
    if (error.status !== 401) throw error;
    // Access token expired — try once to refresh, then retry the request.
    await refreshAccessToken();
    return raw(path, options);
  }
}
