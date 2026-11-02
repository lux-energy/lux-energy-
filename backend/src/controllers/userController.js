const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { passwordMeetsPolicy } = require('../middleware/validation');

const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.station_id, u.status, u.created_at,
             s.name AS station_name
      FROM users u
      LEFT JOIN stations s ON s.id = u.station_id
    `;
    const params = [];
    if (role) {
      query += ' WHERE u.role = ?';
      params.push(role);
    }
    query += ' ORDER BY u.created_at DESC';
    const [users] = await db.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role, station_id, status } = req.body;
    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ message: 'Name, email, password, phone, and role are required' });
    }
    if (!['customer', 'agent'].includes(role)) {
      return res.status(400).json({ message: 'Role must be customer or agent' });
    }
    if (!passwordMeetsPolicy(password)) {
      return res.status(400).json({ message: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol' });
    }
    if (role === 'agent' && !station_id) {
      return res.status(400).json({ message: 'Agents must be assigned to a station' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    const [existingAdmins] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length > 0 || existingAdmins.length > 0) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, phone, role, station_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, phone, role, role === 'agent' ? station_id : null, status || 'active']
    );

    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.station_id, u.status, u.created_at,
              s.name AS station_name
       FROM users u
       LEFT JOIN stations s ON s.id = u.station_id
       WHERE u.id = ?`,
      [result.insertId]
    );
    res.status(201).json(users[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, station_id, status, password } = req.body;
    const [existing] = await db.query('SELECT id, role, station_id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (role && !['customer', 'agent'].includes(role)) {
      return res.status(400).json({ message: 'Role must be customer or agent' });
    }
    const updatedRole = role || existing[0].role;
    const updatedStationId = station_id === undefined ? existing[0].station_id : station_id;
    if (updatedRole === 'agent' && !updatedStationId) {
      return res.status(400).json({ message: 'Agents must be assigned to a station' });
    }

    if (email) {
      const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, req.params.id]);
      const [adminDup] = await db.query('SELECT id FROM admins WHERE email = ?', [email]);
      if (dup.length > 0 || adminDup.length > 0) {
        return res.status(400).json({ message: 'Email is already in use' });
      }
    }
    if (password && !passwordMeetsPolicy(password)) {
      return res.status(400).json({ message: 'Password must be at least 12 characters and include uppercase, lowercase, a number, and a symbol' });
    }

    const fields = [];
    const params = [];
    if (name) { fields.push('name = ?'); params.push(name); }
    if (email) { fields.push('email = ?'); params.push(email); }
    if (phone) { fields.push('phone = ?'); params.push(phone); }
    if (role) { fields.push('role = ?'); params.push(role); }
    if (status) { fields.push('status = ?'); params.push(status); }
    if (station_id !== undefined) {
      fields.push('station_id = ?');
      params.push(role === 'customer' || station_id === '' || station_id === null ? null : station_id);
    }
    if (password) {
      fields.push('password = ?');
      params.push(await bcrypt.hash(password, 10));
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);

    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.station_id, u.status, u.created_at,
              s.name AS station_name
       FROM users u
       LEFT JOIN stations s ON s.id = u.station_id
       WHERE u.id = ?`,
      [req.params.id]
    );
    res.json(users[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email is already in use' });
    }
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deleteUser };
