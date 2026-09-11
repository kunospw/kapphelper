import { useEffect, useState } from 'react';
import { mergeGithubActivity } from '../lib/githubActivity.js';
import { mergePlaneActivity } from '../lib/planeActivity.js';
import { doc, getDoc } from 'firebase/firestore';
import { db, firebaseConfigured } from '../lib/firebase.js';

// Wraps the static snapshot in a loading/error-shaped interface so the
// UI already knows how to render those states when Plane / SharePoint /
// Git adapters are wired in. Today it resolves synchronously from a JSON
// import; the shape is what matters.

const SOURCE = {
  kind: 'snapshot',
  label: 'Waiting for secure dashboard data',
  detail: 'Sign in, then Firestore provides the approved team snapshot.',
};

export function usePortfolio(user) {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
    source: SOURCE,
  });

  useEffect(() => {
    async function load() {
      if (!firebaseConfigured || !db) throw new Error('Firebase configuration is missing.');
      if (!user) return;
      const [portfolioSnapshot, githubSnapshot, planeSnapshot] = await Promise.all([
        getDoc(doc(db, 'dashboard', 'current')),
        getDoc(doc(db, 'dashboard', 'github-activity')),
        getDoc(doc(db, 'dashboard', 'plane-activity')),
      ]);
      if (!portfolioSnapshot.exists()) throw new Error('No dashboard snapshot has been published yet. Run the local publish command first.');
      const portfolio = portfolioSnapshot.data().portfolio;
      const github = githubSnapshot.exists() ? githubSnapshot.data() : null;
      const plane = planeSnapshot.exists() ? planeSnapshot.data() : null;
      setState({
        status: 'ready',
        data: mergePlaneActivity(mergeGithubActivity(portfolio, github), plane),
        error: null,
        source: github?.generatedAt || plane?.generatedAt
          ? { kind: 'partial-live', label: 'KAppHelper snapshot + connected sources', detail: `Git: ${github?.generatedAt ?? 'not connected'} · Plane: ${plane?.generatedAt ?? 'not connected'} · SharePoint is not connected yet.` }
          : SOURCE,
      });
    }
    if (user) load().catch((error) => setState({ status: 'error', data: null, error: error.message ?? 'Unknown error loading portfolio snapshot.', source: SOURCE }));
  }, [user]);

  return state;
}
