// Rules behind the "Needs attention" panel. Pure data in, signals out — no database.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { THRESHOLDS, computeSignals } from '../src/signals.js';

const NOW = new Date('2026-09-24T08:00:00Z').getTime();
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();
const dateOnly = (n) => daysAgo(n).slice(0, 10);

const DEVELOPERS = [
  { id: 'dyah-rini', name: 'Dyah Rini', aliases: [], lastActivityAt: daysAgo(0), hasLiveSource: true },
  { id: 'praisilia-pandoh', name: 'Praisilia Pandoh', aliases: [], lastActivityAt: daysAgo(13), hasLiveSource: false },
];

const project = (overrides = {}) => ({
  id: 'p1', name: 'Project One', status: 'Active', activeDeveloper: 'Dyah Rini',
  lastConfirmed: dateOnly(1), meeting: { milestone: 'Ship it' }, ...overrides,
});

const item = (overrides = {}) => ({
  id: 'w1', identifier: 'KIP-1', name: 'Do the thing', state: 'In Progress', priority: 'medium',
  assignees: [{ name: 'Dyah Rini' }], targetDate: null, updatedAt: new Date(NOW - 86_400_000), url: 'https://plane.test/w1', project: 'Project One', ...overrides,
});

// Default to one active, recently seen developer so unrelated tests are not polluted by the silent one.
const run = (input) => computeSignals({ developers: [DEVELOPERS[0]], syncRuns: { plane: daysAgo(0), github: daysAgo(0), captures: daysAgo(0) }, now: NOW, ...input });
const types = (result) => result.signals.map((s) => s.type);
const find = (result, type) => result.signals.find((s) => s.type === type);

describe('project signals', () => {
  it('reports nothing for a healthy, owned, dated, recently confirmed project', () => {
    assert.deepEqual(run({ projects: [project()] }).signals, []);
  });

  it('flags a missing milestone and a missing/unverified owner, but never for paused projects', () => {
    const result = run({ projects: [project({ meeting: {}, activeDeveloper: 'Needs verification' })] });
    assert.ok(types(result).includes('project_no_milestone'));
    assert.equal(find(result, 'project_no_owner').severity, 'high', 'an active project with no owner is high');
    const paused = run({ projects: [project({ status: 'Paused', meeting: {}, activeDeveloper: null })] });
    assert.ok(!types(paused).includes('project_no_milestone') && !types(paused).includes('project_no_owner'));
  });

  it('a blocked project is high and carries the recorded blocker text', () => {
    const blocked = find(run({ projects: [project({ status: 'Release blocked', meeting: { milestone: 'x', blocker: 'Need the TCS API URL' } })] }), 'project_blocked');
    assert.equal(blocked.severity, 'high');
    assert.match(blocked.detail, /TCS API URL/);
    const bare = find(run({ projects: [project({ status: 'Release blocked', meeting: { milestone: 'x' } })] }), 'project_blocked');
    assert.match(bare.detail, /no blocker text/i);
  });

  it('stale thresholds: fine at the limit, medium past it, high when very stale, low when paused, medium when never confirmed', () => {
    const at = (days, extra) => find(run({ projects: [project({ lastConfirmed: dateOnly(days), ...extra })] }), 'project_stale');
    assert.equal(at(THRESHOLDS.projectStaleDays), undefined);
    assert.equal(at(THRESHOLDS.projectStaleDays + 1).severity, 'medium');
    assert.equal(at(THRESHOLDS.projectVeryStaleDays + 1).severity, 'high');
    assert.equal(at(30, { status: 'Paused' }).severity, 'low');
    assert.equal(find(run({ projects: [project({ lastConfirmed: null })] }), 'project_stale').severity, 'medium');
    assert.match(at(12).title, /12 days ago/);
  });

  it('links a project signal to its developer even when the name is written differently', () => {
    const signal = find(run({ projects: [project({ meeting: {}, activeDeveloper: 'Dyah Puspo Rini' })] }), 'project_no_milestone');
    assert.deepEqual(signal.developerIds, ['dyah-rini']);
  });
});

