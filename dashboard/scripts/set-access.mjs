// Show or change a login's permission level (DevUser.accessRole).
//   npm run set-access                               list every login and its level
//   npm run set-access -- someone@kairossolutions.co lead
// Levels: pm | lead  -> may mark anyone's action done;  dev -> only their own.
// Takes effect on that person's very next request (the API reads the role fresh each time).
// Never touches passwords — unlike add-dev-user, which resets the password of an existing email.
import { prisma } from '../server/src/db.js';
import { ACCESS_ROLES, normalizeAccessRole } from '../server/src/auth/roles.js';

const [email, level] = process.argv.slice(2);

if (!email) {
  const users = await prisma.devUser.findMany({ include: { developer: { select: { name: true } } }, orderBy: { email: 'asc' } });
  console.log('email'.padEnd(40), 'level'.padEnd(6), 'active'.padEnd(7), 'developer');
  for (const user of users) {
    console.log(user.email.padEnd(40), user.accessRole.padEnd(6), String(user.active).padEnd(7), user.developer?.name ?? '(no developer profile)');
  }
  await prisma.$disconnect();
  process.exit(0);
}

const role = normalizeAccessRole(level);
if (!role) {
  console.error(`Usage: npm run set-access -- <email> <${ACCESS_ROLES.join('|')}>`);
  process.exit(1);
}

const normalizedEmail = email.toLowerCase().trim();
const existing = await prisma.devUser.findUnique({ where: { email: normalizedEmail } });
if (!existing) {
  console.error(`No login registered for ${normalizedEmail}. Register it first with add-dev-user.`);
  process.exit(1);
}

await prisma.devUser.update({ where: { id: existing.id }, data: { accessRole: role } });
console.log(`${normalizedEmail}: ${existing.accessRole} -> ${role}`);
await prisma.$disconnect();
