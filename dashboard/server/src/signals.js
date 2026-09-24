// "Needs attention" signals — computed with plain rules, no AI.
//
// Every signal answers three things: what is wrong, how we know (evidence with links back to
// the source record), and who it concerns. Nothing is inferred beyond the recorded data: a
// missing milestone is reported as missing, not guessed. This is also the input layer the AI
// advisor will use later, so its suggestions can only be about facts that were actually measured.
//
// Pure function: pass in plain data, get signals out (see signals.test.mjs).

export const THRESHOLDS = {
  projectStaleDays: 10, // last confirmed this long ago -> medium
  projectVeryStaleDays: 21, // -> high
  planeStalledDays: 7, // In Progress with no update this long
  planeOverdueHighDays: 7, // past target date by this many days -> high (else medium)
  developerSilentDays: 5, // no recorded activity this long
  sourceStaleHours: 3, // a sync older than this is flagged (the scheduler is hourly while the API runs)
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

const norm = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isClosed = (state) => /done|completed|cancel|closed/i.test(String(state ?? ''));
const isInProgress = (state) => /progress|review|doing|testing/i.test(String(state ?? ''));
const isPaused = (project) => /paused|no update/i.test(String(project.status ?? ''));
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function ageDays(value, now) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : Math.floor((now - time) / DAY_MS);
}

// "Dyah Puspo Rini" / "Dyah" -> the one Developer it plainly refers to, else null.
function findDeveloperIds(text, developers) {
  const key = norm(text);
  if (!key || /verif/i.test(String(text))) return [];
  const exact = developers.filter((d) => norm(d.name) === key || (d.aliases ?? []).some((alias) => norm(alias) === key));
  if (exact.length) return exact.map((d) => d.id);
  const first = norm(String(text).split(/\s+/)[0]);
  const byFirstName = developers.filter((d) => norm(String(d.name).split(/\s+/)[0]) === first);
  return byFirstName.length === 1 ? [byFirstName[0].id] : [];
}

function make(signal) {
  return { developerIds: [], evidence: [], ...signal };
}

/**
 * @param {object} input
 * @param {Array}  input.projects    Project rows (status, activeDeveloper, lastConfirmed, meeting, name, id)
 * @param {Array}  input.developers  { id, name, aliases, lastActivityAt, hasLiveSource }
 * @param {Array}  input.planeItems  PlaneWorkItem rows (open or closed; closed are ignored)
 * @param {Map}    input.completions ActionCompletion by key ("plane:<id>") — items done in the dashboard are skipped
 * @param {object} input.syncRuns    { plane, github, captures } last sync ISO time or null
 * @param {number} input.now         epoch ms
 */
