import bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';

const ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// Refresh tokens are long, high-entropy random strings (not user-chosen), so a
// deterministic SHA-256 digest is the right tool — it lets us look a token up
// by an indexed equality match (`WHERE tokenHash = ...`), which a salted
// bcrypt hash can never support (same input, different hash every time).
export function hashToken(plain) {
  return createHash('sha256').update(plain).digest('hex');
}
