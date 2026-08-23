import { Router } from 'express';
import { listJoinees } from '../controllers/leader.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireRole('people_leader'));

router.get('/joinees', asyncHandler(listJoinees));

export default router;
