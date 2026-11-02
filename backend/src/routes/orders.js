const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateOrder } = require('../middleware/validation');
const paymentProofUpload = require('../middleware/paymentProofUpload');
const { resubmitOrderProof, downloadOrderProof, reviewOrderProof } = require('../controllers/orderPaymentProofController');
const {
    createOrder,
    getCustomerOrders,
    getAgentOrders,
    exportAgentOrders,
    updateOrder,
    getAllOrders
} = require('../controllers/orderController');

router.post('/', authMiddleware, requireRole('customer'), (req, res, next) => {
    paymentProofUpload.single('payment_proof')(req, res, (error) => {
        if (error) return res.status(400).json({ message: error.message });
        next();
    });
}, validateOrder, createOrder);
router.get('/mine', authMiddleware, requireRole('customer'), getCustomerOrders);
router.post('/mine/:id/payment-proof', authMiddleware, requireRole('customer'), (req, res, next) => {
    paymentProofUpload.single('payment_proof')(req, res, (error) => {
        if (error) return res.status(400).json({ message: error.message });
        next();
    });
}, resubmitOrderProof);
router.get('/station/export.xlsx', authMiddleware, requireRole('agent'), exportAgentOrders);
router.get('/station', authMiddleware, requireRole('agent'), getAgentOrders);
router.get('/all', authMiddleware, requireRole('admin', 'super_admin'), getAllOrders);
router.get('/:id/payment-proof', authMiddleware, requireRole('agent', 'admin', 'super_admin'), downloadOrderProof);
router.patch('/:id/payment-proof', authMiddleware, requireRole('agent', 'admin', 'super_admin'), reviewOrderProof);
router.patch('/:id', authMiddleware, requireRole('agent', 'admin', 'super_admin'), updateOrder);

module.exports = router;