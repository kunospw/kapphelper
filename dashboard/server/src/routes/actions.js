// "Mark done" for dashboard actions.
//   POST /api/actions/complete     { key, note? }  record the completion; for Plane items also set Done in Plane
//   POST /api/actions/retry-plane  { key }         retry the Plane write of a completion that did not reach Plane
//   POST /api/actions/reopen       { key }         undo a local completion (never touches Plane once it was written)
//
// key is computed by GET /api/portfolio: "plane:<work-item id>" or
// "manual:<developerId>:<title-slug>". Every completion is stored with who did it and
// when (ActionCompletion), and Plane failures never lose the completion — the row
// records why Plane was not changed so it can be retried.
import { Router } from 'express';
import { prisma } from '../db.js';
import { PlaneError, markPlaneItemDone, planeWriteMode } from '../plane.js';
import { canComplete, canManageCompletion, describeWhoCanComplete } from '../auth/roles.js';

export function slugTitle(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function shapeCompletion(row) {
  return {
    key: row.key,
    completedBy: row.completedBy,
    completedAt: row.completedAt.toISOString(),
    note: row.note,
    planeSynced: row.planeSynced,
    planeError: row.planeError,
  };
}

// Owners = the Developers this action is assigned to (a Plane item can have several assignees,
// each of whom has an Action row carrying the item's externalId).
async function ownersOfPlaneItem(itemId) {
  const rows = await prisma.action.findMany({ where: { externalId: itemId }, select: { developerId: true, developer: { select: { name: true } } } });
  return { ids: [...new Set(rows.map((row) => row.developerId))], names: [...new Set(rows.map((row) => row.developer.name))] };
}

async function resolveTarget(key) {
  if (typeof key !== 'string' || key.length > 300) return null;
  if (key.startsWith('plane:')) {
    const id = key.slice('plane:'.length);
    const item = id ? await prisma.planeWorkItem.findUnique({ where: { id } }) : null;
    if (!item) return null;
    const owners = await ownersOfPlaneItem(item.id);
    return { kind: 'plane', title: item.identifier ? `${item.identifier} · ${item.name}` : item.name, planeItemId: item.id, developerId: null, ownerIds: owners.ids, ownerNames: owners.names };
  }
  if (key.startsWith('manual:')) {
    const [, developerId, ...rest] = key.split(':');
    const slug = rest.join(':');
    if (!developerId || !slug) return null;
    const rows = await prisma.action.findMany({ where: { developerId, origin: 'manual' }, select: { title: true, developer: { select: { name: true } } } });
    const match = rows.find((row) => slugTitle(row.title) === slug);
    return match ? { kind: 'manual', title: match.title, planeItemId: null, developerId, ownerIds: [developerId], ownerNames: [match.developer.name] } : null;
  }
  return null;
}

async function tryPlane(completionId, planeItemId) {
  const mode = planeWriteMode();
  try {
    const result = await markPlaneItemDone(planeItemId);
    if (result.mode === 'dry-run') {
      return prisma.actionCompletion.update({
        where: { id: completionId },
        data: { planeSynced: false, planeError: `Dry run: Plane was NOT changed (would set "${result.stateName}").` },
      });
    }
    const now = new Date();
    // Keep the local mirror consistent immediately; the next Plane sync confirms it.
    await prisma.planeWorkItem.update({ where: { id: planeItemId }, data: { state: result.stateName, updatedAt: now } }).catch(() => {});
    return prisma.actionCompletion.update({ where: { id: completionId }, data: { planeSynced: true, planeSyncedAt: now, planeError: null } });
  } catch (error) {
    const message = error instanceof PlaneError ? error.message : 'Plane write failed unexpectedly.';
    if (!(error instanceof PlaneError)) console.error('[actions] unexpected Plane error:', error?.name ?? 'Error');
    return prisma.actionCompletion.update({ where: { id: completionId }, data: { planeSynced: false, planeError: `${mode === 'disabled' ? '' : 'Failed: '}${message}` } });
  }
}

// Express 4 does not catch rejected promises from async handlers; without this a
// database error would leave the request hanging and can crash the process.
const route = (handler) => (req, res) => Promise.resolve(handler(req, res)).catch((error) => {
  console.error('[actions] request failed:', error?.message ?? error);
  if (!res.headersSent) res.status(500).json({ error: 'Something went wrong recording that. Nothing was lost — try again.' });
});

export const actionsRouter = Router();

actionsRouter.post('/complete', route(async (req, res) => {
  const { key, note } = req.body ?? {};
  const target = await resolveTarget(key);
  if (!target) return res.status(404).json({ error: 'That action no longer exists — refresh the dashboard.' });
  if (!canComplete(req.devUser, target.ownerIds)) {
    console.log(`[actions] DENIED ${req.devUser.email} (${req.devUser.accessRole}) mark done: ${target.title}`);
    return res.status(403).json({ error: describeWhoCanComplete(target.ownerNames) });
  }

  const existing = await prisma.actionCompletion.findUnique({ where: { key } });
  if (existing) return res.json({ ok: true, alreadyDone: true, completion: shapeCompletion(existing) });

  let completion = await prisma.actionCompletion.create({
    data: {
      key,
      title: target.title,
      developerId: target.developerId,
      planeItemId: target.planeItemId,
      completedBy: req.devUser.email,
      note: typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null,
    },
  });
  if (target.kind === 'plane') completion = await tryPlane(completion.id, target.planeItemId);
  console.log(`[actions] ${req.devUser.email} marked done ${target.kind}: ${target.title} (plane synced: ${completion.planeSynced})`);
  res.json({ ok: true, completion: shapeCompletion(completion) });
}));

actionsRouter.post('/retry-plane', route(async (req, res) => {
  const completion = await prisma.actionCompletion.findUnique({ where: { key: req.body?.key ?? '' } });
  if (!completion?.planeItemId) return res.status(404).json({ error: 'No Plane completion to retry.' });
  const retryTarget = await resolveTarget(completion.key);
  if (!canManageCompletion(req.devUser, completion, retryTarget?.ownerIds)) return res.status(403).json({ error: 'Only the person who marked this done, its owner, or a PM/lead can retry the Plane update.' });
  if (completion.planeSynced) return res.json({ ok: true, alreadySynced: true, completion: shapeCompletion(completion) });
  const updated = await tryPlane(completion.id, completion.planeItemId);
  res.json({ ok: true, completion: shapeCompletion(updated) });
}));

actionsRouter.post('/reopen', route(async (req, res) => {
  const completion = await prisma.actionCompletion.findUnique({ where: { key: req.body?.key ?? '' } });
  if (!completion) return res.status(404).json({ error: 'Nothing to reopen.' });
  const reopenTarget = await resolveTarget(completion.key);
  if (!canManageCompletion(req.devUser, completion, reopenTarget?.ownerIds)) return res.status(403).json({ error: 'Only the person who marked this done, its owner, or a PM/lead can reopen it.' });
  if (completion.planeSynced) {
    return res.status(409).json({ error: 'This item was set to Done in Plane. Reopen it in Plane — it will return here after the next sync.' });
  }
  await prisma.actionCompletion.delete({ where: { id: completion.id } });
  console.log(`[actions] ${req.devUser.email} reopened ${completion.title}`);
  res.json({ ok: true });
}));
