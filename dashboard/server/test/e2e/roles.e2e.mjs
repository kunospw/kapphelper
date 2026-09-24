// End-to-end check of the "Mark done" permission rules against a real API + database.
// Run from dashboard/:  npm run test:e2e
// It starts its own API on a spare port with sync disabled and Plane write-back OFF (Plane is never
// touched), creates temporary logins/developers/actions tagged "e2e-roles", and deletes them at the end.
// Uses the database in .env.server — run it against your local dev DB only.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../../src/db.js';
import { hashPassword } from '../../src/auth/hash.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const PORT = 4186;
const BASE = `http://127.0.0.1:${PORT}`;
const TAG = 'e2e-roles';
const mk = (name) => ({ email: `${TAG}-${name}@example.invalid`, password: randomBytes(9).toString('base64url') });
const users = { noprofile: mk('noprofile'), deva: mk('deva'), devb: mk('devb'), lead: mk('lead'), inactive: mk('inactive') };

let passed = 0; let failed = 0;
const check = (label, ok, extra = '') => { ok ? passed++ : failed++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`); };

async function cleanup() {
  const emails = Object.values(users).map((user) => user.email);
  await prisma.actionCompletion.deleteMany({ where: { OR: [{ completedBy: { in: emails } }, { key: { startsWith: `manual:${TAG}` } }] } });
  await prisma.refreshToken.deleteMany({ where: { devUser: { email: { in: emails } } } });
  await prisma.devUser.deleteMany({ where: { email: { in: emails } } });
  await prisma.action.deleteMany({ where: { developerId: { startsWith: TAG } } });
  await prisma.developer.deleteMany({ where: { id: { startsWith: TAG } } });
}

let server;
try {
  await cleanup();
  // Fixtures: two temp developers each with one hand-written (manual) action.
  for (const id of [`${TAG}-a`, `${TAG}-b`]) {
    await prisma.developer.create({ data: { id, name: `Temp ${id.slice(-1).toUpperCase()}` } });
    await prisma.action.create({ data: { developerId: id, title: `E2E task ${id.slice(-1).toUpperCase()}`, status: 'Open', origin: 'manual', source: 'e2e' } });
  }
  const link = { deva: `${TAG}-a`, devb: `${TAG}-b` };
  for (const [name, user] of Object.entries(users)) {
    await prisma.devUser.create({
      data: {
        email: user.email, passwordHash: await hashPassword(user.password), active: name !== 'inactive',
        accessRole: name === 'lead' ? 'lead' : 'dev', developerId: link[name] ?? null,
      },
    });
  }

  server = spawn(process.execPath, ['--env-file=.env.server', '--env-file-if-exists=.env.plane', 'server/src/index.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(PORT), SYNC_DISABLED: 'true', PLANE_WRITE_ENABLED: 'false' }, stdio: 'ignore',
  });
  for (let i = 0; i < 30; i++) { try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 300)); }

  const call = async (path, { method = 'GET', body, token } = {}) => {
    const response = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, json: await response.json().catch(() => null) };
  };
  const tokens = {};
  const loginResults = {};
  for (const [name, user] of Object.entries(users)) {
    const result = await call('/api/auth/login', { method: 'POST', body: { email: user.email, password: user.password } });
    loginResults[name] = result;
    tokens[name] = result.json?.accessToken;
  }
  check('login returns accessRole', loginResults.lead.json?.user?.accessRole === 'lead' && loginResults.deva.json?.user?.accessRole === 'dev');
  check('deactivated account cannot log in', loginResults.inactive.status === 401);

  const board = async (name) => (await call('/api/portfolio', { token: tokens[name] })).json;
  const findAction = (portfolio, title) => portfolio.developerActivity.flatMap((d) => d.actions).find((a) => a.title === title);
  const keyA = findAction(await board('lead'), 'E2E task A')?.key;
  const keyB = findAction(await board('lead'), 'E2E task B')?.key;
  check('fixture actions visible with manual keys', keyA?.startsWith('manual:') && keyB?.startsWith('manual:'), `${keyA} / ${keyB}`);

  // ---- what each viewer is TOLD they can do (server-computed flags)
  const asA = await board('deva');
  check('viewer block reflects the caller', asA.viewer?.accessRole === 'dev' && asA.viewer?.developerId === `${TAG}-a`);
  check('dev A sees Done allowed on own task, not on B', findAction(asA, 'E2E task A').canComplete === true && findAction(asA, 'E2E task B').canComplete === false);
  const realPlane = asA.developerActivity.flatMap((d) => d.actions).find((a) => a.key?.startsWith('plane:') && !a.completed);
  check('dev A cannot Done someone else\'s real Plane item (flag)', realPlane && realPlane.canComplete === false, realPlane?.title?.slice(0, 40));
  const asLead = await board('lead');
  check('lead sees Done allowed everywhere', findAction(asLead, 'E2E task A').canComplete && findAction(asLead, 'E2E task B').canComplete && asLead.developerActivity.flatMap((d) => d.actions).filter((a) => a.key).every((a) => a.canComplete));
  const asNone = await board('noprofile');
  check('dev with no developer profile cannot complete anything', asNone.developerActivity.flatMap((d) => d.actions).every((a) => a.canComplete === false));

  // ---- server enforcement (does not trust the flags)
  let r = await call('/api/actions/complete', { method: 'POST', token: tokens.noprofile, body: { key: keyA } });
  check('no-profile dev: complete -> 403', r.status === 403, r.json?.error);
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: keyB } });
  check('dev A completing B\'s task -> 403 naming the owner', r.status === 403 && /Temp B/.test(r.json?.error ?? ''), r.json?.error);
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: realPlane.key } });
  check('dev A completing a real Plane item they do not own -> 403', r.status === 403);
  check('...and nothing was recorded for the denied attempts', (await prisma.actionCompletion.count({ where: { completedBy: { in: Object.values(users).map((u) => u.email) } } })) === 0);
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: keyA, note: 'mine' } });
  check('dev A completing own task -> 200', r.status === 200 && r.json?.ok);
  check('completion audit records the email', (await prisma.actionCompletion.findUnique({ where: { key: keyA } }))?.completedBy === users.deva.email);

  // ---- reopen / retry rules
  r = await call('/api/actions/reopen', { method: 'POST', token: tokens.devb, body: { key: keyA } });
  check('unrelated dev B cannot reopen A\'s completion -> 403', r.status === 403);
  const shown = findAction(await board('devb'), 'E2E task A');
  check('board tells dev B they cannot manage that completion', shown.completed?.canManage === false);
  r = await call('/api/actions/reopen', { method: 'POST', token: tokens.lead, body: { key: keyA } });
  check('lead can reopen anyone\'s completion', r.status === 200);
  await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: keyA } });
  r = await call('/api/actions/reopen', { method: 'POST', token: tokens.deva, body: { key: keyA } });
  check('the owner/completer can undo their own click', r.status === 200);

  // ---- lead completes someone else's items, incl. a real Plane item (local only: write-back is off)
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.lead, body: { key: keyB } });
  check('lead completing B\'s task -> 200', r.status === 200);
  r = await call('/api/actions/reopen', { method: 'POST', token: tokens.deva, body: { key: keyB } });
  check('dev A (neither owner nor completer) cannot reopen B -> 403', r.status === 403);
  const planeBefore = await prisma.planeWorkItem.findUnique({ where: { id: realPlane.key.slice(6) } });
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.lead, body: { key: realPlane.key } });
  check('lead completing a real Plane item -> 200, recorded locally, Plane NOT changed', r.status === 200 && r.json?.completion?.planeSynced === false);
  check('...local Plane mirror untouched', (await prisma.planeWorkItem.findUnique({ where: { id: realPlane.key.slice(6) } })).state === planeBefore.state);
  await call('/api/actions/reopen', { method: 'POST', token: tokens.lead, body: { key: realPlane.key } });
  await call('/api/actions/reopen', { method: 'POST', token: tokens.lead, body: { key: keyB } });

  // ---- Mark done straight from a "Needs attention" signal (same keys and rules as the board)
  const signalsOf = async (name) => (await call('/api/signals', { token: tokens[name] })).json?.signals ?? [];
  const planeSignalsLead = (await signalsOf('lead')).filter((signal) => signal.actionKey);
  if (!planeSignalsLead.length) {
    console.log('SKIP  no Plane-item signals in this data, signal Mark done not exercised');
  } else {
    check('signals: lead may mark every Plane-item signal done', planeSignalsLead.every((signal) => signal.canComplete === true), `${planeSignalsLead.length} signals`);
    check('signals: an unrelated dev is not offered Mark done', (await signalsOf('deva')).filter((signal) => signal.actionKey).every((signal) => signal.canComplete === false));
    const target = planeSignalsLead[0];
    r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: target.actionKey } });
    check('signals: server still refuses an unrelated dev who forces the request', r.status === 403);
    r = await call('/api/actions/complete', { method: 'POST', token: tokens.lead, body: { key: target.actionKey, note: 'from signal' } });
    check('signals: lead completes using the signal action key', r.status === 200 && r.json?.ok, target.actionTitle);
    check('signals: the item stops being flagged once marked done', !(await signalsOf('lead')).some((signal) => signal.actionKey === target.actionKey));
    await call('/api/actions/reopen', { method: 'POST', token: tokens.lead, body: { key: target.actionKey } });
    check('signals: reopening brings the signal back', (await signalsOf('lead')).some((signal) => signal.actionKey === target.actionKey));
  }

  // ---- role changes apply immediately, without logging in again
  await prisma.devUser.update({ where: { email: users.deva.email }, data: { accessRole: 'lead' } });
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: keyB } });
  check('promoting dev A to lead takes effect on the same session', r.status === 200);
  await call('/api/actions/reopen', { method: 'POST', token: tokens.deva, body: { key: keyB } });
  await prisma.devUser.update({ where: { email: users.deva.email }, data: { accessRole: 'dev' } });
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.deva, body: { key: keyB } });
  check('demoting back to dev takes effect immediately', r.status === 403);

  // ---- deactivation kills an existing session
  await prisma.devUser.update({ where: { email: users.devb.email }, data: { active: false } });
  r = await call('/api/actions/complete', { method: 'POST', token: tokens.devb, body: { key: keyB } });
  check('deactivated account is locked out on its next request', r.status === 401);
} catch (error) {
  failed++;
  console.log('FAIL  suite crashed:', error?.message ?? error);
} finally {
  if (server) server.kill();
  await cleanup();
  const leftovers = (await prisma.devUser.count({ where: { email: { contains: TAG } } })) + (await prisma.developer.count({ where: { id: { startsWith: TAG } } }));
  console.log(`\n${passed} passed, ${failed} failed. cleanup leftovers: ${leftovers}`);
  await prisma.$disconnect();
  process.exit(failed ? 1 : 0);
}
