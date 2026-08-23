import { Router } from 'express';
import { continueChat, getConversation, listConversations, startChat, tutor } from '../controllers/ai.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.post('/chat', asyncHandler(startChat));
router.get('/conversations', asyncHandler(listConversations));
router.get('/conversations/:id', asyncHandler(getConversation));
router.post('/conversations/:id/message', asyncHandler(continueChat));
router.post('/tutor', asyncHandler(tutor));

export default router;
