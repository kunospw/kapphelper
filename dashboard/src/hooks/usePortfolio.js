import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api.js';

const SOURCE = {
  kind: 'snapshot',
  label: 'Waiting for secure dashboard data',
  detail: 'Sign in, then the API provides the approved team snapshot.',
};

export function usePortfolio(user) {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
    source: SOURCE,
  });

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    async function load() {
      const [portfolio, syncStatus] = await Promise.all([
        apiFetch('/api/portfolio'),
        apiFetch('/api/sync-status'),
      ]);
      if (!portfolio) throw new Error('No dashboard snapshot has been published yet. Run the publish command first.');
      setState({
        status: 'ready',
        data: { ...portfolio, github: syncStatus.github, plane: syncStatus.plane },
        error: null,
        source: syncStatus.github?.generatedAt || syncStatus.plane?.generatedAt
          ? { kind: 'partial-live', label: 'KAppHelper snapshot + connected sources', detail: `Git: ${syncStatus.github?.generatedAt ?? 'not connected'} · Plane: ${syncStatus.plane?.generatedAt ?? 'not connected'} · SharePoint is not connected yet.` }
          : SOURCE,
      });
    }
    if (user) load().catch((error) => setState({ status: 'error', data: null, error: error.message ?? 'Unknown error loading portfolio snapshot.', source: SOURCE }));
  }, [user, reloadKey]);

  return { ...state, reload };
}
