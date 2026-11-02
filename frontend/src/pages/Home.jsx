import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaGasPump, FaCar, FaIndustry, FaHeadset, FaMapMarkerAlt, FaPhone, FaEnvelope, FaArrowRight, FaUserTie } from 'react-icons/fa';
import { stationService } from '../services/stationService';
import { productService } from '../services/productService';
import { serviceService } from '../services/serviceService';
import { newsService } from '../services/newsService';

const galleryPhotos = [
  {
    caption: 'Illustrative Lux Energy brand concept',
    category: 'Brand concept',
    image: '/hero-fuel-station.webp',
    imageAlt: 'Illustrative branded fuel-station concept; not a photograph of an actual Lux Energy employee or station',
    attribution: 'Illustrative artwork; not documentary photography',
  },
  {
    caption: 'Fueling service illustration',
    category: 'Stock image',
    image: '/gallery-fueling-service.jpg',
    imageAlt: 'Green fuel nozzle filling a white car',
    attribution: 'Illustrative stock photo; not a Lux Energy customer or location',
  },
  {
    caption: 'Fuel station forecourt illustration',
    category: 'Stock image',
    image: '/gallery-fuel-station.jpg',
    imageAlt: 'Illustrative fuel station forecourt; not a Lux Energy location',
    attribution: 'Illustrative stock photo; not a Lux Energy location',
  },
];

const teamMembers = [
  {
    name: 'Team member name to be approved',
    role: 'Job title to be approved',
    description: 'Placeholder profile. Replace with an approved staff biography before publication.',
    color: 'from-primary-100 to-platinum-100',
  },
  {
    name: 'Team member name to be approved',
    role: 'Job title to be approved',
    description: 'Placeholder profile. Replace with an approved staff biography before publication.',
    color: 'from-orange-100 to-gold-100',
  },
  {
    name: 'Team member name to be approved',
    role: 'Job title to be approved',
    description: 'Placeholder profile. Replace with an approved staff biography before publication.',
    color: 'from-gold-100 to-primary-100',
  },
];

