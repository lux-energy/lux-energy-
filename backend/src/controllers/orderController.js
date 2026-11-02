const db = require('../config/database');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

const orderFields = `
  o.id, o.order_type, o.product_name, o.quantity, o.unit,
  o.delivery_address, o.contact_phone, o.notes, o.status, o.agent_notes,
  o.created_at, o.updated_at, s.id AS station_id, s.name AS station_name,
    s.address AS station_address, u.name AS customer_name,
    (SELECT p.status FROM order_payment_proofs p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) AS payment_proof_status,
    (SELECT p.review_note FROM order_payment_proofs p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) AS payment_proof_review_note,
    (SELECT p.payment_method FROM order_payment_proofs p WHERE p.order_id = o.id ORDER BY p.id DESC LIMIT 1) AS payment_method
`;

const createOrder = async(req, res) => {
        if (!req.file) return res.status(400).json({ message: 'Attach your payment receipt to submit this order' });
        const connection = await db.getConnection();
    try {
        const {
            station_id,
            order_type,
            product_name,
            quantity,
            unit,
            delivery_address,
            contact_phone,
            notes
        } = req.body;

        await connection.beginTransaction();
        const [stations] = await connection.query(
            'SELECT id FROM stations WHERE id = ? AND status = ?', [station_id, 'active']
        );
        if (stations.length === 0) {
            await connection.rollback();
            await fs.promises.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ message: 'Please select an active station' });
        }
        const [agents] = await connection.query(
            'SELECT id FROM users WHERE station_id = ? AND role = ? AND status = ? LIMIT 1',
            [station_id, 'agent', 'active']
        );
        if (agents.length === 0) {
            await connection.rollback();
            await fs.promises.unlink(req.file.path).catch(() => {});
            return res.status(409).json({ message: 'This station cannot accept online orders right now. Please choose another station.' });
        }

        const [result] = await connection.query(
            `INSERT INTO orders
        (customer_id, station_id, order_type, product_name, quantity, unit, delivery_address, contact_phone, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [req.user.id, station_id, order_type, product_name, quantity, unit, delivery_address, contact_phone, notes || null]
        );
        await connection.query(
            `INSERT INTO order_payment_proofs
             (order_id, customer_id, stored_name, original_name, mime_type, file_size, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [result.insertId, req.user.id, path.basename(req.file.filename), req.file.originalname,
                req.file.mimetype, req.file.size, req.body.payment_method]
        );
        await connection.commit();

        const [orders] = await db.query(
            `SELECT ${orderFields}
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       JOIN users u ON u.id = o.customer_id
       WHERE o.id = ?`, [result.insertId]
        );
        res.status(201).json(orders[0]);
    } catch (error) {
        await connection.rollback().catch(() => {});
        await fs.promises.unlink(req.file.path).catch(() => {});
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error' });
    } finally {
        connection.release();
    }
};

