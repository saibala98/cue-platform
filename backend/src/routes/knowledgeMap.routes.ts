import { Router } from 'express';
import { createEntry, deleteEntry, getEntry, listEntries, searchEntries, updateEntry } from '../controllers/knowledgeMap.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

// /search must be registered before /:id — both are single-segment GET
// routes, and Express would otherwise match "/search" as id="search".
router.get('/search', asyncHandler(searchEntries));
router.get('/', asyncHandler(listEntries));
router.get('/:id', asyncHandler(getEntry));

router.post('/', requireRole('people_leader'), asyncHandler(createEntry));
router.put('/:id', requireRole('people_leader'), asyncHandler(updateEntry));
router.delete('/:id', requireRole('people_leader'), asyncHandler(deleteEntry));

export default router;
