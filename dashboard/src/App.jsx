import { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from './hooks/usePortfolio.js';
import { Sidebar } from './components/Sidebar.jsx';
import { TopBar } from './components/TopBar.jsx';
import { MeetingView } from './components/MeetingView.jsx';
import { PortfolioView } from './components/PortfolioView.jsx';
import { ProjectDetail } from './components/ProjectDetail.jsx';
import { IntegrationsView } from './components/IntegrationsView.jsx';
import { ErrorState, LoadingState } from './components/primitives.jsx';
import { AuthGate } from './components/AuthGate.jsx';
import { useAuth } from './hooks/useAuth.js';

const DEFAULT_VIEW = 'meeting';

function filterProjects(projects, query) {
  const term = query.trim().toLowerCase();
  if (!term) return projects;
  return projects.filter((project) => JSON.stringify(project).toLowerCase().includes(term));
}

function App() {
  const auth = useAuth();
  const { status, data, error, source, reload } = usePortfolio(auth.user);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');

  const projects = data?.projects ?? [];
  const filtered = useMemo(() => filterProjects(projects, query), [projects, query]);
  const selected = useMemo(
    () => projects.find((project) => project.id === selectedId) ?? null,
    [projects, selectedId],
  );

  useEffect(() => {
    if (view !== 'detail') return;
    const node = document.querySelector('#project-detail');
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [view, selectedId]);

  const openProject = (id) => {
    setSelectedId(id);
    setView('detail');
  };

  const changeView = (next) => {
    setView(next);
    if (next !== 'detail') setSelectedId('');
  };

  return <AuthGate auth={auth}>
    <div className="shell">
      <Sidebar
        projects={projects}
        view={view}
        onChangeView={changeView}
        selectedId={selectedId}
        onSelectProject={openProject}
      />

      <main className="main">
        <TopBar
          view={view}
          snapshotDate={data?.generatedAt}
          query={query}
          onQueryChange={setQuery}
          source={source}
          user={auth.user}
          onSignOut={auth.signOut}
        />

        {status === 'loading' && (
          <LoadingState message="Loading the KAppHelper snapshot." />
        )}

        {status === 'error' && (
          <ErrorState
            message={error ?? 'Snapshot could not be read.'}
            hint="Confirm that your account is active (ask an admin) and that the first portfolio publish has run (npm run publish:portfolio)."
          />
        )}

        {status === 'ready' && (
          <>
            {view === 'meeting' && (
              <MeetingView projects={filtered} developers={data?.developerActivity ?? []} githubConnected={Boolean(data?.github?.generatedAt)} planeConnected={Boolean(data?.plane?.generatedAt)} onOpenProject={openProject} currentDeveloperId={auth.user?.developerId} query={query} planeWriteMode={data?.planeWriteMode} onChanged={reload} />
            )}

            {view === 'portfolio' && (
              <PortfolioView
                projects={filtered}
                selectedId={selectedId}
                onSelect={openProject}
                query={query}
              />
            )}

            {view === 'detail' && (
              <ProjectDetail
                project={selected}
                onBack={() => changeView('portfolio')}
              />
            )}

            {view === 'integrations' && (
              <IntegrationsView snapshotDate={data?.generatedAt} source={source} github={data?.github} plane={data?.plane} runs={data?.runs} planeWriteMode={data?.planeWriteMode} />
            )}
          </>
        )}
      </main>
    </div>
  </AuthGate>;
}

export default App;
