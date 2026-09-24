// Replaces publish-firestore.mjs. Reads the hand-maintained data/portfolio.json
// and upserts it into Postgres: Project rows verbatim, and Developer rows plus
// their "manual" (hand-authored) Activity/Action rows. Sync scripts add
// "synced" rows on top of the same Developer via merge-activity.mjs — the two
// origins are combined at read time by the API, not here.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../server/src/db.js';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portfolioPath = resolve(dashboardRoot, 'data', 'portfolio.json');
const portfolio = JSON.parse(await readFile(portfolioPath, 'utf8'));

const projects = portfolio.projects ?? [];
const developers = portfolio.developerActivity ?? [];
const nameToId = new Map(projects.map((project) => [project.name, project.id]));

for (const project of projects) {
  await prisma.project.upsert({
    where: { id: project.id },
    update: {
      name: project.name,
      kind: project.kind ?? null,
      status: project.status ?? null,
      client: project.client ?? null,
      owner: project.owner ?? null,
      activeDeveloper: project.activeDeveloper ?? null,
      lifecycle: project.lifecycle ?? null,
      summary: project.summary ?? null,
      repositories: project.repositories ?? [],
      lastConfirmed: project.lastConfirmed ?? null,
      nextStep: project.nextStep ?? null,
      nextWhy: project.nextWhy ?? null,
      risks: project.risks ?? [],
      release: project.release ?? null,
      meeting: project.meeting ?? null,
      sources: project.sources ?? [],
      evidence: project.evidence ?? [],
    },
    create: {
      id: project.id,
      name: project.name,
      kind: project.kind ?? null,
      status: project.status ?? null,
      client: project.client ?? null,
      owner: project.owner ?? null,
      activeDeveloper: project.activeDeveloper ?? null,
      lifecycle: project.lifecycle ?? null,
      summary: project.summary ?? null,
      repositories: project.repositories ?? [],
      lastConfirmed: project.lastConfirmed ?? null,
      nextStep: project.nextStep ?? null,
      nextWhy: project.nextWhy ?? null,
      risks: project.risks ?? [],
      release: project.release ?? null,
      meeting: project.meeting ?? null,
      sources: project.sources ?? [],
      evidence: project.evidence ?? [],
    },
  });
}

for (const developer of developers) {
  await prisma.developer.upsert({
    where: { id: developer.id },
    update: {
      name: developer.name,
      githubLogin: developer.githubLogin ?? null,
      role: developer.role ?? null,
      focus: developer.focus ?? null,
      lastUpdated: developer.lastUpdated ? new Date(developer.lastUpdated) : null,
    },
    create: {
      id: developer.id,
      name: developer.name,
      githubLogin: developer.githubLogin ?? null,
      role: developer.role ?? null,
      focus: developer.focus ?? null,
      lastUpdated: developer.lastUpdated ? new Date(developer.lastUpdated) : null,
    },
  });

  await prisma.activity.deleteMany({ where: { developerId: developer.id, origin: 'manual' } });
  for (const activity of developer.activities ?? []) {
    const projectId = nameToId.get(activity.project);
    await prisma.activity.create({
      data: {
        developerId: developer.id,
        projectId: projectId ?? null,
        projectLabel: projectId ? null : activity.project ?? null,
        timestamp: new Date(activity.timestamp),
        title: activity.title,
        summary: activity.summary ?? null,
        sourceType: activity.source?.type ?? 'manual',
        sourceRef: activity.source?.reference ?? null,
        url: activity.url ?? null,
        origin: 'manual',
      },
    });
  }

  await prisma.action.deleteMany({ where: { developerId: developer.id, origin: 'manual' } });
  for (const action of developer.actions ?? []) {
    const projectId = nameToId.get(action.project);
    await prisma.action.create({
      data: {
        developerId: developer.id,
        projectId: projectId ?? null,
        projectLabel: projectId ? null : action.project ?? null,
        status: action.status ?? null,
        title: action.title,
        detail: action.detail ?? null,
        source: action.source ?? null,
        due: action.due ?? null,
        createdAtSrc: action.createdAt ? new Date(action.createdAt) : null,
        updatedAtSrc: action.updatedAt ? new Date(action.updatedAt) : null,
        origin: 'manual',
      },
    });
  }
}

const refreshedAt = new Date();
await prisma.syncRun.create({
  data: {
    source: 'portfolio',
    status: 'success',
    detail: { projectCount: projects.length, developerCount: developers.length },
    refreshedAt,
  },
});

console.log(`Portfolio published to Postgres at ${refreshedAt.toISOString()} (${projects.length} projects, ${developers.length} developers).`);
await prisma.$disconnect();
