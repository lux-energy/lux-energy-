const jwt = require('jsonwebtoken');
const db = require('../config/database');
const isDatabaseUnavailable = (error) => (
    ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)
);

const authMiddleware = async (req, res, next) => {
    let decoded;
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No authentication token, access denied' });
        }

        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = decoded;
    if (decoded.role === 'customer') {
        try {
            const [users] = await db.query(
                `SELECT status, verification_status, email_verified_at, phone_verified_at FROM users
                 WHERE id = ? AND role = 'customer' LIMIT 1`,
                [decoded.id]
            );
            if (!users.length || users[0].status !== 'active') {
                return res.status(401).json({ message: 'Customer account is inactive. Sign in again or contact support.' });
            }
            if (users[0].verification_status !== 'verified' && !(users[0].email_verified_at || users[0].phone_verified_at)) {
                return res.status(401).json({ message: 'Verify your email or phone before accessing the customer portal.' });
            }
        } catch (error) {
            console.error('Customer verification status check failed:', error.code || error.message);
            return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({
                message: isDatabaseUnavailable(error)
                    ? 'Customer access is temporarily unavailable. Please try again later.'
                    : 'Unable to verify customer access right now.'
            });
        }
    }
    next();
};

const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'You do not have permission to perform this action' });
    }
    next();
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;