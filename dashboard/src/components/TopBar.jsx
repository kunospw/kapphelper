import { describeFreshness } from '../lib/freshness.js';
import { formatDateTime } from '../lib/format.js';
import { Eyebrow } from './primitives.jsx';

const VIEW_TITLES = {
  meeting: { title: 'Team meeting', lead: 'Fifteen minutes, exceptions first. Open the source record only when the room needs detail.' },
  portfolio: { title: 'Portfolio', lead: 'Every custom app, its owner, and its current health. Click a card for the full project record.' },
  integrations: { title: 'Data sources', lead: 'Where each fact comes from today and what is not yet wired up.' },
  detail: { title: 'Project detail', lead: 'Full context, release safety, source records, and the recommended next action.' },
};

export function TopBar({ view, snapshotDate, query, onQueryChange, source, user, onSignOut }) {
  const meta = VIEW_TITLES[view] ?? VIEW_TITLES.portfolio;
  const freshness = describeFreshness(snapshotDate);
  const displayName = user?.displayName ?? user?.email ?? 'User';

  return (
    <header className="topbar">
      <div className="topbar-heading">
        <Eyebrow>Kairos custom apps</Eyebrow>
        <h1>{meta.title}</h1>
        <p className="topbar-lead">{meta.lead}</p>
      </div>

      {user && (
        <div className="user-menu">
          <span className="user-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span>
          <span className="user-name" title={displayName}>{displayName}</span>
          {user.accessRole && <span className={`user-role user-role-${user.accessRole}`} title="Your permission level">{user.accessRole}</span>}
          <button type="button" className="user-signout" onClick={onSignOut}>Sign out</button>
        </div>
      )}

      <div className="topbar-tools">
        <div className={`snapshot-chip snapshot-${freshness.tone}`} title={source?.detail ?? 'Snapshot source unknown'}>
          <span className="snapshot-dot" aria-hidden="true" />
          <div>
            <strong>{source?.label ?? 'Snapshot'}</strong>
            <span>Data as of {formatDateTime(snapshotDate)} · {freshness.label}</span>
          </div>
        </div>

        <label className="search">
          <span aria-hidden="true">⌕</span>
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            type="search"
            placeholder="Search apps, clients, risks"
            aria-label="Search"
          />
        </label>
      </div>
    </header>
  );
}
