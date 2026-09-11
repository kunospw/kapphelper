function safeId(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

function findDeveloper(developers, commit) {
  const values = [commit.authorLogin, commit.authorEmail, commit.authorName].filter(Boolean).map((value) => value.toLowerCase());
  return developers.find((developer) => [developer.githubLogin, developer.email, developer.name].filter(Boolean).some((candidate) => values.includes(candidate.toLowerCase())));
}

export function mergeGithubActivity(portfolio, github) {
  if (!github?.generatedAt || !Array.isArray(github.repositories)) return portfolio;
  const developers = structuredClone(portfolio.developerActivity ?? []);
  for (const repository of github.repositories) for (const commit of repository.commits ?? []) {
    let developer = findDeveloper(developers, commit);
    if (!developer) {
      const displayName = commit.authorName || commit.authorLogin || 'Unmapped Git contributor';
      developer = { id: `github-${safeId(commit.authorLogin || commit.authorEmail || displayName)}`, name: displayName, role: 'Developer · GitHub activity', focus: 'Git activity has not yet been mapped to a KAppHelper developer profile.', lastUpdated: null, activities: [], actions: [] };
      developers.push(developer);
    }
    const syncLabel = repository.origin === 'local-git' ? 'local Git log sync' : 'read-only GitHub sync';
    developer.activities.unshift({ timestamp: commit.timestamp, project: repository.project ?? repository.repository, title: commit.title, summary: `Commit ${commit.sha} recorded from the ${syncLabel}.`, source: { type: 'commit', reference: `${repository.repository}@${commit.sha}` }, url: commit.url });
    if (!developer.lastUpdated || commit.timestamp > developer.lastUpdated) developer.lastUpdated = commit.timestamp;
  }
  for (const developer of developers) {
    developer.activities.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
    developer.activities = developer.activities.slice(0, 30);
  }
  return { ...portfolio, developerActivity: developers, github: { generatedAt: github.generatedAt, repositoryCount: github.repositories.length } };
}
