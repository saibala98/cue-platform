import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../models/User';

const SALT_ROUNDS = 12;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be set (see backend/.env.example)');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '8h';

export interface AccessTokenPayload {
  sub: string;
  role: UserRole;
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET as string) as AccessTokenPayload;
}
