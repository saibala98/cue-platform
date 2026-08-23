import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { User } from '../models/User';

const userRepo = () => AppDataSource.getRepository(User);

/** All new joinees in the leader's LOB, regardless of mentor-assignment status — used to populate
 * the employee picker when a leader assigns a training module to specific people. */
export async function listJoinees(req: Request, res: Response): Promise<void> {
  const leader = await userRepo().findOneBy({ id: req.userId });
  if (!leader?.lobId) {
    res.json({ joinees: [] });
    return;
  }
  const joinees = await userRepo().find({ where: { lobId: leader.lobId, role: 'new_joinee' }, order: { lastName: 'ASC' } });
  res.json({ joinees: joinees.map((j) => ({ id: j.id, name: `${j.firstName} ${j.lastName}` })) });
}
