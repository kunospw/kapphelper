import { describeFreshness } from '../lib/freshness.js';
import { formatDateTime, hoursSince, timeAgo } from '../lib/format.js';

// Status is derived from what the sync scripts actually recorded (SyncRun rows via
// /api/sync-status) — never hard-coded. A source that has synced is "connected"; one whose
// last sync is older than STALE_AFTER_HOURS is flagged, because the API's hourly scheduler
// only runs while `npm run server` is up.
const STALE_AFTER_HOURS = 3;

const STATE_META = {
  connected: { label: 'Connected', tone: 'active' },
  stale: { label: 'Connected · sync is old', tone: 'risk' },
  planned: { label: 'Not connected', tone: 'paused' },
};

const WRITE_MODE_COPY = {
  live: { label: 'On', text: 'Marking an item done also sets it to Done in Plane (confirm-first, audited).' },
  'dry-run': { label: 'Dry run', text: 'Checks the Plane endpoint and Done state but does not change Plane.' },
  disabled: { label: 'Off', text: 'Marking done is recorded here only; Plane is not changed.' },
};

function liveState(lastSync) {
  if (!lastSync) return 'planned';
  const hours = hoursSince(lastSync);
  return hours !== null && hours > STALE_AFTER_HOURS ? 'stale' : 'connected';
}

function lastSyncText(lastSync) {
  return lastSync ? `${formatDateTime(lastSync)} · ${timeAgo(lastSync) ?? ''}`.trim() : 'never';
}

export function IntegrationsView({ snapshotDate, source, github, plane, runs = {}, planeWriteMode = 'disabled' }) {
  const freshness = describeFreshness(snapshotDate);
  const writeMode = WRITE_MODE_COPY[planeWriteMode] ?? WRITE_MODE_COPY.disabled;

  const entries = [
    {
      id: 'snapshot',
      title: 'KAppHelper snapshot',
      scope: 'Portfolio cards, project context, release profiles, meeting rows.',
      state: snapshotDate ? 'connected' : 'planned',
      note: 'Seeded from dashboard/data/portfolio.json and published to Postgres on every sync. Project milestones and blockers can also be reported through captures.',
      rows: [['Source', source?.detail ?? 'Unknown source.'], ['As of', `${formatDateTime(snapshotDate)} · ${freshness.label}`]],
    },
    {
      id: 'captures',
      title: 'KAppHelper captures',
      scope: 'Decisions, session notes and status reports written with /capture.',
      state: liveState(runs.captures),
      note: 'Captures from registered developers become their activity; capture status fields update project milestone, blocker and health.',
      rows: [['Last sync', lastSyncText(runs.captures)]],
    },
    {
      id: 'plane',
      title: 'Plane',
      scope: 'Work items, priorities, assignments, status.',
      state: liveState(plane?.generatedAt),
      note: 'Read-only sync of the configured Plane project. The one write is Mark done, controlled by write-back below.',
      rows: [
        ['Last sync', lastSyncText(plane?.generatedAt)],
        ['Work items', plane?.workItemCount != null ? String(plane.workItemCount) : 'not synced yet'],
        ['Write-back', `${writeMode.label} — ${writeMode.text}`],
      ],
    },
    {
      id: 'git',
      title: 'Git commit activity',
      scope: 'Commit author, time and first line of the message — no source files.',
      state: liveState(github?.generatedAt),
      note: 'Read from a local blobless mirror (or the GitHub App when installed) and matched to developers by login, email or name.',
      rows: [
        ['Last sync', lastSyncText(github?.generatedAt)],
        ['Repositories', github?.repositoryCount != null ? String(github.repositoryCount) : 'none synced yet'],
      ],
    },
    {
      id: 'sharepoint',
      title: 'SharePoint',
      scope: 'Meeting notes, onboarding, test artefacts, reference documents.',
      state: 'planned',
      note: 'Needs the team-owned library location and a Microsoft Graph read scope agreed before ingestion.',
    },
    {
      id: 'appstate',
      title: 'App-repo Git state',
      scope: 'Current branch, last commit, uncommitted work, deploy readiness.',
      state: 'planned',
      note: 'Not built. Would read local git checkouts read-only; no push, no force.',
    },
    {
      id: 'ai',
      title: 'AI briefs & next-work',
      scope: 'On-demand project summary and ranked next-work suggestions with citations.',
      state: 'planned',
      note: 'Planned on local Ollama, server-side only. Every generated sentence must cite its input record and its freshness.',
    },
  ];

  return (
    <section className="integrations">
      <div className="integrations-lead">
        <p className="eyebrow">Data sources</p>
        <h2>Where every fact on this dashboard comes from</h2>
        <p>
          Mostly read-only: nothing here deploys, uploads to a store, or touches production. The one write is
          Mark done, recorded with who and when; it changes Plane only when write-back is on
          (currently <strong>{writeMode.label.toLowerCase()}</strong>). Status below comes from the last recorded
          sync of each source, not from a fixed list.
        </p>
      </div>

      <div className="integration-grid">
        {entries.map((entry) => {
          const meta = STATE_META[entry.state];
          return (
            <article key={entry.id} className={`integration-card tone-${meta.tone}`}>
              <header>
                <h3>{entry.title}</h3>
                <span className={`status status-${meta.tone}`}>{meta.label}</span>
              </header>
              <p className="integration-scope">{entry.scope}</p>
              <p className="integration-note">{entry.note}</p>
              {entry.rows && (
                <dl className="integration-meta">
                  {entry.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
                </dl>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
