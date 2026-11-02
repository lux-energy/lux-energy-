const db = require('../config/database');

const getMyTickets = async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT id, subject, category, description, status, priority, admin_notes, created_at, updated_at
       FROM tickets
       WHERE customer_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(tickets);
  } catch (error) {
    console.error('Get my tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createTicket = async (req, res) => {
  try {
    const { subject, category, description, priority } = req.body;
    if (!subject || !description) {
      return res.status(400).json({ message: 'Subject and description are required' });
    }

    const [result] = await db.query(
      `INSERT INTO tickets (customer_id, subject, category, description, priority, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [
        req.user.id,
        subject,
        category || 'technical',
        description,
        priority || 'medium'
      ]
    );

    const [tickets] = await db.query('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
    res.status(201).json(tickets[0]);
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllTickets = async (req, res) => {
  try {
    const [tickets] = await db.query(
      `SELECT t.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM tickets t
       JOIN users u ON u.id = t.customer_id
       ORDER BY
         FIELD(t.status, 'open', 'in_progress', 'resolved', 'closed'),
         FIELD(t.priority, 'high', 'medium', 'low'),
         t.created_at DESC`
    );
    res.json(tickets);
  } catch (error) {
    console.error('Get all tickets error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateTicket = async (req, res) => {
  try {
    const { status, admin_notes, priority } = req.body;
    const [existing] = await db.query('SELECT id FROM tickets WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    const fields = [];
    const params = [];
    if (status) { fields.push('status = ?'); params.push(status); }
    if (admin_notes !== undefined) { fields.push('admin_notes = ?'); params.push(admin_notes); }
    if (priority) { fields.push('priority = ?'); params.push(priority); }

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);
    await db.query(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`, params);

    const [tickets] = await db.query(
      `SELECT t.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
       FROM tickets t
       JOIN users u ON u.id = t.customer_id
       WHERE t.id = ?`,
      [req.params.id]
    );
    res.json(tickets[0]);
  } catch (error) {
    console.error('Update ticket error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getMyTickets, createTicket, getAllTickets, updateTicket };
