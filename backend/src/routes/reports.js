const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const reportUpload = require('../middleware/reportUpload');
const reports = require('../controllers/reportController');

router.use(authMiddleware);

router.get('/pending-agents', requireRole('admin', 'super_admin'), reports.pendingAgents);
router.get('/dashboard', requireRole('admin', 'super_admin'), reports.dashboard);
router.get('/approved-summary', requireRole('admin', 'super_admin'), reports.approvedSummary);
router.get('/export.xlsx', requireRole('admin', 'super_admin'), reports.exportExcel);
router.get('/export.pdf', requireRole('admin', 'super_admin'), reports.exportPdf);

router.get('/', requireRole('agent', 'admin', 'super_admin'), reports.list);
router.post('/', requireRole('agent'), reports.create);
router.get('/:id/audit', requireRole('agent', 'admin', 'super_admin'), reports.auditTrail);
router.get('/:id/attachments/:attachmentId/download', requireRole('agent', 'admin', 'super_admin'), reports.downloadAttachment);
router.post('/:id/attachments', requireRole('agent'), reportUpload.array('files', 5), reports.addAttachments);
router.delete('/:id/attachments/:attachmentId', requireRole('agent'), reports.removeAttachment);
router.put('/:id', requireRole('agent'), reports.update);
router.post('/:id/submit', requireRole('agent'), reports.submit);
router.patch('/:id/review', requireRole('admin', 'super_admin'), reports.review);
router.get('/:id', requireRole('agent', 'admin', 'super_admin'), reports.read);

module.exports = router;