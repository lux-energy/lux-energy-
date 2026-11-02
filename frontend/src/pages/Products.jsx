import React, { useEffect, useState } from 'react';
import { FaGasPump } from 'react-icons/fa';
import { productService } from '../services/productService';
import { apiAssetUrl } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await productService.getAllProducts();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-800 to-primary-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Products</h1>
          <p className="text-xl text-gray-100">Quality fuel and gas products for every need</p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div key={product.id} className="card">
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg mb-4 flex items-center justify-center">
                  {product.image ? (
                    <img 
                      src={apiAssetUrl(product.image)}
                      alt={product.name} 
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <FaGasPump className="text-primary-600 text-5xl" />
                  )}
                </div>
                <div className="text-sm text-gold-600 font-semibold mb-2">{product.category}</div>
                <h3 className="text-xl font-semibold mb-3">{product.name}</h3>
                <p className="text-gray-600">{product.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Information */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Our Products?</h2>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-primary-600">Quality Assurance</h3>
                <p className="text-gray-600">
                  All our products meet international quality standards and undergo rigorous testing to ensure purity and performance.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-gold-600">Consistent Supply</h3>
                <p className="text-gray-600">
                  We maintain reliable supply chains to ensure our customers always have access to the fuel and gas products they need.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-orange-600">Competitive Pricing</h3>
                <p className="text-gray-600">
                  We offer fair and competitive pricing on all our products without compromising on quality.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3 text-platinum-600">Expert Support</h3>
                <p className="text-gray-600">
                  Our knowledgeable team provides expert guidance on product selection and usage to help you make informed decisions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Visit any of our stations or contact us for bulk orders and commercial supply solutions.
          </p>
          <a href="/stations" className="btn-primary inline-block mr-4">
            Find a Station
          </a>
          <a href="/contact" className="btn-secondary inline-block">
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
};

export default Products;