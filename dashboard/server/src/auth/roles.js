// Who may mark an action done (and undo / retry it). The browser only *reflects* these
// rules (buttons hidden); the API enforces them on every request, reading the account fresh
// from the database, so changing someone's role takes effect on their very next request.
//
//   pm, lead : any action, any owner
//   dev      : an action they own (their linked Developer is one of its owners), and
//              undoing/retrying a completion they made themselves
//
// The permission level is DevUser.accessRole — not Developer.role, which is a free-text job title.

export const ACCESS_ROLES = ['pm', 'lead', 'dev'];

export function normalizeAccessRole(value) {
  const role = String(value ?? '').trim().toLowerCase();
  return ACCESS_ROLES.includes(role) ? role : null;
}

export function isManager(devUser) {
  return devUser?.accessRole === 'pm' || devUser?.accessRole === 'lead';
}

export function ownsAction(devUser, ownerDeveloperIds = []) {
  return Boolean(devUser?.developerId) && ownerDeveloperIds.includes(devUser.developerId);
}

/// May this account mark the action done?
export function canComplete(devUser, ownerDeveloperIds) {
  return isManager(devUser) || ownsAction(devUser, ownerDeveloperIds);
}

/// May this account reopen / retry an existing completion?
export function canManageCompletion(devUser, completion, ownerDeveloperIds) {
  return isManager(devUser) || completion?.completedBy === devUser?.email || ownsAction(devUser, ownerDeveloperIds);
}

export function describeWhoCanComplete(ownerNames = []) {
  const owners = ownerNames.length ? ownerNames.join(', ') : 'its owner';
  return `Only ${owners} or a PM/lead can mark this done.`;
}
