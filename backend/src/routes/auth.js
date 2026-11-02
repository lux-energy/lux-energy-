const express = require('express');
const router = express.Router();
const {
    login,
    getMe,
    loginCustomer,
    loginAgent,
    registerCustomer,
    getUserMe
} = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { validateLogin, validateCustomerRegistration } = require('../middleware/validation');
const { requestPasswordReset, resetPassword } = require('../controllers/passwordRecoveryController');
const { verifyCustomerContacts, resendCustomerVerification } = require('../controllers/customerVerificationController');
const {
    verifyCustomerRegistration,
    resendCustomerRegistrationCode
} = require('../controllers/customerRegistrationController');
const { rateLimit } = require('express-rate-limit');

const customerAuthLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many account attempts. Try again in 2 minutes.' }
});

const verificationLimiter = rateLimit({
    windowMs: 2 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSeconds = req.rateLimit?.resetTime
            ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
            : 2 * 60;
        res.status(429).json({
            message: 'Too many verification requests.',
            retry_after_seconds: retryAfterSeconds
        });
    }
});

const passwordResetLimiter = (limit, message) => rateLimit({
    windowMs: 2 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const retryAfterSeconds = req.rateLimit?.resetTime
            ? Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000))
            : 2 * 60;
        res.status(429).json({ message, retry_after_seconds: retryAfterSeconds });
    }
});

const passwordResetRequestLimiter = passwordResetLimiter(
    5,
    'Too many password reset requests. Try again in 2 minutes.'
);
const passwordResetAttemptLimiter = passwordResetLimiter(
    10,
    'Too many reset attempts. Try again in 2 minutes.'
);

router.post('/login', validateLogin, login);
router.get('/me', authMiddleware, getMe);
router.post('/customer/register', customerAuthLimiter, validateCustomerRegistration, registerCustomer);
router.post('/customer/register/verify', verificationLimiter, verifyCustomerRegistration);
router.post('/customer/register/resend', verificationLimiter, resendCustomerRegistrationCode);
router.post('/customer/login', customerAuthLimiter, validateLogin, loginCustomer);
router.post('/customer/verify', verificationLimiter, verifyCustomerContacts);
router.post('/customer/verify/resend', verificationLimiter, resendCustomerVerification);
router.post('/agent/login', validateLogin, loginAgent);
router.post('/password/forgot', passwordResetRequestLimiter, requestPasswordReset);
router.post('/password/reset', passwordResetAttemptLimiter, resetPassword);
router.get('/user/me', authMiddleware, getUserMe);

module.exports = router;