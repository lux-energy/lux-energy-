import React, { useState } from 'react';
import { FaMapMarkerAlt, FaPhone, FaEnvelope, FaClock, FaPaperPlane } from 'react-icons/fa';
import { contactService } from '../services/contactService';

const Contact = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await contactService.createMessage(formData);
      setSuccess(true);
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-gray-100">Get in touch with Lux Energy Rwanda</p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="text-primary-600 text-4xl mb-4">
                <FaMapMarkerAlt />
              </div>
              <h3 className="text-lg font-semibold mb-2">Address</h3>
              <p className="text-gray-600">Picasa Café</p>
              <p className="text-gray-600">23MJ+FGP, Kicukiro</p>
              <p className="text-gray-600">Near Frulep &amp; Rwanda Foam, KN 3 Rd, Kigali</p>
            </div>
            <div className="text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaPhone />
              </div>
              <h3 className="text-lg font-semibold mb-2">Phone</h3>
              <p className="text-gray-600">+250 791 324 587</p>
            </div>
            <div className="text-center">
              <div className="text-orange-600 text-4xl mb-4">
                <FaEnvelope />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email</h3>
              <p className="text-gray-600">info@luxenergy.rw</p>
              <p className="text-gray-600">support@luxenergy.rw</p>
            </div>
            <div className="text-center">
              <div className="text-platinum-600 text-4xl mb-4">
                <FaClock />
              </div>
              <h3 className="text-lg font-semibold mb-2">Opening Hours</h3>
              <p className="text-gray-600">Mon - Fri: 8:00 - 17:00</p>
              <p className="text-gray-600">Sat: 9:00 - 13:00</p>
            </div>
          </div>

          {/* Contact Form and Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
              
              {success && (
                <div role="status" className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                  Your message has been sent successfully! We&apos;ll get back to you soon.
                </div>
              )}

              {error && (
                <div role="alert" className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="contact-full-name" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    id="contact-full-name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter your email address"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    id="contact-phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    id="contact-subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="input-field"
                    placeholder="Enter the subject"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="input-field"
                    placeholder="Enter your message"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  {loading ? (
                    <span className="animate-spin mr-2">⏳</span>
                  ) : (
                    <FaPaperPlane className="mr-2" />
                  )}
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>

            {/* Map */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Find Us</h2>
              <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <FaMapMarkerAlt className="text-4xl mb-2 mx-auto" />
                  <p>Google Maps Integration</p>
                  <p className="text-sm">Picasa Café, 23MJ+FGP, Kicukiro, Near Frulep &amp; Rwanda Foam, KN 3 Rd, Kigali</p>
                </div>
              </div>
              <div className="mt-6">
                <a
                  href="https://maps.app.goo.gl/u5m5XAdcyJFFk6kp8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gold-600 hover:text-gold-700 font-semibold inline-flex items-center"
                >
                  <FaMapMarkerAlt className="mr-2" />
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">Connect With Us</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Our social media links will be added here when the official profiles are available.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Contact;