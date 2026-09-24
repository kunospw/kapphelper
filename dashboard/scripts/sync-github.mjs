import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { prisma } from '../server/src/db.js';

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

let commitCount = 0;
let pullRequestCount = 0;
for (const repository of repositories) {
  const [commits, pullRequests] = await Promise.all([
    github(`/repos/${repository}/commits?per_page=30`, installation.token),
    github(`/repos/${repository}/pulls?state=open&per_page=30`, installation.token),
  ]);

  for (const commit of commits) {
    const sha = commit.sha.slice(0, 7);
    await prisma.githubCommit.upsert({
      where: { sha_repository: { sha, repository } },
      update: {
        authorLogin: commit.author?.login ?? null,
        authorName: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        timestamp: new Date(commit.commit.author.date),
        title: commit.commit.message.split('\n')[0],
        url: commit.html_url,
      },
      create: {
        sha,
        repository,
        origin: 'github-app',
        authorLogin: commit.author?.login ?? null,
        authorName: commit.commit.author.name,
        authorEmail: commit.commit.author.email,
        timestamp: new Date(commit.commit.author.date),
        title: commit.commit.message.split('\n')[0],
        url: commit.html_url,
      },
    });
  }
  commitCount += commits.length;

  for (const pullRequest of pullRequests) {
    await prisma.githubPullRequest.upsert({
      where: { number_repository: { number: pullRequest.number, repository } },
      update: { title: pullRequest.title, authorLogin: pullRequest.user?.login ?? null, updatedAt: new Date(pullRequest.updated_at), url: pullRequest.html_url },
      create: { number: pullRequest.number, repository, title: pullRequest.title, authorLogin: pullRequest.user?.login ?? null, updatedAt: new Date(pullRequest.updated_at), url: pullRequest.html_url },
    });
  }
  pullRequestCount += pullRequests.length;
}

const refreshedAt = new Date();
await prisma.syncRun.create({
  data: { source: 'github', status: 'success', detail: { repositoryCount: repositories.length, commitCount, pullRequestCount }, refreshedAt },
});

console.log(`GitHub activity synced to Postgres: ${repositories.length} repository/repositories.`);
await prisma.$disconnect();
