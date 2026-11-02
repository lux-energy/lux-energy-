const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');

router.get('/stats', authMiddleware, requireRole('admin', 'super_admin'), getDashboardStats);

module.exports = router;