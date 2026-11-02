import api from './api';

export const reportService = {
  list: async (params = {}) => (await api.get('/reports', { params })).data,
  read: async (id) => (await api.get(`/reports/${id}`)).data,
  create: async (payload) => (await api.post('/reports', payload)).data,
  update: async (id, payload) => (await api.put(`/reports/${id}`, payload)).data,
  submit: async (id) => (await api.post(`/reports/${id}/submit`)).data,
  review: async (id, payload) => (await api.patch(`/reports/${id}/review`, payload)).data,
  pendingAgents: async (params = {}) => (await api.get('/reports/pending-agents', { params })).data,
  dashboard: async (params = {}) => (await api.get('/reports/dashboard', { params })).data,
  approvedSummary: async (params = {}) => (await api.get('/reports/approved-summary', { params })).data,
  auditTrail: async (id) => (await api.get(`/reports/${id}/audit`)).data,
  addAttachments: async (id, files) => {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append('files', file));
    return (await api.post(`/reports/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })).data;
  },
  downloadAttachment: async (id, attachmentId) => (
    await api.get(`/reports/${id}/attachments/${attachmentId}/download`, { responseType: 'blob' })
  ).data,
  export: async (format, params = {}) => (
    await api.get(`/reports/export.${format}`, { params, responseType: 'blob' })
  ).data
};