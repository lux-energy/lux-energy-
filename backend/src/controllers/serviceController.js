const db = require('../config/database');

const getAllServices = async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services WHERE status = ? ORDER BY title',
      ['active']
    );
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getServiceById = async (req, res) => {
  try {
    const [services] = await db.query(
      'SELECT * FROM services WHERE id = ?',
      [req.params.id]
    );

    if (services.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(services[0]);
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description, detailed_description, image, icon, status } = req.body;

    const imagePath = req.file ? `/uploads/${req.file.filename}` : image || '';

    const [result] = await db.query(
      `INSERT INTO services (title, description, detailed_description, image, icon, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, description, detailed_description, imagePath, icon, status || 'active']
    );

    const [newService] = await db.query('SELECT * FROM services WHERE id = ?', [result.insertId]);
    res.status(201).json(newService[0]);
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateService = async (req, res) => {
  try {
    const { title, description, detailed_description, image, icon, status } = req.body;

    let imagePath = image;
    if (req.file) {
      imagePath = `/uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE services 
       SET title = ?, description = ?, detailed_description = ?, image = ?, icon = ?, status = ?
       WHERE id = ?`,
      [title, description, detailed_description, imagePath, icon, status, req.params.id]
    );

    const [updatedService] = await db.query('SELECT * FROM services WHERE id = ?', [req.params.id]);
    
    if (updatedService.length === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json(updatedService[0]);
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteService = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM services WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};