import api from './api';

export const contactService = {
  createMessage: async (messageData) => {
    const response = await api.post('/contact', messageData);
    return response.data;
  },

  getAllMessages: async () => {
    const response = await api.get('/contact');
    return response.data;
  },

  getMessageById: async (id) => {
    const response = await api.get(`/contact/${id}`);
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.put(`/contact/${id}/read`);
    return response.data;
  },

  deleteMessage: async (id) => {
    const response = await api.delete(`/contact/${id}`);
    return response.data;
  }
};