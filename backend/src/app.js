const express = require('express');
const cors = require('cors');
const { uploadsDirectory } = require('./config/storage');

const app = express();
const defaultDevelopmentOrigins = 'http://localhost:3002,http://127.0.0.1:3002';
const configuredOrigins = process.env.CORS_ALLOWED_ORIGINS?.trim();
const allowedOrigins = new Set(
    (configuredOrigins || defaultDevelopmentOrigins)
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
);

// Middleware
app.use(cors({
    origin(origin, callback) {
        if (!origin || (!configuredOrigins && process.env.NODE_ENV === 'production')) {
            return callback(null, true);
        }
        callback(null, allowedOrigins.has(origin));
    }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDirectory));
// API Routes

app.use('/api/auth', require('./routes/auth'));
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/dev', require('./routes/devEmail'));
}
app.use('/api/stations', require('./routes/stations'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/products', require('./routes/products'));
app.use('/api/services', require('./routes/services'));
app.use('/api/news', require('./routes/news'));
app.use('/api/careers', require('./routes/careers'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/users', require('./routes/users'));
app.use('/api/customer-services', require('./routes/customerServices'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/reports', require('./routes/reports'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Lux Energy API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;