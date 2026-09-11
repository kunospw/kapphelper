// Health/status vocabulary used across the dashboard.
// Buckets group statuses for the meeting view; tone drives the pill styling.

export const STATUS_TONE = {
  'Active': 'active',
  'On track': 'active',
  'At risk': 'risk',
  'Needs plan': 'risk',
  'Needs verification': 'risk',
  'No update': 'paused',
  'Paused': 'paused',
  'Release blocked': 'blocked',
};

export const STATUS_BUCKETS = [
  {
    id: 'blocked',
    label: 'Blocked',
    tone: 'blocked',
    description: 'Work cannot continue safely until a decision or verification lands.',
    match: (s) => s === 'Release blocked',
  },
  {
    id: 'attention',
    label: 'At risk or needs verification',
    tone: 'risk',
    description: 'Missing context, an unowned decision, or a fact that must be confirmed before acting.',
    match: (s) => s === 'At risk' || s === 'Needs verification' || s === 'Needs plan',
  },
  {
    id: 'active',
    label: 'On track',
    tone: 'active',
    description: 'Owner and next action are clear; no blocker recorded.',
    match: (s) => s === 'Active' || s === 'On track',
  },
  {
    id: 'paused',
    label: 'Paused or no update',
    tone: 'paused',
    description: 'Intentionally parked or awaiting an external trigger.',
    match: (s) => s === 'Paused' || s === 'No update',
  },
];

export function toneFor(status) {
  return STATUS_TONE[status] ?? 'risk';
}

export function bucketFor(status) {
  return STATUS_BUCKETS.find((b) => b.match(status)) ?? STATUS_BUCKETS[1];
}

export function groupByBucket(projects) {
  return STATUS_BUCKETS.map((bucket) => ({
    bucket,
    projects: projects.filter((p) => bucket.match(p.status)),
  }));
}
