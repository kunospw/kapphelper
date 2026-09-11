import { toneFor } from '../lib/status.js';

export function Status({ value }) {
  return <span className={`status status-${toneFor(value)}`}>{value}</span>;
}

export function Stat({ label, value, tone = 'neutral' }) {
  return (
    <div className={`stat stat-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function Fact({ label, value }) {
  const missing = !value || value === 'Needs verification';
  return (
    <div className={`fact ${missing ? 'fact-missing' : ''}`}>
      <dt>{label}</dt>
      <dd>{value || 'Needs verification'}</dd>
    </div>
  );
}

export function Eyebrow({ children }) {
  return <p className="eyebrow">{children}</p>;
}

export function FreshnessBadge({ freshness, prefix = 'Confirmed' }) {
  return (
    <span
      className={`freshness freshness-${freshness.tone}`}
      title={freshness.date ? `Last confirmed ${freshness.date}` : 'No confirmation date on record'}
    >
      <span className="freshness-dot" aria-hidden="true" />
      <span className="freshness-label">
        {prefix} {freshness.label.toLowerCase()}
      </span>
    </span>
  );
}

export function EmptyState({ title, message, action }) {
  return (
    <div className="state-card state-empty" role="status">
      <strong>{title}</strong>
      <p>{message}</p>
      {action}
    </div>
  );
}

export function LoadingState({ title = 'Loading', message = 'Fetching the current snapshot.' }) {
  return (
    <div className="state-card state-loading" role="status" aria-live="polite">
      <span className="state-spinner" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  );
}

export function ErrorState({ title = 'Could not load data', message, hint }) {
  return (
    <div className="state-card state-error" role="alert">
      <strong>{title}</strong>
      <p>{message}</p>
      {hint && <p className="state-hint">{hint}</p>}
    </div>
  );
}
