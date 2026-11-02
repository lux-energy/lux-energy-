import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { newsService } from '../../services/newsService';
import { FaNewspaper, FaPlus, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';

const AdminNews = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingNews, setEditingNews] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    image: '',
    author: '',
    category: '',
    status: 'draft',
    published_at: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNews();
  }, []);

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataObj = new FormData();
      Object.keys(formData).forEach(key => {
        formDataObj.append(key, formData[key]);
      });
      if (imageFile) {
        formDataObj.append('image', imageFile);
      }

      if (editingNews) {
        await newsService.updateNews(editingNews.id, formDataObj);
      } else {
        await newsService.createNews(formDataObj);
      }
      setShowModal(false);
      setEditingNews(null);
      setFormData({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        image: '',
        author: '',
        category: '',
        status: 'draft',
        published_at: ''
      });
      setImageFile(null);
      fetchNews();
    } catch (error) {
      console.error('Error saving news:', error);
    }
  };

  const handleEdit = (article) => {
    setEditingNews(article);
    setFormData(article);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await newsService.deleteNews(id);
        fetchNews();
      } catch (error) {
        console.error('Error deleting news:', error);
      }
    }
  };

  const handleAddNew = () => {
    setEditingNews(null);
    setFormData({
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      image: '',
      author: '',
      category: '',
      status: 'draft',
      published_at: ''
    });
    setImageFile(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-energy-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/admin')} className="text-gray-600 hover:text-energy-600">
              <FaArrowLeft />
            </button>
            <h1 className="text-xl font-bold text-gray-900">Manage News</h1>
          </div>
          <button onClick={handleAddNew} className="btn-primary flex items-center space-x-2">
            <FaPlus />
            <span>Add Article</span>
          </button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {news.map((article) => (
                <tr key={article.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FaNewspaper className="text-energy-600 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{article.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {article.author}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {article.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => handleEdit(article)} className="text-energy-600 hover:text-energy-900">
                      <FaEdit />
                    </button>
                    <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:text-red-900">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-screen overflow-y-auto m-4">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingNews ? 'Edit Article' : 'Add New Article'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="news-title" className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input id="news-title" type="text" name="title" value={formData.title} onChange={handleTitleChange} required className="input-field" />
                </div>
                <div>
                  <label htmlFor="news-slug" className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
                  <input id="news-slug" type="text" name="slug" value={formData.slug} onChange={handleChange} className="input-field" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="news-category" className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <input id="news-category" type="text" name="category" value={formData.category} onChange={handleChange} className="input-field" />
                  </div>
                  <div>
                    <label htmlFor="news-author" className="block text-sm font-medium text-gray-700 mb-2">Author</label>
                    <input id="news-author" type="text" name="author" value={formData.author} onChange={handleChange} className="input-field" />
                  </div>
                </div>
                <div>
                  <label htmlFor="news-excerpt" className="block text-sm font-medium text-gray-700 mb-2">Excerpt</label>
                  <textarea id="news-excerpt" name="excerpt" value={formData.excerpt} onChange={handleChange} rows={2} className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="news-content" className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea id="news-content" name="content" value={formData.content} onChange={handleChange} rows={8} required className="input-field"></textarea>
                </div>
                <div>
                  <label htmlFor="news-image" className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <input id="news-image" type="file" onChange={handleImageChange} accept="image/*" className="input-field" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="news-status" className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select id="news-status" name="status" value={formData.status} onChange={handleChange} className="input-field">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="news-published-at" className="block text-sm font-medium text-gray-700 mb-2">Published At</label>
                    <input id="news-published-at" type="datetime-local" name="published_at" value={formData.published_at} onChange={handleChange} className="input-field" />
                  </div>
                </div>
                <div className="flex justify-end space-x-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingNews ? 'Update' : 'Create'} Article
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNews;