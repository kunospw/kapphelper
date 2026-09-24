import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '30m';

if (!SECRET) {
  throw new Error('JWT_SECRET is not set. Add it to dashboard/.env.server.');
}

export function signAccessToken(devUser) {
  return jwt.sign(
    { sub: devUser.id, email: devUser.email, developerId: devUser.developerId ?? null },
    SECRET,
    { expiresIn: ACCESS_TTL },
  );
}

export function verifyAccessToken(token) {
  return jwt.verify(token, SECRET);
}
