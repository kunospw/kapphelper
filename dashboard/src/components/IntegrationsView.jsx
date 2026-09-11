import { describeFreshness } from '../lib/freshness.js';

// Each entry represents a system the dashboard will eventually read from.
// Today only the manual snapshot is wired; the rest render as explicit
// "not connected" cards so the UI already knows how to describe them.
const INTEGRATIONS = [
  {
    id: 'snapshot',
    title: 'KAppHelper snapshot',
    scope: 'Portfolio cards, project context, release profiles, meeting rows.',
    state: 'connected',
    note: 'Reads dashboard/data/portfolio.json at build/reload time. Update the JSON when a project fact changes.',
  },
  {
    id: 'plane',
    title: 'Plane',
    scope: 'Active issues, priorities, assignments, work status.',
    state: 'planned',
    note: 'Requires MCP/API credentials, an approved read scope, and a preview-before-write rule for any mutation.',
  },
  {
    id: 'sharepoint',
    title: 'SharePoint',
    scope: 'Meeting notes, onboarding, test artefacts, reference documents.',
    state: 'planned',
    note: 'Needs the team-owned library location and Microsoft Graph read scope agreed before ingestion.',
  },
  {
    id: 'git',
    title: 'App-repo Git state',
    scope: 'Current branch, last commit, uncommitted work, deploy readiness.',
    state: 'planned',
    note: 'Reads local git checkouts on the Claude server. No push, no force. Dashboard stays read-only.',
  },
  {
    id: 'ai',
    title: 'AI briefs & next-work',
    scope: 'On-demand project summary and ranked next-work suggestions with citations.',
    state: 'planned',
    note: 'Every generated sentence must cite its input record and its freshness. Nothing writes to Plane automatically.',
  },
];

const STATE_META = {
  connected: { label: 'Connected', tone: 'active' },
  planned:   { label: 'Not connected', tone: 'paused' },
  error:     { label: 'Error', tone: 'blocked' },
};

export function IntegrationsView({ snapshotDate, source }) {
  const freshness = describeFreshness(snapshotDate);
  return (
    <section className="integrations">
      <div className="integrations-lead">
        <p className="eyebrow">Data sources</p>
        <h2>Where every fact on this dashboard comes from</h2>
        <p>
          The dashboard is read-only. Nothing here writes to Plane, uploads to a
          store, or touches production. This page shows what is wired up today
          and what is still on the roadmap.
        </p>
      </div>

      <div className="integration-grid">
        {INTEGRATIONS.map((entry) => {
          const meta = STATE_META[entry.state];
          const isSnapshot = entry.id === 'snapshot';
          return (
            <article key={entry.id} className={`integration-card tone-${meta.tone}`}>
              <header>
                <h3>{entry.title}</h3>
                <span className={`status status-${meta.tone}`}>{meta.label}</span>
              </header>
              <p className="integration-scope">{entry.scope}</p>
              <p className="integration-note">{entry.note}</p>
              {isSnapshot && (
                <dl className="integration-meta">
                  <div><dt>Source</dt><dd>{source?.detail ?? 'Unknown source.'}</dd></div>
                  <div><dt>As of</dt><dd>{snapshotDate ?? 'unknown'} · {freshness.label}</dd></div>
                </dl>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
