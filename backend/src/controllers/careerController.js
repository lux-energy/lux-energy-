const db = require('../config/database');

const getAllCareers = async (req, res) => {
  try {
    const [careers] = await db.query(
      'SELECT * FROM careers WHERE status = ? ORDER BY created_at DESC',
      ['open']
    );
    res.json(careers);
  } catch (error) {
    console.error('Get careers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getCareerById = async (req, res) => {
  try {
    const [careers] = await db.query(
      'SELECT * FROM careers WHERE id = ?',
      [req.params.id]
    );

    if (careers.length === 0) {
      return res.status(404).json({ message: 'Career opportunity not found' });
    }

    res.json(careers[0]);
  } catch (error) {
    console.error('Get career error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createCareer = async (req, res) => {
  try {
    const { title, department, location, employment_type, description, requirements, deadline, application_instructions, status } = req.body;

    const [result] = await db.query(
      `INSERT INTO careers (title, department, location, employment_type, description, requirements, deadline, application_instructions, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, department, location, employment_type, description, requirements, deadline, application_instructions, status || 'open']
    );

    const [newCareer] = await db.query('SELECT * FROM careers WHERE id = ?', [result.insertId]);
    res.status(201).json(newCareer[0]);
  } catch (error) {
    console.error('Create career error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateCareer = async (req, res) => {
  try {
    const { title, department, location, employment_type, description, requirements, deadline, application_instructions, status } = req.body;

    await db.query(
      `UPDATE careers 
       SET title = ?, department = ?, location = ?, employment_type = ?, description = ?, requirements = ?, deadline = ?, application_instructions = ?, status = ?
       WHERE id = ?`,
      [title, department, location, employment_type, description, requirements, deadline, application_instructions, status, req.params.id]
    );

    const [updatedCareer] = await db.query('SELECT * FROM careers WHERE id = ?', [req.params.id]);
    
    if (updatedCareer.length === 0) {
      return res.status(404).json({ message: 'Career opportunity not found' });
    }

    res.json(updatedCareer[0]);
  } catch (error) {
    console.error('Update career error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteCareer = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM careers WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Career opportunity not found' });
    }

    res.json({ message: 'Career opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete career error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllCareers,
  getCareerById,
  createCareer,
  updateCareer,
  deleteCareer
};