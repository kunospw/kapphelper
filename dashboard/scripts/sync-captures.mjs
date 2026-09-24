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

const rows = [];
const skipped = { noFrontmatter: [], badDate: [], notDeveloper: new Map() };
const latestByDeveloper = new Map();

for (const { slug, path } of files) {
  const rel = relative(repoRoot, path).split('\\').join('/');
  const parsed = parseCapture(readFileSync(path, 'utf8'));
  if (!parsed) { skipped.noFrontmatter.push(rel); continue; }
  const { meta, body } = parsed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date ?? '')) { skipped.badDate.push(rel); continue; }

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

for (const [id, timestamp] of latestByDeveloper) {
  const developer = developers.find((entry) => entry.id === id);
  if (!developer.lastUpdated || timestamp > developer.lastUpdated) {
    await prisma.developer.update({ where: { id }, data: { lastUpdated: timestamp } });
  }
}

await prisma.syncRun.create({
  data: { source: 'captures', status: 'success', detail: { scanned: files.length, attributed: rows.length }, refreshedAt: new Date() },
});

console.log(`Captures synced to Postgres: ${rows.length} of ${files.length} attributed to a developer.`);
await prisma.$disconnect();
