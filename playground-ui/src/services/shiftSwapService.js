import api from '../api';

const shiftSwapService = {
    getById: async (id) => {
        const response = await api.get(`/ShiftSwapRequests/${id}`);
        return response.data;
    },
    getMyRequests: async () => {
        const response = await api.get('/ShiftSwapRequests/my');
        return response.data;
    },
    getPendingApprovals: async () => {
        const response = await api.get('/ShiftSwapRequests/pending-approvals');
        return response.data;
    },
    getApprovalHistory: async () => {
        const response = await api.get('/ShiftSwapRequests/approval-history');
        return response.data;
    },
    createRequest: async (data) => {
        const response = await api.post('/ShiftSwapRequests', data);
        return response.data;
    },
    respondAsPartner: async (id, data) => {
        const response = await api.post(`/ShiftSwapRequests/${id}/respond-partner`, data);
        return response.data;
    },
    approveByManager: async (id, data) => {
        const response = await api.post(`/ShiftSwapRequests/${id}/approve-manager`, data);
        return response.data;
    },
    confirmByHR: async (id, data) => {
        const response = await api.post(`/ShiftSwapRequests/${id}/confirm-hr`, data);
        return response.data;
    },
    downloadPdf: async (id) => {
        const response = await api.get(`/ShiftSwapRequests/${id}/pdf`, {
            responseType: 'blob'
        });
        return response.data;
    }
};

export default shiftSwapService;
