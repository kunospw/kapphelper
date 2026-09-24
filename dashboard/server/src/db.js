import { PrismaClient } from '@prisma/client';

// Single shared client — reused by the Express app and by the CLI scripts
// under scripts/ (they import this same file, no separate connection setup).
export const prisma = globalThis.__kapphelperPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__kapphelperPrisma = prisma;
