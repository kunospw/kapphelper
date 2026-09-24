import { Router } from 'express';
import { prisma } from '../db.js';
import { planeWriteMode } from '../plane.js';
import { slugTitle } from './actions.js';

function shapeActivity(row) {
  return {
    timestamp: row.timestamp.toISOString(),
    project: row.project?.name ?? row.projectLabel ?? null,
    title: row.title,
    summary: row.summary,
    source: { type: row.sourceType, reference: row.sourceRef },
    url: row.url ?? null,
  };
}

const COMPLETED_VISIBLE_DAYS = 30;
const STALE_TOLERANCE_MS = 60_000;

// Stable identity for an action across syncs (Action row ids change every merge).
function actionKey(row, developer) {
  if (row.externalId) return `plane:${row.externalId}`;
  if (row.origin === 'manual') return `manual:${developer.id}:${slugTitle(row.title)}`;
  return null; // synced row from before externalId existed — resolves on the next sync
}

// A completion only counts while the source has not moved on: if the Plane item
// was edited (e.g. reopened) after we recorded it, the dashboard shows it open again.
function activeCompletion(row, completion) {
  if (!completion) return null;
  if (row.origin === 'synced' && row.updatedAtSrc && row.updatedAtSrc.getTime() > completion.completedAt.getTime() + STALE_TOLERANCE_MS) return null;
  return completion;
}

function shapeAction(row, developer, completions) {
  const key = actionKey(row, developer);
  const completion = key ? activeCompletion(row, completions.get(key)) : null;
  return {
    key,
    project: row.project?.name ?? row.projectLabel ?? null,
    status: completion ? 'Done' : row.status,
    priority: row.priority,
    owner: developer.name,
    title: row.title,
    detail: row.detail,
    source: row.source,
    due: row.due,
    createdAt: row.createdAtSrc ? row.createdAtSrc.toISOString() : null,
    updatedAt: row.updatedAtSrc ? row.updatedAtSrc.toISOString() : null,
    completed: completion
      ? {
        by: completion.completedBy,
        at: completion.completedAt.toISOString(),
        note: completion.note,
        planeSynced: completion.planeSynced,
        planeError: completion.planeError,
        planeLinked: Boolean(completion.planeItemId),
      }
      : null,
  };
}

export const portfolioRouter = Router();

portfolioRouter.get('/portfolio', async (_req, res) => {
  const cutoff = new Date(Date.now() - COMPLETED_VISIBLE_DAYS * 86_400_000);
  const [developers, projects, portfolioRun, completionRows] = await Promise.all([
    prisma.developer.findMany({
      include: {
        activities: {
          include: { project: { select: { name: true } } },
          orderBy: [{ timestamp: 'desc' }],
          take: 30,
        },
        actions: {
          include: { project: { select: { name: true } } },
          orderBy: [
            { updatedAtSrc: { sort: 'desc', nulls: 'last' } },
            { createdAtSrc: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          take: 150,
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.project.findMany({ orderBy: { name: 'asc' } }),
    prisma.syncRun.findFirst({ where: { source: 'portfolio' }, orderBy: { refreshedAt: 'desc' } }),
    prisma.actionCompletion.findMany(),
  ]);
  const completions = new Map(completionRows.map((row) => [row.key, row]));

  res.json({
    generatedAt: portfolioRun?.refreshedAt?.toISOString() ?? null,
    planeWriteMode: planeWriteMode(),
    developerActivity: developers.map((developer) => ({
      id: developer.id,
      name: developer.name,
      githubLogin: developer.githubLogin,
      role: developer.role,
      focus: developer.focus,
      lastUpdated: developer.lastUpdated ? developer.lastUpdated.toISOString().slice(0, 10) : null,
      activities: developer.activities.map(shapeActivity),
      // Completed items older than the window drop off the board; they stay in ActionCompletion as the audit trail.
      actions: developer.actions
        .map((action) => shapeAction(action, developer, completions))
        .filter((action) => !action.completed || new Date(action.completed.at) >= cutoff),
    })),
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      kind: project.kind,
      status: project.status,
      client: project.client,
      owner: project.owner,
      activeDeveloper: project.activeDeveloper,
      lifecycle: project.lifecycle,
      summary: project.summary,
      repositories: project.repositories,
      lastConfirmed: project.lastConfirmed,
      nextStep: project.nextStep,
      nextWhy: project.nextWhy,
      risks: project.risks,
      release: project.release,
      meeting: project.meeting,
      sources: project.sources,
      evidence: project.evidence,
    })),
  });
});

portfolioRouter.get('/sync-status', async (_req, res) => {
  const sources = ['local-git', 'github', 'plane', 'portfolio'];
  const latest = await Promise.all(
    sources.map((source) => prisma.syncRun.findFirst({ where: { source }, orderBy: { refreshedAt: 'desc' } })),
  );
  const [localGit, github, plane] = latest;

  const [commitRepoCount, workItemCount] = await Promise.all([
    prisma.githubCommit.findMany({ distinct: ['repository'], select: { repository: true } }).then((rows) => rows.length),
    prisma.planeWorkItem.count(),
  ]);

  // github/plane blocks mirror what mergeGithubActivity/mergePlaneActivity used to
  // stamp onto the portfolio object client-side — App.jsx reads
  // data.github.generatedAt / data.plane.generatedAt to show connection status.
  res.json({
    runs: Object.fromEntries(sources.map((source, index) => [source, latest[index]?.refreshedAt?.toISOString() ?? null])),
    github: (localGit || github)
      ? { generatedAt: (github ?? localGit).refreshedAt.toISOString(), repositoryCount: commitRepoCount }
      : null,
    plane: plane ? { generatedAt: plane.refreshedAt.toISOString(), workItemCount } : null,
  });
});
