import { useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';
import { STATUS_BUCKETS, groupByBucket } from '../lib/status.js';
import { describeFreshness } from '../lib/freshness.js';
import { meetingRowFor } from '../lib/meeting.js';
import { EmptyState, FreshnessBadge, Status } from './primitives.jsx';
import { SignalsPanel } from './SignalsPanel.jsx';
import { planeCopy } from '../lib/planeCopy.js';

// Plane (Backlog/Todo/In Progress) and hand-written meeting actions (Open /
// Needs verification / Needs update) use different words for the same idea —
// these groups are what the meeting actually talks through, in order.
const GROUPS = [
  { id: 'attention', label: 'Needs attention', hint: 'Blocked, or waiting on verification or an update — discuss first.', tone: 'risk' },
  { id: 'progress', label: 'In progress', hint: 'Being worked on now.', tone: 'active' },
  { id: 'next', label: 'Up next', hint: 'Committed, not started yet.', tone: 'next' },
  { id: 'backlog', label: 'Backlog', hint: 'Not scheduled — skim only if there is time.', tone: 'paused', collapsed: true },
  { id: 'done', label: 'Completed', hint: 'Marked done in the last 30 days — who, when, and whether Plane was updated.', tone: 'paused', collapsed: true },
];

function groupFor(status = '') {
  if (/block|verif|needs|waiting|on hold/i.test(status)) return 'attention';
  if (/progress|review|doing|testing/i.test(status)) return 'progress';
  if (/backlog/i.test(status)) return 'backlog';
  return 'next';
}

const PRIORITY = {
  urgent: { rank: 0, label: 'Urgent' },
  high: { rank: 1, label: 'High' },
  medium: { rank: 2, label: 'Medium' },
  low: { rank: 3, label: 'Low' },
};

// "Kairos Invoice Portal-158 · Persist keys…" → { key: '#158', fullKey, name }
function splitTitle(title = '') {
  const index = title.indexOf(' · ');
  if (index === -1) return { key: null, fullKey: null, name: title };
  const fullKey = title.slice(0, index);
  const number = fullKey.match(/-(\d+)$/);
  return { key: number ? `#${number[1]}` : fullKey, fullKey, name: title.slice(index + 3) };
}

function timestampOf(action) {
  return action.updatedAt ?? action.createdAt ?? null;
}

function relativeTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 14) return days === 1 ? 'yesterday' : `${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks < 9 ? `${weeks} weeks ago` : `${Math.round(days / 30)} months ago`;
}

function absoluteTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore',
  }).format(date)} SGT`;
}

function meaningfulDue(due) {
  return due && !/^no (due )?date/i.test(due) ? due : null;
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ name, size = 'md' }) {
  return <span className={`ab-avatar ab-avatar-${size}`} aria-hidden="true">{initials(name)}</span>;
}

