import api from '../api';

const attendanceService = {
  // Check-in/Check-out
  checkIn: async (location = '', deviceInfo = 'Web Browser') => {
    try {
      const response = await api.post('/attendance/check-in', {
        location,
        deviceInfo
      });
      return response.data;
    } catch (error) {
      // Ném lại error nhưng đảm bảo error.response được giữ nguyên
      throw error;
    }
  },

  checkOut: async (location = '', deviceInfo = 'Web Browser') => {
    try {
      const response = await api.post('/attendance/check-out', {
        location,
        deviceInfo
      });
      return response.data;
    } catch (error) {
      // Ném lại error nhưng đảm bảo error.response được giữ nguyên
      throw error;
    }
  },

  // Attendance history
  getMyRecords: async (fromDate = null, toDate = null) => {
    try {
      const params = {};
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;
      
      const response = await api.get('/attendance/my-records', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Attendance summary
  getMySummary: async (periodId) => {
    try {
      const response = await api.get(`/attendance/my-summary/${periodId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Time adjustment requests
  createAdjustmentRequest: async (data) => {
    try {
      const response = await api.post('/attendance/adjustment-request', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getMyAdjustmentRequests: async () => {
    try {
      const response = await api.get('/attendance/my-adjustment-requests');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Admin functions
  getDepartmentAttendance: async (departmentId, date) => {
    try {
      const response = await api.get(`/attendance/department/${departmentId}/date/${date}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveAdjustmentRequest: async (requestId, note) => {
    try {
      const response = await api.post(`/attendance/adjustment-request/${requestId}/approve`, { note });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  rejectAdjustmentRequest: async (requestId, note) => {
    try {
      const response = await api.post(`/attendance/adjustment-request/${requestId}/reject`, { note });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Timesheet Management
  getDepartmentTimesheets: async (departmentId, periodId) => {
    try {
      const response = await api.get(`/attendance/department/${departmentId}/timesheets/${periodId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveTimesheet: async (summaryId) => {
    try {
      const response = await api.post(`/attendance/timesheet/${summaryId}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  approveAllTimesheets: async (departmentId, periodId) => {
    try {
      const response = await api.post(`/attendance/department/${departmentId}/timesheets/${periodId}/approve-all`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  finalizeAttendance: async (periodId) => {
    try {
      const response = await api.post(`/attendance/finalize/${periodId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

};

export default attendanceService;