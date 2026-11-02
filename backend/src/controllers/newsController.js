const db = require('../config/database');

const getAllNews = async (req, res) => {
  try {
    const [news] = await db.query(
      'SELECT * FROM news WHERE status = ? ORDER BY published_at DESC',
      ['published']
    );
    res.json(news);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNewsById = async (req, res) => {
  try {
    const [news] = await db.query(
      'SELECT * FROM news WHERE id = ?',
      [req.params.id]
    );

    if (news.length === 0) {
      return res.status(404).json({ message: 'News article not found' });
    }

    res.json(news[0]);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getNewsBySlug = async (req, res) => {
  try {
    const [news] = await db.query(
      'SELECT * FROM news WHERE slug = ?',
      [req.params.slug]
    );

    if (news.length === 0) {
      return res.status(404).json({ message: 'News article not found' });
    }

    res.json(news[0]);
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createNews = async (req, res) => {
  try {
    const { title, slug, excerpt, content, image, author, category, status, published_at } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : image || '';

    const [result] = await db.query(
      `INSERT INTO news (title, slug, excerpt, content, image, author, category, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, excerpt, content, imagePath, author, category, status || 'draft', published_at || null]
    );

    const [newNews] = await db.query('SELECT * FROM news WHERE id = ?', [result.insertId]);
    res.status(201).json(newNews[0]);
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateNews = async (req, res) => {
  try {
    const { title, slug, excerpt, content, image, author, category, status, published_at } = req.body;

    let imagePath = image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE news 
       SET title = ?, slug = ?, excerpt = ?, content = ?, image = ?, author = ?, category = ?, status = ?, published_at = ?
       WHERE id = ?`,
      [title, slug, excerpt, content, imagePath, author, category, status, published_at, req.params.id]
    );

    const [updatedNews] = await db.query('SELECT * FROM news WHERE id = ?', [req.params.id]);
    
    if (updatedNews.length === 0) {
      return res.status(404).json({ message: 'News article not found' });
    }

    res.json(updatedNews[0]);
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteNews = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM news WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'News article not found' });
    }

    res.json({ message: 'News article deleted successfully' });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllNews,
  getNewsById,
  getNewsBySlug,
  createNews,
  updateNews,
  deleteNews
};