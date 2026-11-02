import api from './api';

export const careerService = {
  getAllCareers: async () => {
    const response = await api.get('/careers');
    return response.data;
  },

  getCareerById: async (id) => {
    const response = await api.get(`/careers/${id}`);
    return response.data;
  },

  createCareer: async (careerData) => {
    const response = await api.post('/careers', careerData);
    return response.data;
  },

  updateCareer: async (id, careerData) => {
    const response = await api.put(`/careers/${id}`, careerData);
    return response.data;
  },

  deleteCareer: async (id) => {
    const response = await api.delete(`/careers/${id}`);
    return response.data;
  }
};