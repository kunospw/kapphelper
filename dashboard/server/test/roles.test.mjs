// Permission rules for "Mark done". Pure functions — no database.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canComplete, canManageCompletion, describeWhoCanComplete, isManager, normalizeAccessRole, ownsAction } from '../src/auth/roles.js';

const user = (accessRole, developerId = null, email = `${accessRole}@example.test`) => ({ accessRole, developerId, email });

describe('normalizeAccessRole', () => {
  it('accepts the three levels case-insensitively and rejects anything else', () => {
    assert.equal(normalizeAccessRole('PM'), 'pm');
    assert.equal(normalizeAccessRole(' Lead '), 'lead');
    assert.equal(normalizeAccessRole('dev'), 'dev');
    for (const bad of ['admin', '', null, undefined, 'root']) assert.equal(normalizeAccessRole(bad), null);
  });
});

describe('canComplete', () => {
  it('lets pm and lead complete anything, including items nobody owns', () => {
    assert.ok(canComplete(user('pm'), ['someone-else']));
    assert.ok(canComplete(user('lead'), []));
  });
  it('lets a dev complete only items they own', () => {
    assert.ok(canComplete(user('dev', 'praisilia'), ['praisilia']));
    assert.ok(canComplete(user('dev', 'praisilia'), ['dyah', 'praisilia']), 'co-assigned Plane items count');
    assert.equal(canComplete(user('dev', 'praisilia'), ['dyah']), false);
  });
  it('denies a dev with no linked developer profile, and unknown roles', () => {
    assert.equal(canComplete(user('dev', null), ['dyah']), false);
    assert.equal(canComplete(user('dev', null), []), false);
    assert.equal(canComplete(user('superuser', 'dyah'), ['other']), false);
    assert.equal(canComplete(undefined, ['dyah']), false);
  });
});

describe('canManageCompletion (reopen / retry)', () => {
  const completion = { completedBy: 'lead@example.test' };
  it('allows managers, the person who completed it, and an owner', () => {
    assert.ok(canManageCompletion(user('pm'), completion, []));
    assert.ok(canManageCompletion(user('lead', null, 'lead@example.test'), completion, []));
    assert.ok(canManageCompletion(user('dev', 'praisilia', 'p@example.test'), completion, ['praisilia']));
    assert.ok(canManageCompletion(user('dev', 'x', 'lead@example.test'), completion, []), 'the completer can undo their own click');
  });
  it('denies an unrelated dev', () => {
    assert.equal(canManageCompletion(user('dev', 'jesynta', 'j@example.test'), completion, ['praisilia']), false);
  });
});

describe('helpers', () => {
  it('isManager / ownsAction', () => {
    assert.ok(isManager(user('pm')) && isManager(user('lead')));
    assert.equal(isManager(user('dev')), false);
    assert.equal(ownsAction(user('dev', 'a'), ['a']), true);
    assert.equal(ownsAction(user('dev', null), ['a']), false);
  });
  it('explains who may complete', () => {
    assert.match(describeWhoCanComplete(['Praisilia Pandoh']), /Only Praisilia Pandoh or a PM\/lead/);
    assert.match(describeWhoCanComplete([]), /its owner/);
  });
});
