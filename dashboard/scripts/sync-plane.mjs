import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firestoreAdmin } from './firebase-admin.mjs';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokenPath = process.env.PLANE_TOKEN_PATH || resolve(dashboardRoot, '..', '..', 'kapphelper-dashboard-local-secrets', 'plane-readonly.token');
const required = ['PLANE_BASE_URL', 'PLANE_WORKSPACE', 'PLANE_PROJECT_ID', 'PLANE_PROJECT_NAME'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing required environment values: ${missing.join(', ')}`);
  process.exit(1);
}

const token = (await readFile(tokenPath, 'utf8')).trim();
if (!token) throw new Error(`Plane token file is empty: ${tokenPath}`);
if (!token.startsWith('plane_api_') || /[\r\n,]/.test(token)) throw new Error(`Plane token file must contain only one plane_api_ token. It appears to be a CSV or malformed file: ${tokenPath}`);
const configuredBase = process.env.PLANE_BASE_URL.replace(/\/$/, '');
const originBase = new URL(configuredBase).origin;
const workspace = encodeURIComponent(process.env.PLANE_WORKSPACE);
const projectId = encodeURIComponent(process.env.PLANE_PROJECT_ID);
const modernPath = `/api/v1/workspaces/${workspace}/projects/${projectId}/work-items/?limit=100&expand=state,assignees,project`;
const modernIssuesPath = `/api/v1/workspaces/${workspace}/projects/${projectId}/issues/?per_page=100&expand=state,assignees,project`;
const legacyPath = `/api/workspaces/${workspace}/projects/${projectId}/issues/?per_page=100&expand=state,assignees,project`;
const candidates = [...new Set([
  `${originBase}${legacyPath}`,
  `${originBase}${modernIssuesPath}`,
  `${originBase}${modernPath}`,
  `${configuredBase}${legacyPath}`,
  `${configuredBase}${modernIssuesPath}`,
  `${configuredBase}${modernPath}`,
])];

let response;
let endpoint;
const attempts = [];
const authMethods = [
  { name: 'X-API-Key', headers: { 'X-API-Key': token } },
  { name: 'Bearer', headers: { Authorization: `Bearer ${token}` } },
  { name: 'Basic', headers: { Authorization: `Basic ${Buffer.from(`${token}:`).toString('base64')}` } },
];

for (const candidate of candidates) {
  for (const auth of authMethods) {
    const attempt = await fetch(candidate, {
      headers: { Accept: 'application/json', ...auth.headers },
    });
    const contentType = attempt.headers.get('content-type') ?? '';
    if (attempt.ok && contentType.includes('application/json')) {
      response = attempt;
      endpoint = candidate;
      break;
    }
    // Deliberately record only the authentication *method*, never the token.
    attempts.push(`${attempt.status} ${candidate} [${auth.name}] (${contentType || 'no content type'})`);
  }
  if (response) break;
}
if (!response) throw new Error(`Plane did not return JSON from any candidate endpoint. Results: ${attempts.join(' | ')}`);

const payload = await response.json();
const records = Array.isArray(payload) ? payload : payload.results ?? payload.data ?? [];
const workItems = records.map((item) => ({
  id: item.id,
  identifier: item.identifier ?? (item.sequence_id ? `${process.env.PLANE_PROJECT_NAME}-${item.sequence_id}` : item.id),
  name: item.name ?? 'Untitled work item',
  state: item.state?.name ?? item.state_detail?.name ?? item.state_name ?? item.state ?? 'State unknown',
  priority: item.priority ?? 'none',
  assignees: (item.assignees ?? item.assignee_details ?? []).map((assignee) => ({ id: assignee.id, name: assignee.display_name ?? assignee.name ?? assignee.first_name ?? 'Unknown assignee', email: assignee.email ?? null })),
  targetDate: item.target_date ?? null,
  updatedAt: item.updated_at ?? item.created_at ?? null,
  createdAt: item.created_at ?? null,
  url: item.id ? `${configuredBase}/${process.env.PLANE_WORKSPACE}/browse/${item.id}` : null,
}));

const generatedAt = new Date().toISOString();
const db = await firestoreAdmin();
await db.doc('dashboard/plane-activity').set({ generatedAt, project: { id: process.env.PLANE_PROJECT_ID, name: process.env.PLANE_PROJECT_NAME }, workItems });
await db.doc('sync-runs/plane').set({ source: 'Plane API', status: 'success', refreshedAt: generatedAt, project: process.env.PLANE_PROJECT_NAME, workItemCount: workItems.length, endpoint });
console.log(`Plane activity published to Firestore: ${process.env.PLANE_PROJECT_NAME} (${workItems.length} work items).`);
