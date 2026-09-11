import { STATUS_BUCKETS, bucketFor } from '../lib/status.js';

export function Sidebar({ projects, view, onChangeView, selectedId, onSelectProject }) {
  const grouped = STATUS_BUCKETS.map((bucket) => ({
    bucket,
    items: projects.filter((p) => bucket.match(p.status)),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">K</span>
        <div>
          <strong>KAppHelper</strong>
          <span className="brand-sub">Developer dashboard</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Primary views">
        {[
          { id: 'meeting', label: 'Team meeting', hint: 'Screen-share view' },
          { id: 'portfolio', label: 'Portfolio', hint: 'Browse all projects' },
          { id: 'integrations', label: 'Data sources', hint: 'Live wiring status' },
        ].map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`sidebar-nav-item ${view === entry.id ? 'active' : ''}`}
            onClick={() => onChangeView(entry.id)}
          >
            <span>{entry.label}</span>
            <small>{entry.hint}</small>
          </button>
        ))}
      </nav>

      <div className="sidebar-projects" aria-label="Project quick navigation">
        <p className="sidebar-heading">Projects by health</p>
        {grouped.map(({ bucket, items }) => (
          <div key={bucket.id} className="sidebar-group">
            <span className={`sidebar-group-label tone-${bucket.tone}`}>
              {bucket.label}
              <em>{items.length}</em>
            </span>
            <ul>
              {items.map((project) => (
                <li key={project.id}>
                  <button
                    type="button"
                    className={`sidebar-project ${selectedId === project.id ? 'selected' : ''}`}
                    onClick={() => onSelectProject(project.id)}
                    title={project.status}
                  >
                    <span className="sidebar-project-name">{project.name}</span>
                    <span className={`sidebar-project-dot tone-${bucketFor(project.status).tone}`} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="pill pill-read-only">Read only</span>
        <p>Snapshot data. No secrets, no deploy actions, no Plane writes.</p>
      </div>
    </aside>
  );
}
