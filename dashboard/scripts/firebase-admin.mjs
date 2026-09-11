import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultKeyPath = resolve(dashboardRoot, '..', '..', 'kapphelper-dashboard-local-secrets', 'kapphelper-dashboard-admin.json');

export async function firestoreAdmin() {
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || defaultKeyPath;
  let credentials;
  try {
    credentials = JSON.parse(await readFile(keyPath, 'utf8'));
  } catch {
    throw new Error(`Firebase Admin key not found at ${keyPath}. Put the downloaded JSON there, or set FIREBASE_SERVICE_ACCOUNT_PATH.`);
  }
  const app = getApps()[0] ?? initializeApp({ credential: cert(credentials) });
  return getFirestore(app);
}
