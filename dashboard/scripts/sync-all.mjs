// Runs the full sync pipeline in one command: publish the hand-maintained
// portfolio, pull each connected source, then merge everything into the
// Activity/Action feed. Each stage is isolated — one source failing (e.g.
// Plane unreachable) does not block the others or the merge step, so the
// dashboard still gets partial fresh data instead of nothing.
//
// Order matters: publish:portfolio must run before merge:activity so
// Project ids exist to match against; the three source syncs can run in
// any order relative to each other.
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// [envFiles, script, label, required] — required=false means "skip quietly
// if its env file is missing" instead of failing the whole run, so a
// machine that only has some sources configured (e.g. the Mac) still works.
const stages = [
  { label: 'portfolio', envFiles: ['.env.server'], script: 'scripts/publish-portfolio.mjs', required: true },
  { label: 'github', envFiles: ['.env.server', '.env.sync'], script: 'scripts/sync-github.mjs', required: false },
  { label: 'tsapp-git', envFiles: ['.env.server', '.env.gitlog'], script: 'scripts/sync-local-git.mjs', required: false },
  { label: 'plane', envFiles: ['.env.server', '.env.plane'], script: 'scripts/sync-plane.mjs', required: false },
  { label: 'captures', envFiles: ['.env.server'], script: 'scripts/sync-captures.mjs', required: false },
];

const { existsSync } = await import('node:fs');

function run(args) {
  return new Promise((resolvePromise) => {
    const child = spawn(process.execPath, args, { cwd: dashboardRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (code) => resolvePromise({ code, stdout: stdout.trim(), stderr: stderr.trim() }));
  });
}

const results = [];
const startedAt = new Date();
console.log(`▶ sync-all starting ${startedAt.toISOString()}`);

// Pull teammates' pushed captures before ingesting them. Without this the
// dashboard only ever sees captures that exist in THIS checkout, so a junior's
// pushed capture would never show up. Fast-forward only, and never fatal: if the
// pull can't apply cleanly (local edits in the way, no network, diverged), the
// sync carries on with what's on disk and says so. Set SYNC_GIT_PULL=false to skip.
if (process.env.SYNC_GIT_PULL !== 'false') {
  const repoRoot = resolve(dashboardRoot, '..');
  const pull = await run(['-e', `
    const { spawnSync } = require('node:child_process');
    const r = spawnSync('git', ['-C', ${JSON.stringify(repoRoot)}, 'pull', '--ff-only', '--quiet'], { encoding: 'utf8', timeout: 60000 });
    process.stdout.write(((r.stdout || '') + (r.stderr || '')).trim());
    process.exit(r.status ?? 1);
  `]);
  if (pull.code === 0) {
    console.log('  ✓ kapphelper: git pull --ff-only ok (captures pushed by teammates are included)');
  } else {
    const reason = (pull.stdout || pull.stderr || 'unknown error').split(/\r?\n/)[0];
    console.warn(`  ⚠ kapphelper: git pull skipped — ${reason} (continuing with local files)`);
  }
}

for (const stage of stages) {
  const envArgs = stage.envFiles.flatMap((file) => [`--env-file=${file}`]);
  const missingEnv = stage.envFiles.filter((file) => !existsSync(resolve(dashboardRoot, file)));
  if (missingEnv.length) {
    const message = `skipped — missing ${missingEnv.join(', ')}`;
    console.log(`  ⏭  ${stage.label}: ${message}`);
    results.push({ stage: stage.label, ok: null, message });
    if (stage.required) {
      console.error(`❌ ${stage.label} is required and its env is missing — aborting before merge.`);
      process.exit(1);
    }
    continue;
  }

  const result = await run([...envArgs, stage.script]);
  if (result.code === 0) {
    console.log(`  ✓ ${stage.label}: ${result.stdout.split('\n').pop()}`);
    results.push({ stage: stage.label, ok: true, message: result.stdout });
  } else {
    console.error(`  ✗ ${stage.label} failed (exit ${result.code}): ${result.stderr || result.stdout}`);
    results.push({ stage: stage.label, ok: false, message: result.stderr || result.stdout });
    if (stage.required) {
      console.error(`❌ ${stage.label} is required — aborting before merge.`);
      process.exit(1);
    }
  }
}

const mergeResult = await run(['--env-file=.env.server', 'scripts/merge-activity.mjs']);
if (mergeResult.code === 0) {
  console.log(`  ✓ merge: ${mergeResult.stdout}`);
} else {
  console.error(`  ✗ merge failed (exit ${mergeResult.code}): ${mergeResult.stderr || mergeResult.stdout}`);
}

const finishedAt = new Date();
const failed = results.filter((r) => r.ok === false).length;
const skipped = results.filter((r) => r.ok === null).length;
const ok = results.filter((r) => r.ok === true).length;
console.log(`▶ sync-all done in ${((finishedAt - startedAt) / 1000).toFixed(1)}s — ${ok} synced, ${skipped} skipped, ${failed} failed, merge ${mergeResult.code === 0 ? 'ok' : 'FAILED'}`);

// Exit non-zero only if something that was actually attempted failed, or the
// merge step failed — a skipped (unconfigured) source is not an error.
process.exit(failed > 0 || mergeResult.code !== 0 ? 1 : 0);
