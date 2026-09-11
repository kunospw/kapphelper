import { describeFreshness } from '../lib/freshness.js';
import { Fact, FreshnessBadge, Status } from './primitives.jsx';

function Section({ title, hint, children }) {
  return (
    <section className="section">
      <div className="section-head">
        <h3>{title}</h3>
        {hint && <span className="section-hint">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

export function ProjectDetail({ project, onBack }) {
  if (!project) {
    return (
      <section className="detail-placeholder">
        <p className="eyebrow">No project selected</p>
        <p>Select a project card or a sidebar row to see context, release safety, source records, and the recommended next work item.</p>
      </section>
    );
  }

  const freshness = describeFreshness(project.lastConfirmed);
  const hasRelease = project.release && Object.keys(project.release).length > 0;

  return (
    <article className="detail-panel" id="project-detail" aria-labelledby="detail-heading">
      <header className="detail-head">
        <div className="detail-head-main">
          <div className="detail-eyebrow-row">
            <p className="eyebrow">{project.kind}</p>
            <Status value={project.status} />
            <FreshnessBadge freshness={freshness} />
          </div>
          <h2 id="detail-heading">{project.name}</h2>
          <p className="detail-summary">{project.summary}</p>
          {onBack && (
            <button type="button" className="link-back" onClick={onBack}>
              ← Back to portfolio
            </button>
          )}
        </div>
        {project.risks?.length > 0 && (
          <aside className="warning" role="note">
            <strong>Top guardrail</strong>
            <p>{project.risks[0]}</p>
          </aside>
        )}
      </header>

      <div className="detail-body">
        <div className="detail-main">
          <Section title="Project context">
            <dl className="facts">
              <Fact label="Client" value={project.client} />
              <Fact label="Owner" value={project.owner} />
              <Fact label="Active developer" value={project.activeDeveloper} />
              <Fact label="Lifecycle" value={project.lifecycle} />
              <Fact label="Repositories" value={project.repositories?.join(' · ')} />
              <Fact label="Last confirmed" value={project.lastConfirmed} />
            </dl>
          </Section>

          {hasRelease && (
            <Section title="Release safety" hint="Facts required before any store or environment action.">
              <dl className="facts">
                {Object.entries(project.release).map(([label, value]) => (
                  <Fact key={label} label={label} value={value} />
                ))}
              </dl>
            </Section>
          )}

          {project.risks?.length > 0 && (
            <Section title="Risks and blockers">
              <ul className="list list-risk">
                {project.risks.map((risk) => (
                  <li key={risk}>{risk}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        <aside className="detail-side">
          <Section title="Recommended next work">
            <div className="next-work">
              <strong>{project.nextStep}</strong>
              {project.nextWhy && <p>{project.nextWhy}</p>}
              <p className="evidence-note">
                Recommendation drawn from the project record. Nothing here is
                inferred from the project name or a chat.
              </p>
            </div>
          </Section>

          <Section title="Source records">
            <ul className="source-list">
              {project.sources?.length ? project.sources.map((source) => (
                <li key={source} className="source">{source}</li>
              )) : <li className="source empty">No sources recorded.</li>}
            </ul>
          </Section>

          {project.evidence?.length > 0 && (
            <Section title="Evidence on file">
              <ul className="list list-ok">
                {project.evidence.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </Section>
          )}
        </aside>
      </div>
    </article>
  );
}