export function computeSignals({ projects = [], developers = [], planeItems = [], completions = new Map(), syncRuns = {}, now = Date.now() } = {}) {
  const signals = [];

  // ---- project-level
  for (const project of projects) {
    const paused = isPaused(project);
    const owners = findDeveloperIds(project.activeDeveloper, developers);
    const ref = { label: 'Project', text: project.name };
    const base = { scope: 'project', projectId: project.id, projectName: project.name, developerIds: owners };

    if (project.status === 'Release blocked') {
      const blocker = project.meeting?.blocker;
      signals.push(make({
        ...base, id: `project_blocked:${project.id}`, type: 'project_blocked', severity: 'high',
        title: `${project.name} is blocked`,
        detail: blocker && blocker !== 'No blocker recorded.' ? blocker : 'Marked "Release blocked" with no blocker text recorded.',
        evidence: [ref],
      }));
    }

    if (!paused && (!project.activeDeveloper || /verif/i.test(project.activeDeveloper))) {
      signals.push(make({
        ...base, id: `project_no_owner:${project.id}`, type: 'project_no_owner',
        severity: project.status === 'Release blocked' || project.status === 'Active' || project.status === 'On track' ? 'high' : 'medium',
        title: `${project.name} has no confirmed developer`,
        detail: 'Nobody is recorded as driving this project, so nobody is accountable for its next step.',
        evidence: [ref],
      }));
    }

    if (!paused && !project.meeting?.milestone) {
      signals.push(make({
        ...base, id: `project_no_milestone:${project.id}`, type: 'project_no_milestone', severity: 'medium',
        title: `${project.name} has no next milestone`,
        detail: 'Without a milestone and target date the dashboard cannot say whether this project is on track.',
        evidence: [ref],
      }));
    }

    const age = ageDays(project.lastConfirmed, now);
    if (age === null) {
      signals.push(make({
        ...base, id: `project_stale:${project.id}`, type: 'project_stale', severity: paused ? 'low' : 'medium',
        title: `${project.name} has never been confirmed`, detail: 'No "last confirmed" date is recorded.', evidence: [ref],
      }));
    } else if (age > THRESHOLDS.projectStaleDays) {
      signals.push(make({
        ...base, id: `project_stale:${project.id}`, type: 'project_stale',
        severity: paused ? 'low' : age > THRESHOLDS.projectVeryStaleDays ? 'high' : 'medium',
        title: `${project.name} was last confirmed ${plural(age, 'day')} ago`,
        detail: `Status "${project.status ?? 'unknown'}" has not been re-verified since ${project.lastConfirmed}. A developer can refresh it with a /capture status update.`,
        evidence: [ref, { label: 'Last confirmed', text: String(project.lastConfirmed) }],
      }));
    }
  }

  // ---- Plane work items
  const developerByName = (assignee) => findDeveloperIds(assignee.name ?? assignee.email, developers);
  for (const item of planeItems) {
    if (isClosed(item.state)) continue;
    const completion = completions.get(`plane:${item.id}`);
    if (completion && (!item.updatedAt || new Date(item.updatedAt).getTime() <= completion.completedAt.getTime() + 60_000)) continue;

    const assignees = Array.isArray(item.assignees) ? item.assignees : [];
    const names = assignees.map((a) => a.name).filter(Boolean);
    const developerIds = [...new Set(assignees.flatMap(developerByName))];
    const label = item.identifier ?? item.id;
    const evidence = [{ label: 'Plane item', text: label, url: item.url ?? null }];
    const base = { scope: 'action', projectName: item.project ?? null, developerIds, evidence };
    const who = names.length ? names.join(', ') : 'Unassigned';

    if (item.targetDate) {
      const due = new Date(`${item.targetDate}T23:59:59+08:00`).getTime();
      const overdueDays = Math.floor((now - due) / DAY_MS);
      if (!Number.isNaN(due) && now > due) {
        signals.push(make({
          ...base, id: `plane_overdue:${item.id}`, type: 'plane_overdue',
          severity: overdueDays >= THRESHOLDS.planeOverdueHighDays ? 'high' : 'medium',
          title: `${label} is ${plural(Math.max(overdueDays, 1), 'day')} past its target date`,
          detail: `${item.name} · ${item.state} · ${who} · target ${item.targetDate}`,
          evidence: [...evidence, { label: 'Target date', text: item.targetDate }],
        }));
      }
    }

    const idle = ageDays(item.updatedAt, now);
    if (isInProgress(item.state) && idle !== null && idle > THRESHOLDS.planeStalledDays) {
      signals.push(make({
        ...base, id: `plane_stalled:${item.id}`, type: 'plane_stalled', severity: 'medium',
        title: `${label} has been "${item.state}" with no update for ${plural(idle, 'day')}`,
        detail: `${item.name} · ${who}. Either it is blocked, finished but not updated, or Plane is out of date.`,
      }));
    }

    if (!names.length && (item.priority === 'urgent' || item.priority === 'high')) {
      signals.push(make({
        ...base, id: `plane_unassigned:${item.id}`, type: 'plane_unassigned', severity: item.priority === 'urgent' ? 'high' : 'medium',
        title: `${label} (${item.priority}) has no assignee`, detail: `${item.name} · ${item.state}`,
      }));
    }
  }

  // ---- developers: a prompt to ask, not a verdict
  for (const developer of developers) {
    const silent = ageDays(developer.lastActivityAt, now);
    if (silent === null || silent <= THRESHOLDS.developerSilentDays) continue;
    signals.push(make({
      id: `developer_silent:${developer.id}`, type: 'developer_silent', severity: 'medium', scope: 'developer',
      developerIds: [developer.id], projectName: null,
      title: `${developer.name}: no recorded activity for ${plural(silent, 'day')}`,
      detail: developer.hasLiveSource
        ? 'Worth asking whether they are blocked or waiting on something.'
        : 'No connected source covers this developer\'s repositories yet, so this may just be missing data — ask them, and have them log a /capture update.',
      evidence: [{ label: 'Last recorded activity', text: developer.lastActivityAt ? new Date(developer.lastActivityAt).toISOString().slice(0, 10) : 'none' }],
    }));
  }

  // ---- the data itself
  for (const [source, label] of [['plane', 'Plane'], ['github', 'Git'], ['captures', 'Captures']]) {
    const last = syncRuns[source];
    const hours = last ? (now - new Date(last).getTime()) / HOUR_MS : null;
    if (!last) {
      signals.push(make({ id: `source_stale:${source}`, type: 'source_stale', severity: 'low', scope: 'source', title: `${label} has never been synced`, detail: 'Anything that depends on it is missing from this view.' }));
    } else if (hours > THRESHOLDS.sourceStaleHours) {
      signals.push(make({
        id: `source_stale:${source}`, type: 'source_stale', severity: hours > 24 ? 'medium' : 'low', scope: 'source',
        title: `${label} data is ${Math.round(hours)} h old`,
        detail: 'The hourly sync only runs while the dashboard API is running. Run `npm run sync:all` or start `npm run server`.',
        evidence: [{ label: 'Last sync', text: new Date(last).toISOString() }],
      }));
    }
  }

  signals.sort((a, b) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  const counts = { high: 0, medium: 0, low: 0 };
  for (const signal of signals) counts[signal.severity] += 1;
  return { signals, counts, thresholds: THRESHOLDS };
}
