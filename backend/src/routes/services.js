const express = require('express');
const router = express.Router();
const { getAllServices, getServiceById, createService, updateService, deleteService } = require('../controllers/serviceController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateService } = require('../middleware/validation');
const upload = require('../middleware/upload');

router.get('/', getAllServices);
router.get('/:id', getServiceById);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateService, createService);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateService, updateService);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteService);

module.exports = router;