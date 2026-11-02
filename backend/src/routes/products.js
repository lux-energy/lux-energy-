const express = require('express');
const router = express.Router();
const { getAllProducts, getProductById, createProduct, updateProduct, deleteProduct } = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateProduct } = require('../middleware/validation');
const upload = require('../middleware/upload');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateProduct, createProduct);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateProduct, updateProduct);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteProduct);

module.exports = router;