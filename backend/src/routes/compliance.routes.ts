import { Router } from 'express';
import {
  createNewVersion,
  exportAuditLog,
  getAuditLog,
  getComplianceSummary,
  listAllModules,
  listModuleVersions,
  verifyIntegrity,
} from '../controllers/compliance.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();
router.use(requireAuth, requireRole('compliance_admin'));

router.get('/summary', asyncHandler(getComplianceSummary));
router.get('/audit-log', asyncHandler(getAuditLog));
router.get('/audit-log/export', asyncHandler(exportAuditLog));
router.get('/audit-log/verify', asyncHandler(verifyIntegrity));
router.get('/modules', asyncHandler(listAllModules));
router.get('/modules/versions', asyncHandler(listModuleVersions));
router.post('/modules/:id/new-version', asyncHandler(createNewVersion));

export default router;