function ActionItem({ action, open, onToggle, showOwner, onOpenProject, projects, planeWriteMode, confirming, busyKey, onAskDone, onCancel, onConfirmDone, onReopen, onRetry }) {
  const [note, setNote] = useState('');
  const { key, fullKey, name } = splitTitle(action.title);
  const priority = PRIORITY[action.priority];
  const stamp = timestampOf(action);
  const due = meaningfulDue(action.due);
  const project = projects.find((item) => item.name === action.project);
  const done = action.completed;
  const busy = busyKey === action.key;
  const planeLinked = Boolean(action.key?.startsWith('plane:'));

  return (
    <li className={`ab-item ${open ? 'is-open' : ''} ${done ? 'is-done' : ''}`}>
      <div className="ab-line">
        <button type="button" className="ab-row" aria-expanded={open} onClick={onToggle}>
          <span className={`ab-priority ab-priority-${action.priority ?? 'none'}`} title={priority ? `${priority.label} priority` : 'No priority recorded'}>
            {priority ? priority.label : '—'}
          </span>
          <span className="ab-main">
            <span className="ab-title">
              {key && <span className="ab-key" title={fullKey}>{key}</span>}
              {name}
            </span>
            <span className="ab-meta">
              <span>{action.project ?? 'No project'}</span>
              <span className="ab-status-text">{action.status ?? 'Open'}</span>
              {done
                ? <span title={absoluteTime(done.at)}>Done {relativeTime(done.at)} by {done.by}</span>
                : stamp && <span title={absoluteTime(stamp)}>Updated {relativeTime(stamp)}</span>}
              {due && !done && <span className="ab-due">Due: {due}</span>}
            </span>
          </span>
          {showOwner && (
            <span className="ab-owner"><Avatar name={action.owner} size="sm" /><span>{action.owner}</span></span>
          )}
          <span className="ab-chevron" aria-hidden="true">{open ? '−' : '+'}</span>
        </button>
        {!done && action.key && action.canComplete && (
          <button type="button" className="ab-quick-done" aria-label={`Mark done: ${name}`} title="Mark done" onClick={onAskDone}>✓ Done</button>
        )}
      </div>

      {confirming && !done && (
        <div className="ab-confirm" role="group" aria-label="Confirm mark done">
          <p><strong>Mark “{name}” as done?</strong> {planeLinked ? planeCopy(planeWriteMode) : 'It is recorded in the dashboard with your name and the time.'}</p>
          <label>Note (optional)
            <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} placeholder="e.g. merged and verified on Pilot" />
          </label>
          <div className="ab-confirm-actions">
            <button type="button" className="ab-btn ab-btn-primary" disabled={busy} onClick={() => onConfirmDone(note)}>{busy ? 'Saving…' : 'Confirm done'}</button>
            <button type="button" className="ab-btn" disabled={busy} onClick={onCancel}>Cancel</button>
          </div>
        </div>
      )}

      {open && (
        <div className="ab-detail">
          <p>{action.detail ?? 'No additional detail recorded for this action.'}</p>
          {done && (
            <p className="ab-done-note">
              Done by <strong>{done.by}</strong> · {absoluteTime(done.at)}{done.note ? ` — “${done.note}”` : ''}.{' '}
              {planeLinked
                ? (done.planeSynced ? 'Plane: set to Done ✓' : `Plane was not changed — ${done.planeError ?? 'reason unknown'}`)
                : 'Recorded in the dashboard.'}
            </p>
          )}
          <dl>
            <div><dt>Status</dt><dd>{action.status ?? 'Not recorded'}</dd></div>
            <div><dt>Priority</dt><dd>{priority?.label ?? 'Not recorded'}</dd></div>
            <div><dt>Owner</dt><dd>{action.owner ?? 'Not recorded'}</dd></div>
            <div><dt>Source</dt><dd>{action.source ?? 'Not recorded'}</dd></div>
            <div><dt>Last updated</dt><dd>{stamp ? absoluteTime(stamp) : 'Not recorded'}</dd></div>
            <div><dt>Due</dt><dd>{due ?? 'No date recorded'}</dd></div>
          </dl>
          {!done && action.key && !action.canComplete && (
            <p className="ab-locked-note">Only {action.owner} or a PM/lead can mark this done.</p>
          )}
          <div className="ab-detail-actions">
            {project && <button type="button" className="ab-link" onClick={() => onOpenProject(project.id)}>Open {project.name} context →</button>}
            {done && done.canManage && planeLinked && !done.planeSynced && <button type="button" className="ab-link" disabled={busy} onClick={onRetry}>Retry Plane update</button>}
            {done && done.canManage && !done.planeSynced && <button type="button" className="ab-link" disabled={busy} onClick={onReopen}>Reopen</button>}
          </div>
        </div>
      )}
    </li>
  );
}

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
        <button type="button" className="project-link" onClick={() => onOpenProject(project.id)}>{project.name}</button>
        <span className="cell-client">{project.client}</span>
        <Status value={row.health} />
      </td>
      <td className="cell-progress"><strong>{row.milestone}</strong><span>{row.latestUpdate}</span></td>
      <td className="cell-blocker">{row.blocker}</td>
      <td className="cell-owner"><strong>{row.owner}</strong><span className={developerMissing ? 'missing' : ''}>{row.developer}</span></td>
      <td className="cell-freshness"><FreshnessBadge freshness={freshness} prefix="Updated" /></td>
      <td className="cell-next"><strong>{row.nextDecision}</strong>{project.nextWhy && <span>{project.nextWhy}</span>}</td>
    </tr>
  );
}

