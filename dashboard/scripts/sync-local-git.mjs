import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { firestoreAdmin } from './firebase-admin.mjs';

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
  return { sha: sha.slice(0, 7), authorLogin: null, authorName, authorEmail, timestamp, title, url: null };
}).filter((commit) => commit.sha);

const repository = process.env.LOCAL_GIT_REPOSITORY_NAME;
const repositoryActivity = { repository, project: process.env.LOCAL_GIT_PROJECT || repository, origin: 'local-git', commits, openPullRequests: [] };
const generatedAt = new Date().toISOString();
const db = await firestoreAdmin();
const existing = await db.doc('dashboard/github-activity').get();
const otherRepositories = existing.exists ? (existing.data().repositories ?? []).filter((item) => item.repository !== repository) : [];
await db.doc('dashboard/github-activity').set({ generatedAt, repositories: [...otherRepositories, repositoryActivity] });
await db.doc('sync-runs/local-git').set({ source: 'Local Git log', status: 'success', refreshedAt: generatedAt, repository, branch, commitCount: commits.length });
console.log(`Local Git activity published to Firestore: ${repository} (${commits.length} commits).`);
