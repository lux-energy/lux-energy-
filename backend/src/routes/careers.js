const express = require('express');
const router = express.Router();
const { getAllCareers, getCareerById, createCareer, updateCareer, deleteCareer } = require('../controllers/careerController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateCareer } = require('../middleware/validation');

router.get('/', getAllCareers);
router.get('/:id', getCareerById);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), validateCareer, createCareer);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), validateCareer, updateCareer);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteCareer);

module.exports = router;