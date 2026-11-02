import React from 'react';
import { FaGasPump, FaAward, FaUsers, FaLeaf, FaShieldAlt, FaHandshake } from 'react-icons/fa';

const About = () => {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About Lux Energy</h1>
          <p className="text-xl text-gray-100">Powering Rwanda&apos;s growth since 2010</p>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Who We Are</h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Lux Energy Rwanda is a leading energy company dedicated to providing reliable fuel and gas solutions across the country.
              With over a decade of experience, we have established ourselves as a trusted partner for businesses and individuals
              seeking quality energy products and services.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Our commitment to excellence, safety, and customer satisfaction has made us one of Rwanda&apos;s preferred energy providers.
              We operate a growing network of fuel stations and offer comprehensive energy solutions tailored to meet the diverse needs
              of our customers.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="card">
              <div className="text-gold-600 text-4xl mb-4">
                <FaGasPump />
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
              <p className="text-gray-600 leading-relaxed">
                To provide reliable, safe, and affordable energy solutions that power Rwanda&apos;s economic growth and improve the quality of life for all Rwandans.
                We are committed to operational excellence, environmental responsibility, and customer satisfaction in everything we do.
              </p>
            </div>
            <div className="card">
              <div className="text-gold-600 text-4xl mb-4">
                <FaAward />
              </div>
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-gray-600 leading-relaxed">
                To be Rwanda&apos;s leading energy company, recognized for excellence in service delivery, innovation in energy solutions,
                and contribution to national development. We aim to expand our reach while maintaining the highest standards of quality
                and safety in the energy sector.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaShieldAlt />
              </div>
              <h3 className="text-xl font-semibold mb-3">Safety First</h3>
              <p className="text-gray-600">
                We prioritize the safety of our customers, employees, and communities in all our operations.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaHandshake />
              </div>
              <h3 className="text-xl font-semibold mb-3">Integrity</h3>
              <p className="text-gray-600">
                We conduct our business with honesty, transparency, and ethical standards.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaUsers />
              </div>
              <h3 className="text-xl font-semibold mb-3">Customer Focus</h3>
              <p className="text-gray-600">
                Our customers are at the heart of everything we do. We strive to exceed their expectations.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaLeaf />
              </div>
              <h3 className="text-xl font-semibold mb-3">Environmental Responsibility</h3>
              <p className="text-gray-600">
                We are committed to sustainable practices that protect our environment for future generations.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaAward />
              </div>
              <h3 className="text-xl font-semibold mb-3">Excellence</h3>
              <p className="text-gray-600">
                We pursue excellence in quality, service, operational efficiency, and continuous improvement.
              </p>
            </div>
            <div className="card text-center">
              <div className="text-gold-600 text-4xl mb-4">
                <FaGasPump />
              </div>
              <h3 className="text-xl font-semibold mb-3">Innovation</h3>
              <p className="text-gray-600">
                We embrace innovation and technology to deliver better energy solutions to our customers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Lux Energy?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaGasPump />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Quality Products</h3>
                <p className="text-gray-600">
                  We provide only the highest quality fuel and gas products that meet international standards.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaShieldAlt />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Safe Operations</h3>
                <p className="text-gray-600">
                  Our operations follow strict safety protocols to ensure the well-being of our customers and staff.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaUsers />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Expert Team</h3>
                <p className="text-gray-600">
                  Our trained professionals deliver exceptional service with expertise and dedication.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaHandshake />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Competitive Pricing</h3>
                <p className="text-gray-600">
                  We offer fair and competitive pricing without compromising on quality or service.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaLeaf />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Environmental Care</h3>
                <p className="text-gray-600">
                  We implement eco-friendly practices and support sustainable energy initiatives.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <div className="text-gold-600 text-2xl mt-1">
                <FaAward />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Proven Track Record</h3>
                <p className="text-gray-600">
                  Over a decade of reliable service has made us a trusted name in Rwanda&apos;s energy sector.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">15+</div>
              <div className="text-primary-100">Stations Nationwide</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10+</div>
              <div className="text-gold-100">Years of Experience</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">200+</div>
              <div className="text-orange-100">Dedicated Employees</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50K+</div>
              <div className="text-platinum-100">Satisfied Customers</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;