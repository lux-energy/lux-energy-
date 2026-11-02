const db = require('../config/database');
const fs = require('fs');
const path = require('path');
const { privateUploadsDirectory } = require('../config/storage');

const proofDirectory = path.join(privateUploadsDirectory, 'payment-proofs');

const removeUpload = (file) => file ? fs.promises.unlink(file.path).catch(() => {}) : Promise.resolve();

const resubmitOrderProof = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a receipt document to submit' });
  if (!['mobile_money', 'bank_transfer'].includes(req.body.payment_method)) {
    await removeUpload(req.file);
    return res.status(400).json({ message: 'Choose Mobile Money or Bank Transfer as the payment method' });
  }
  try {
    const [orders] = await db.query(
      'SELECT id, status FROM orders WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]
    );
    if (!orders.length) {
      await removeUpload(req.file);
      return res.status(404).json({ message: 'Order not found' });
    }
    if (orders[0].status !== 'pending') {
      await removeUpload(req.file);
      return res.status(409).json({ message: 'Payment proof can only be replaced while the order is awaiting review' });
    }
    const [latestProofs] = await db.query(
      'SELECT status FROM order_payment_proofs WHERE order_id = ? ORDER BY id DESC LIMIT 1', [req.params.id]
    );
    if (latestProofs.length && latestProofs[0].status !== 'rejected') {
      await removeUpload(req.file);
      return res.status(409).json({ message: 'Only a missing or rejected receipt can be submitted again' });
    }
    await db.query(
      `INSERT INTO order_payment_proofs
       (order_id, customer_id, stored_name, original_name, mime_type, file_size, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, req.user.id, path.basename(req.file.filename), req.file.originalname,
        req.file.mimetype, req.file.size, req.body.payment_method]
    );
    res.status(201).json({ message: 'Replacement receipt submitted for station review' });
  } catch (error) {
    await removeUpload(req.file);
    console.error('Resubmit order payment proof error:', error);
    res.status(500).json({ message: 'Unable to resubmit payment proof' });
  }
};

const downloadOrderProof = async (req, res) => {
  try {
    const [proofs] = await db.query(
      `SELECT pp.stored_name, pp.original_name, o.station_id
       FROM order_payment_proofs pp JOIN orders o ON o.id = pp.order_id
       WHERE o.id = ? ORDER BY pp.id DESC LIMIT 1`,
      [req.params.id]
    );
    if (!proofs.length) return res.status(404).json({ message: 'Payment receipt not found' });
    if (req.user.role === 'agent') {
      const [agents] = await db.query(
        'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
        [req.user.id, 'agent', 'active']
      );
      if (!agents[0]?.station_id || Number(agents[0].station_id) !== Number(proofs[0].station_id)) {
        return res.status(404).json({ message: 'Payment receipt not found for your station' });
      }
    }
    res.download(path.join(proofDirectory, path.basename(proofs[0].stored_name)), proofs[0].original_name);
  } catch (error) {
    console.error('Download order payment proof error:', error);
    res.status(500).json({ message: 'Unable to download payment receipt' });
  }
};

const reviewOrderProof = async (req, res) => {
  const { decision, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: 'Decision must be approved or rejected' });
  }
  if (decision === 'rejected' && !String(note || '').trim()) {
    return res.status(400).json({ message: 'Add a reason so the customer knows what to correct' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    let stationId;
    if (req.user.role === 'agent') {
      const [agents] = await connection.query(
        'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ? FOR UPDATE',
        [req.user.id, 'agent', 'active']
      );
      stationId = agents[0]?.station_id;
      if (!stationId) {
        await connection.rollback();
        return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
      }
    }

    const [proofs] = await connection.query(
      `SELECT pp.id, pp.order_id FROM order_payment_proofs pp
       JOIN orders o ON o.id = pp.order_id
       WHERE o.id = ? AND pp.status = 'pending' AND (? IS NULL OR o.station_id = ?)
       ORDER BY pp.id DESC LIMIT 1 FOR UPDATE`,
      [req.params.id, stationId || null, stationId || null]
    );
    if (!proofs.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Pending payment receipt not found for this order' });
    }
    await connection.query(
      `UPDATE order_payment_proofs
       SET status = ?, review_note = ?, reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [decision, String(note || '').slice(0, 1000) || null, req.user.id, proofs[0].id]
    );
    await connection.commit();
    res.json({ message: decision === 'approved' ? 'Payment receipt approved' : 'Payment receipt rejected; customer can submit a replacement' });
  } catch (error) {
    await connection.rollback();
    console.error('Review order payment proof error:', error);
    res.status(500).json({ message: 'Unable to review payment receipt' });
  } finally {
    connection.release();
  }
};

module.exports = { resubmitOrderProof, downloadOrderProof, reviewOrderProof };
