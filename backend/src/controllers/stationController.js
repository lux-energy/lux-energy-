const db = require('../config/database');

const getAllStations = async (req, res) => {
  try {
    const [stations] = await db.query(
      'SELECT * FROM stations WHERE status = ? ORDER BY name',
      ['active']
    );
    res.json(stations);
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getOrderStations = async (req, res) => {
  try {
    const [stations] = await db.query(
      `SELECT s.* FROM stations s
       WHERE s.status = 'active'
         AND EXISTS (
           SELECT 1 FROM users u
           WHERE u.station_id = s.id AND u.role = 'agent' AND u.status = 'active'
         )
       ORDER BY s.name`
    );
    res.json(stations);
  } catch (error) {
    console.error('Get order stations error:', error);
    res.status(500).json({ message: 'Unable to load stations accepting orders' });
  }
};

const getStationById = async (req, res) => {
  try {
    const [stations] = await db.query(
      'SELECT * FROM stations WHERE id = ?',
      [req.params.id]
    );

    if (stations.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    res.json(stations[0]);
  } catch (error) {
    console.error('Get station error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createStation = async (req, res) => {
  try {
    const { name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status } = req.body;

    const [result] = await db.query(
      `INSERT INTO stations (name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status || 'active']
    );

    const [newStation] = await db.query('SELECT * FROM stations WHERE id = ?', [result.insertId]);
    res.status(201).json(newStation[0]);
  } catch (error) {
    console.error('Create station error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateStation = async (req, res) => {
  try {
    const { name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status } = req.body;

    await db.query(
      `UPDATE stations 
       SET name = ?, province = ?, district = ?, sector = ?, address = ?, phone = ?, 
           opening_hours = ?, latitude = ?, longitude = ?, services_available = ?, status = ?
       WHERE id = ?`,
      [name, province, district, sector, address, phone, opening_hours, latitude, longitude, services_available, status, req.params.id]
    );

    const [updatedStation] = await db.query('SELECT * FROM stations WHERE id = ?', [req.params.id]);
    
    if (updatedStation.length === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    res.json(updatedStation[0]);
  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteStation = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM stations WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Station not found' });
    }

    res.json({ message: 'Station deleted successfully' });
  } catch (error) {
    console.error('Delete station error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAllStations,
  getOrderStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation
};