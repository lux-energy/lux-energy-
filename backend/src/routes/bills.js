const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const {
  getMyBills,
  getAllBills,
  createBill,
  getStationBilling,
  createStationBill
} = require('../controllers/billController');
const paymentProofUpload = require('../middleware/paymentProofUpload');
const {
  uploadPaymentProof,
  downloadPaymentProof,
  getStationPaymentProof,
  reviewPaymentProof
} = require('../controllers/paymentProofController');

router.get('/mine', authMiddleware, requireRole('customer'), getMyBills);
router.post('/mine/:id/payment-proof', authMiddleware, requireRole('customer'), (req, res, next) => {
  paymentProofUpload.single('proof')(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.message });
    next();
  });
}, uploadPaymentProof);
router.get('/mine/:id/payment-proof', authMiddleware, requireRole('customer'), downloadPaymentProof);
router.get('/station', authMiddleware, requireRole('agent'), getStationBilling);
router.post('/station', authMiddleware, requireRole('agent'), createStationBill);
router.get('/station/:id/payment-proof', authMiddleware, requireRole('agent'), getStationPaymentProof);
router.patch('/station/:id/payment-proof', authMiddleware, requireRole('agent'), reviewPaymentProof);
router.get('/', authMiddleware, requireRole('admin', 'super_admin'), getAllBills);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), createBill);

module.exports = router;
