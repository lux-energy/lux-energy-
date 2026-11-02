import api from './api';

export const orderService = {
    create: async(order) => {
        const response = await api.post('/orders', order, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    submitPaymentProof: async(orderId, paymentMethod, proof) => {
        const formData = new FormData();
        formData.append('payment_method', paymentMethod);
        formData.append('payment_proof', proof);
        return (await api.post(`/orders/mine/${orderId}/payment-proof`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })).data;
    },

    downloadPaymentProof: async(orderId) => (
        await api.get(`/orders/${orderId}/payment-proof`, { responseType: 'blob' })
    ).data,

    reviewPaymentProof: async(orderId, decision, note) => (
        await api.patch(`/orders/${orderId}/payment-proof`, { decision, note })
    ).data,

    getMine: async() => {
        const response = await api.get('/orders/mine');
        return response.data;
    },

    getStationOrders: async() => {
        const response = await api.get('/orders/station');
        return response.data;
    },

    exportStationOrders: async() => {
        const response = await api.get('/orders/station/export.xlsx', { responseType: 'blob' });
        return response.data;
    },

    update: async(id, details) => {
        const response = await api.patch(`/orders/${id}`, details);
        return response.data;
    }
};