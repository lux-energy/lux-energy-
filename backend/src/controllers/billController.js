const db = require('../config/database');

const getMyBills = async (req, res) => {
  try {
    const [bills] = await db.query(
      `SELECT b.*, o.product_name, o.quantity, o.unit,
              pp.id AS proof_id, pp.status AS proof_status,
              pp.original_name AS proof_original_name, pp.review_note AS proof_review_note,
              pp.created_at AS proof_submitted_at
       FROM bills b
       LEFT JOIN orders o ON o.id = b.order_id
       LEFT JOIN payment_proofs pp ON pp.id = (
         SELECT MAX(latest.id) FROM payment_proofs latest WHERE latest.bill_id = b.id
       )
       WHERE b.customer_id = ?
       ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(bills);
  } catch (error) {
    console.error('Get my bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBills = async (req, res) => {
  try {
    const [bills] = await db.query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email
       FROM bills b
       JOIN users u ON u.id = b.customer_id
       ORDER BY b.created_at DESC`
    );
    res.json(bills);
  } catch (error) {
    console.error('Get all bills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBill = async (req, res) => {
  try {
    const { customer_id, order_id, description, amount, due_date } = req.body;
    if (!customer_id || !description || amount == null) {
      return res.status(400).json({ message: 'customer_id, description, and amount are required' });
    }

    const [result] = await db.query(
      `INSERT INTO bills (customer_id, order_id, description, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'unpaid')`,
      [customer_id, order_id || null, description, amount, due_date || null]
    );

    const [bills] = await db.query('SELECT * FROM bills WHERE id = ?', [result.insertId]);
    res.status(201).json(bills[0]);
  } catch (error) {
    console.error('Create bill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getStationBilling = async (req, res) => {
  try {
    const [agents] = await db.query(
      'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
      [req.user.id, 'agent', 'active']
    );
    const stationId = agents[0]?.station_id;
    if (!stationId) return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
    const [bills] = await db.query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email,
              o.product_name, o.quantity, o.unit, o.id AS order_number,
              pp.id AS proof_id, pp.status AS proof_status,
              pp.original_name AS proof_original_name, pp.review_note AS proof_review_note,
              pp.created_at AS proof_submitted_at
       FROM bills b
       JOIN orders o ON o.id = b.order_id
       JOIN users u ON u.id = b.customer_id
       LEFT JOIN payment_proofs pp ON pp.id = (
         SELECT MAX(latest.id) FROM payment_proofs latest WHERE latest.bill_id = b.id
       )
       WHERE o.station_id = ?
       ORDER BY b.created_at DESC`,
      [stationId]
    );
    const [debtByCustomer] = await db.query(
      `SELECT u.id AS customer_id, u.name AS customer_name, u.email,
              COUNT(b.id) AS unpaid_invoice_count, SUM(b.amount) AS outstanding_balance
       FROM bills b
       JOIN orders o ON o.id = b.order_id
       JOIN users u ON u.id = b.customer_id
       WHERE o.station_id = ? AND b.status IN ('unpaid', 'overdue')
       GROUP BY u.id, u.name, u.email
       ORDER BY outstanding_balance DESC`,
      [stationId]
    );
    const [unbilledOrders] = await db.query(
      `SELECT o.id, o.order_type, o.product_name, o.quantity, o.unit, o.updated_at,
              u.id AS customer_id, u.name AS customer_name
       FROM orders o
       JOIN users u ON u.id = o.customer_id
       LEFT JOIN bills b ON b.order_id = o.id
       WHERE o.station_id = ? AND o.status = 'completed' AND b.id IS NULL
       ORDER BY o.updated_at DESC`,
      [stationId]
    );
    res.json({ bills, debtByCustomer, unbilledOrders });
  } catch (error) {
    console.error('Get station billing error:', error);
    res.status(500).json({ message: 'Unable to load station billing' });
  }
};

const createStationBill = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [agents] = await connection.query(
      'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ? FOR UPDATE',
      [req.user.id, 'agent', 'active']
    );
    const stationId = agents[0]?.station_id;
    if (!stationId) {
      await connection.rollback();
      return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
    }
    const [orders] = await connection.query(
      `SELECT id, customer_id, station_id, order_type, product_name, quantity, unit, status
       FROM orders WHERE id = ? FOR UPDATE`,
      [req.body.order_id]
    );
    const order = orders[0];
    if (!order || Number(order.station_id) !== Number(stationId)) {
      await connection.rollback();
      return res.status(404).json({ message: 'Completed order not found for your station' });
    }
    if (order.status !== 'completed') {
      await connection.rollback();
      return res.status(409).json({ message: 'Only completed orders can be invoiced' });
    }
    const [existingBills] = await connection.query('SELECT id FROM bills WHERE order_id = ? FOR UPDATE', [order.id]);
    if (existingBills.length) {
      await connection.rollback();
      return res.status(409).json({ message: 'This order already has an invoice' });
    }

    const unitPrice = order.order_type === 'gas' ? 25000 : 1450;
    const amount = Number(order.quantity) * unitPrice;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const [result] = await connection.query(
      `INSERT INTO bills (customer_id, order_id, description, amount, due_date, status)
       VALUES (?, ?, ?, ?, ?, 'unpaid')`,
      [order.customer_id, order.id, `${order.product_name} · ${order.quantity} ${order.unit}`,
        amount, dueDate.toISOString().slice(0, 10)]
    );
    await connection.commit();
    const [created] = await db.query(
      `SELECT b.*, u.name AS customer_name, u.email AS customer_email
       FROM bills b JOIN users u ON u.id = b.customer_id WHERE b.id = ?`,
      [result.insertId]
    );
    res.status(201).json(created[0]);
  } catch (error) {
    await connection.rollback();
    console.error('Create station invoice error:', error);
    res.status(500).json({ message: 'Unable to create invoice' });
  } finally {
    connection.release();
  }
};

module.exports = { getMyBills, getAllBills, createBill, getStationBilling, createStationBill };
