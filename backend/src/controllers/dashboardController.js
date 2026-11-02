const db = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const [stations] = await db.query('SELECT COUNT(*) as total FROM stations WHERE status = ?', ['active']);
    const [products] = await db.query('SELECT COUNT(*) as total FROM products WHERE status = ?', ['active']);
    const [services] = await db.query('SELECT COUNT(*) as total FROM services WHERE status = ?', ['active']);
    const [news] = await db.query('SELECT COUNT(*) as total FROM news WHERE status = ?', ['published']);
    const [careers] = await db.query('SELECT COUNT(*) as total FROM careers WHERE status = ?', ['open']);
    const [messages] = await db.query('SELECT COUNT(*) as total FROM contact_messages WHERE status = ?', ['unread']);
    const [customers] = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'customer'");
    const [agents] = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'agent'");
    const [orders] = await db.query('SELECT COUNT(*) as total FROM orders');
    const [activeOrders] = await db.query(
      "SELECT COUNT(*) as total FROM orders WHERE status NOT IN ('completed', 'cancelled')"
    );
    const [openTickets] = await db.query(
      "SELECT COUNT(*) as total FROM tickets WHERE status IN ('open', 'in_progress')"
    );
    const [unpaidBills] = await db.query(
      "SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as amount FROM bills WHERE status = 'unpaid'"
    );
    const [paidRevenue] = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as amount FROM bills WHERE status = 'paid'"
    );

    const [stationsByProvince] = await db.query(
      `SELECT province, COUNT(*) as total
       FROM stations WHERE status = 'active'
       GROUP BY province ORDER BY total DESC`
    );

    const [ordersByProvince] = await db.query(
      `SELECT s.province, COUNT(*) as total
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       GROUP BY s.province
       ORDER BY total DESC`
    );

    const [ordersByStatus] = await db.query(
      `SELECT status, COUNT(*) as total FROM orders GROUP BY status`
    );

    const [recentOrders] = await db.query(
      `SELECT o.id, o.product_name, o.quantity, o.unit, o.status, o.created_at,
              s.name AS station_name, s.province, u.name AS customer_name
       FROM orders o
       JOIN stations s ON s.id = o.station_id
       JOIN users u ON u.id = o.customer_id
       ORDER BY o.created_at DESC
       LIMIT 8`
    );

    const [monthlyOrders] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as total
       FROM orders
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    res.json({
      totalStations: stations[0].total,
      totalProducts: products[0].total,
      totalServices: services[0].total,
      totalNews: news[0].total,
      activeCareers: careers[0].total,
      unreadMessages: messages[0].total,
      totalCustomers: customers[0].total,
      totalAgents: agents[0].total,
      totalOrders: orders[0].total,
      activeOrders: activeOrders[0].total,
      openTickets: openTickets[0].total,
      unpaidBills: unpaidBills[0].total,
      unpaidAmount: Number(unpaidBills[0].amount),
      paidRevenue: Number(paidRevenue[0].amount),
      stationsByProvince,
      ordersByProvince,
      ordersByStatus,
      recentOrders,
      monthlyOrders
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getDashboardStats };
