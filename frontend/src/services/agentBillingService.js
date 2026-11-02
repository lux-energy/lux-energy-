import api from './api';

export const agentBillingService = {
  getStationBilling: async () => (await api.get('/bills/station')).data,
  createInvoice: async (orderId) => (await api.post('/bills/station', { order_id: orderId })).data,
  downloadPaymentProof: async (billId) => (await api.get(`/bills/station/${billId}/payment-proof`, { responseType: 'blob' })).data,
  reviewPaymentProof: async (billId, decision, note) => (
    await api.patch(`/bills/station/${billId}/payment-proof`, { decision, note })
  ).data
};