const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const {
  getMyTickets,
  createTicket,
  getAllTickets,
  updateTicket
} = require('../controllers/ticketController');

router.get('/mine', authMiddleware, requireRole('customer'), getMyTickets);
router.post('/mine', authMiddleware, requireRole('customer'), createTicket);
router.get('/', authMiddleware, requireRole('admin', 'super_admin'), getAllTickets);
router.patch('/:id', authMiddleware, requireRole('admin', 'super_admin'), updateTicket);

module.exports = router;
