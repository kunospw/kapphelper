import { useMemo, useState } from 'react';

// "Needs attention": rule-based signals from GET /api/signals (server/src/signals.js).
// Grouped per project / person so a project with five problems is one card, not five rows.
// Not AI — every line is a measured fact with a link back to its record.

const TYPE_LABEL = {
  project_blocked: 'Blocked',
  project_no_owner: 'No owner',
  project_no_milestone: 'No milestone',
  project_stale: 'Not re-confirmed',
  plane_overdue: 'Overdue',
  plane_stalled: 'Stalled',
  plane_unassigned: 'Unassigned',
  developer_silent: 'No activity',
  source_stale: 'Sync old',
};

const RANK = { high: 0, medium: 1, low: 2 };
const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

function groupKey(signal) {
  if (signal.projectName) return signal.projectName;
  if (signal.scope === 'developer') return 'People';
  if (signal.scope === 'source') return 'Data freshness';
  return 'Other';
}

function summarize(signals) {
  const counts = new Map();
  for (const signal of signals) counts.set(signal.type, (counts.get(signal.type) ?? 0) + 1);
  return [...counts].map(([type, count]) => `${count > 1 ? `${count} × ` : ''}${TYPE_LABEL[type] ?? type}`).join(' · ');
}

function SignalRow({ signal }) {
  return (
    <li className={`sg-row sg-${signal.severity}`}>
      <span className="sg-dot" title={`${SEVERITY_LABEL[signal.severity]} severity`} aria-label={`${SEVERITY_LABEL[signal.severity]} severity`} />
      <div className="sg-body">
        <p className="sg-title"><span className="sg-type">{TYPE_LABEL[signal.type] ?? signal.type}</span>{signal.title}</p>
        <p className="sg-detail">{signal.detail}</p>
        {signal.evidence?.length > 0 && (
          <p className="sg-evidence">
            {signal.evidence.map((entry) => (
              <span key={`${entry.label}-${entry.text}`}>
                {entry.label}: {entry.url ? <a href={entry.url} target="_blank" rel="noreferrer">{entry.text}</a> : entry.text}
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

export function SignalsPanel({ data, personId = 'all', personName }) {
  const [toggled, setToggled] = useState(() => new Set());
  const [showLow, setShowLow] = useState(false);

  const visible = useMemo(() => {
    const all = data?.signals ?? [];
    const scoped = personId === 'all' ? all : all.filter((signal) => signal.developerIds?.includes(personId));
    return showLow ? scoped : scoped.filter((signal) => signal.severity !== 'low');
  }, [data, personId, showLow]);

  const groups = useMemo(() => {
    const byKey = new Map();
    for (const signal of visible) {
      const key = groupKey(signal);
      byKey.set(key, [...(byKey.get(key) ?? []), signal]);
    }
    return [...byKey].map(([name, signals]) => ({
      name,
      signals,
      top: signals.reduce((best, signal) => Math.min(best, RANK[signal.severity]), 2),
    })).sort((a, b) => (a.top - b.top) || (b.signals.length - a.signals.length) || a.name.localeCompare(b.name));
  }, [visible]);

  if (!data) return null;

  const counts = visible.reduce((total, signal) => ({ ...total, [signal.severity]: (total[signal.severity] ?? 0) + 1 }), {});
  const lowHidden = !showLow && (data.counts?.low ?? 0) > 0 && personId === 'all';
  // Only the most urgent group starts open — each header already summarises its group, and a fully
  // expanded list is too long to talk through. Anyone can open or close any group.
  const isOpen = (group, index) => (index === 0) !== toggled.has(group.name);
  const flip = (name) => setToggled((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  });

  return (
    <section className="sg" aria-labelledby="sg-heading">
      <header className="sg-head">
        <div>
          <h3 id="sg-heading">Needs attention{personId !== 'all' && personName ? ` — ${personName}` : ''}</h3>
          <p>
            Worked out by rules from the synced data, not by AI. Each line links to its record.{' '}
            {visible.length > 0 && <strong>{counts.high ?? 0} high · {counts.medium ?? 0} medium{showLow ? ` · ${counts.low ?? 0} low` : ''}</strong>}
          </p>
        </div>
        {lowHidden && <button type="button" className="ab-link" onClick={() => setShowLow(true)}>Show {data.counts.low} low</button>}
        {showLow && <button type="button" className="ab-link" onClick={() => setShowLow(false)}>Hide low</button>}
      </header>

      {groups.length === 0 ? (
        <p className="sg-empty">
          {personId === 'all'
            ? 'Nothing needs attention by these rules. That only covers what the connected sources can see.'
            : `Nothing flagged for ${personName ?? 'this person'} by these rules.`}
        </p>
      ) : (
        <ul className="sg-groups">
          {groups.map((group, index) => {
            const open = isOpen(group, index);
            return (
              <li key={group.name} className={`sg-group sg-group-${['high', 'medium', 'low'][group.top]}`}>
                <button type="button" className="sg-group-head" aria-expanded={open} onClick={() => flip(group.name)}>
                  <span className="sg-dot" aria-hidden="true" />
                  <strong>{group.name}</strong>
                  <span className="sg-summary">{summarize(group.signals)}</span>
                  <span className="sg-toggle">{open ? 'Hide' : 'Show'}</span>
                </button>
                {open && <ul className="sg-list">{group.signals.map((signal) => <SignalRow key={signal.id} signal={signal} />)}</ul>}
              </li>
            );
          })}
        </ul>
      )}

      <details className="sg-how">
        <summary>How this is calculated</summary>
        <ul>
          <li>Project: blocked · no confirmed developer · no next milestone · not re-confirmed for more than {data.thresholds?.projectStaleDays} days ({data.thresholds?.projectVeryStaleDays}+ is high).</li>
          <li>Plane: open items past their target date · In Progress with no update for more than {data.thresholds?.planeStalledDays} days · urgent/high with no assignee. Items marked done here are skipped.</li>
          <li>People: no recorded activity for more than {data.thresholds?.developerSilentDays} days — a prompt to ask, not a judgement; sources only cover connected repositories.</li>
          <li>Data: a source not synced for more than {data.thresholds?.sourceStaleHours} hours.</li>
        </ul>
      </details>
    </section>
  );
}
