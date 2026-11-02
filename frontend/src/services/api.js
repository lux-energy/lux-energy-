import axios from 'axios';

const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiAssetUrl = (assetPath) => {
    if (!assetPath) return '';
    if (/^https?:\/\//i.test(assetPath)) return assetPath;
    return `${API_BASE_URL.replace(/\/api\/?$/, '')}/${assetPath.replace(/^\/+/, '')}`;
};

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = /\/auth\/(?:customer\/|agent\/)?login(?:\?|$)/.test(error.config?.url || '');
        if (error.response?.status === 401 && !isLoginRequest) {
            const user = JSON.parse(localStorage.getItem('user') || 'null');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            const loginPath = user?.role === 'agent'
                ? '/agent/login'
                : user?.role === 'customer'
                    ? '/login'
                    : window.location.pathname.startsWith('/admin')
                        ? '/admin/login'
                        : window.location.pathname.startsWith('/agent')
                            ? '/agent/login'
                            : '/login';
            window.location.href = loginPath;
        }
        return Promise.reject(error);
    }
);

export default api;