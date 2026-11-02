import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaGasPump } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/portal', label: 'Orders', end: true },
  { to: '/portal/services', label: 'Services' },
  { to: '/portal/bills', label: 'Bills' },
  { to: '/portal/tickets', label: 'Tickets' }
];

const CustomerPortalLayout = ({ title, subtitle, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (item) => {
    if (item.end) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-gold-300 font-semibold mb-2">
                <FaGasPump />
                <span>Customer Portal</span>
              </div>
              <p className="text-sm text-gray-200 mb-1">Welcome, {user?.name}</p>
              <h1 className="text-3xl md:text-4xl font-bold">{title}</h1>
              {subtitle && <p className="text-gray-100 mt-2">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Link to="/home" className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Home</Link>
              <button onClick={handleLogout} className="bg-white/10 border border-white/30 px-4 py-2 rounded-lg">Logout</button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item)
                    ? 'bg-white text-primary-900'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      <section className="py-10">
        <div className="container mx-auto px-4">{children}</div>
      </section>
    </div>
  );
};

export default CustomerPortalLayout;
