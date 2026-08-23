import type { NextFunction, Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import multer from 'multer';

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the maximum upload size' : err.message });
    return;
  }
  if (err instanceof Error && err.message.startsWith('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof QueryFailedError) {
    const pgCode = (err as unknown as { code?: string }).code;
    if (pgCode === '23505') {
      res.status(409).json({ error: 'A record with that value already exists' });
      return;
    }
    if (pgCode === '23503') {
      res.status(400).json({ error: 'Referenced record does not exist' });
      return;
    }
    if (pgCode === '23514') {
      res.status(400).json({ error: 'Value violates a database constraint' });
      return;
    }
    console.error('[db]', err.message);
    res.status(500).json({ error: 'Database error' });
    return;
  }

  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
}
