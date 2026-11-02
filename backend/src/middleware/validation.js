const { body, validationResult } = require('express-validator');

const passwordMeetsPolicy = (password) => typeof password === 'string'
    && password.length >= 12
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9]/.test(password);

const validateLogin = [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateCustomerRegistration = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('phone').notEmpty().withMessage('Phone is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateOrder = [
    body('station_id').isInt({ min: 1 }).withMessage('A valid station is required'),
    body('order_type').isIn(['fuel', 'gas']).withMessage('Order type must be fuel or gas'),
    body('product_name').notEmpty().withMessage('Product name is required'),
    body('quantity').isFloat({ min: 0.01 }).withMessage('Quantity must be greater than zero'),
    body('unit').notEmpty().withMessage('Unit is required'),
    body('delivery_address').notEmpty().withMessage('Delivery address is required'),
    body('contact_phone').notEmpty().withMessage('Contact phone is required'),
    body('payment_method').isIn(['mobile_money', 'bank_transfer']).withMessage('Choose Mobile Money or Bank Transfer'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            if (req.file?.path) require('fs').promises.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateStation = [
    body('name').notEmpty().withMessage('Station name is required'),
    body('province').notEmpty().withMessage('Province is required'),
    body('district').notEmpty().withMessage('District is required'),
    body('sector').notEmpty().withMessage('Sector is required'),
    body('address').notEmpty().withMessage('Address is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateProduct = [
    body('name').notEmpty().withMessage('Product name is required'),
    body('category').notEmpty().withMessage('Category is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateService = [
    body('title').notEmpty().withMessage('Service title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateNews = [
    body('title').notEmpty().withMessage('Title is required'),
    body('content').notEmpty().withMessage('Content is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateCareer = [
    body('title').notEmpty().withMessage('Job title is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('description').notEmpty().withMessage('Description is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

const validateContact = [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('message').notEmpty().withMessage('Message is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];

module.exports = {
    passwordMeetsPolicy,
    validateLogin,
    validateCustomerRegistration,
    validateOrder,
    validateStation,
    validateProduct,
    validateService,
    validateNews,
    validateCareer,
    validateContact
};