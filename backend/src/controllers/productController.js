const db = require('../config/database');

const getAllProducts = async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE status = ? ORDER BY name',
      ['active']
    );
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProductById = async (req, res) => {
  try {
    const [products] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, category, description, image, status } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : image || '';

    const [result] = await db.query(
      `INSERT INTO products (name, category, description, image, status)
       VALUES (?, ?, ?, ?, ?)`,
      [name, category, description, imagePath, status || 'active']
    );

    const [newProduct] = await db.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, category, description, image, status } = req.body;

    let imagePath = image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE products 
       SET name = ?, category = ?, description = ?, image = ?, status = ?
       WHERE id = ?`,
      [name, category, description, imagePath, status, req.params.id]
    );

    const [updatedProduct] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (updatedProduct.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(updatedProduct[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};