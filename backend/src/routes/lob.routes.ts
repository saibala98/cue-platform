import { Router } from 'express';
import { listLobs } from '../controllers/lob.controller';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Public: needed to populate the LOB picker on the registration form.
router.get('/', asyncHandler(listLobs));

export default router;
