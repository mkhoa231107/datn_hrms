import { api } from '../api';

const shiftChangeService = {
  // Employee requests
  createRequest: async (data) => {
    const response = await api.post('/shiftchangerequests', data);
    return response.data;
  },

  getMyRequests: async () => {
    const response = await api.get('/shiftchangerequests/my');
    return response.data;
  },

  // Department Head requests
  getPendingRequests: async () => {
    const response = await api.get('/shiftchangerequests/pending');
    return response.data;
  },

  getAllRequests: async () => {
    const response = await api.get('/shiftchangerequests/all');
    return response.data;
  },

  approveRequest: async (id) => {
    const response = await api.post(`/shiftchangerequests/${id}/approve`);
    return response.data;
  },

  rejectRequest: async (id, reason) => {
    const response = await api.post(`/shiftchangerequests/${id}/reject`, { reason });
    return response.data;
  }
};

export default shiftChangeService;
