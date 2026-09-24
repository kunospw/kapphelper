// Display helpers for timestamps. The API stores UTC ISO strings; people read Singapore time.

const SGT = 'Asia/Singapore';

/// "2026-09-24T07:50:45.851Z" -> "24 Sep 2026, 15:50 SGT"; a bare date stays a date; nothing invented.
export function formatDateTime(value) {
  if (!value) return 'unknown';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: SGT }).format(new Date(`${value}T00:00:00+08:00`));
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: SGT }).format(date)} SGT`;
}

/// Hours since an ISO timestamp, or null if it cannot be read.
export function hoursSince(value, now = Date.now()) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : (now - time) / 3_600_000;
}

/// "12 min ago" / "3 h ago" / "2 days ago" for recent timestamps.
export function timeAgo(value, now = Date.now()) {
  const hours = hoursSince(value, now);
  if (hours === null) return null;
  const minutes = Math.round(hours * 60);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 48) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}
