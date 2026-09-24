// Tests the Plane "mark done" client against a fake fetch — no network, no real Plane.
// Run: npm test
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { PlaneError, _resetPlaneCacheForTests, markPlaneItemDone, planeWriteMode } from '../src/plane.js';

const STATES = [
  { id: 'state-backlog', name: 'Backlog', group: 'backlog' },
  { id: 'state-progress', name: 'In Progress', group: 'started' },
  { id: 'state-cancelled', name: 'Cancelled', group: 'cancelled' },
  { id: 'state-completed-other', name: 'Released', group: 'completed' },
  { id: 'state-done', name: 'Done', group: 'completed' },
];

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Fake Plane: only the legacy path + X-API-Key auth answers, so discovery has to try others first.
function fakePlane({ patchStatus = 200, states = STATES } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, method: options.method ?? 'GET', headers: options.headers ?? {}, body: options.body });
    const legacy = url.includes('/api/workspaces/');
    const authed = options.headers?.['X-API-Key'] === 'plane_api_testtoken';
    if (!legacy || !authed) return json(401, { detail: 'nope' });
    if (url.endsWith('/states/')) return json(200, { results: states });
    if ((options.method ?? 'GET') === 'PATCH') return json(patchStatus, { id: 'item-1' });
    return json(404, {});
  };
  return { fetchImpl, calls };
}

let tokenPath;
const saved = {};
const ENV_KEYS = ['PLANE_WRITE_ENABLED', 'PLANE_WRITE_DRY_RUN', 'PLANE_BASE_URL', 'PLANE_WORKSPACE', 'PLANE_PROJECT_ID', 'PLANE_WRITE_TOKEN_PATH', 'PLANE_TOKEN_PATH'];

beforeEach(async () => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  const dir = await mkdtemp(join(tmpdir(), 'plane-test-'));
  tokenPath = join(dir, 'token');
  await writeFile(tokenPath, 'plane_api_testtoken\n');
  Object.assign(process.env, {
    PLANE_WRITE_ENABLED: 'true',
    PLANE_WRITE_DRY_RUN: 'false',
    PLANE_BASE_URL: 'https://plane.example.test/sub',
    PLANE_WORKSPACE: 'kairos',
    PLANE_PROJECT_ID: 'proj-1',
    PLANE_WRITE_TOKEN_PATH: tokenPath,
  });
  _resetPlaneCacheForTests();
});

afterEach(() => {
  for (const key of ENV_KEYS) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; }
});

describe('planeWriteMode', () => {
  it('is disabled unless explicitly enabled', () => {
    delete process.env.PLANE_WRITE_ENABLED;
    assert.equal(planeWriteMode(), 'disabled');
    process.env.PLANE_WRITE_ENABLED = 'yes';
    assert.equal(planeWriteMode(), 'disabled');
  });
  it('distinguishes dry-run from live', () => {
    assert.equal(planeWriteMode(), 'live');
    process.env.PLANE_WRITE_DRY_RUN = 'true';
    assert.equal(planeWriteMode(), 'dry-run');
  });
});

describe('markPlaneItemDone', () => {
  it('refuses to do anything when disabled — no request is sent', async () => {
    process.env.PLANE_WRITE_ENABLED = 'false';
    const { fetchImpl, calls } = fakePlane();
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl }), PlaneError);
    assert.equal(calls.length, 0);
  });

  it('dry-run resolves the Done state but never PATCHes', async () => {
    process.env.PLANE_WRITE_DRY_RUN = 'true';
    const { fetchImpl, calls } = fakePlane();
    const result = await markPlaneItemDone('item-1', { fetchImpl });
    assert.deepEqual(result, { mode: 'dry-run', stateName: 'Done' });
    assert.ok(calls.every((call) => call.method === 'GET'), 'only read-only requests');
  });

  it('live: discovers the working endpoint/auth with GET first, then PATCHes the Done state id', async () => {
    const { fetchImpl, calls } = fakePlane();
    const result = await markPlaneItemDone('item-1', { fetchImpl });
    assert.deepEqual(result, { mode: 'live', stateName: 'Done' });

    const patch = calls.find((call) => call.method === 'PATCH');
    assert.ok(patch, 'a PATCH was sent');
    assert.match(patch.url, /\/api\/workspaces\/kairos\/projects\/proj-1\/issues\/item-1\/$/);
    assert.deepEqual(JSON.parse(patch.body), { state: 'state-done' });
    assert.equal(patch.headers['X-API-Key'], 'plane_api_testtoken');
    // Nothing was written before an endpoint was proven with a read-only GET.
    assert.equal(calls.findIndex((call) => call.method === 'PATCH'), calls.length - 1);
    assert.ok(calls.slice(0, -1).every((call) => call.method === 'GET'));
  });

  it('prefers the state named Done, else falls back to any completed-group state', async () => {
    const { fetchImpl } = fakePlane({ states: STATES.filter((state) => state.id !== 'state-done') });
    const result = await markPlaneItemDone('item-1', { fetchImpl });
    assert.equal(result.stateName, 'Released');
  });

  it('fails clearly when the project has no completed state', async () => {
    const { fetchImpl } = fakePlane({ states: STATES.filter((state) => state.group !== 'completed') });
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl }), /no state in the "completed" group/);
  });

  it('reports a read-only token (403) without leaking anything', async () => {
    const { fetchImpl } = fakePlane({ patchStatus: 403 });
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl }), (error) => {
      assert.ok(error instanceof PlaneError);
      assert.match(error.message, /write permission/);
      assert.ok(!error.message.includes('plane_api_'), 'token never appears in the message');
      return true;
    });
  });

  it('reports a missing work item (404) and other rejections', async () => {
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl: fakePlane({ patchStatus: 404 }).fetchImpl }), /404/);
    _resetPlaneCacheForTests();
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl: fakePlane({ patchStatus: 500 }).fetchImpl }), /HTTP 500/);
  });

  it('rejects a malformed token file before any request', async () => {
    await writeFile(tokenPath, 'not-a-plane-token');
    const { fetchImpl, calls } = fakePlane();
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl }), /exactly one plane_api_ token/);
    assert.equal(calls.length, 0);
  });

  it('rejects an unreadable token file', async () => {
    process.env.PLANE_WRITE_TOKEN_PATH = join(tmpdir(), 'definitely-missing-token-file');
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl: fakePlane().fetchImpl }), /could not be read/);
  });

  it('reports missing configuration', async () => {
    delete process.env.PLANE_PROJECT_ID;
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl: fakePlane().fetchImpl }), /missing PLANE_PROJECT_ID/);
  });

  it('gives up with a useful message when no endpoint/auth combination works', async () => {
    const fetchImpl = async () => json(401, {});
    await assert.rejects(markPlaneItemDone('item-1', { fetchImpl }), /Could not read Plane states/);
  });
});
