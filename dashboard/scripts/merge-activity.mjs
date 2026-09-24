// Server-side port of the old src/lib/githubActivity.js / planeActivity.js
// client-side merge. Reads the raw GithubCommit / PlaneWorkItem tables (kept
// fresh by sync-local-git.mjs / sync-github.mjs / sync-plane.mjs) and writes
// "synced" Activity/Action rows per Developer, matching commit/work-item
// authors to a Developer by githubLogin/email/name/aliases — creating a stub
// Developer row when nothing matches, same as the old client behavior.
//
// Run after the sync scripts (or on a schedule alongside them). Idempotent:
// every run replaces all origin="synced" rows from the current raw tables,
// so re-running never duplicates.
import { prisma } from '../server/src/db.js';

function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function normalized(value) { return value?.trim().toLowerCase() ?? ''; }
function identityKey(value) { return normalized(value).replace(/[^a-z0-9]/g, ''); }
function isClosed(state) { return /done|completed|cancelled|canceled|closed/i.test(String(state)); }

const developers = await prisma.developer.findMany();
const projects = await prisma.project.findMany({ select: { id: true, name: true } });
const projectIdByName = new Map(projects.map((project) => [project.name, project.id]));
const developerById = new Map(developers.map((developer) => [developer.id, developer]));
const newDevelopers = new Map(); // id -> data, created after matching so duplicates within one run reuse the same stub

function findByGithub({ authorLogin, authorEmail, authorName }) {
  const values = [authorLogin, authorEmail, authorName].filter(Boolean).map((v) => v.toLowerCase());
  for (const developer of [...developerById.values(), ...newDevelopers.values()]) {
    const candidates = [developer.githubLogin, developer.email, developer.name].filter(Boolean).map((v) => v.toLowerCase());
    if (candidates.some((candidate) => values.includes(candidate))) return developer;
  }
  return null;
}

function findByPlane({ name, email }) {
  const values = [name, email].map(normalized).filter(Boolean);
  const identities = values.map(identityKey).filter(Boolean);
  for (const developer of [...developerById.values(), ...newDevelopers.values()]) {
    const candidates = [developer.name, ...(Array.isArray(developer.aliases) ? developer.aliases : []), developer.githubLogin, developer.email]
      .map(normalized)
      .filter(Boolean);
    if (candidates.some((candidate) => values.includes(candidate) || identities.includes(identityKey(candidate)))) return developer;
  }
  return null;
}

function ensureGithubStub(commit) {
  let developer = findByGithub(commit);
  if (developer) return developer;
  const displayName = commit.authorName || commit.authorLogin || 'Unmapped Git contributor';
  const id = `github-${slug(commit.authorLogin || commit.authorEmail || displayName)}`;
  developer = newDevelopers.get(id) ?? {
    id, name: displayName, role: 'Developer · GitHub activity',
    focus: 'Git activity has not yet been mapped to a KAppHelper developer profile.',
    githubLogin: commit.authorLogin ?? null, email: null, aliases: [], lastUpdated: null,
  };
  newDevelopers.set(id, developer);
  return developer;
}

function ensurePlaneStub(assignee) {
  let developer = findByPlane(assignee);
  if (developer) return developer;
  const id = `plane-${slug(normalized(assignee.email || assignee.name))}`;
  developer = newDevelopers.get(id) ?? {
    id, name: assignee.name, role: assignee.name === 'Unassigned' ? 'Unassigned · Plane' : 'Developer · Plane activity',
    focus: 'Plane work-item ownership has not yet been mapped to a KAppHelper developer profile.',
    githubLogin: null, email: assignee.email ?? null, aliases: [], lastUpdated: null,
  };
  newDevelopers.set(id, developer);
  return developer;
}

const activityRows = [];
const actionRows = [];
const lastUpdatedById = new Map();
function bumpLastUpdated(id, timestamp) {
  if (!timestamp) return;
  const current = lastUpdatedById.get(id);
  if (!current || timestamp > current) lastUpdatedById.set(id, timestamp);
}

const commits = await prisma.githubCommit.findMany();
for (const commit of commits) {
  const developer = ensureGithubStub(commit);
  const projectName = commit.project ?? commit.repository;
  const syncLabel = commit.origin === 'local-git' ? 'local Git log sync' : 'read-only GitHub sync';
  activityRows.push({
    developerId: developer.id,
    projectId: projectIdByName.get(projectName) ?? null,
    projectLabel: projectIdByName.has(projectName) ? null : projectName,
    timestamp: commit.timestamp,
    title: commit.title ?? 'Untitled commit',
    summary: `Commit ${commit.sha} recorded from the ${syncLabel}.`,
    sourceType: 'commit',
    sourceRef: `${commit.repository}@${commit.sha}`,
    url: commit.url,
    origin: 'synced',
  });
  bumpLastUpdated(developer.id, commit.timestamp);
}

const workItems = await prisma.planeWorkItem.findMany();
for (const item of workItems.filter((wi) => !isClosed(wi.state))) {
  const assignees = Array.isArray(item.assignees) && item.assignees.length ? item.assignees : [{ name: 'Unassigned', email: null }];
  for (const assignee of assignees) {
    const developer = ensurePlaneStub(assignee);
    const projectName = item.project ?? 'Unknown project';
    const priorityNote = item.priority && item.priority !== 'none' ? ` · Priority: ${item.priority}` : '';
    activityRows.push({
      developerId: developer.id,
      projectId: projectIdByName.get(projectName) ?? null,
      projectLabel: projectIdByName.has(projectName) ? null : projectName,
      timestamp: item.updatedAt ?? item.createdAt ?? new Date(),
      title: `${item.identifier ?? item.id} · ${item.name}`,
      summary: `Plane status: ${item.state}${priorityNote}.`,
      sourceType: 'plane',
      sourceRef: item.identifier ?? item.id,
      url: item.url,
      origin: 'synced',
    });
    actionRows.push({
      developerId: developer.id,
      projectId: projectIdByName.get(projectName) ?? null,
      projectLabel: projectIdByName.has(projectName) ? null : projectName,
      status: item.state,
      priority: item.priority && item.priority !== 'none' ? item.priority : null,
      title: `${item.identifier ?? item.id} · ${item.name}`,
      detail: `Plane work item${priorityNote}.`,
      source: 'Plane',
      due: item.targetDate || 'No due date',
      createdAtSrc: item.createdAt,
      updatedAtSrc: item.updatedAt,
      origin: 'synced',
    });
    bumpLastUpdated(developer.id, item.updatedAt ?? item.createdAt);
  }
}

// Create stub developers discovered above, then apply lastUpdated bumps to everyone.
for (const developer of newDevelopers.values()) {
  await prisma.developer.create({ data: developer });
}
for (const [id, timestamp] of lastUpdatedById) {
  const existing = developerById.get(id) ?? newDevelopers.get(id);
  if (!existing?.lastUpdated || timestamp > existing.lastUpdated) {
    await prisma.developer.update({ where: { id }, data: { lastUpdated: timestamp } });
  }
}

await prisma.$transaction([
  prisma.activity.deleteMany({ where: { origin: 'synced' } }),
  prisma.action.deleteMany({ where: { origin: 'synced' } }),
  ...(activityRows.length ? [prisma.activity.createMany({ data: activityRows })] : []),
  ...(actionRows.length ? [prisma.action.createMany({ data: actionRows })] : []),
]);

console.log(`Merged activity: ${activityRows.length} activity rows, ${actionRows.length} action rows, ${newDevelopers.size} new developer stub(s).`);
await prisma.$disconnect();
