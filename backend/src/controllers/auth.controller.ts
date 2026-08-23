import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { User, USER_ROLES } from '../models/User';
import { Lob } from '../models/Lob';
import { hashPassword, signAccessToken, verifyPassword } from '../services/authService';
import { assignAllLobModulesToEmployee } from '../services/moduleAssignmentService';
import { HttpError } from '../middleware/errorHandler';

const userRepo = () => AppDataSource.getRepository(User);
const lobRepo = () => AppDataSource.getRepository(Lob);

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    lobId: user.lobId,
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password, firstName, lastName, role, lobId } = req.body ?? {};

  if (typeof email !== 'string' || typeof password !== 'string' || typeof firstName !== 'string' || typeof lastName !== 'string') {
    throw new HttpError(400, 'email, password, firstName, and lastName are required strings');
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    throw new HttpError(400, 'A valid email is required');
  }
  if (password.length < 8) {
    throw new HttpError(400, 'Password must be at least 8 characters');
  }
  if (typeof role !== 'string' || !(USER_ROLES as readonly string[]).includes(role)) {
    throw new HttpError(400, `role must be one of: ${USER_ROLES.join(', ')}`);
  }
  if (lobId !== undefined && lobId !== null) {
    if (typeof lobId !== 'string') {
      throw new HttpError(400, 'lobId must be a string');
    }
    const lob = await lobRepo().findOneBy({ id: lobId });
    if (!lob) {
      throw new HttpError(400, 'lobId does not reference an existing line of business');
    }
  }

  const existing = await userRepo().findOneBy({ email: normalizedEmail });
  if (existing) {
    throw new HttpError(409, 'An account with that email already exists');
  }

  const user = userRepo().create({
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    role: role as User['role'],
    lobId: lobId ?? null,
  });
  await userRepo().save(user);

  if (user.role === 'new_joinee' && user.lobId) {
    await assignAllLobModulesToEmployee(user.id, user.lobId);
  }

  const token = signAccessToken({ sub: user.id, role: user.role });
  res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw new HttpError(400, 'email and password are required');
  }

  const user = await userRepo().findOneBy({ email: email.trim().toLowerCase() });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new HttpError(401, 'Invalid email or password');
  }

  const token = signAccessToken({ sub: user.id, role: user.role });
  res.json({ token, user: toPublicUser(user) });
}

// JWTs are stateless and carry no server-side session, so there is nothing
// to revoke here; this endpoint exists for a symmetric, predictable client
// contract (and a natural place to add token blacklisting later).
export function logout(_req: Request, res: Response): void {
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await userRepo().findOneBy({ id: req.userId });
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  res.json({ user: toPublicUser(user) });
}
