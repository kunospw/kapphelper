import { prisma } from '../db.js';
import { verifyAccessToken } from './jwt.js';

/// Requires a valid, unexpired Bearer JWT whose subject is still an active
/// DevUser. Deactivating a DevUser (flip `active` to false) therefore locks
/// them out on their very next request, without touching any token.
export async function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing bearer token.' });

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  const devUser = await prisma.devUser.findUnique({ where: { id: payload.sub } });
  if (!devUser || !devUser.active) {
    return res.status(401).json({ error: 'Account is not active.' });
  }

  req.devUser = devUser;
  next();
}
