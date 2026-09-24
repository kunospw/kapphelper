import { useMemo, useState } from 'react';
import { describeFreshness } from '../lib/freshness.js';
import { EmptyState, FreshnessBadge, Status } from './primitives.jsx';

const SOURCE_LABELS = {
  commit: 'Git commit',
  plane: 'Plane work item',
  documentation: 'Documentation',
  meeting: 'Meeting update',
  capture: 'KAppHelper capture',
};

function SourceTag({ source }) {
  return <span className={`activity-source source-${source.type}`}>{SOURCE_LABELS[source.type] ?? source.type}</span>;
}

function formatTimelineTimestamp(timestamp) {
  if (!timestamp) return 'Date unknown';
  if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }).format(new Date(`${timestamp}T00:00:00+08:00`));
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const value = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore',
  }).format(date);
  return `${value} SGT`;
}

function DeveloperCard({ developer, selected, onSelect }) {
  const freshness = describeFreshness(developer.lastUpdated);
  return <button type="button" className={`developer-card ${selected ? 'selected' : ''}`} onClick={() => onSelect(developer.id)}>
    <span className="developer-initial">{developer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
    <span><strong>{developer.name}</strong><small>{developer.role}</small></span>
    <FreshnessBadge freshness={freshness} prefix="Updated" />
  </button>;
}

function ActivityTimeline({ activities }) {
  if (!activities?.length) return <EmptyState title="No verified activity yet" message="Connect Git, Plane, or a handover/capture source before presenting a developer update." />;
  return <ol className="activity-timeline">
    {activities.map((activity) => <li key={`${activity.timestamp}-${activity.title}`}>
      <time dateTime={activity.timestamp}>{formatTimelineTimestamp(activity.timestamp)}</time>
      <div className="activity-entry"><div className="activity-meta"><SourceTag source={activity.source} /><span>{activity.project}</span></div><strong>{activity.title}</strong><p>{activity.summary}</p><span className="activity-reference">{activity.source.reference}</span></div>
    </li>)}
  </ol>;
}

function ActionList({ actions }) {
  if (!actions?.length) return <EmptyState title="No open action recorded" message="This does not mean there is no work; it means the snapshot has no verified action list yet." />;
  const sortedActions = [...actions].sort((left, right) => {
    const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : -Infinity;
    const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : -Infinity;
    return rightDate - leftDate;
  });
  return <div className="action-list">
    {sortedActions.map((action) => <article className="action-item" key={`${action.project}-${action.title}`}><div><Status value={action.status} /><span className="action-project">{action.project}</span></div><strong>{action.title}</strong><p>{action.detail}</p><footer><span>{action.source}</span><span>{action.createdAt ? `Created ${formatTimelineTimestamp(action.createdAt)}` : action.due}</span></footer></article>)}
  </div>;
}

export function DeveloperProgressView({ developers = [], embedded = false, githubConnected = false, planeConnected = false }) {
  const [selectedId, setSelectedId] = useState(developers[0]?.id ?? '');
  const selected = useMemo(() => developers.find((developer) => developer.id === selectedId) ?? developers[0], [developers, selectedId]);
  const actionCount = developers.reduce((total, developer) => total + (developer.actions?.length ?? 0), 0);
  const liveSources = ['Git commits', 'Plane work items', 'Documentation'];

  if (!developers.length) return <EmptyState title="No developer update records" message="Add verified handover, Git, Plane, or documentation evidence to show progress by developer." />;

  return <section className={`developer-progress ${embedded ? 'developer-progress-embedded' : ''}`} aria-labelledby="developer-progress-heading">
    <header className="developer-head"><div><p className="eyebrow">Internal team meeting</p><h2 id="developer-progress-heading">Developer updates and action tracking</h2><p>Each update must be anchored to a commit, Plane item, document, or meeting record. The current snapshot is read-only; live source connectors come next.</p></div><div className="developer-summary"><strong>{developers.length}</strong><span>developers</span><strong>{actionCount}</strong><span>open actions</span></div></header>
    <div className="source-strip" aria-label="Data connection status">{liveSources.map((source) => { const connected = (source === 'Git commits' && githubConnected) || (source === 'Plane work items' && planeConnected); return <span key={source}><i className={connected ? 'connected' : ''} aria-hidden="true" />{source}: <b>{connected ? 'connected' : 'not connected'}</b></span>; })}<span><i className="connected" aria-hidden="true" />Meeting captures: <b>snapshot</b></span></div>
    <div className="developer-layout"><aside className="developer-list" aria-label="Developers">{developers.map((developer) => <DeveloperCard key={developer.id} developer={developer} selected={developer.id === selected?.id} onSelect={setSelectedId} />)}</aside>
      {selected && <div className="developer-detail"><header className="developer-detail-head"><div><p className="eyebrow">{selected.role}</p><h3>{selected.name}</h3><p>{selected.focus}</p></div><FreshnessBadge freshness={describeFreshness(selected.lastUpdated)} prefix="Last update" /></header><div className="developer-columns"><section><h4>What happened</h4><ActivityTimeline activities={selected.activities} /></section><section><h4>Action list</h4><ActionList actions={selected.actions} /></section></div></div>}
    </div>
  </section>;
}