const Home = () => {
  const [stations, setStations] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState(/** @type {Record<string, boolean>} */ ({}));

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        stationService.getAllStations(),
        productService.getAllProducts(),
        serviceService.getAllServices(),
        newsService.getAllNews()
      ]);
      const applyResult = (key, result, setData, transform = (data) => data) => {
        if (result.status === 'fulfilled') {
          setData(transform(result.value));
        } else {
          console.error(`Error fetching homepage ${key}:`, result.reason);
          setLoadErrors((current) => ({ ...current, [key]: true }));
        }
      };

      applyResult('stations', results[0], setStations, (data) => data.slice(0, 3));
      applyResult('products', results[1], setProducts);
      applyResult('services', results[2], setServices, (data) => data.slice(0, 6));
      applyResult('news', results[3], setNews, (data) => data.slice(0, 3));
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative bg-primary-900 bg-cover bg-center text-white py-20 md:py-32"
        style={{ backgroundImage: "url('/hero-fuel-station.webp')" }}
      >
        <div className="absolute inset-0 bg-primary-900/55"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Powering Rwanda&apos;s Future</h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100">
              Your trusted partner for quality fuel, gas, and energy solutions across Rwanda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/services" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-center">
                Explore Our Services
              </Link>
              <Link to="/stations" className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-600 transition-colors text-center">
                Find a Station
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {!services.length && (
              <p className="col-span-full text-center text-gray-600" role={loadErrors.services ? 'alert' : undefined}>
                {loadErrors.services ? 'Services are temporarily unavailable.' : loading ? 'Loading services...' : 'No services are currently available.'}
              </p>
            )}
            {services.map((service) => (
              <div key={service.id} className="card text-center">
                <div className="text-gold-600 text-4xl mb-4">
                  {service.title === 'Fuel Station Services' && <FaGasPump />}
                  {service.title === 'LPG/Gas Services' && <FaGasPump />}
                  {service.title === 'Automotive Services' && <FaCar />}
                  {service.title === 'Commercial Fuel Supply' && <FaIndustry />}
                  {service.title === 'Energy Solutions' && <FaIndustry />}
                  {service.title === 'Customer Support' && <FaHeadset />}
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/services" className="text-gold-600 font-semibold hover:text-gold-700 inline-flex items-center">
              View All Services <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Products</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {!products.length && (
              <p className="col-span-full text-center text-gray-600" role={loadErrors.products ? 'alert' : undefined}>
                {loadErrors.products ? 'Products are temporarily unavailable.' : loading ? 'Loading products...' : 'No products are currently available.'}
              </p>
            )}
            {products.map((product) => (
              <div key={product.id} className="card">
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 flex items-center justify-center">
                  <FaGasPump className="text-primary-600 text-5xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                <p className="text-sm text-gray-600">{product.category}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/products" className="text-primary-600 font-semibold hover:text-primary-700 inline-flex items-center">
              View All Products <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Stations */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Stations</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {!stations.length && (
              <p className="col-span-full text-center text-gray-600" role={loadErrors.stations ? 'alert' : undefined}>
                {loadErrors.stations ? 'Station information is temporarily unavailable.' : loading ? 'Loading stations...' : 'No stations are currently available.'}
              </p>
            )}
            {stations.map((station) => (
              <div key={station.id} className="card">
                <div className="h-48 bg-gradient-to-br from-gold-100 to-gold-200 rounded-lg mb-4 flex items-center justify-center">
                  <FaGasPump className="text-gold-600 text-5xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{station.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{station.address}</p>
                <p className="text-sm text-gray-600">{station.province}, {station.district}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/stations" className="text-gold-600 font-semibold hover:text-gold-700 inline-flex items-center">
              Find All Stations <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-16 bg-gray-50" aria-labelledby="gallery-heading">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gold-700 font-semibold uppercase tracking-wide mb-2">Life at Lux Energy</p>
            <h2 id="gallery-heading" className="text-3xl font-bold mb-4">Photo Gallery</h2>
            <p className="text-gray-600">
              Illustrative images only. These are not verified photographs of Lux Energy stations, staff, or customers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {galleryPhotos.map((photo) => (
              <article key={photo.category} className="card overflow-hidden p-0">
                <img
                  src={photo.image}
                  alt={photo.imageAlt}
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
                <p className="bg-gray-100 px-5 py-2 text-xs font-medium text-gray-700">{photo.attribution}</p>
                <div className="p-5">
                  <p className="text-sm font-semibold text-gold-700 mb-1">{photo.category}</p>
                  <h3 className="text-lg font-semibold text-gray-900">{photo.caption}</h3>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Our Team */}
      <section className="py-16 bg-white" aria-labelledby="team-heading">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="text-gold-700 font-semibold uppercase tracking-wide mb-2">People behind the service</p>
            <h2 id="team-heading" className="text-3xl font-bold mb-4">Our Team</h2>
            <p className="text-gray-600">
              Sample cards only; staff identities, titles, biographies, and portraits require approval.
            </p>
            <p className="text-sm font-semibold text-amber-800 mt-3">PLACEHOLDER CONTENT — REPLACE BEFORE PUBLICATION</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <article key={index} className="card text-center">
                <div
                  className={`mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br ${member.color} ring-4 ring-white shadow-md`}
                  role="img"
                  aria-label="Placeholder portrait; replace with an approved staff photo"
                >
                  <FaUserTie className="text-primary-700 text-6xl" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">Placeholder profile</p>
                <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                <p className="text-primary-700 font-medium mt-1 mb-3">{member.role}</p>
                <p className="text-gray-600">{member.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-600 text-white">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-amber-100 mb-8">
            Metric placeholders — replace with verified figures before publication
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">—</div>
              <div className="text-primary-100">Verified station count</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">—</div>
              <div className="text-gold-100">Verified years of experience</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">—</div>
              <div className="text-orange-100">Verified customer count</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">—</div>
              <div className="text-platinum-100">Approved support hours</div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Latest News</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {!news.length && (
              <p className="col-span-full text-center text-gray-600" role={loadErrors.news ? 'alert' : undefined}>
                {loadErrors.news ? 'News is temporarily unavailable.' : loading ? 'Loading news...' : 'No news articles are currently available.'}
              </p>
            )}
            {news.map((article) => (
              <div key={article.id} className="card">
                <div className="h-48 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-orange-600 text-4xl">📰</span>
                </div>
                <div className="text-sm text-orange-600 mb-2">{article.category}</div>
                <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{article.excerpt}</p>
                <Link to={`/news/${article.slug}`} className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center">
                  Read More <FaArrowRight className="ml-2" />
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/news" className="text-orange-600 font-semibold hover:text-orange-700 inline-flex items-center">
              View All News <FaArrowRight className="ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Contact us today to learn more about our products and services, or find your nearest Lux Energy station.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact" className="btn-primary">
              Contact Us
            </Link>
            <Link to="/stations" className="btn-secondary">
              Find a Station
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <FaMapMarkerAlt className="text-primary-500 text-3xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Visit Us</h3>
              <p className="text-gray-400">KN 3 Rd, Kigali, Rwanda</p>
            </div>
            <div>
              <FaPhone className="text-gold-500 text-3xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Call Us</h3>
              <p className="text-gray-400">+250 791 324 587</p>
            </div>
            <div>
              <FaEnvelope className="text-orange-500 text-3xl mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Email Us</h3>
              <p className="text-gray-400">info@luxenergy.rw</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;