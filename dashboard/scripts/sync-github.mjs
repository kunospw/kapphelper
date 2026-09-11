import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firestoreAdmin } from './firebase-admin.mjs';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = ['GITHUB_APP_ID', 'GITHUB_APP_INSTALLATION_ID', 'GITHUB_PRIVATE_KEY_PATH', 'GITHUB_REPOSITORIES'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(', ')}`);
  process.exit(1);
}

function base64Url(value) { return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url'); }

async function appJwt() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64Url({ alg: 'RS256', typ: 'JWT' })}.${base64Url({ iat: now - 30, exp: now + 9 * 60, iss: process.env.GITHUB_APP_ID })}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(await readFile(process.env.GITHUB_PRIVATE_KEY_PATH, 'utf8')).toString('base64url')}`;
}

async function github(path, token, method = 'GET') {
  const response = await fetch(`https://api.github.com${path}`, { method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'kapphelper-sync' } });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${await response.text()}`);
  return response.json();
}

const jwt = await appJwt();
const installation = await github(`/app/installations/${process.env.GITHUB_APP_INSTALLATION_ID}/access_tokens`, jwt, 'POST');
const repositories = process.env.GITHUB_REPOSITORIES.split(',').map((value) => value.trim()).filter(Boolean);
const activity = [];
for (const repository of repositories) {
  const [commits, pullRequests] = await Promise.all([github(`/repos/${repository}/commits?per_page=30`, installation.token), github(`/repos/${repository}/pulls?state=open&per_page=30`, installation.token)]);
  activity.push({ repository, commits: commits.map((commit) => ({ sha: commit.sha.slice(0, 7), authorLogin: commit.author?.login ?? null, authorName: commit.commit.author.name, authorEmail: commit.commit.author.email, timestamp: commit.commit.author.date, title: commit.commit.message.split('\n')[0], url: commit.html_url })), openPullRequests: pullRequests.map((pullRequest) => ({ number: pullRequest.number, title: pullRequest.title, authorLogin: pullRequest.user?.login ?? null, updatedAt: pullRequest.updated_at, url: pullRequest.html_url })) });
}
const generatedAt = new Date().toISOString();
const db = await firestoreAdmin();
await db.doc('dashboard/github-activity').set({ generatedAt, repositories: activity });
await db.doc('sync-runs/github').set({ source: 'GitHub App', status: 'success', refreshedAt: generatedAt, repositoryCount: activity.length });
console.log(`GitHub activity published to Firestore: ${activity.length} repository/repositories.`);
