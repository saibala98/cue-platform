import { Router } from 'express';
import {
  assignMentor,
  completeSession,
  getChecklist,
  getMyAssignment,
  getMyMentees,
  getProgress,
  listAssignmentsForLeader,
  listAvailableMentors,
  listUnassignedJoinees,
} from '../controllers/mentors.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/assign', requireRole('people_leader'), asyncHandler(assignMentor));
router.get('/unassigned-joinees', requireRole('people_leader'), asyncHandler(listUnassignedJoinees));
router.get('/available-mentors', requireRole('people_leader'), asyncHandler(listAvailableMentors));
router.get('/assignments', requireRole('people_leader'), asyncHandler(listAssignmentsForLeader));

router.get('/my-assignment', asyncHandler(getMyAssignment));
router.get('/my-mentees', requireRole('mentor'), asyncHandler(getMyMentees));

router.get('/checklist/:assignmentId/progress', asyncHandler(getProgress));
router.get('/checklist/:assignmentId', asyncHandler(getChecklist));
router.post('/checklist/:assignmentId/session/:sessionNumber/complete', asyncHandler(completeSession));

export default router;
