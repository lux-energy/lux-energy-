import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaNewspaper, FaCalendar, FaUser, FaArrowRight } from 'react-icons/fa';
import { newsService } from '../services/newsService';
import { apiAssetUrl } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const News = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await newsService.getAllNews();
        setNews(data);
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString) => {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-energy-600 to-energy-800 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">News & Updates</h1>
          <p className="text-xl text-gray-100">Stay informed about Lux Energy&apos;s latest news and developments</p>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          {news.length === 0 ? (
            <div className="text-center py-12">
              <FaNewspaper className="text-gray-400 text-5xl mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No news articles available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {news.map((article) => (
                <div key={article.id} className="card">
                  <div className="h-48 bg-gradient-to-br from-energy-100 to-energy-200 rounded-lg mb-4 flex items-center justify-center">
                    {article.image ? (
                      <img 
                        src={apiAssetUrl(article.image)}
                        alt={article.title} 
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <FaNewspaper className="text-energy-600 text-5xl" />
                    )}
                  </div>
                  <div className="text-sm text-energy-600 font-semibold mb-2">{article.category}</div>
                  <h3 className="text-xl font-semibold mb-3">{article.title}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-3">{article.excerpt}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <FaUser className="mr-2" />
                      <span>{article.author}</span>
                    </div>
                    <div className="flex items-center">
                      <FaCalendar className="mr-2" />
                      <span>{formatDate(article.published_at)}</span>
                    </div>
                  </div>
                  <Link to={`/news/${article.slug}`} className="text-energy-600 font-semibold hover:text-energy-700 inline-flex items-center">
                    Read More <FaArrowRight className="ml-2" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe to our newsletter to receive the latest news and updates from Lux Energy.
          </p>
          <div className="max-w-md mx-auto flex gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 input-field"
            />
            <button className="btn-primary">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default News;