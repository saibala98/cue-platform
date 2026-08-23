import { Router } from 'express';
import {
  deleteDocument,
  downloadDocument,
  getDocument,
  getDocumentChunks,
  listDocuments,
  retryProcessing,
  searchDocuments,
  uploadDocument,
} from '../controllers/documents.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadLobDocument } from '../middleware/upload.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(listDocuments));
router.post('/upload', uploadLobDocument, asyncHandler(uploadDocument));
router.post('/search', asyncHandler(searchDocuments));
router.get('/:id', asyncHandler(getDocument));
router.get('/:id/chunks', asyncHandler(getDocumentChunks));
router.get('/:id/download', asyncHandler(downloadDocument));
router.post('/:id/retry', asyncHandler(retryProcessing));
router.delete('/:id', asyncHandler(deleteDocument));

export default router;
