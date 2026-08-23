import { Router } from 'express';
import { getModuleDetail, getModuleProgress, listAssignedModules, submitCompletion } from '../controllers/modules.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/assigned', asyncHandler(listAssignedModules));
router.get('/:id', asyncHandler(getModuleDetail));
router.get('/:id/progress', asyncHandler(getModuleProgress));
router.post('/:id/completion', asyncHandler(submitCompletion));

export default router;
