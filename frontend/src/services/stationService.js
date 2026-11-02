import api from './api';

export const stationService = {
  getAllStations: async () => {
    const response = await api.get('/stations');
    return response.data;
  },

  getOrderableStations: async () => {
    const response = await api.get('/stations/orders');
    return response.data;
  },

  getStationById: async (id) => {
    const response = await api.get(`/stations/${id}`);
    return response.data;
  },

  createStation: async (stationData) => {
    const response = await api.post('/stations', stationData);
    return response.data;
  },

  updateStation: async (id, stationData) => {
    const response = await api.put(`/stations/${id}`, stationData);
    return response.data;
  },

  deleteStation: async (id) => {
    const response = await api.delete(`/stations/${id}`);
    return response.data;
  }
};