export function MeetingView({ projects, developers, githubConnected, planeConnected, onOpenProject, currentDeveloperId, query = '', planeWriteMode = 'disabled', signals, onChanged }) {
  const [chosenPersonId, setChosenPersonId] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [notice, setNotice] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [openGroups, setOpenGroups] = useState(() => new Set(GROUPS.filter((g) => !g.collapsed).map((g) => g.id)));
  const [showContext, setShowContext] = useState(false);

  const hasSelf = Boolean(currentDeveloperId && developers.some((d) => d.id === currentDeveloperId));
  const personId = chosenPersonId ?? (hasSelf ? currentDeveloperId : 'all');

  const actions = useMemo(() => developers.flatMap((developer) => (developer.actions ?? []).map((action, index) => ({
    ...action,
    owner: action.owner ?? developer.name,
    _id: `${developer.id}-${index}-${action.title}`,
    _developerId: developer.id,
    _group: action.completed ? 'done' : groupFor(action.status),
  }))), [developers]);

  const activeCount = (list) => list.filter((a) => a._group !== 'backlog' && a._group !== 'done').length;

  const people = useMemo(() => {
    const withWork = developers
      .filter((d) => d.id === currentDeveloperId || (d.actions ?? []).length > 0)
      .map((d) => ({ id: d.id, name: d.name, isSelf: d.id === currentDeveloperId, count: activeCount(actions.filter((a) => a._developerId === d.id)) }))
      .sort((a, b) => (b.isSelf - a.isSelf) || a.name.localeCompare(b.name));
    return [...withWork, { id: 'all', name: 'Everyone', isAll: true, count: activeCount(actions) }];
  }, [developers, actions, currentDeveloperId]);

  const term = query.trim().toLowerCase();
  const personActions = useMemo(() => actions
    .filter((a) => personId === 'all' || a._developerId === personId)
    .filter((a) => !term || `${a.title} ${a.project ?? ''} ${a.detail ?? ''}`.toLowerCase().includes(term)), [actions, personId, term]);

  const grouped = useMemo(() => GROUPS.map((group) => ({
    group,
    items: personActions
      .filter((a) => a._group === group.id)
      .sort((a, b) => (group.id === 'done'
        ? String(b.completed?.at ?? '').localeCompare(String(a.completed?.at ?? ''))
        : ((PRIORITY[a.priority]?.rank ?? 9) - (PRIORITY[b.priority]?.rank ?? 9))
          || String(timestampOf(b) ?? '').localeCompare(String(timestampOf(a) ?? '')))),
  })), [personActions]);

  const person = people.find((p) => p.id === personId) ?? people[people.length - 1];
  const showOwner = personId === 'all';
  const projectGroups = useMemo(() => groupByBucket(projects), [projects]);
  const projectsNeedingAttention = projects.filter((p) => STATUS_BUCKETS[0].match(p.status) || STATUS_BUCKETS[1].match(p.status)).length;


  // Every write goes through the API, which records who did it; the board then reloads so what
  // is shown is what the server holds, not an optimistic guess.
  const submit = async (action, path, body, describe) => {
    setBusyKey(action.key);
    setNotice(null);
    try {
      const response = await apiFetch(path, { method: 'POST', body });
      setNotice(describe(response));
      setConfirming(null);
      await onChanged?.();
    } catch (error) {
      setNotice({ tone: 'error', text: error.message || 'That did not work. Nothing was changed.' });
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDone = (action, note) => submit(action, '/api/actions/complete', { key: action.key, note }, ({ completion, alreadyDone }) => {
    const shortName = splitTitle(action.title).name;
    if (alreadyDone) return { tone: 'info', text: `“${shortName}” was already marked done.` };
    if (!action.key.startsWith('plane:')) return { tone: 'ok', text: `Marked done: “${shortName}”.` };
    return completion.planeSynced
      ? { tone: 'ok', text: `Marked done and set to Done in Plane: “${shortName}”.` }
      : { tone: 'warn', text: `Marked done in the dashboard only — Plane was not changed. ${completion.planeError ?? ''}`.trim() };
  });

  const retryPlane = (action) => submit(action, '/api/actions/retry-plane', { key: action.key }, ({ completion }) => (
    completion.planeSynced ? { tone: 'ok', text: 'Plane updated to Done.' } : { tone: 'warn', text: `Plane still not changed. ${completion.planeError ?? ''}`.trim() }
  ));

  const reopen = (action) => submit(action, '/api/actions/reopen', { key: action.key }, () => ({ tone: 'info', text: 'Reopened.' }));

  const toggleGroup = (id) => setOpenGroups((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const jumpToGroup = (id) => {
    setOpenGroups((current) => new Set(current).add(id));
    setTimeout(() => document.getElementById(`ab-group-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <section className="ab" aria-labelledby="ab-heading">
      <header className="ab-head">
        <div>
          <p className="eyebrow">Team meeting</p>
          <h2 id="ab-heading">Action board</h2>
          <p className="ab-lead">
            {person.isAll ? 'Everyone’s work' : person.isSelf ? 'Your work' : `${person.name}’s work`}, most urgent first.
            Pick a person to hand over the screen.
          </p>
        </div>
        <p className="ab-sources">
          <span className={planeConnected ? 'on' : ''}>Plane {planeConnected ? 'synced' : 'not connected'}</span>
          <span className={githubConnected ? 'on' : ''}>Git {githubConnected ? 'synced' : 'not connected'}</span>
        </p>
      </header>

      {notice && (
        <div className={`ab-notice ab-notice-${notice.tone}`} role="status">
          <span>{notice.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      <nav className="ab-people" aria-label="Whose actions to show">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`ab-person ${p.id === personId ? 'active' : ''} ${p.isAll ? 'is-all' : ''}`}
            aria-pressed={p.id === personId}
            onClick={() => { setChosenPersonId(p.id); setExpanded(null); }}
          >
            {p.isAll ? <span className="ab-avatar ab-avatar-md ab-avatar-all" aria-hidden="true">All</span> : <Avatar name={p.name} />}
            <span className="ab-person-text">
              <strong>{p.name}{p.isSelf && <em> (you)</em>}</strong>
              <small>{p.count} active</small>
            </span>
          </button>
        ))}
      </nav>

      <SignalsPanel data={signals} personId={personId} personName={person.isAll ? undefined : person.name} planeWriteMode={planeWriteMode} busyKey={busyKey} onMarkDone={confirmDone} />

      <div className="ab-stats">
        {grouped.map(({ group, items }) => (
          <button key={group.id} type="button" className={`ab-stat tone-${group.tone}`} onClick={() => jumpToGroup(group.id)} disabled={!items.length}>
            <strong>{items.length}</strong>
            <span>{group.label}</span>
          </button>
        ))}
      </div>

      {personActions.length === 0 ? (
        <EmptyState
          title={term ? 'No actions match your search' : 'No actions recorded'}
          message={term ? 'Clear the search box to see every action.' : `${person.isAll ? 'Nobody' : person.name} has no actions in the latest sync. Plane items appear here once they are assigned in Plane.`}
        />
      ) : (
        <div className="ab-groups">
          {grouped.filter(({ items }) => items.length > 0).map(({ group, items }) => {
            const isOpen = openGroups.has(group.id);
            return (
              <section key={group.id} id={`ab-group-${group.id}`} className={`ab-group tone-${group.tone}`}>
                <button type="button" className="ab-group-head" aria-expanded={isOpen} onClick={() => toggleGroup(group.id)}>
                  <span className="ab-group-title"><strong>{group.label}</strong><span className="ab-count">{items.length}</span></span>
                  <span className="ab-group-hint">{group.hint}</span>
                  <span className="ab-group-toggle">{isOpen ? 'Hide' : 'Show'}</span>
                </button>
                {isOpen && (
                  <ul className="ab-list">
                    {items.map((action) => (
                      <ActionItem
                        key={action._id}
                        action={action}
                        open={expanded === action._id}
                        onToggle={() => setExpanded(expanded === action._id ? null : action._id)}
                        showOwner={showOwner}
                        onOpenProject={onOpenProject}
                        projects={projects}
                        planeWriteMode={planeWriteMode}
                        confirming={confirming === action._id}
                        busyKey={busyKey}
                        onAskDone={() => setConfirming(confirming === action._id ? null : action._id)}
                        onCancel={() => setConfirming(null)}
                        onConfirmDone={(note) => confirmDone(action, note)}
                        onRetry={() => retryPlane(action)}
                        onReopen={() => reopen(action)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <section className="health-context" aria-labelledby="health-context-heading">
        <button type="button" className="health-context-toggle" aria-expanded={showContext} onClick={() => setShowContext((value) => !value)}>
          <span><strong id="health-context-heading">Project health</strong><small>{projectsNeedingAttention} of {projects.length} projects blocked or need verification</small></span>
          <span>{showContext ? 'Hide' : 'Show projects'}</span>
        </button>
        {showContext && (
          <div className="meeting-groups">
            {projectGroups.filter((g) => g.projects.length > 0).map(({ bucket, projects: bucketProjects }) => (
              <section key={bucket.id} className={`meeting-group tone-${bucket.tone}`}>
                <BucketHeader bucket={bucket} count={bucketProjects.length} />
                <div className="meeting-table-wrap">
                  <table className="meeting-table">
                    <thead><tr><th scope="col">Project</th><th scope="col">Milestone & latest update</th><th scope="col">Blocker or decision needed</th><th scope="col">Owner · developer</th><th scope="col">Freshness</th><th scope="col">Next action</th></tr></thead>
                    <tbody>{bucketProjects.map((project) => <MeetingRow key={project.id} project={project} onOpenProject={onOpenProject} />)}</tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <footer className="meeting-footnote">Only recorded dates, owners and priorities are shown — the dashboard never invents deadlines, approvals or progress.</footer>
    </section>
  );
}
