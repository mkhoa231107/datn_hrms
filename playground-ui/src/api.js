import axios from 'axios';

// --- CHẾ ĐỘ TEST LOCAL ---
export const BASE_URL = "http://localhost:5052"; 

// --- CHẾ ĐỘ PRODUCTION (KHI UP LÊN HOST) ---
// export const BASE_URL = "https://api.hrms.io.vn"; 

const API_BASE = `${BASE_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
});
/**
 * Helper để lấy URL ảnh nhân viên chuẩn xác
 * Cách dùng trong Component: <img src={getEmployeeImageUrl(emp.imagePath)} />
 */
export const getEmployeeImageUrl = (imagePath) => {
  if (!imagePath) return "/default-avatar.png"; // Đường dẫn ảnh mặc định trong thư mục public của React
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_URL}/uploads/employees/${imagePath}`;
};

// Tự động gắn Token vào header của mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý phản hồi và bắt lỗi tập trung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nếu lỗi 401 (Hết hạn token hoặc chưa đăng nhập)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      // Tùy chọn: window.location.href = '/login';
    }
    
    if (error.response && error.response.data) {
      console.error('API Error:', error.response.data);
    }
    return Promise.reject(error);
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
  },
  updateCoefficient: async (id, coefficient) => {
    const res = await api.put(`/positions/${id}/coefficient`, { coefficient });
    return res.data;
  },
  updateAllowances: async (id, meal, phone, petrol, housing) => {
    const res = await api.put(`/positions/${id}/allowances`, { meal, phone, petrol, housing });
    return res.data;
  },
  updateEmployeePayrollOverrides: async (employeeId, coefficient, mealAllowance, phoneAllowance, petrolAllowance, housingAllowance) => {
    const res = await api.put(`/employees/${employeeId}/payroll-overrides`, { 
      coefficient, mealAllowance, phoneAllowance, petrolAllowance, housingAllowance 
    });
    return res.data;
  }
};



export const schedulingService = {
  getShifts: async () => {
    const res = await api.get('/workshifts');
    return res.data;
  },
  getTemplates: async () => {
    const res = await api.get('/workschedules/templates');
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
  },
  globalAutoSchedule: async (data) => {
    const res = await api.post('/workschedules/global-auto-schedule', data);
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
  approveRequest: async (id, note, approverSignature) => {
    const res = await api.post(`/leave/request/${id}/approve`, { note, approverSignature });
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
  scanBarcode: async (employeeCode) => {
    const res = await api.post('/attendance/scan-barcode', { employeeCode });
    return res.data;
  },
  getMyOvertime: async () => {
    const res = await api.get('/attendance/my-overtime');
    return res.data;
  }
};

export const overtimeService = {
  createPlan: async (data) => {
    const res = await api.post('/overtimemanagement/plans', data);
    return res.data;
  },
  getPlans: async (params) => {
    const res = await api.get('/overtimemanagement/plans', { params });
    return res.data;
  },
  bulkAssign: async (data) => {
    const res = await api.post('/overtimemanagement/assignments/bulk', data);
    return res.data;
  },
  getAssignmentGrid: async (departmentId, month, year) => {
    const res = await api.get(`/overtimemanagement/assignments/grid?departmentId=${departmentId}&month=${month}&year=${year}`);
    return res.data;
  },
  getMySchedule: async (fromDate, toDate) => {
    const res = await api.get(`/overtimemanagement/my-schedule?fromDate=${fromDate}&toDate=${toDate}`);
    return res.data;
  },
  publishPlan: async (id) => {
    const res = await api.post(`/overtimemanagement/plans/${id}/publish`);
    return res.data;
  },
  confirmAssignment: async (id) => {
    const res = await api.post(`/overtimemanagement/assignments/${id}/confirm`);
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
  },
  createUser: async (dto) => {
    const res = await api.post('/users', dto);
    return res.data;
  },
  updateUserInfo: async (id, dto) => {
    const res = await api.put(`/users/${id}`, dto);
    return res.data;
  },
  resetPassword: async (id, newPassword) => {
    const res = await api.post(`/users/${id}/reset-password`, { newPassword });
    return res.data;
  },
  toggleActive: async (id) => {
    const res = await api.post(`/users/${id}/toggle-active`);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  }
};

export default api;