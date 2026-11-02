import React from 'react';
import { Link } from 'react-router-dom';
import { FaGasPump, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <FaGasPump className="text-gold-500 text-2xl" />
              <span className="text-xl font-bold">Lux Energy</span>
            </div>
            <p className="text-gray-400 mb-4">
              Powering Rwanda&apos;s future with reliable fuel and energy solutions since 2010.
            </p>
            <p className="text-sm text-gray-400">Official social media profiles coming soon.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-gold-500 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/services" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-gray-400 hover:text-orange-500 transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link to="/stations" className="text-gray-400 hover:text-platinum-500 transition-colors">
                  Find a Station
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-gray-400 hover:text-gold-500 transition-colors">
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Our Services</h3>
            <ul className="space-y-2">
              <li className="text-gray-400">Fuel Station Services</li>
              <li className="text-gray-400">LPG/Gas Services</li>
              <li className="text-gray-400">Automotive Services</li>
              <li className="text-gray-400">Commercial Fuel Supply</li>
              <li className="text-gray-400">Energy Solutions</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <FaMapMarkerAlt className="text-primary-500 mt-1" />
                <span className="text-gray-400">Picasa Café, 23MJ+FGP, Kicukiro, Near Frulep &amp; Rwanda Foam, KN 3 Rd, Kigali</span>
              </li>
              <li className="flex items-center space-x-3">
                <FaPhone className="text-gold-500" />
                <span className="text-gray-400">+250 791324587</span>
              </li>
              <li className="flex items-center space-x-3">
                <FaEnvelope className="text-orange-500" />
                <span className="text-gray-400">info@luxenergy.rw</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Lux Energy Rwanda. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;