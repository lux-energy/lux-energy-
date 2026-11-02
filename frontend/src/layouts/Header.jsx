import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const loginPath = user?.role === 'agent' ? '/agent/login' : '/login';
    logout();
    navigate(loginPath);
  };

  const navLinks = [
    { path: '/home', label: 'Home' },
    { path: '/about', label: 'About Us' },
    { path: '/services', label: 'Services' },
    { path: '/products', label: 'Products' },
    { path: '/stations', label: 'Stations' },
    { path: '/news', label: 'News' },
    { path: '/careers', label: 'Careers' },
    { path: '/contact', label: 'Contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-[0_10px_30px_rgba(15,23,42,0.08)] border-b border-gray-200">
      <div className="container mx-auto px-4">
        {/* Top Bar */}
        <div className="hidden md:flex justify-between items-center py-2.5 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white text-sm shadow-inner">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 font-medium">
              <FaPhone className="text-gold-300" />
              <span>+250 791 324 587</span>
            </div>

            <div className="flex items-center space-x-2 font-medium">
              <FaEnvelope className="text-gold-300" />
              <span>info@luxenergy.rw</span>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-medium text-white/90">
            <FaMapMarkerAlt className="text-gold-300" />
            <span>Picasa Café, 23MJ+FGP, Kicukiro, Near Frulep &amp; Rwanda Foam, KN 3 Rd, Kigali</span>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link
            to="/home"
            className="flex items-center shrink-0 group"
            aria-label="Lux Energy home"
          >
            <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-50 via-white to-gold-50 px-3 py-2 shadow-sm ring-1 ring-primary-100 transition-all duration-300 group-hover:shadow-md group-hover:ring-primary-200">
              <img
                src="/logo.jpeg"
                alt="Lux Energy"
                className="h-16 w-16 md:h-20 md:w-20 object-cover rounded-full border-2 border-white shadow-md ring-2 ring-primary-100"
              />
              <div className="hidden sm:block">
                <div className="text-xl md:text-2xl font-black tracking-tight text-primary-700 leading-none">
                  Lux Energy
                </div>
                <div className="text-[10px] md:text-[11px] uppercase tracking-[0.28em] text-gold-600 font-semibold mt-1">
                  Powering Rwanda
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 xl:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`relative px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                  location.pathname === link.path
                    ? 'text-primary-700'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {link.label}
                {location.pathname === link.path && (
                  <span className="absolute inset-x-2 -bottom-1 h-0.5 rounded-full bg-primary-600" />
                )}
              </Link>
            ))}

            <Link
              to="/stations"
              className="ml-2 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-gold-500/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-gold-500/40"
            >
              Find a Station
            </Link>

            {user?.role === 'customer' && (
              <Link to="/portal" className="ml-2 text-sm font-semibold text-primary-700">My Portal</Link>
            )}
            {user?.role === 'agent' && (
              <Link to="/agent/orders" className="ml-2 text-sm font-semibold text-primary-700">Order Queue</Link>
            )}
            {!user && <Link to="/login" className="ml-2 text-sm font-semibold text-primary-700">Customer Login</Link>}
            {!user && <Link to="/agent/login" className="text-sm font-semibold text-gold-600">Agent Login</Link>}
            {user && <button onClick={handleLogout} className="ml-2 text-sm font-semibold text-gray-600">Logout</button>}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-primary-50 text-primary-700 shadow-sm transition hover:bg-primary-100"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
          </button>
        </nav>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white py-4">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    location.pathname === link.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}

              <Link
                to="/stations"
                className="mt-2 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg shadow-gold-500/30"
                onClick={() => setIsOpen(false)}
              >
                Find a Station
              </Link>
              {!user && <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-primary-700" onClick={() => setIsOpen(false)}>Customer Login</Link>}
              {!user && <Link to="/agent/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-gold-600" onClick={() => setIsOpen(false)}>Agent Login</Link>}
              {user && <button onClick={() => { handleLogout(); setIsOpen(false); }} className="text-left rounded-lg px-3 py-2 text-sm font-semibold text-gray-600">Logout</button>}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;