describe('Plane signals', () => {
  it('overdue: medium at first, high after a week, and it names the item and links to it', () => {
    const recent = find(run({ planeItems: [item({ targetDate: dateOnly(2) })] }), 'plane_overdue');
    assert.equal(recent.severity, 'medium');
    assert.equal(recent.evidence[0].url, 'https://plane.test/w1');
    assert.deepEqual(recent.developerIds, ['dyah-rini']);
    assert.equal(find(run({ planeItems: [item({ targetDate: dateOnly(9) })] }), 'plane_overdue').severity, 'high');
    assert.equal(find(run({ planeItems: [item({ targetDate: dateOnly(-3) })] }), 'plane_overdue'), undefined, 'a future date is not overdue');
  });

  it('ignores closed items', () => {
    for (const state of ['Done', 'Cancelled', 'Completed']) {
      assert.deepEqual(run({ planeItems: [item({ state, targetDate: dateOnly(30), updatedAt: new Date(daysAgo(30)) })] }).signals, []);
    }
  });

  it('ignores an item marked done in the dashboard, but not one edited in Plane afterwards', () => {
    const completedAt = new Date(NOW - 3_600_000);
    const completions = new Map([['plane:w1', { completedAt }]]);
    const stale = item({ targetDate: dateOnly(5), updatedAt: new Date(NOW - 86_400_000) });
    assert.deepEqual(run({ planeItems: [stale], completions }).signals, []);
    const reopened = item({ targetDate: dateOnly(5), updatedAt: new Date(NOW - 60_000) });
    assert.ok(types(run({ planeItems: [reopened], completions })).includes('plane_overdue'));
  });

  it('stalled: only In Progress-type states with no update past the limit', () => {
    const old = new Date(NOW - (THRESHOLDS.planeStalledDays + 1) * 86_400_000);
    assert.ok(types(run({ planeItems: [item({ updatedAt: old })] })).includes('plane_stalled'));
    assert.ok(!types(run({ planeItems: [item({ state: 'Backlog', updatedAt: old })] })).includes('plane_stalled'));
    assert.ok(!types(run({ planeItems: [item({ updatedAt: new Date(NOW - 2 * 86_400_000) })] })).includes('plane_stalled'));
  });

  it('unassigned: only for urgent/high priority', () => {
    const at = (priority) => run({ planeItems: [item({ assignees: [], priority })] });
    assert.equal(find(at('urgent'), 'plane_unassigned').severity, 'high');
    assert.equal(find(at('high'), 'plane_unassigned').severity, 'medium');
    assert.equal(find(at('low'), 'plane_unassigned'), undefined);
  });
});

describe('developer and data-source signals', () => {
  it('silent developer: only past the limit, and the wording admits when no source covers them', () => {
    const result = run({ developers: DEVELOPERS });
    const praisilia = result.signals.find((s) => s.id === 'developer_silent:praisilia-pandoh');
    assert.ok(praisilia);
    assert.match(praisilia.title, /13 days/);
    assert.match(praisilia.detail, /may just be missing data/);
    assert.ok(!result.signals.some((s) => s.id === 'developer_silent:dyah-rini'));

    const withSource = computeSignals({ developers: [{ ...DEVELOPERS[1], hasLiveSource: true }], now: NOW, syncRuns: { plane: daysAgo(0), github: daysAgo(0), captures: daysAgo(0) } });
    assert.match(withSource.signals[0].detail, /blocked or waiting/);
  });

  it('a developer with no activity at all is not reported as silent (nothing to measure)', () => {
    const result = computeSignals({ developers: [{ id: 'x', name: 'New Person', lastActivityAt: null, hasLiveSource: false }], now: NOW, syncRuns: { plane: daysAgo(0), github: daysAgo(0), captures: daysAgo(0) } });
    assert.deepEqual(result.signals, []);
  });

  it('source freshness: silent when fresh, low when a few hours old, medium after a day, low when never synced', () => {
    const at = (hoursAgo) => computeSignals({ now: NOW, syncRuns: { plane: new Date(NOW - hoursAgo * 3_600_000).toISOString(), github: daysAgo(0), captures: daysAgo(0) } });
    assert.deepEqual(at(1).signals, []);
    assert.equal(at(5).signals[0].severity, 'low');
    assert.equal(at(30).signals[0].severity, 'medium');
    const never = computeSignals({ now: NOW, syncRuns: {} });
    assert.equal(never.signals.length, 3);
    assert.ok(never.signals.every((s) => s.severity === 'low' && /never been synced/.test(s.title)));
  });
});

describe('ordering and totals', () => {
  it('sorts high before medium before low and counts each', () => {
    const result = run({
      projects: [project({ meeting: {} }), project({ id: 'p2', name: 'Blocked One', status: 'Release blocked', meeting: { milestone: 'x', blocker: 'b' } })],
      planeItems: [item({ targetDate: dateOnly(1) })],
    });
    const ranks = result.signals.map((s) => ({ high: 0, medium: 1, low: 2 })[s.severity]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    assert.equal(result.counts.high + result.counts.medium + result.counts.low, result.signals.length);
    assert.equal(result.signals[0].severity, 'high');
    assert.equal(new Set(result.signals.map((s) => s.id)).size, result.signals.length, 'ids are unique (used as React keys)');
  });
});
