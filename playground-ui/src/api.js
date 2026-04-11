import axios from 'axios';

const API_BASE = "http://localhost:5052/api";

export const api = axios.create({
  baseURL: API_BASE,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors properly
api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Preserve the error structure so components can access error.response.data.message
    if (error.response && error.response.data) {
      // Backend error structure: { success: false, message: "..." }
      console.log('API Error:', error.response.data);
    }
    return Promise.reject(error); // Re-throw to let components handle it
  }
);

export const authService = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },
  register: async (username, password, email, fullName) => {
    const res = await api.post('/auth/register', { username, password, email, fullName });
    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  logout: () => {
    localStorage.removeItem('token');
  },
  forgotPassword: async (username) => {
    const response = await api.post('/auth/forgot-password', { username });
    return response.data;
  },
  verifyOTP: async (username, otpCode) => {
    const response = await api.post('/auth/verify-otp', { username, otpCode });
    return response.data;
  },
  resetPassword: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
};

export const employeeService = {
  getMyProfile: async () => {
    const res = await api.get('/employees/my-profile');
    return res.data;
  },
  getAllEmployees: async () => {
    const res = await api.get('/employees/managed-users');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/employees/${id}`);
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/employees', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/employees/${id}`, data);
    return res.data;
  }
};

export const departmentService = {
  getAll: async () => {
    const res = await api.get('/departments');
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/departments/${id}`);
    return res.data;
  }
};

export const positionService = {
  getAll: async () => {
    const res = await api.get('/positions');
    return res.data;
  }
};

export const hrRecruitmentService = {
  acceptApplication: async (id) => {
    const res = await api.post(`/HRRecruitment/applications/${id}/accept`);
    return res.data;
  },
};

export const jobCriteriaService = {
  getByJobId: async (jobId) => {
    const res = await api.get(`/JobCriteria/job/${jobId}`);
    return res.data;
  },
  upsert: async (data) => {
    const res = await api.post('/JobCriteria', data);
    return res.data;
  }
};

export const schedulingService = {
  getShifts: async () => {
    const res = await api.get('/workshifts');
    return res.data;
  },
  getTemplates: async () => {
    const res = await api.get('/workschedules/templates'); // I need to implement this controller action
    return res.data;
  },
  getPeriods: async () => {
    const res = await api.get('/workschedules/periods');
    return res.data;
  },
  getMatrix: async (periodId, deptId) => {
    const res = await api.get(`/workschedules/matrix?periodId=${periodId}${deptId ? `&deptId=${deptId}` : ''}`);
    return res.data;
  },
  getPersonalSchedule: async (periodId) => {
    const res = await api.get(`/workschedules/personal?periodId=${periodId}`);
    return res.data;
  },
  bulkAssign: async (data) => {
    const res = await api.post('/workschedules/bulk-assign', data);
    return res.data;
  },
  copyPrevious: async (data) => {
    const res = await api.post('/workschedules/copy-previous', data);
    return res.data;
  },
  applyTemplate: async (data) => {
    const res = await api.post('/workschedules/apply-template', data);
    return res.data;
  },
  lockPeriod: async (periodId) => {
    const res = await api.post(`/workschedules/lock/${periodId}`);
    return res.data;
  },
  unlockPeriod: async (periodId) => {
    const res = await api.post(`/workschedules/unlock/${periodId}`);
    return res.data;
  },
  createPeriod: async (periodCmd) => {
    const res = await api.post('/workschedules/periods', periodCmd);
    return res.data;
  },
  autoScheduleDept: async (data) => {
    const res = await api.post('/workschedules/auto-schedule-dept', data);
    return res.data;
  }
};

export const leaveService = {
  getTypes: async () => {
    const res = await api.get('/leave/types');
    return res.data;
  },
  getMyBalance: async (year) => {
    const res = await api.get(`/leave/my-balance?year=${year || new Date().getFullYear()}`);
    return res.data;
  },
  getMyRequests: async () => {
    const res = await api.get('/leave/my-requests');
    return res.data;
  },
  createRequest: async (data) => {
    const res = await api.post('/leave/request', data);
    return res.data;
  },
  cancelRequest: async (id) => {
    const res = await api.delete(`/leave/request/${id}`);
    return res.data;
  },
  getDepartmentRequests: async (departmentId) => {
    const res = await api.get(`/leave/department/${departmentId}/requests`);
    return res.data;
  },
  getToApprove: async () => {
    const res = await api.get('/leave/to-approve');
    return res.data;
  },
  getApprovalHistory: async () => {
    const res = await api.get('/leave/history');
    return res.data;
  },
  approveRequest: async (id, note) => {
    const res = await api.post(`/leave/request/${id}/approve`, { note });
    return res.data;
  },
  rejectRequest: async (id, note) => {
    const res = await api.post(`/leave/request/${id}/reject`, { note });
    return res.data;
  }
};

export const attendanceService = {
  getHistory: async (month, year) => {
    const res = await api.get(`/attendance/my-history?month=${month}&year=${year}`);
    return res.data;
  },
  checkIn: async (data) => {
    const res = await api.post('/attendance/check-in', data);
    return res.data;
  },
  checkOut: async (data) => {
    const res = await api.post('/attendance/check-out', data);
    return res.data;
  },
  // Overtime Methods
  submitOvertimeRequest: async (data) => {
    const res = await api.post('/attendance/overtime/request', data);
    return res.data;
  },
  reviewOvertimeRequest: async (data) => {
    const res = await api.post('/attendance/overtime/review', data);
    return res.data;
  },
  getMyOvertime: async () => {
    const res = await api.get('/attendance/my-overtime');
    return res.data;
  },
  getPendingOvertime: async (deptId) => {
    const res = await api.get(`/attendance/overtime/pending/${deptId}`);
    return res.data;
  },
  getDepartmentOvertime: async (deptId) => {
    const res = await api.get(`/attendance/department/${deptId}/overtime`);
    return res.data;
  },
  scanBarcode: async (employeeCode) => {
    const res = await api.post('/attendance/scan-barcode', { employeeCode });
    return res.data;
  }
};

export const auditLogService = {
  getDepartmentActivities: async () => {
    const res = await api.get('/auditlogs/department');
    return res.data;
  }
};

export const usersService = {
  getAllUsers: async (search = '') => {
    const res = await api.get(`/users${search ? `?search=${search}` : ''}`);
    return res.data;
  },
  getRoles: async () => {
    const res = await api.get('/users/roles');
    return res.data;
  },
  updateRoles: async (id, roleIds) => {
    const res = await api.put(`/users/${id}/roles`, { roleIds });
    return res.data;
  }
};

export default api;
