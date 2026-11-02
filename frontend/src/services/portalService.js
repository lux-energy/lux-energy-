import api from './api';

export const portalService = {
  getStationServices: async () => (await api.get('/customer-services/station')).data,
  getMyServices: async () => (await api.get('/customer-services/mine')).data,
  subscribeService: async (payload) => (await api.post('/customer-services/mine', payload)).data,
  updateMyService: async (id, payload) => (await api.patch(`/customer-services/mine/${id}`, payload)).data,

  getMyBills: async () => (await api.get('/bills/mine')).data,
  submitPaymentProof: async (id, payment_method, proof) => {
    const formData = new FormData();
    formData.append('payment_method', payment_method);
    formData.append('proof', proof);
    return (await api.post(`/bills/mine/${id}/payment-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data;
  },

  getMyTickets: async () => (await api.get('/tickets/mine')).data,
  createTicket: async (payload) => (await api.post('/tickets/mine', payload)).data
};

export const adminOpsService = {
  getUsers: async (role) => (await api.get('/users', { params: role ? { role } : {} })).data,
  createUser: async (payload) => (await api.post('/users', payload)).data,
  updateUser: async (id, payload) => (await api.put(`/users/${id}`, payload)).data,
  deleteUser: async (id) => (await api.delete(`/users/${id}`)).data,

  getAllOrders: async (params) => (await api.get('/orders/all', { params })).data,
  updateOrder: async (id, payload) => (await api.patch(`/orders/${id}`, payload)).data,

  getTickets: async () => (await api.get('/tickets')).data,
  updateTicket: async (id, payload) => (await api.patch(`/tickets/${id}`, payload)).data,

  getBills: async () => (await api.get('/bills')).data,
  createBill: async (payload) => (await api.post('/bills', payload)).data
};
