import { describeFreshness } from '../lib/freshness.js';
import { EmptyState, FreshnessBadge, Status } from './primitives.jsx';

function ProjectCard({ project, onSelect, selected }) {
  const freshness = describeFreshness(project.lastConfirmed);
  return (
    <button
      type="button"
      className={`project-card ${selected ? 'selected' : ''}`}
      onClick={() => onSelect(project.id)}
      aria-pressed={selected}
    >
      <span className="card-top">
        <span className="project-kind">{project.kind}</span>
        <Status value={project.status} />
      </span>
      <strong className="project-name">{project.name}</strong>
      <span className="project-client">{project.client}</span>
      <span className="project-summary">{project.summary}</span>
      <span className="card-meta">
        <FreshnessBadge freshness={freshness} />
      </span>
      <span className="card-footer">
        <span className="next-label">Next</span>
        <span className="next-step">{project.nextStep}</span>
      </span>
    </button>
  );
}

export function PortfolioView({ projects, selectedId, onSelect, query }) {
  if (projects.length === 0) {
    const message = query
      ? `Nothing matched "${query}". Try a client name, a lifecycle word, or a risk keyword.`
      : 'No projects registered yet.';
    return (
      <EmptyState
        title="No projects to show"
        message={message}
      />
    );
  }
  return (
    <div className="project-grid" aria-label="Project portfolio">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          selected={selectedId === project.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
