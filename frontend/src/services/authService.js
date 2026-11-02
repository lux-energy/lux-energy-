import api from './api';

export const authService = {
    login: async(email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.admin));
        }
        return response.data;
    },

    loginCustomer: async(email, password) => {
        const response = await api.post('/auth/customer/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        } else if (response.data.verification_required) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return response.data;
    },

    registerCustomer: async(details) => {
        const response = await api.post('/auth/customer/register', details);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        } else if (response.data.verification_required) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
        return response.data;
    },

    verifyCustomerContacts: async(details) => {
        const response = await api.post('/auth/customer/verify', details);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    verifyCustomerRegistration: async(details) => (
        await api.post('/auth/customer/register/verify', details)
    ).data,

    resendCustomerRegistrationCode: async(challengeId) => (
        await api.post('/auth/customer/register/resend', { challenge_id: challengeId })
    ).data,

    resendCustomerVerification: async(email, channel) => (
        await api.post('/auth/customer/verify/resend', { email, channel })
    ).data,

    loginAgent: async(email, password) => {
        const response = await api.post('/auth/agent/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getCurrentUser: async() => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    getUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
};