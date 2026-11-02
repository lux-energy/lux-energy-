import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dashboardService } from '../../services/dashboardService';
import {
  FaGasPump, FaBox, FaConciergeBell, FaNewspaper, FaBriefcase, FaEnvelope,
  FaUsers, FaClipboardList, FaHeadset, FaChartLine, FaSignOutAlt, FaShoppingCart
} from 'react-icons/fa';

const BarChart = ({ data, labelKey, valueKey, color = '#8B1538' }) => {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item[labelKey]}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">{item[labelKey]}</span>
            <span className="font-semibold text-gray-900">{item[valueKey]}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(Number(item[valueKey]) / max) * 100}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-sm text-gray-500">No data yet.</p>}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await dashboardService.getStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaGasPump className="text-energy-600 text-2xl" />
            <span className="text-xl font-bold text-gray-900">Lux Energy Admin</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-600 hover:text-energy-600 transition-colors"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
            <button
              onClick={() => navigate('/home')}
              className="text-gray-600 hover:text-energy-600 transition-colors"
            >
              Public Home
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Stations', value: stats?.totalStations, icon: <FaGasPump /> },
            { label: 'Customers', value: stats?.totalCustomers, icon: <FaUsers /> },
            { label: 'Active Orders', value: stats?.activeOrders, icon: <FaShoppingCart /> },
            { label: 'Open Tickets', value: stats?.openTickets, icon: <FaHeadset /> },
            { label: 'Products', value: stats?.totalProducts, icon: <FaBox /> },
            { label: 'Agents', value: stats?.totalAgents, icon: <FaUsers /> },
            { label: 'Unread Messages', value: stats?.unreadMessages, icon: <FaEnvelope /> },
            { label: 'Paid Revenue (RWF)', value: Number(stats?.paidRevenue || 0).toLocaleString(), icon: <FaChartLine /> }
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{card.value || 0}</p>
                </div>
                <div className="text-energy-600 text-3xl">{card.icon}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold mb-6">Regional Growth Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FaChartLine className="text-energy-600" /> Stations by province
            </h3>
            <BarChart data={stats?.stationsByProvince || []} labelKey="province" valueKey="total" color="#B8860B" />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Orders by province</h3>
            <BarChart data={stats?.ordersByProvince || []} labelKey="province" valueKey="total" />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Orders by status</h3>
            <BarChart data={stats?.ordersByStatus || []} labelKey="status" valueKey="total" color="#2F6B4F" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Monthly order volume</h3>
            <BarChart data={stats?.monthlyOrders || []} labelKey="month" valueKey="total" color="#1F4E79" />
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold mb-4">Recent orders</h3>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(stats?.recentOrders || []).map((order) => (
                <div key={order.id} className="flex justify-between gap-3 text-sm border-b border-gray-100 pb-2">
                  <div>
                    <p className="font-medium">#{order.id} · {order.product_name}</p>
                    <p className="text-gray-500">{order.customer_name} · {order.station_name} ({order.province})</p>
                  </div>
                  <span className="text-gold-700 font-semibold capitalize">{order.status}</span>
                </div>
              ))}
              {(stats?.recentOrders || []).length === 0 && (
                <p className="text-sm text-gray-500">No orders yet.</p>
              )}
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { path: '/admin/orders', icon: <FaClipboardList />, title: 'Live Orders', desc: 'Track and update all orders' },
            { path: '/admin/reports', icon: <FaClipboardList />, title: 'Daily Reports', desc: 'Review station reports and export data' },
            { path: '/admin/users', icon: <FaUsers />, title: 'User Directory', desc: 'Manage customers and agents' },
            { path: '/admin/tickets', icon: <FaHeadset />, title: 'Support Tickets', desc: 'Resolve customer tickets' },
            { path: '/admin/stations', icon: <FaGasPump />, title: 'Manage Stations', desc: 'Add, edit, or delete stations' },
            { path: '/admin/products', icon: <FaBox />, title: 'Manage Products', desc: 'Add, edit, or delete products' },
            { path: '/admin/services', icon: <FaConciergeBell />, title: 'Manage Services', desc: 'CMS for energy services' },
            { path: '/admin/news', icon: <FaNewspaper />, title: 'Manage News', desc: 'Create and manage articles' },
            { path: '/admin/contact', icon: <FaEnvelope />, title: 'View Messages', desc: 'Read contact form messages' },
            { path: '/admin/careers', icon: <FaBriefcase />, title: 'Careers', desc: 'Manage job listings' }
          ].map((action) => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center space-x-4">
                <div className="text-energy-600 text-2xl">{action.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{action.title}</h3>
                  <p className="text-sm text-gray-600">{action.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
