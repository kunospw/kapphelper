function normalized(value) { return value?.trim().toLowerCase() ?? ''; }
function identityKey(value) { return normalized(value).replace(/[^a-z0-9]/g, ''); }

function findDeveloper(developers, assignee) {
  const values = [assignee.name, assignee.email].map(normalized).filter(Boolean);
  const identities = values.map(identityKey).filter(Boolean);
  return developers.find((developer) => {
    const candidates = [developer.name, ...(developer.aliases ?? []), developer.githubLogin, developer.email]
      .map(normalized)
      .filter(Boolean);
    return candidates.some((candidate) => values.includes(candidate) || identities.includes(identityKey(candidate)));
  });
}

function isClosed(state) { return /done|completed|cancelled|canceled|closed/i.test(String(state)); }

function singaporeDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Meeting presentation rule: hide only work items updated on the current SGT day.
// They reappear automatically tomorrow; the source snapshot remains untouched.
function hideForTodayPresentation(item) {
  return singaporeDateKey(item.updatedAt) === singaporeDateKey(new Date());
}

export function mergePlaneActivity(portfolio, plane) {
  if (!plane?.generatedAt || !Array.isArray(plane.workItems)) return portfolio;
  const developers = structuredClone(portfolio.developerActivity ?? []);
  for (const item of plane.workItems.filter((workItem) => !isClosed(workItem.state) && !hideForTodayPresentation(workItem))) {
    const assignees = item.assignees?.length ? item.assignees : [{ name: 'Unassigned', email: null }];
    for (const assignee of assignees) {
      let developer = findDeveloper(developers, assignee);
      if (!developer) {
        developer = { id: `plane-${normalized(assignee.email || assignee.name).replace(/[^a-z0-9]+/g, '-')}`, name: assignee.name, role: assignee.name === 'Unassigned' ? 'Unassigned · Plane' : 'Developer · Plane activity', focus: 'Plane work-item ownership has not yet been mapped to a KAppHelper developer profile.', lastUpdated: null, activities: [], actions: [] };
        developers.push(developer);
      }
      developer.activities.unshift({ timestamp: item.updatedAt, project: plane.project.name, title: `${item.identifier} · ${item.name}`, summary: `Plane status: ${item.state}${item.priority && item.priority !== 'none' ? ` · Priority: ${item.priority}` : ''}.`, source: { type: 'plane', reference: item.identifier }, url: item.url });
      developer.actions.unshift({ project: plane.project.name, status: item.state, title: `${item.identifier} · ${item.name}`, detail: `Plane work item${item.priority && item.priority !== 'none' ? ` · Priority: ${item.priority}` : ''}.`, source: 'Plane', due: item.targetDate || 'No due date', createdAt: item.createdAt ?? null });
      if (!developer.lastUpdated || item.updatedAt > developer.lastUpdated) developer.lastUpdated = item.updatedAt;
    }
  }
  for (const developer of developers) {
    developer.activities.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
    developer.activities = developer.activities.slice(0, 30);
    developer.actions = developer.actions.slice(0, 20);
  }
  return { ...portfolio, developerActivity: developers, plane: { generatedAt: plane.generatedAt, workItemCount: plane.workItems.length } };
}
