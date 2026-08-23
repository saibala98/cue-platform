import { Router } from 'express';
import {
  exportCsv,
  getCompletions,
  getMentorTable,
  getModules,
  getOverdue,
  getSummary,
  sendReminder,
} from '../controllers/leaderDashboard.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireRole('people_leader'));

router.get('/summary', asyncHandler(getSummary));
router.get('/completions', asyncHandler(getCompletions));
router.get('/mentors', asyncHandler(getMentorTable));
router.get('/overdue', asyncHandler(getOverdue));
router.post('/overdue/:targetType/:targetId/remind', asyncHandler(sendReminder));
router.get('/export', asyncHandler(exportCsv));
router.get('/modules', asyncHandler(getModules));

export default router;
