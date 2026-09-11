import { useMemo, useState } from 'react';
import { STATUS_BUCKETS, groupByBucket } from '../lib/status.js';
import { describeFreshness } from '../lib/freshness.js';
import { meetingRowFor } from '../lib/meeting.js';
import { EmptyState, FreshnessBadge, Status } from './primitives.jsx';
import { DeveloperProgressView } from './DeveloperProgressView.jsx';

const FILTERS = [
  { id: 'attention', label: 'Needs attention', match: (b) => b.id === 'blocked' || b.id === 'attention' },
  { id: 'all', label: 'All projects', match: () => true },
  { id: 'blocked', label: 'Blocked only', match: (b) => b.id === 'blocked' },
  { id: 'active', label: 'On track', match: (b) => b.id === 'active' },
];

function BucketHeader({ bucket, count }) {
  return (
    <div className={`bucket-header tone-${bucket.tone}`}>
      <div>
        <span className={`status status-${bucket.tone}`}>{bucket.label}</span>
        <p>{bucket.description}</p>
      </div>
      <span className="bucket-count">{count}</span>
    </div>
  );
}

function MeetingRow({ project, onOpenProject }) {
  const row = meetingRowFor(project);
  const freshness = describeFreshness(row.lastUpdate);
  const developerMissing = !project.activeDeveloper || project.activeDeveloper === 'Needs verification';

  return (
    <tr>
      <td className="cell-project">
        <button type="button" className="project-link" onClick={() => onOpenProject(project.id)}>
          {project.name}
        </button>
        <span className="cell-client">{project.client}</span>
        <Status value={row.health} />
      </td>
      <td className="cell-progress">
        <strong>{row.milestone}</strong>
        <span>{row.latestUpdate}</span>
      </td>
      <td className="cell-blocker">
        {row.blocker}
      </td>
      <td className="cell-owner">
        <strong>{row.owner}</strong>
        <span className={developerMissing ? 'missing' : ''}>{row.developer}</span>
      </td>
      <td className="cell-freshness">
        <FreshnessBadge freshness={freshness} prefix="Updated" />
      </td>
      <td className="cell-next">
        <strong>{row.nextDecision}</strong>
        {project.nextWhy && <span>{project.nextWhy}</span>}
      </td>
    </tr>
  );
}

export function MeetingView({ projects, developers, githubConnected, planeConnected, onOpenProject }) {
  const [filterId, setFilterId] = useState('attention');
  const filter = FILTERS.find((f) => f.id === filterId) ?? FILTERS[1];

  const groups = useMemo(() => groupByBucket(projects), [projects]);
  const visibleGroups = groups
    .filter((group) => filter.match(group.bucket))
    .filter((group) => group.projects.length > 0);

  const totals = useMemo(() => {
    const map = {};
    STATUS_BUCKETS.forEach((bucket) => {
      map[bucket.id] = projects.filter((p) => bucket.match(p.status)).length;
    });
    return map;
  }, [projects]);

  const totalNeedsAttention = totals.blocked + totals.attention;

  return (
    <section className="meeting-panel" aria-labelledby="meeting-heading">
      <header className="meeting-head">
        <div>
          <p className="eyebrow">Internal team meeting</p>
          <h2 id="meeting-heading">Exceptions first, then the plan</h2>
          <p className="meeting-lead">
            Grouped by health. Rows never show an inferred progress percentage,
            deadline, or approver &mdash; if a fact is not on record, the row
            says so.
          </p>
        </div>
        <div className="meeting-summary" aria-label="Health counts">
          <div className="summary-tile tone-blocked">
            <strong>{totals.blocked}</strong>
            <span>Blocked</span>
          </div>
          <div className="summary-tile tone-risk">
            <strong>{totals.attention}</strong>
            <span>At risk / verify</span>
          </div>
          <div className="summary-tile tone-active">
            <strong>{totals.active}</strong>
            <span>On track</span>
          </div>
          <div className="summary-tile tone-paused">
            <strong>{totals.paused}</strong>
            <span>Paused</span>
          </div>
        </div>
      </header>

      <div className="meeting-toolbar" role="tablist" aria-label="Filter meeting rows">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filterId === f.id}
            className={`chip ${filterId === f.id ? 'active' : ''}`}
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
          </button>
        ))}
        <span className="meeting-toolbar-sep" aria-hidden="true" />
        <span className="meeting-toolbar-note">
          {totalNeedsAttention} of {projects.length} projects need attention.
        </span>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState
          title="Nothing in this bucket"
          message="Switch the filter above, or clear the search box, to see other projects."
        />
      ) : (
        <div className="meeting-groups">
          {visibleGroups.map(({ bucket, projects: bucketProjects }) => (
            <section key={bucket.id} className={`meeting-group tone-${bucket.tone}`}>
              <BucketHeader bucket={bucket} count={bucketProjects.length} />
              <div className="meeting-table-wrap">
                <table className="meeting-table">
                  <thead>
                    <tr>
                      <th scope="col">Project</th>
                      <th scope="col">Milestone &amp; latest update</th>
                      <th scope="col">Blocker or decision needed</th>
                      <th scope="col">Owner · developer</th>
                      <th scope="col">Freshness</th>
                      <th scope="col">Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucketProjects.map((project) => (
                      <MeetingRow key={project.id} project={project} onOpenProject={onOpenProject} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="meeting-footnote">
        Freshness compares "last confirmed" to today. A stale date does not
        mean work is stalled &mdash; it means the record has not been re-verified.
      </footer>

      <DeveloperProgressView developers={developers} githubConnected={githubConnected} planeConnected={planeConnected} embedded />
    </section>
  );
}
