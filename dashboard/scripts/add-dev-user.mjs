// Register a dev's login: npm run add-dev-user -- "email@kairossolutions.co" "Full Name" ["Role · Focus"] ["optional-password"]
// Prints the plaintext password once (generated if not given) — relay it to
// the dev out of band. There is no self-service signup by design: only
// someone able to run this script can add a login.
import { randomBytes } from 'node:crypto';
import { prisma } from '../server/src/db.js';
import { hashPassword } from '../server/src/auth/hash.js';

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const [email, name, role, providedPassword] = process.argv.slice(2);
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
  update: { passwordHash: await hashPassword(password), active: true, developerId: developer.id },
  create: { email: normalizedEmail, passwordHash: await hashPassword(password), developerId: developer.id },
});

console.log(`Registered ${devUser.email} (developer: ${developer.name}, id: ${developer.id}).`);
if (!providedPassword) console.log(`Generated password (share this once, it is not stored anywhere): ${password}`);

await prisma.$disconnect();
