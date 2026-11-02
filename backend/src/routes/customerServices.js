const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const {
  getStationServices,
  getMyServices,
  subscribeService,
  updateMyService
} = require('../controllers/customerServiceController');

router.get('/station', authMiddleware, requireRole('agent'), getStationServices);
router.get('/mine', authMiddleware, requireRole('customer'), getMyServices);
router.post('/mine', authMiddleware, requireRole('customer'), subscribeService);
router.patch('/mine/:id', authMiddleware, requireRole('customer'), updateMyService);

module.exports = router;
