import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Node treats an unhandled promise rejection as fatal (process exits), so
 * every async controller must funnel its rejections into next() instead of
 * letting them escape. Wrap every route handler with this.
 */
export function asyncHandler(fn: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