const getCustomerOrders = async(req, res) => {
    try {
        const [orders] = await db.query(
            `SELECT ${orderFields}
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       JOIN users u ON u.id = o.customer_id
       WHERE o.customer_id = ?
       ORDER BY o.created_at DESC`, [req.user.id]
        );
        res.json(orders);
    } catch (error) {
        console.error('Get customer orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAgentOrders = async(req, res) => {
    try {
        const [agents] = await db.query(
            'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
            [req.user.id, 'agent', 'active']
        );
        const stationId = agents[0]?.station_id;
        if (!stationId) {
            return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
        }
        const [orders] = await db.query(
            `SELECT ${orderFields}, u.phone AS customer_phone
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       JOIN users u ON u.id = o.customer_id
          WHERE o.status NOT IN ('completed', 'cancelled') AND o.station_id = ?
       ORDER BY o.created_at ASC`,
            [stationId]
        );
        res.json(orders);
    } catch (error) {
        console.error('Get agent orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const exportAgentOrders = async(req, res) => {
    try {
        const [agents] = await db.query(
            'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
            [req.user.id, 'agent', 'active']
        );
        const stationId = agents[0]?.station_id;
        if (!stationId) {
            return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
        }
        const [orders] = await db.query(
            `SELECT ${orderFields}, u.phone AS customer_phone
             FROM orders o
             JOIN stations s ON s.id = o.station_id
             JOIN users u ON u.id = o.customer_id
             WHERE o.station_id = ?
             ORDER BY o.created_at DESC`,
            [stationId]
        );
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Lux Energy';
        workbook.created = new Date();
        const sheet = workbook.addWorksheet('Station Orders');
        sheet.columns = [
            { header: 'Order', key: 'id', width: 12 },
            { header: 'Customer', key: 'customer_name', width: 26 },
            { header: 'Phone', key: 'customer_phone', width: 18 },
            { header: 'Product', key: 'product_name', width: 20 },
            { header: 'Quantity', key: 'quantity', width: 14 },
            { header: 'Unit', key: 'unit', width: 14 },
            { header: 'Status', key: 'status', width: 16 },
            { header: 'Delivery address', key: 'delivery_address', width: 36 },
            { header: 'Station', key: 'station_name', width: 24 },
            { header: 'Created', key: 'created_at', width: 22 }
        ];
        sheet.addRows(orders);
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF174E3A' } };
        sheet.autoFilter = { from: 'A1', to: 'J1' };
        const workbookBuffer = await workbook.xlsx.writeBuffer();
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="station-orders.xlsx"'
        });
        res.send(workbookBuffer);
    } catch (error) {
        console.error('Export agent orders error:', error);
        res.status(500).json({ message: 'Unable to export station orders' });
    }
};

const updateOrder = async(req, res) => {
    try {
        const { status, agent_notes, station_id: requestedStationId } = req.body;
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
        let stationId = req.user.stationId;
        if (req.user.role === 'agent') {
            const [agents] = await db.query(
                'SELECT station_id FROM users WHERE id = ? AND role = ? AND status = ?',
                [req.user.id, 'agent', 'active']
            );
            stationId = agents[0]?.station_id;
            if (!stationId) {
                return res.status(403).json({ message: 'Agent account is not assigned to an active station' });
            }
        }
        const stationFilter = !isAdmin && stationId ? 'AND station_id = ?' : '';
        const findParams = !isAdmin && stationId ? [req.params.id, stationId] : [req.params.id];
        const [existingOrders] = await db.query(
            `SELECT * FROM orders WHERE id = ? ${stationFilter}`,
            findParams
        );
        if (existingOrders.length === 0) {
            return res.status(404).json({ message: 'Order not found for your station' });
        }

        const previous = existingOrders[0];
        const [proofs] = await db.query(
            'SELECT status, payment_method FROM order_payment_proofs WHERE order_id = ? ORDER BY id DESC LIMIT 1',
            [previous.id]
        );
        if (req.user.role === 'agent'
            && ['confirmed', 'preparing', 'ready', 'completed'].includes(status)
            && (!proofs.length || proofs[0].status !== 'approved')) {
            return res.status(409).json({ message: 'Verify the customer payment proof before processing this order' });
        }
        let nextStationId = previous.station_id;
        if (requestedStationId !== undefined) {
            if (!isAdmin) {
                return res.status(403).json({ message: 'Only admins can reassign an order to another station' });
            }
            if (['completed', 'cancelled'].includes(previous.status)) {
                return res.status(409).json({ message: 'Completed or cancelled orders cannot be reassigned' });
            }
            nextStationId = Number(requestedStationId);
            if (!Number.isInteger(nextStationId) || nextStationId < 1) {
                return res.status(400).json({ message: 'Choose a valid staffed station' });
            }
            const [eligibleStations] = await db.query(
                `SELECT s.id FROM stations s
                 WHERE s.id = ? AND s.status = 'active'
                   AND EXISTS (
                     SELECT 1 FROM users u
                     WHERE u.station_id = s.id AND u.role = 'agent' AND u.status = 'active'
                   )`,
                [nextStationId]
            );
            if (eligibleStations.length === 0) {
                return res.status(409).json({ message: 'Orders can only be assigned to an active station with an active agent' });
            }
        }
        const stationChanged = Number(nextStationId) !== Number(previous.station_id);
        const agentId = isAdmin ? (stationChanged ? null : previous.agent_id || null) : req.user.id;

        await db.query(
            `UPDATE orders SET station_id = ?, status = ?, agent_notes = ?, agent_id = ? WHERE id = ?`,
            [nextStationId, status || previous.status,
                agent_notes !== undefined ? agent_notes : previous.agent_notes, agentId, req.params.id]
        );

        // Auto-create a bill when an order is completed for the first time
        if (status === 'completed' && previous.status !== 'completed') {
            const [existingBill] = await db.query(
                'SELECT id FROM bills WHERE order_id = ?',
                [req.params.id]
            );
            if (existingBill.length === 0) {
                const unitPrice = previous.order_type === 'gas' ? 25000 : 1450;
                const amount = Number(previous.quantity) * unitPrice;
                const due = new Date();
                due.setDate(due.getDate() + 14);
                const paymentVerified = proofs[0]?.status === 'approved';
                await db.query(
                    `INSERT INTO bills (customer_id, order_id, description, amount, due_date, status, paid_at, payment_method)
                     VALUES (?, ?, ?, ?, ?, ?, ${paymentVerified ? 'NOW()' : 'NULL'}, ?)`,
                    [
                        previous.customer_id,
                        previous.id,
                        `${previous.product_name} · ${previous.quantity} ${previous.unit}`,
                        amount,
                        due.toISOString().slice(0, 10),
                        paymentVerified ? 'paid' : 'unpaid',
                        paymentVerified ? proofs[0].payment_method : null
                    ]
                );
            }
        }

        const [orders] = await db.query(
            `SELECT ${orderFields}
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       JOIN users u ON u.id = o.customer_id
       WHERE o.id = ?`, [req.params.id]
        );
        res.json(orders[0]);
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getAllOrders = async(req, res) => {
    try {
        const { status, province } = req.query;
        let query = `
      SELECT ${orderFields}, u.phone AS customer_phone, s.province
      FROM orders o
      JOIN stations s ON s.id = o.station_id
      JOIN users u ON u.id = o.customer_id
      WHERE 1=1`;
        const params = [];
        if (status) {
            query += ' AND o.status = ?';
            params.push(status);
        }
        if (province) {
            query += ' AND s.province = ?';
            params.push(province);
        }
        query += ' ORDER BY o.created_at DESC';
        const [orders] = await db.query(query, params);
        res.json(orders);
    } catch (error) {
        console.error('Get all orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { createOrder, getCustomerOrders, getAgentOrders, exportAgentOrders, updateOrder, getAllOrders };