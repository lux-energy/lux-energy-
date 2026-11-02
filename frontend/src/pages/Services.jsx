import React, { useEffect, useState } from 'react';
import { FaGasPump, FaCar, FaIndustry, FaHeadset, FaLightbulb } from 'react-icons/fa';
import { serviceService } from '../services/serviceService';
import LoadingSpinner from '../components/LoadingSpinner';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await serviceService.getAllServices();
        setServices(data);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const getIcon = (title) => {
    switch (title) {
      case 'Fuel Station Services':
        return <FaGasPump />;
      case 'LPG/Gas Services':
        return <FaGasPump />;
      case 'Automotive Services':
        return <FaCar />;
      case 'Commercial Fuel Supply':
        return <FaIndustry />;
      case 'Energy Solutions':
        return <FaLightbulb />;
      case 'Customer Support':
        return <FaHeadset />;
      default:
        return <FaGasPump />;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary-900 text-white py-20 md:py-28">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero-fuel-station.webp')",
            filter: 'brightness(0.55)'
          }}
        />
        <div className="absolute inset-0 bg-primary-900/60" />
        <div className="container mx-auto px-4 relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-xl text-gray-100 max-w-2xl">Comprehensive energy solutions for all your needs</p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div key={service.id} className="card">
                <div className="text-gold-600 text-5xl mb-4">
                  {getIcon(service.title)}
                </div>
                <h3 className="text-xl font-semibold mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                {service.detailed_description && (
                  <p className="text-sm text-gray-500">{service.detailed_description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Need More Information?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Our team is ready to help you find the right energy solutions for your needs. 
            Contact us today to learn more about our services.
          </p>
          <a href="/contact" className="btn-primary inline-block">
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
};

export default Services;