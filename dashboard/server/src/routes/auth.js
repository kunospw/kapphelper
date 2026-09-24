import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import { hashToken, verifyPassword } from '../auth/hash.js';
import { signAccessToken } from '../auth/jwt.js';

const REFRESH_TTL_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30);

function issueRefreshToken(devUserId) {
  const plain = randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { plain, expiresAt };
}

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' });

  const devUser = await prisma.devUser.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  // Same generic message whether the email is unregistered or the password is
  // wrong — don't let login responses confirm which registered emails exist.
  const invalid = () => res.status(401).json({ error: 'Invalid email or password.' });
  if (!devUser || !devUser.active) return invalid();

  const ok = await verifyPassword(password, devUser.passwordHash);
  if (!ok) return invalid();

  const { plain, expiresAt } = issueRefreshToken(devUser.id);
  await prisma.$transaction([
    prisma.refreshToken.create({ data: { devUserId: devUser.id, tokenHash: hashToken(plain), expiresAt } }),
    prisma.devUser.update({ where: { id: devUser.id }, data: { lastLoginAt: new Date() } }),
  ]);

  res.json({
    accessToken: signAccessToken(devUser),
    refreshToken: plain,
    user: { email: devUser.email, developerId: devUser.developerId },
  });
});

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required.' });

  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(refreshToken) },
    include: { devUser: true },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date() || !record.devUser.active) {
    return res.status(401).json({ error: 'Refresh token is invalid or expired.' });
  }

  res.json({
    accessToken: signAccessToken(record.devUser),
    user: { email: record.devUser.email, developerId: record.devUser.developerId },
  });
});

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  res.status(204).end();
});
