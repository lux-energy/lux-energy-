const express = require('express');
const router = express.Router();
const { createContactMessage, getAllContactMessages, getContactMessageById, markMessageAsRead, deleteContactMessage } = require('../controllers/contactController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateContact } = require('../middleware/validation');

router.post('/', validateContact, createContactMessage);
router.get('/', authMiddleware, requireRole('admin', 'super_admin'), getAllContactMessages);
router.get('/:id', authMiddleware, requireRole('admin', 'super_admin'), getContactMessageById);
router.put('/:id/read', authMiddleware, requireRole('admin', 'super_admin'), markMessageAsRead);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteContactMessage);

module.exports = router;