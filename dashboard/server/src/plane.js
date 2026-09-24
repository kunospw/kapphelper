// Writes "Done" back to Plane when someone marks an item done in the dashboard.
//
// This is the ONLY Plane write the dashboard performs. It is deliberately narrow:
//   * one operation — move a single work item to the project's "completed" state;
//   * off unless PLANE_WRITE_ENABLED=true (the default is local-only completion);
//   * PLANE_WRITE_DRY_RUN=true resolves everything and reports what it WOULD do,
//     without sending the PATCH — use it to verify config against real Plane safely;
//   * the token is read from a local file, never from the browser, never logged, and
//     never included in an error message that reaches the API response.
//
// Endpoint/auth discovery mirrors scripts/sync-plane.mjs (the Plane deployment here
// answers on the legacy /api/... paths, other versions on /api/v1/...): the first
// combination that answers a read-only GET for the project's states is remembered and
// reused for the PATCH, so a write is never the first thing sent to an untested path.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function planeWriteMode() {
  if (process.env.PLANE_WRITE_ENABLED !== 'true') return 'disabled';
  return process.env.PLANE_WRITE_DRY_RUN === 'true' ? 'dry-run' : 'live';
}

function config() {
  const missing = ['PLANE_BASE_URL', 'PLANE_WORKSPACE', 'PLANE_PROJECT_ID'].filter((name) => !process.env[name]);
  if (missing.length) throw new PlaneError(`Plane is not configured (missing ${missing.join(', ')} in .env.plane).`);
  const configuredBase = process.env.PLANE_BASE_URL.replace(/\/$/, '');
  return {
    configuredBase,
    originBase: new URL(configuredBase).origin,
    workspace: encodeURIComponent(process.env.PLANE_WORKSPACE),
    projectId: encodeURIComponent(process.env.PLANE_PROJECT_ID),
    tokenPath: process.env.PLANE_WRITE_TOKEN_PATH
      || process.env.PLANE_TOKEN_PATH
      || resolve(dashboardRoot, '..', '..', 'kapphelper-dashboard-local-secrets', 'plane-readonly.token'),
  };
}

export class PlaneError extends Error {}

async function readToken(tokenPath) {
  let token;
  try { token = (await readFile(tokenPath, 'utf8')).trim(); } catch { throw new PlaneError('Plane token file could not be read.'); }
  if (!token.startsWith('plane_api_') || /[\r\n,]/.test(token)) throw new PlaneError('Plane token file must contain exactly one plane_api_ token.');
  return token;
}

const AUTH_METHODS = [
  { name: 'X-API-Key', headers: (token) => ({ 'X-API-Key': token }) },
  { name: 'Bearer', headers: (token) => ({ Authorization: `Bearer ${token}` }) },
  { name: 'Basic', headers: (token) => ({ Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` }) },
];

function statesUrls({ configuredBase, originBase, workspace, projectId }) {
  const paths = [
    { style: 'legacy', path: `/api/workspaces/${workspace}/projects/${projectId}/states/` },
    { style: 'v1', path: `/api/v1/workspaces/${workspace}/projects/${projectId}/states/` },
  ];
  return [...new Set([originBase, configuredBase])].flatMap((base) => paths.map((entry) => ({ base, ...entry })));
}

function issueUrl({ base, style }, { workspace, projectId }, itemId) {
  const prefix = style === 'legacy' ? '/api/workspaces' : '/api/v1/workspaces';
  return `${base}${prefix}/${workspace}/projects/${projectId}/issues/${encodeURIComponent(itemId)}/`;
}

let discovered = null; // { base, style, auth } once a read-only GET has succeeded

async function discoverAndLoadStates(cfg, token, fetchImpl) {
  const attempts = [];
  const combos = discovered
    ? [{ base: discovered.base, style: discovered.style, path: statesUrls(cfg).find((u) => u.base === discovered.base && u.style === discovered.style)?.path }]
    : statesUrls(cfg);
  for (const candidate of combos) {
    for (const auth of discovered ? [discovered.auth] : AUTH_METHODS) {
      const response = await fetchImpl(`${candidate.base}${candidate.path}`, { headers: { Accept: 'application/json', ...auth.headers(token) } });
      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.includes('application/json')) {
        const payload = await response.json();
        discovered = { base: candidate.base, style: candidate.style, auth };
        return Array.isArray(payload) ? payload : payload.results ?? payload.data ?? [];
      }
      attempts.push(`${response.status} ${candidate.style}/${auth.name}`);
    }
  }
  discovered = null;
  throw new PlaneError(`Could not read Plane states (${attempts.slice(0, 6).join(', ')}). Check the token and PLANE_BASE_URL.`);
}

function pickDoneState(states) {
  const completed = states.filter((state) => state.group === 'completed');
  return completed.find((state) => /^done$/i.test(state.name)) ?? completed[0] ?? null;
}

/// Moves one Plane work item to the project's completed state.
/// Resolves { mode, stateName } — mode 'dry-run' means nothing was sent.
/// Throws PlaneError with a safe, user-showable message on any failure.
export async function markPlaneItemDone(itemId, { fetchImpl = fetch } = {}) {
  const mode = planeWriteMode();
  if (mode === 'disabled') throw new PlaneError('Plane write-back is off (set PLANE_WRITE_ENABLED=true to enable).');

  const cfg = config();
  const token = await readToken(cfg.tokenPath);

  const states = await discoverAndLoadStates(cfg, token, fetchImpl);
  const done = pickDoneState(states);
  if (!done) throw new PlaneError('This Plane project has no state in the "completed" group.');

  const url = issueUrl(discovered, cfg, itemId);
  if (mode === 'dry-run') return { mode, stateName: done.name };

  const response = await fetchImpl(url, {
    method: 'PATCH',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...discovered.auth.headers(token) },
    body: JSON.stringify({ state: done.id }),
  });
  if (response.status === 403) throw new PlaneError('Plane refused the update (403): this token does not have write permission.');
  if (response.status === 404) throw new PlaneError('Plane could not find that work item (404) — it may have been deleted or moved.');
  if (!response.ok) throw new PlaneError(`Plane rejected the update (HTTP ${response.status}).`);
  return { mode, stateName: done.name };
}

export function _resetPlaneCacheForTests() {
  discovered = null;
}
