const express = require('express');
const { body, validationResult } = require('express-validator');
const { rateLimit } = require('express-rate-limit');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { sendEmail } = require('../services/notificationService');

const router = express.Router();
const testEmailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many email tests. Try again later.' }
});

router.post(
    '/email-test',
    authMiddleware,
    requireRole('admin', 'super_admin'),
    testEmailLimiter,
    body('to').isEmail().normalizeEmail(),
    async(req, res) => {
        const validation = validationResult(req);
        if (!validation.isEmpty()) {
            return res.status(400).json({ message: 'Enter a valid test recipient email address.' });
        }

        try {
            await sendEmail(
                req.body.to,
                'Lux Energy SMTP test',
                'This is a test email from Lux Energy. Email delivery is working.'
            );
            return res.json({ message: 'Test email sent successfully.' });
        } catch (error) {
            console.error('Development email test failed:', error.code || 'UNKNOWN_ERROR');
            return res.status(503).json({
                message: 'The test email could not be sent. Check the email settings and try again.'
            });
        }
    }
);

module.exports = router;