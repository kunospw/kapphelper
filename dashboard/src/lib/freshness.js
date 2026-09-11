// Freshness math for "last confirmed" dates. Never invents a date; if the
// input is missing or unparseable, callers get an explicit "unknown" result.

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(from, to = new Date()) {
  if (!from) return null;
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

// Buckets are intentionally conservative — a two-week-old confirmed record
// is not "fresh" for a live product, and a one-day-old one is not "stale".
export function freshnessTone(days) {
  if (days === null || days === undefined) return 'unknown';
  if (days <= 3) return 'fresh';
  if (days <= 10) return 'aging';
  return 'stale';
}

export function freshnessLabel(days) {
  if (days === null || days === undefined) return 'Date unknown';
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 8) return `${weeks} weeks ago`;
  const months = Math.round(days / 30);
  return `${months} months ago`;
}

export function describeFreshness(dateString, now = new Date()) {
  const parsed = parseDate(dateString);
  const days = daysBetween(parsed, now);
  return {
    date: dateString || null,
    days,
    tone: freshnessTone(days),
    label: freshnessLabel(days),
  };
}
