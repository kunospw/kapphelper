import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prisma } from '../server/src/db.js';

const execFileAsync = promisify(execFile);
const required = ['LOCAL_GIT_REPOSITORY_PATH', 'LOCAL_GIT_BRANCH', 'LOCAL_GIT_REPOSITORY_NAME'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(', ')}`);
  process.exit(1);
}

async function git(args) {
  try {
    return (await execFileAsync('git', args, { windowsHide: true })).stdout;
  } catch (error) {
    throw new Error(`Git command failed: git ${args.join(' ')}\n${error.stderr || error.message}`);
  }
}

const repositoryPath = process.env.LOCAL_GIT_REPOSITORY_PATH;
const branch = process.env.LOCAL_GIT_BRANCH;
await git(['-C', repositoryPath, 'fetch', '--depth=100', 'origin', branch]);
const output = await git(['-C', repositoryPath, 'log', 'FETCH_HEAD', '-n', '30', '--format=%H%x1f%an%x1f%ae%x1f%aI%x1f%s%x1e']);
const commits = output.split('\x1e').map((record) => record.trim()).filter(Boolean).map((record) => {
  const [sha = '', authorName = 'Unknown author', authorEmail = '', timestamp = '', title = 'Untitled commit'] = record.split('\x1f');
  return { sha: sha.slice(0, 7), authorName, authorEmail, timestamp, title };
}).filter((commit) => commit.sha);

const repository = process.env.LOCAL_GIT_REPOSITORY_NAME;
const project = process.env.LOCAL_GIT_PROJECT || repository;

for (const commit of commits) {
  await prisma.githubCommit.upsert({
    where: { sha_repository: { sha: commit.sha, repository } },
    update: { syncedAt: new Date(), authorName: commit.authorName, authorEmail: commit.authorEmail, timestamp: new Date(commit.timestamp), title: commit.title, project },
    create: {
      sha: commit.sha,
      repository,
      project,
      origin: 'local-git',
      authorLogin: null,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      timestamp: new Date(commit.timestamp),
      title: commit.title,
      url: null,
    },
  });
}

const refreshedAt = new Date();
await prisma.syncRun.create({
  data: { source: 'local-git', status: 'success', detail: { repository, branch, commitCount: commits.length }, refreshedAt },
});

console.log(`Local Git activity synced to Postgres: ${repository} (${commits.length} commits).`);
await prisma.$disconnect();
