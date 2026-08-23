import type { Request, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { Lob } from '../models/Lob';

export async function listLobs(_req: Request, res: Response): Promise<void> {
  const lobs = await AppDataSource.getRepository(Lob).find({ order: { name: 'ASC' } });
  res.json({ lobs });
}
