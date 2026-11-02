const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parsePhoneNumberFromString } = require('libphonenumber-js/max');
const { passwordMeetsPolicy } = require('../middleware/validation');
const { startCustomerVerification } = require('./customerVerificationController');
const { startCustomerRegistrationVerification } = require('./customerRegistrationController');
const isDatabaseUnavailable = (error) => (
    ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(error.code)
);

const createToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role, stationId: user.station_id || null },
    process.env.JWT_SECRET, { expiresIn: '24h' }
);

const publicUser = (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    station_id: user.station_id || null
});

const login = async(req, res) => {
    try {
        const { email, password } = req.body;

        const [admins] = await db.query(
            'SELECT * FROM admins WHERE email = ?', [email]
        );

        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: admin.id, email: admin.email, role: admin.role },
            process.env.JWT_SECRET, { expiresIn: '24h' }
        );

        res.json({
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getMe = async(req, res) => {
    try {
        const [admins] = await db.query(
            'SELECT id, name, email, role, created_at FROM admins WHERE id = ?', [req.user.id]
        );

        if (admins.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json(admins[0]);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const loginUser = (role) => async(req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ? AND role = ? LIMIT 1', [String(email).trim().toLowerCase(), role]
        );

        if (users.length === 0 || !(await bcrypt.compare(password, users[0].password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        if (user.status !== 'active') {
            return res.status(403).json({ message: 'This account is inactive. Contact Lux Energy support.' });
        }
        if (role === 'customer'
            && (user.email_verified_at || user.phone_verified_at)
            && user.verification_status !== 'verified') {
            await db.query(
                "UPDATE users SET verification_status = 'verified' WHERE id = ?",
                [user.id]
            );
            user.verification_status = 'verified';
        }
        if (role === 'customer' && !user.email_verified_at && !user.phone_verified_at) {
            try {
                const delivery = await startCustomerVerification(user, 'email');
                if (delivery.retry_after_seconds) {
                    return res.status(429).json({
                        message: delivery.message,
                        retry_after_seconds: delivery.retry_after_seconds
                    });
                }
                return res.status(202).json({
                    verification_required: true,
                    email_sent: delivery.email_sent,
                    sms_sent: delivery.sms_sent,
                    channel: delivery.channel,
                    email_mode: delivery.email_mode,
                    email_verified: delivery.email_verified,
                    phone_verified: delivery.phone_verified,
                    email_error: delivery.email_error,
                    sms_error: delivery.sms_error || '',
                    email: user.email,
                    phone: user.phone,
                    retry_after_seconds: delivery.retry_after_seconds,
                    message: delivery.message
                });
            } catch (deliveryError) {
                console.error('Customer verification delivery unavailable:', deliveryError.code || deliveryError.message);
                if (deliveryError.status === 429) {
                    return res.status(429).json({ message: deliveryError.message });
                }
                return res.status(202).json({
                    verification_required: true,
                    email_sent: false,
                    sms_sent: false,
                    email_error: 'Verification delivery failed. Try again later.',
                    sms_error: '',
                    email: user.email,
                    phone: user.phone,
                    message: 'Verification delivery failed. Try again later.'
                });
            }
        }
        res.json({ token: createToken(user), user: publicUser(user) });
    } catch (error) {
        console.error(`${role} login error:`, error);
        res.status(500).json({ message: 'Server error' });
    }
};

const registerCustomer = async(req, res) => {
    try {
        const { name, password } = req.body;
        const email = String(req.body.email || '').trim().toLowerCase();
        const parsedPhone = parsePhoneNumberFromString(String(req.body.phone || '').trim(), 'RW');
        if (!parsedPhone || !parsedPhone.isValid()) {
            return res.status(400).json({ message: 'Enter a valid phone number with its country code.' });
        }
        const phone = parsedPhone.number;

        if (!passwordMeetsPolicy(password)) {
            return res.status(400).json({ message: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const delivery = await startCustomerRegistrationVerification({
            name: String(name).trim(),
            email,
            passwordHash: hashedPassword,
            phone
        });
        if (delivery.retry_after_seconds) {
            return res.status(429).json({
                message: delivery.message,
                retry_after_seconds: delivery.retry_after_seconds
            });
        }
        res.status(202).json({
            verification_required: true,
            challenge_id: delivery.challenge_id,
            email_sent: delivery.email_sent,
            email_mode: delivery.email_mode,
            email_error: delivery.email_error,
            retry_after_seconds: delivery.retry_after_seconds,
            email,
            phone,
            message: delivery.message
        });
    } catch (error) {
        console.error('Customer registration request failed:', error.code || error.message);
        res.status(isDatabaseUnavailable(error) ? 503 : 500).json({
            message: isDatabaseUnavailable(error)
                ? 'Registration is temporarily unavailable. Please try again later.'
                : 'Unable to start registration right now.'
        });
    }
};

const getUserMe = async(req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, phone, role, station_id FROM users WHERE id = ? AND status = ?', [req.user.id, 'active']
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(users[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    login,
    getMe,
    loginCustomer: loginUser('customer'),
    loginAgent: loginUser('agent'),
    registerCustomer,
    getUserMe
};