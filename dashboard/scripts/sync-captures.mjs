// Turns KAppHelper capture files into developer activity, so what a developer
// records with /capture (their own session notes, decisions, blockers) shows up
// on their card without anyone hand-editing data/portfolio.json.
//
// Reads apps/*/capture/*.md and clients/*/capture/*.md (frontmatter per the root
// CLAUDE.md capture format) and writes Activity rows with origin="capture".
// That origin is deliberately separate: merge-activity.mjs replaces every
// origin="synced" row on each run and publish-portfolio.mjs replaces every
// origin="manual" row, so neither would preserve capture rows.
//
// Attribution: a capture becomes activity only when its `from:` matches a
// registered Developer (name, alias, githubLogin, email, or an unambiguous first
// name). Captures FROM stakeholders (Ken, Iwan, ...) record decisions about a
// project, not developer work, so they are skipped and counted, never attributed
// to a developer. Nothing is invented: unknown authors are reported, not stubbed.
//
// PROJECT STATUS FROM CAPTURES: a capture may also carry optional frontmatter that
// updates the project's meeting row, so developers can report a milestone or
// blocker without editing data/portfolio.json:
//   project:         project id (defaults to the capture folder's slug when that is a project id)
//   health:          Active | On track | At risk | Needs plan | Needs verification | No update | Paused | Release blocked
//   milestone:       next milestone, plain text        milestone_date: YYYY-MM-DD (appended as "target <date>")
//   blocker:         what is blocking (or "none")      next_step: the next action
//   active_dev:      who is driving it now
// Captures are applied oldest to newest, so the latest value per field wins. Every applied
// update is stamped "reported by <from>, <date>" so nothing looks more authoritative than
// it is. This stage runs AFTER publish-portfolio in sync-all, which re-seeds Project rows
// from portfolio.json each run; running publish:portfolio alone therefore resets them until
// the next captures sync.
//
// Idempotent: each run deletes all origin="capture" rows and recreates them
// from the files on disk. `--dry` prints what would be written and touches nothing.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../server/src/db.js';

const dryRun = process.argv.includes('--dry');
const dashboardRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = process.env.KAPPHELPER_ROOT ? resolve(process.env.KAPPHELPER_ROOT) : resolve(dashboardRoot, '..');

function identityKey(value) { return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, ''); }

function parseCapture(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const meta = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!pair) continue;
    meta[pair[1]] = pair[2].replace(/\s+#\s.*$/, '').replace(/^["']|["']$/g, '').trim();
  }
  return { meta, body: match[2] };
}

