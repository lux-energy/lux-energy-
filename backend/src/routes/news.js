const express = require('express');
const router = express.Router();
const { getAllNews, getNewsById, getNewsBySlug, createNews, updateNews, deleteNews } = require('../controllers/newsController');
const authMiddleware = require('../middleware/auth');
const { requireRole } = require('../middleware/auth');
const { validateNews } = require('../middleware/validation');
const upload = require('../middleware/upload');

router.get('/', getAllNews);
router.get('/slug/:slug', getNewsBySlug);
router.get('/:id', getNewsById);
router.post('/', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateNews, createNews);
router.put('/:id', authMiddleware, requireRole('admin', 'super_admin'), upload.single('image'), validateNews, updateNews);
router.delete('/:id', authMiddleware, requireRole('admin', 'super_admin'), deleteNews);

module.exports = router;
module.exports = router;