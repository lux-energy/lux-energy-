const express = require('express');
const router = express.Router();
const { getAllStations, getOrderStations, getStationById, createStation, updateStation, deleteStation } = require('../controllers/stationController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateStation } = require('../middleware/validation');
const upload = require('../middleware/upload');

router.get('/', getAllStations);
router.get('/orders', getOrderStations);
router.get('/:id', getStationById);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), validateStation, createStation);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), validateStation, updateStation);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteStation);

module.exports = router;