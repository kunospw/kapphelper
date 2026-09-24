import { useCallback, useEffect, useState } from 'react';
import { apiConfigured, getStoredRefreshToken, login, logout, restoreSession } from '../lib/api.js';

const CONFIG_MESSAGE = 'API is not configured. Add VITE_API_BASE_URL to dashboard/.env.local.';

export function useAuth() {
  const [state, setState] = useState({ status: apiConfigured ? 'loading' : 'configuration-required', user: null, error: null });

  useEffect(() => {
    if (!apiConfigured) return;
    if (!getStoredRefreshToken()) {
      setState({ status: 'unauthenticated', user: null, error: null });
      return;
    }
    restoreSession()
      .then((user) => setState({ status: 'authenticated', user: user ?? {}, error: null }))
      .catch(() => setState({ status: 'unauthenticated', user: null, error: null }));
  }, []);

  const signIn = useCallback(async (email, password) => {
    if (!apiConfigured) { setState({ status: 'configuration-required', user: null, error: CONFIG_MESSAGE }); return; }
    setState((current) => ({ ...current, status: 'signing-in', error: null }));
    try {
      const user = await login(email, password);
      setState({ status: 'authenticated', user: user ?? {}, error: null });
    } catch (error) {
      setState((current) => ({ ...current, status: 'unauthenticated', error: error.message ?? 'Sign-in failed.' }));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await logout();
    setState({ status: 'unauthenticated', user: null, error: null });
  }, []);

  return { ...state, signIn, signOut: signOutUser };
}
