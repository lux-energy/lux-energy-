import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaNewspaper, FaCalendar, FaUser, FaArrowLeft } from 'react-icons/fa';
import { newsService } from '../services/newsService';
import { apiAssetUrl } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const NewsDetail = () => {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    setArticle(null);
    setLoading(true);
    setLoadError(false);

    const fetchArticle = async () => {
      try {
        const data = await newsService.getNewsBySlug(slug);
        if (active) setArticle(data);
      } catch (error) {
        if (!active) return;
        if (error.response?.status === 404) {
          setArticle(null);
        } else {
          console.error('Error fetching article:', error);
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchArticle();
    return () => {
      active = false;
    };
  }, [slug]);

  const formatDate = (dateString) => {
    /** @type {Intl.DateTimeFormatOptions} */
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <FaNewspaper className="text-gray-400 text-5xl mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900">
          {loadError ? 'Unable to load this article' : 'Article not found'}
        </h1>
        <p className="mt-2 text-gray-600 text-lg">
          {loadError
            ? 'Please check your connection and try again.'
            : 'This article may have been removed or the link may be incorrect.'}
        </p>
        <Link to="/news" className="text-energy-600 hover:text-energy-700 mt-4 inline-block">
          <FaArrowLeft className="inline mr-2" />
          Back to News
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-energy-600 to-energy-800 text-white py-20">
        <div className="container mx-auto px-4">
          <Link to="/news" className="text-white hover:text-gray-200 inline-flex items-center mb-4">
            <FaArrowLeft className="mr-2" />
            Back to News
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center space-x-6 text-gray-100">
            <div className="flex items-center">
              <FaUser className="mr-2" />
              <span>{article.author}</span>
            </div>
            <div className="flex items-center">
              <FaCalendar className="mr-2" />
              <span>{formatDate(article.published_at)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            {article.image && (
              <img 
                src={apiAssetUrl(article.image)}
                alt={article.title} 
                className="w-full h-96 object-cover rounded-lg mb-8"
              />
            )}
            
            <div className="text-sm text-energy-600 font-semibold mb-4">{article.category}</div>
            
            {article.excerpt && (
              <p className="text-xl text-gray-700 mb-8 leading-relaxed italic">
                {article.excerpt}
              </p>
            )}
            
            <div className="prose prose-lg max-w-none">
              <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                {article.content}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t">
              <Link to="/news" className="text-energy-600 hover:text-energy-700 inline-flex items-center">
                <FaArrowLeft className="mr-2" />
                Back to All News
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default NewsDetail;