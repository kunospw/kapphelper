import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, firebaseConfigured, githubProvider } from '../lib/firebase.js';

const CONFIG_MESSAGE = 'Firebase configuration is missing. Add the VITE_FIREBASE_* values to dashboard/.env.local.';

export function useAuth() {
  const [state, setState] = useState({ status: firebaseConfigured ? 'loading' : 'configuration-required', user: null, error: null });

  useEffect(() => {
    if (!firebaseConfigured || !auth) return undefined;
    return onAuthStateChanged(auth, (user) => setState({ status: user ? 'authenticated' : 'unauthenticated', user, error: null }));
  }, []);

  const signIn = useCallback(async () => {
    if (!auth) { setState({ status: 'configuration-required', user: null, error: CONFIG_MESSAGE }); return; }
    setState((current) => ({ ...current, status: 'signing-in', error: null }));
    try {
      await signInWithPopup(auth, githubProvider());
    } catch (error) {
      const friendly = error.code === 'auth/operation-not-allowed'
        ? 'GitHub sign-in is not enabled in Firebase Authentication yet.'
        : error.code === 'auth/popup-closed-by-user'
          ? 'GitHub sign-in was cancelled.'
          : error.message ?? 'GitHub sign-in failed.';
      setState((current) => ({ ...current, status: 'unauthenticated', error: friendly }));
    }
  }, []);

  const signOutUser = useCallback(() => auth ? signOut(auth) : Promise.resolve(), []);
  return { ...state, signIn, signOut: signOutUser };
}
