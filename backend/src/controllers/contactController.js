const db = require('../config/database');

const createContactMessage = async (req, res) => {
  try {
    const { full_name, email, phone, subject, message } = req.body;

    const [result] = await db.query(
      `INSERT INTO contact_messages (full_name, email, phone, subject, message)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, phone, subject, message]
    );

    const [newMessage] = await db.query('SELECT * FROM contact_messages WHERE id = ?', [result.insertId]);
    res.status(201).json(newMessage[0]);
  } catch (error) {
    console.error('Create contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllContactMessages = async (req, res) => {
  try {
    const [messages] = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json(messages);
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getContactMessageById = async (req, res) => {
  try {
    const [messages] = await db.query(
      'SELECT * FROM contact_messages WHERE id = ?',
      [req.params.id]
    );

    if (messages.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(messages[0]);
  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const markMessageAsRead = async (req, res) => {
  try {
    await db.query(
      'UPDATE contact_messages SET status = ? WHERE id = ?',
      ['read', req.params.id]
    );

    const [updatedMessage] = await db.query('SELECT * FROM contact_messages WHERE id = ?', [req.params.id]);
    
    if (updatedMessage.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json(updatedMessage[0]);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteContactMessage = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createContactMessage,
  getAllContactMessages,
  getContactMessageById,
  markMessageAsRead,
  deleteContactMessage
};