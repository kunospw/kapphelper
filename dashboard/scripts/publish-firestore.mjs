import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { firestoreAdmin } from './firebase-admin.mjs';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const portfolioPath = resolve(dashboardRoot, 'data', 'portfolio.json');
const portfolio = JSON.parse(await readFile(portfolioPath, 'utf8'));
const db = await firestoreAdmin();
const publishedAt = new Date().toISOString();

await db.doc('dashboard/current').set({ portfolio, publishedAt, schemaVersion: 1 });
await db.doc('sync-runs/portfolio').set({ source: 'KAppHelper portfolio', status: 'success', refreshedAt: publishedAt });
console.log(`Dashboard snapshot published to Firestore at ${publishedAt}`);
