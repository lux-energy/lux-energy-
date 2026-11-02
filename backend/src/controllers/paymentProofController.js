const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const { privateUploadsDirectory } = require('../config/storage');

const proofDirectory = path.join(privateUploadsDirectory, 'payment-proofs');

const uploadPaymentProof = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a payment receipt image or PDF to upload' });
  if (!['mobile_money', 'bank_transfer'].includes(req.body.payment_method)) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'Choose Mobile Money or Bank Transfer as the payment method' });
  }
  try {
    const [bills] = await db.query(
      'SELECT id, status FROM bills WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]
    );
    if (!bills.length) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ message: 'Bill not found' });
    }
    if (['paid', 'cancelled'].includes(bills[0].status)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ message: 'This bill cannot accept payment proof' });
    }
    const [pending] = await db.query(
      "SELECT id FROM payment_proofs WHERE bill_id = ? AND status = 'pending' LIMIT 1", [req.params.id]
    );
    if (pending.length) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(409).json({ message: 'Your payment proof is already awaiting station review' });
    }

    await db.query(
      `INSERT INTO payment_proofs
       (bill_id, customer_id, stored_name, original_name, mime_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, path.basename(req.file.filename), req.file.originalname,
        req.file.mimetype, req.file.size]
    );
    if (req.body.payment_method) {
      await db.query('UPDATE bills SET payment_method = ? WHERE id = ?', [req.body.payment_method, req.params.id]);
    }
    res.status(201).json({ message: 'Payment proof submitted and is awaiting station review' });
  } catch (error) {
    await fs.promises.unlink(req.file.path).catch(() => {});
    console.error('Upload payment proof error:', error);
    res.status(500).json({ message: 'Unable to submit payment proof' });
  }
};

const downloadPaymentProof = async (req, res) => {
  try {
    const [proofs] = await db.query(
      `SELECT pp.stored_name, pp.original_name FROM payment_proofs pp
       JOIN bills b ON b.id = pp.bill_id
       WHERE b.id = ? AND b.customer_id = ? ORDER BY pp.id DESC LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (!proofs.length) return res.status(404).json({ message: 'Payment proof not found' });
    res.download(path.join(proofDirectory, path.basename(proofs[0].stored_name)), proofs[0].original_name);
  } catch (error) {
    console.error('Download customer payment proof error:', error);
    res.status(500).json({ message: 'Unable to download payment proof' });
  }
};

const getStationPaymentProof = async (req, res) => {
  try {
    const [agents] = await db.query(
      'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
      [req.user.id, 'agent', 'active']
    );
    const stationId = agents[0]?.station_id;
    if (!stationId) return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
    const [proofs] = await db.query(
      `SELECT pp.stored_name, pp.original_name FROM payment_proofs pp
       JOIN bills b ON b.id = pp.bill_id
       JOIN orders o ON o.id = b.order_id
       WHERE b.id = ? AND o.station_id = ? ORDER BY pp.id DESC LIMIT 1`,
      [req.params.id, stationId]
    );
    if (!proofs.length) return res.status(404).json({ message: 'Payment proof not found for your station' });
    res.download(path.join(proofDirectory, path.basename(proofs[0].stored_name)), proofs[0].original_name);
  } catch (error) {
    console.error('Download station payment proof error:', error);
    res.status(500).json({ message: 'Unable to download payment proof' });
  }
};

const reviewPaymentProof = async (req, res) => {
  if (!['approved', 'rejected'].includes(req.body.decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected' });
  }
  if (req.body.decision === 'rejected' && !String(req.body.note || '').trim()) {
    return res.status(400).json({ message: 'Add a reason so the customer knows what to correct' });
  }
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
    const [proofs] = await connection.query(
      `SELECT pp.id, b.id AS bill_id, b.status AS bill_status
       FROM payment_proofs pp
       JOIN bills b ON b.id = pp.bill_id
       JOIN orders o ON o.id = b.order_id
       WHERE b.id = ? AND o.station_id = ? AND pp.status = 'pending'
       ORDER BY pp.id DESC LIMIT 1 FOR UPDATE`,
      [req.params.id, stationId]
    );
    if (!proofs.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pending payment proof not found for your station' });
    }
    if (proofs[0].bill_status === 'paid') {
      await connection.rollback();
      return res.status(409).json({ message: 'This bill is already marked as paid' });
    }

    await connection.query(
      `UPDATE payment_proofs SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [req.body.decision, String(req.body.note || '').slice(0, 1000) || null, req.user.id, proofs[0].id]
    );
    if (req.body.decision === 'approved') {
      await connection.query(
        "UPDATE bills SET status = 'paid', paid_at = NOW() WHERE id = ?",
        [proofs[0].bill_id]
      );
    }
    await connection.commit();
    res.json({ message: req.body.decision === 'approved' ? 'Payment verified and bill marked paid' : 'Payment proof rejected' });
  } catch (error) {
    await connection.rollback();
    console.error('Review payment proof error:', error);
    res.status(500).json({ message: 'Unable to review payment proof' });
  } finally {
    connection.release();
  }
};

module.exports = {
  uploadPaymentProof,
  downloadPaymentProof,
  getStationPaymentProof,
  reviewPaymentProof
};
