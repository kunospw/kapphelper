// GET /api/signals — the rule-based "Needs attention" list (see ../signals.js).
// Read-only. Loads what the sync scripts already put in Postgres and computes on request,
// so it is always consistent with the board (no stored copy that can go stale).
import { Router } from 'express';
import { prisma } from '../db.js';
import { computeSignals } from '../signals.js';
import { canComplete } from '../auth/roles.js';

export const signalsRouter = Router();

signalsRouter.get('/', async (req, res) => {
  try {
    const [projects, developers, activities, planeItems, completionRows, runRows, ownerRows] = await Promise.all([
      prisma.project.findMany(),
      prisma.developer.findMany({ select: { id: true, name: true, aliases: true } }),
      prisma.activity.findMany({ select: { developerId: true, timestamp: true, origin: true } }),
      prisma.planeWorkItem.findMany(),
      prisma.actionCompletion.findMany(),
      Promise.all(['plane', 'github', 'local-git', 'captures'].map((source) => prisma.syncRun.findFirst({ where: { source }, orderBy: { refreshedAt: 'desc' } }))),
      prisma.action.findMany({ where: { externalId: { not: null } }, select: { externalId: true, developerId: true } }),
    ]);
    // Owners of a Plane item = developers holding an Action row for it (same source the actions API uses).
    const ownersByItem = new Map();
    for (const row of ownerRows) ownersByItem.set(row.externalId, [...(ownersByItem.get(row.externalId) ?? []), row.developerId]);
    const [plane, github, localGit, captures] = runRows;

    const lastActivity = new Map();
    const liveSource = new Set();
    for (const activity of activities) {
      const seen = lastActivity.get(activity.developerId);
      if (!seen || activity.timestamp > seen) lastActivity.set(activity.developerId, activity.timestamp);
      if (activity.origin === 'synced' || activity.origin === 'capture') liveSource.add(activity.developerId);
    }

    const result = computeSignals({
      projects,
      developers: developers.map((developer) => ({
        ...developer,
        lastActivityAt: lastActivity.get(developer.id) ?? null,
        hasLiveSource: liveSource.has(developer.id),
      })),
      planeItems,
      completions: new Map(completionRows.map((row) => [row.key, row])),
      syncRuns: {
        plane: plane?.refreshedAt ?? null,
        github: (github ?? localGit)?.refreshedAt ?? null,
        captures: captures?.refreshedAt ?? null,
      },
      now: Date.now(),
    });

    // Computed for THIS viewer so the browser never re-implements the rule; POST /api/actions/complete enforces it again.
    const signals = result.signals.map((signal) => (signal.actionKey
      ? { ...signal, canComplete: canComplete(req.devUser, ownersByItem.get(signal.actionKey.slice('plane:'.length)) ?? []) }
      : signal));

    res.json({ generatedAt: new Date().toISOString(), ...result, signals });
  } catch (error) {
    console.error('[signals] failed:', error?.message ?? error);
    res.status(500).json({ error: 'Could not compute signals.' });
  }
});
