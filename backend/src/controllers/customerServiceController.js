const db = require('../config/database');

const getStationServices = async (req, res) => {
  try {
    const [agents] = await db.query(
      'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
      [req.user.id, 'agent', 'active']
    );
    const stationId = agents[0]?.station_id;
    if (!stationId) {
      return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
    }

    const [rows] = await db.query(
      `SELECT cs.id, cs.status, cs.started_at, cs.updated_at,
              s.id AS service_id, s.title, s.description,
              st.id AS station_id, st.name AS station_name,
              u.id AS customer_id, u.name AS customer_name,
              u.email AS customer_email, u.phone AS customer_phone
       FROM customer_services cs
       JOIN services s ON s.id = cs.service_id
       JOIN users u ON u.id = cs.customer_id AND u.role = 'customer'
       LEFT JOIN stations st ON st.id = cs.station_id
       WHERE cs.station_id = ?
       ORDER BY cs.updated_at DESC, cs.id DESC
       LIMIT 100`,
      [stationId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get station services error:', error);
    res.status(500).json({ message: 'Unable to load customer services' });
  }
};

const getMyServices = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT cs.id, cs.status, cs.started_at, cs.updated_at,
              s.id AS service_id, s.title, s.description, s.icon,
              st.id AS station_id, st.name AS station_name
       FROM customer_services cs
       JOIN services s ON s.id = cs.service_id
       LEFT JOIN stations st ON st.id = cs.station_id
       WHERE cs.customer_id = ? AND cs.status != 'cancelled'
       ORDER BY cs.started_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('Get my services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const subscribeService = async (req, res) => {
  try {
    const { service_id, station_id } = req.body;
    if (!Number.isInteger(Number(station_id)) || Number(station_id) < 1) {
      return res.status(400).json({ message: 'Please select a station for your service' });
    }

    const [services] = await db.query(
      'SELECT id FROM services WHERE id = ? AND status = ?',
      [service_id, 'active']
    );
    if (services.length === 0) {
      return res.status(400).json({ message: 'Service not available' });
    }

    const [stations] = await db.query(
      `SELECT st.id
       FROM stations st
       JOIN users a ON a.station_id = st.id AND a.role = 'agent' AND a.status = 'active'
       WHERE st.id = ? AND st.status = 'active'
       LIMIT 1`,
      [station_id]
    );
    if (stations.length === 0) {
      return res.status(409).json({ message: 'This station cannot accept service activations right now. Please choose another station.' });
    }

    const [existing] = await db.query(
      'SELECT id, status FROM customer_services WHERE customer_id = ? AND service_id = ?',
      [req.user.id, service_id]
    );

    let id;
    if (existing.length > 0) {
      await db.query(
        `UPDATE customer_services SET status = 'active', station_id = ?, updated_at = NOW() WHERE id = ?`,
        [station_id || null, existing[0].id]
      );
      id = existing[0].id;
    } else {
      const [result] = await db.query(
        `INSERT INTO customer_services (customer_id, service_id, station_id, status)
         VALUES (?, ?, ?, 'active')`,
        [req.user.id, service_id, station_id || null]
      );
      id = result.insertId;
    }

    const [rows] = await db.query(
      `SELECT cs.id, cs.status, cs.started_at, cs.updated_at,
              s.id AS service_id, s.title, s.description, s.icon,
              st.id AS station_id, st.name AS station_name
       FROM customer_services cs
       JOIN services s ON s.id = cs.service_id
       LEFT JOIN stations st ON st.id = cs.station_id
       WHERE cs.id = ?`,
      [id]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Subscribe service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateMyService = async (req, res) => {
  try {
    const { status, station_id } = req.body;
    if (status && !['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    if (station_id !== undefined) {
      if (!Number.isInteger(Number(station_id)) || Number(station_id) < 1) {
        return res.status(400).json({ message: 'Please select a station for your service' });
      }

      const [stations] = await db.query(
        `SELECT st.id
         FROM stations st
         JOIN users a ON a.station_id = st.id AND a.role = 'agent' AND a.status = 'active'
         WHERE st.id = ? AND st.status = 'active'
         LIMIT 1`,
        [station_id]
      );
      if (stations.length === 0) {
        return res.status(409).json({ message: 'This station cannot accept service activations right now. Please choose another station.' });
      }
    }

    const [existing] = await db.query(
      'SELECT id FROM customer_services WHERE id = ? AND customer_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Service subscription not found' });
    }

    const fields = [];
    const params = [];
    if (status) { fields.push('status = ?'); params.push(status); }
    if (station_id !== undefined) { fields.push('station_id = ?'); params.push(station_id || null); }
    if (fields.length === 0) {
      return res.status(400).json({ message: 'No fields to update' });
    }

    params.push(req.params.id);
    await db.query(`UPDATE customer_services SET ${fields.join(', ')} WHERE id = ?`, params);

    const [rows] = await db.query(
      `SELECT cs.id, cs.status, cs.started_at, cs.updated_at,
              s.id AS service_id, s.title, s.description, s.icon,
              st.id AS station_id, st.name AS station_name
       FROM customer_services cs
       JOIN services s ON s.id = cs.service_id
       LEFT JOIN stations st ON st.id = cs.station_id
       WHERE cs.id = ?`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Update my service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getStationServices, getMyServices, subscribeService, updateMyService };
