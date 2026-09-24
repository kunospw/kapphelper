// Runs scripts/sync-all.mjs in the background while the API server is up, so
// developers never have to run the sync commands by hand — start `npm run
// server` and the dashboard stays current on its own. Only active while this
// process is running; if the server isn't started, nothing syncs (that's the
// tradeoff of "trigger it from the server" over an OS-level scheduled task).
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

let running = false;

function runSyncAll() {
  if (running) {
    console.log('[sync] skipped — previous run still in progress');
    return;
  }
  running = true;
  const startedAt = new Date();
  const child = spawn(process.execPath, ['scripts/sync-all.mjs'], { cwd: dashboardRoot, stdio: 'inherit' });
  child.on('close', (code) => {
    running = false;
    const seconds = ((Date.now() - startedAt.getTime()) / 1000).toFixed(1);
    console.log(`[sync] finished in ${seconds}s (exit ${code})`);
  });
  child.on('error', (error) => {
    running = false;
    console.error('[sync] failed to start sync-all.mjs:', error.message);
  });
}

export function startSyncScheduler({ intervalMinutes = 60 } = {}) {
  const intervalMs = intervalMinutes * 60 * 1000;
  console.log(`[sync] scheduler started — running now, then every ${intervalMinutes} min`);
  runSyncAll();
  const timer = setInterval(runSyncAll, intervalMs);
  timer.unref(); // don't keep the process alive on its own — express's listen() already does that
  return () => clearInterval(timer);
}
