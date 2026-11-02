import React from 'react';
import { Link } from 'react-router-dom';
import { FaUser, FaHardHat, FaArrowRight, FaShieldAlt } from 'react-icons/fa';

const LoginGateway = () => (
  <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-600 text-white flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-5xl">
      <div className="text-center mb-10">
        <img src="/logo.jpeg" alt="Lux Energy" className="h-24 w-24 object-cover rounded-full border-4 border-white shadow-xl mx-auto mb-5" />
        <p className="text-gold-300 uppercase tracking-[0.28em] text-sm font-semibold mb-3">Powering Rwanda</p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to Lux Energy</h1>
        <p className="text-primary-100 text-lg">Choose your account to continue.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <Link to="/login" className="group bg-white text-gray-900 rounded-lg p-8 shadow-xl hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-6">
            <span className="h-14 w-14 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center"><FaUser size={24} /></span>
            <FaArrowRight className="text-primary-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <h2 className="text-2xl font-bold text-primary-700 mb-2">Customer login</h2>
          <p className="text-gray-600">Order fuel or gas, choose your station, and follow your order from home.</p>
        </Link>

        <Link to="/agent/login" className="group bg-white text-gray-900 rounded-lg p-8 shadow-xl hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-6">
            <span className="h-14 w-14 rounded-full bg-gold-100 text-gold-700 flex items-center justify-center"><FaHardHat size={24} /></span>
            <FaArrowRight className="text-gold-600 group-hover:translate-x-1 transition-transform" />
          </div>
          <h2 className="text-2xl font-bold text-primary-700 mb-2">Station agent login</h2>
          <p className="text-gray-600">Manage customer requests and keep your station orders moving.</p>
        </Link>

        <Link to="/admin/login" className="group bg-white text-gray-900 rounded-lg p-8 shadow-xl hover:-translate-y-1 transition-transform">
          <div className="flex items-center justify-between mb-6">
            <span className="h-14 w-14 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center"><FaShieldAlt size={24} /></span>
            <FaArrowRight className="text-gray-700 group-hover:translate-x-1 transition-transform" />
          </div>
          <h2 className="text-2xl font-bold text-primary-700 mb-2">Admin login</h2>
          <p className="text-gray-600">Manage users, stations, operations, and submitted reports.</p>
        </Link>
      </div>

      <div className="text-center mt-8">
        <Link to="/home" className="text-white/80 hover:text-white text-sm">Continue to the public website</Link>
      </div>
    </div>
  </div>
);

export default LoginGateway;
