import api from './api';

export const newsService = {
  getAllNews: async () => {
    const response = await api.get('/news');
    return response.data;
  },

  getNewsById: async (id) => {
    const response = await api.get(`/news/${id}`);
    return response.data;
  },

  getNewsBySlug: async (slug) => {
    const response = await api.get(`/news/slug/${slug}`);
    return response.data;
  },

  createNews: async (formData) => {
    const response = await api.post('/news', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  updateNews: async (id, formData) => {
    const response = await api.put(`/news/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  deleteNews: async (id) => {
    const response = await api.delete(`/news/${id}`);
    return response.data;
  }
};