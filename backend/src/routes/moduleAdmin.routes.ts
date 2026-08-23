import { Router } from 'express';
import { assignModule, createModule, getModuleCompletions, listAdminModules } from '../controllers/moduleAdmin.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireRole('people_leader'));

router.get('/', asyncHandler(listAdminModules));
router.post('/', asyncHandler(createModule));
router.post('/:id/assign', asyncHandler(assignModule));
router.get('/:id/completions', asyncHandler(getModuleCompletions));

export default router;
