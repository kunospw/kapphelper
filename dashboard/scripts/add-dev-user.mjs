// Register a dev's login: npm run add-dev-user -- "email@kairossolutions.co" "Full Name" ["Role · Focus"] ["optional-password"] [--access=pm|lead|dev]
// WARNING: for an email that already exists this RESETS its password (and reactivates it). To change only the
// permission level use `npm run set-access`. New logins default to --access=dev.
// Prints the plaintext password once (generated if not given) — relay it to
// the dev out of band. There is no self-service signup by design: only
// someone able to run this script can add a login.
import { randomBytes } from 'node:crypto';
import { prisma } from '../server/src/db.js';
import { hashPassword } from '../server/src/auth/hash.js';
import { ACCESS_ROLES, normalizeAccessRole } from '../server/src/auth/roles.js';

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const flags = process.argv.slice(2).filter((arg) => arg.startsWith('--'));
const [email, name, role, providedPassword] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const accessFlag = flags.find((flag) => flag.startsWith('--access='))?.slice('--access='.length);
const accessRole = accessFlag === undefined ? undefined : normalizeAccessRole(accessFlag);
if (accessFlag !== undefined && !accessRole) {
  console.error(`--access must be one of: ${ACCESS_ROLES.join(', ')}`);
  process.exit(1);
}
if (!email || !name) {
  console.error('Usage: npm run add-dev-user -- "email@kairossolutions.co" "Full Name" ["Role"] ["password"]');
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();
const password = providedPassword || randomBytes(9).toString('base64url');
const developerId = slug(name);

const developer = await prisma.developer.upsert({
  where: { id: developerId },
  update: { name, email: normalizedEmail, role: role ?? undefined },
  create: { id: developerId, name, email: normalizedEmail, role: role ?? null },
});

const devUser = await prisma.devUser.upsert({
  where: { email: normalizedEmail },
  update: { passwordHash: await hashPassword(password), active: true, developerId: developer.id, ...(accessRole ? { accessRole } : {}) },
  create: { email: normalizedEmail, passwordHash: await hashPassword(password), developerId: developer.id, accessRole: accessRole ?? 'dev' },
});

console.log(`Registered ${devUser.email} (developer: ${developer.name}, id: ${developer.id}, access: ${devUser.accessRole}).`);
if (!providedPassword) console.log(`Generated password (share this once, it is not stored anywhere): ${password}`);

await prisma.$disconnect();