// First paragraph under "## What", flattened and shortened — a preview, not the record.
function whatSummary(body) {
  const section = body.match(/^##\s+What\s*\n([\s\S]*?)(?=^##\s|\s*$(?![\s\S]))/m);
  const text = (section ? section[1] : body).replace(/\s+/g, ' ').trim();
  return text.length > 320 ? `${text.slice(0, 317)}...` : text;
}

const developers = await prisma.developer.findMany();
const projects = await prisma.project.findMany({ select: { id: true } });
const projectIds = new Set(projects.map((project) => project.id));

const firstNameCounts = new Map();
for (const developer of developers) {
  const first = identityKey(developer.name.split(/\s+/)[0]);
  firstNameCounts.set(first, (firstNameCounts.get(first) ?? 0) + 1);
}

function findDeveloper(from) {
  const key = identityKey(from);
  if (!key) return null;
  for (const developer of developers) {
    const aliases = Array.isArray(developer.aliases) ? developer.aliases : [];
    const candidates = [developer.name, developer.githubLogin, developer.email, ...aliases].map(identityKey).filter(Boolean);
    if (candidates.includes(key)) return developer;
  }
  // "Dyah" -> "Dyah Rini", but only when exactly one developer has that first name.
  if (firstNameCounts.get(key) === 1) {
    return developers.find((developer) => identityKey(developer.name.split(/\s+/)[0]) === key) ?? null;
  }
  return null;
}

const files = [];
for (const kind of ['apps', 'clients']) {
  const kindDir = join(repoRoot, kind);
  if (!existsSync(kindDir)) continue;
  for (const slug of readdirSync(kindDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const captureDir = join(kindDir, slug.name, 'capture');
    if (!existsSync(captureDir)) continue;
    for (const file of readdirSync(captureDir).filter((name) => name.endsWith('.md'))) {
      files.push({ slug: slug.name, path: join(captureDir, file) });
    }
  }
}

const VALID_HEALTH = new Set(['Active', 'On track', 'At risk', 'Needs plan', 'Needs verification', 'No update', 'Paused', 'Release blocked']);
const NONE_VALUE = /^(none|no|nil|n\/a|-|—)$/i;
const FIELD_KEYS = ['health', 'milestone', 'milestone_date', 'blocker', 'next_step', 'active_dev'];
const projectUpdates = []; // { projectId, rel, date, from, meta, summary }
const projectWarnings = [];

function collectProjectUpdate({ slug, rel, meta, body }) {
  if (!FIELD_KEYS.some((key) => meta[key])) return;
  const projectId = meta.project || (projectIds.has(slug) ? slug : null);
  if (!projectId || !projectIds.has(projectId)) {
    projectWarnings.push(`${rel}: has status fields but no valid project (set "project: <id>"; known: ${[...projectIds].join(', ')})`);
    return;
  }
  projectUpdates.push({ projectId, rel, date: meta.date, from: meta.from || 'unknown', meta, summary: whatSummary(body) });
}

const rows = [];
const skipped = { noFrontmatter: [], badDate: [], notDeveloper: new Map() };
const latestByDeveloper = new Map();

for (const { slug, path } of files) {
  const rel = relative(repoRoot, path).split('\\').join('/');
  const parsed = parseCapture(readFileSync(path, 'utf8'));
  if (!parsed) { skipped.noFrontmatter.push(rel); continue; }
  const { meta, body } = parsed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) { skipped.badDate.push(rel); continue; }

  collectProjectUpdate({ slug, rel, meta, body });

  const developer = findDeveloper(meta.from);
  if (!developer) {
    skipped.notDeveloper.set(meta.from || '(no from)', (skipped.notDeveloper.get(meta.from || '(no from)') ?? 0) + 1);
    continue;
  }

  const timestamp = new Date(`${meta.date}T12:00:00+08:00`);
  const tags = [meta.type, meta.status, meta.plane && meta.plane !== '—' && meta.plane !== '-' ? meta.plane : null].filter(Boolean).join(' · ');
  rows.push({
    developerId: developer.id,
    projectId: projectIds.has(slug) ? slug : null,
    projectLabel: projectIds.has(slug) ? null : slug,
    timestamp,
    title: meta.about || rel.split('/').pop(),
    summary: `${tags ? `[${tags}] ` : ''}${whatSummary(body)}`.trim(),
    sourceType: 'capture',
    sourceRef: rel,
    url: null,
    origin: 'capture',
  });
  const latest = latestByDeveloper.get(developer.id);
  if (!latest || timestamp > latest) latestByDeveloper.set(developer.id, timestamp);
}

const perDeveloper = new Map();
for (const row of rows) perDeveloper.set(row.developerId, (perDeveloper.get(row.developerId) ?? 0) + 1);

const report = [
  `${files.length} capture file(s) scanned`,
  `${rows.length} attributed to a developer (${[...perDeveloper].map(([id, n]) => `${id}: ${n}`).join(', ') || 'none'})`,
  `${[...skipped.notDeveloper.values()].reduce((a, b) => a + b, 0)} skipped, author is not a registered developer (${[...skipped.notDeveloper].map(([who, n]) => `${who}: ${n}`).join(', ') || 'none'})`,
];
if (skipped.noFrontmatter.length) report.push(`${skipped.noFrontmatter.length} skipped, no frontmatter: ${skipped.noFrontmatter.join(', ')}`);
if (skipped.badDate.length) report.push(`${skipped.badDate.length} skipped, bad/missing date: ${skipped.badDate.join(', ')}`);

// Fold updates oldest -> newest so the latest value per field wins.
projectUpdates.sort((a, b) => a.date.localeCompare(b.date) || a.rel.localeCompare(b.rel));
const folded = new Map(); // projectId -> { fields, date, from, summary, sources[] }
for (const update of projectUpdates) {
  const entry = folded.get(update.projectId) ?? { fields: {}, sources: [] };
  const { meta } = update;
  if (meta.health) {
    if (VALID_HEALTH.has(meta.health)) entry.fields.health = meta.health;
    else projectWarnings.push(`${update.rel}: unknown health "${meta.health}" ignored (use: ${[...VALID_HEALTH].join(' | ')})`);
  }
  if (meta.milestone) {
    const dated = meta.milestone_date && /^\d{4}-\d{2}-\d{2}$/.test(meta.milestone_date);
    if (meta.milestone_date && !dated) projectWarnings.push(`${update.rel}: milestone_date "${meta.milestone_date}" must be YYYY-MM-DD, date ignored`);
    entry.fields.milestone = dated ? `${meta.milestone} (target ${meta.milestone_date})` : meta.milestone;
  } else if (meta.milestone_date) {
    projectWarnings.push(`${update.rel}: milestone_date without milestone ignored`);
  }
  if (meta.blocker) entry.fields.blocker = NONE_VALUE.test(meta.blocker) ? 'No blocker recorded.' : meta.blocker;
  if (meta.next_step) entry.fields.nextStep = meta.next_step;
  if (meta.active_dev) entry.fields.activeDeveloper = meta.active_dev;
  if (Object.keys(entry.fields).length) {
    entry.date = update.date;
    entry.from = update.from;
    entry.summary = update.summary;
    entry.sources.push(update.rel);
  }
  folded.set(update.projectId, entry);
}
for (const [id, entry] of folded) if (!Object.keys(entry.fields).length) folded.delete(id);

if (projectWarnings.length) report.push(...projectWarnings.map((warning) => `⚠ ${warning}`));
report.push(`${folded.size} project(s) updated from capture status fields${folded.size ? ` (${[...folded].map(([id, e]) => `${id}: ${Object.keys(e.fields).join('/')}`).join(', ')})` : ''}`);

if (dryRun) {
  console.log(`[dry run] nothing written.\n  ${report.join('\n  ')}`);
  for (const row of rows) console.log(`  + ${row.timestamp.toISOString().slice(0, 10)} ${row.developerId} | ${row.title}`);
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$transaction([
  prisma.activity.deleteMany({ where: { origin: 'capture' } }),
  ...(rows.length ? [prisma.activity.createMany({ data: rows })] : []),
]);

for (const [projectId, entry] of folded) {
  const current = await prisma.project.findUnique({ where: { id: projectId } });
  const meeting = { ...(current.meeting ?? {}) };
  const data = {};
  if (entry.fields.health) { data.status = entry.fields.health; meeting.health = entry.fields.health; }
  if (entry.fields.milestone) meeting.milestone = entry.fields.milestone;
  if (entry.fields.blocker) meeting.blocker = entry.fields.blocker;
  if (entry.fields.nextStep) data.nextStep = entry.fields.nextStep;
  if (entry.fields.activeDeveloper) data.activeDeveloper = entry.fields.activeDeveloper;
  meeting.lastUpdate = entry.date;
  meeting.reportedBy = entry.from;
  meeting.latestUpdate = `${entry.summary} (reported by ${entry.from}, ${entry.date})`;
  data.lastConfirmed = entry.date;
  data.meeting = meeting;
  await prisma.project.update({ where: { id: projectId }, data });
}

for (const [id, timestamp] of latestByDeveloper) {
  const developer = developers.find((entry) => entry.id === id);
  if (!developer.lastUpdated || timestamp > developer.lastUpdated) {
    await prisma.developer.update({ where: { id }, data: { lastUpdated: timestamp } });
  }
}

await prisma.syncRun.create({
  data: { source: 'captures', status: 'success', detail: { scanned: files.length, attributed: rows.length, projectsUpdated: folded.size }, refreshedAt: new Date() },
});

console.log(`Captures synced to Postgres: ${rows.length} of ${files.length} attributed to a developer.`);
await prisma.$disconnect();
