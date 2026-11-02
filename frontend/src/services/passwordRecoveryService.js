import api from './api';

export const passwordRecoveryService = {
  requestCode: async (payload) => (await api.post('/auth/password/forgot', payload)).data,
  resetPassword: async (payload) => (await api.post('/auth/password/reset', payload)).data
};