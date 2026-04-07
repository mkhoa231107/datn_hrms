import React, { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import Sidebar, { getPrimaryRole } from './components/layout/Sidebar';
import Profile from './components/profile/Profile';
import EmployeeList from './components/employee/EmployeeList';
import EmployeeForm from './components/employee/EmployeeForm';
import SchedulingMatrix from './components/scheduling/SchedulingMatrix';
import SchedulingSupervisor from './components/scheduling/SchedulingSupervisor';
import Attendance from './components/attendance/Attendance';
import TimeAdjustmentRequest from './components/request/TimeAdjustmentRequest';
import Leave from './components/leave/Leave';
import MySchedule from './components/scheduling/MySchedule';
import DeptActivities from './components/dashboard/DeptActivities';
import FaceRegistration from './components/attendance/FaceRegistration';
import Login from './components/auth/Login';
import { RoleGuard } from './components/auth/RoleGuard';
import ContractManagement from './components/contracts/ContractManagement';
import ContractApproval from './components/contracts/ContractApproval';
import MyContract from './components/contracts/MyContract';
import { Toaster, toast } from 'react-hot-toast';
import { ChevronLeft } from 'lucide-react';
import { authService, api } from './api';
import RestrictedView from './components/auth/RestrictedView';
import BackButton from './components/layout/BackButton';
import TimesheetApproval from './components/payroll/TimesheetApproval';
import PayrollProcessing from './components/payroll/PayrollProcessing';
import PayrollSettings from './components/payroll/PayrollSettings';
import MyPayslip from './components/payroll/MyPayslip';
import InsuranceManagement from './components/payroll/InsuranceManagement';
import MyInsurance from './components/payroll/MyInsurance';
import EasyDashboard from './components/dashboard/EasyDashboard';
import DailyAttendanceAdmin from './components/attendance/DailyAttendanceAdmin';

import OvertimeScheduling from './components/scheduling/OvertimeScheduling';


// Default tab per role when first logged in
const DEFAULT_TAB = {
  Admin: 'me',
  DepartmentManager: 'me',
  DepartmentHead: 'me',
  Employee: 'me',
  HrAdmin: 'me',
};

// A reusable "Coming Soon" placeholder for features not yet implemented
function ComingSoon({ title, description, icon = '🚧', onBack }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-5 text-center">
      {onBack && (
        <BackButton onClick={onBack} className="absolute top-4 left-4" />
      )}
      <div className="text-6xl">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">{title}</h2>
        <p className="text-sm text-slate-400 max-w-md">{description}</p>
      </div>
      <div className="px-4 py-2 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
        Tính năng đang được phát triển
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('me');
  const [viewingEmployeeId, setViewingEmployeeId] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasUnsignedContract, setHasUnsignedContract] = useState(false);
  // Default to public landing page for any unauthenticated visitor
  const [publicView, setPublicView] = useState(!localStorage.getItem('token'));

  useEffect(() => { checkAuth(); }, []);

  const checkUnsignedContracts = async (roles = []) => {
    // Only Employee role needs to sign contracts — skip check for all other roles
    const primaryRole = getPrimaryRole(roles);
    if (primaryRole !== 'Employee') {
      setHasUnsignedContract(false);
      return false;
    }
    try {
      const response = await api.get('/contracts?status=4&personal=true');
      const waiting = (response.data || []).length > 0;
      setHasUnsignedContract(waiting);
      return waiting;
    } catch (error) {
      console.error('Error checking contracts:', error);
      return false;
    }
  };

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const data = await authService.getMe();
        setUser(data);
        

        const primary = getPrimaryRole(data.roles || []);
        // Only check contracts for Employee role
        const waiting = await checkUnsignedContracts(data.roles || []);
        
        if (waiting) {
          setActiveTab('my-contract');
          toast.error("Bạn cần ký hợp đồng để sử dụng hệ thống", { duration: 6000, icon: '📄' });
        } else {
          setActiveTab(DEFAULT_TAB[primary] || 'me');
        }
      } catch {
        authService.logout();
      }
    }
    setInitializing(false);
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    

    const primary = getPrimaryRole(userData.roles || []);
    // Only check contracts for Employee role
    const waiting = await checkUnsignedContracts(userData.roles || []);
    
    if (waiting) {
      setActiveTab('my-contract');
      toast.error("Bạn cần ký hợp đồng để sử dụng hệ thống", { duration: 6000, icon: '📄' });
    } else {
      setActiveTab(DEFAULT_TAB[primary] || 'me');
      toast.success(`Chào mừng trở lại, ${userData.fullName}!`);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setActiveTab('me');
    setHasUnsignedContract(false);
    setPublicView(false); // go to login, not public careers page
  };

  const handleViewEmployee = (id) => {
    if (hasUnsignedContract) return; // Block viewing profiles if contract not signed
    setViewingEmployeeId(id);
    setActiveTab('view-profile');
  };

  if (initializing) return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
      <div className="space-y-4 text-center">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-indigo-300 font-bold tracking-widest text-xs uppercase animate-pulse">Khởi tạo hệ thống...</p>
      </div>
    </div>
  );

  if (!user) {
      return <Login onLoginSuccess={handleLogin} onShowPublic={() => setPublicView(true)} />;
  }


  const isDashboard = activeTab === 'dashboard';
  const tab = (id) => activeTab === id;

  const handleTabChange = (t) => {
    if (hasUnsignedContract && t !== 'my-contract' && t !== 'me') return;
    setActiveTab(t);
    setViewingEmployeeId(null);
    setSidebarOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 overflow-x-hidden">
      <Header 
        user={user} 
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="flex flex-1 mx-auto w-full relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          hasUnsignedContract={hasUnsignedContract}
          hidden={true} 
          onTabChange={handleTabChange}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto w-full max-w-full">
          {/* Thông báo bắt buộc ký hợp đồng */}
          {hasUnsignedContract && (
            <div className="mb-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-amber-200 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <i className="fas fa-file-contract text-2xl"></i>
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold">Yêu cầu ký kết hợp đồng</h3>
                  <p className="text-amber-50 opacity-90 text-sm">
                    Tài khoản của bạn có hợp đồng mới đang chờ ký xác nhận. Vui lòng hoàn tất ký kết để tiếp tục sử dụng đầy đủ các tính năng của hệ thống.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('my-contract')}
                  className="bg-white text-amber-600 px-6 py-2 rounded-lg font-bold text-sm hover:bg-amber-50 transition-colors shadow-sm shrink-0"
                >
                  Ký ngay
                </button>
              </div>
            </div>
          )}

          {/* ── HRMS Net Dashboard ── */}
          {tab('dashboard') && (
            <EasyDashboard 
              user={user} 
              onModuleClick={(moduleId) => {
                const primaryRole = getPrimaryRole(user?.roles || []);
                // If Admin clicks "Hệ thống", go to the management interface (old interface)
                if (moduleId === 'admin-system' && primaryRole === 'Admin') {
                  setActiveTab('employees');
                } else {
                  setActiveTab(moduleId);
                }
              }} 
            />
          )}

          {/* ── Personal (All roles) ── */}
          {tab('me') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'HrAdmin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              <Profile mode="me" onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('attendance') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Tính năng Điểm danh bị khóa" 
                  description="Bạn không thể thực hiện chấm công hoặc xem dữ liệu điểm danh khi chưa hoàn tất ký kết hợp đồng."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <Attendance onBack={() => setActiveTab('dashboard')} />
              )}
            </RoleGuard>
          )}
          {tab('leave') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Tính năng Đơn từ bị khóa" 
                  description="Bạn không thể gửi đơn nghỉ phép hoặc theo dõi số dư phép khi chưa ký hợp đồng xác nhận."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <Leave user={user} onBack={() => setActiveTab('dashboard')} />
              )}
            </RoleGuard>
          )}
          {tab('time-adjustment') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Tính năng Điều chỉnh bị khóa" 
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <TimeAdjustmentRequest />
              )}
            </RoleGuard>
          )}
          {tab('my-contract') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              <MyContract user={user} onSignSuccess={checkUnsignedContracts} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('my-schedule') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Lịch làm việc bị khóa" 
                  description="Thông tin ca làm việc của bạn tạm thời bị ẩn. Vui lòng ký kết hợp đồng để nhận lịch công tác."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <MySchedule user={user} onBack={() => setActiveTab('dashboard')} />
              )}
            </RoleGuard>
          )}
          {tab('my-payslip') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              <MyPayslip user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('my-insurance') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead', 'Employee']}>
              <MyInsurance user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}

          {/* ── DepartmentHead ── */}
          {tab('team-timesheets') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager']}>
              <TimesheetApproval user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('team-schedule') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'Admin', 'HrAdmin']}>
              <SchedulingMatrix user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('team-leaves') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'Admin', 'HrAdmin']}>
              <Leave user={user} approvalOnly={true} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('team-contracts') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'Admin', 'HrAdmin']}>
              <ContractApproval user={user} scope="team" onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}

          {/* ── DepartmentManager ── */}
          {tab('employees') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'Admin', 'HrAdmin']}>
              <EmployeeList user={user} onViewProfile={handleViewEmployee} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('dept-activities') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'Admin']}>
              <DeptActivities user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('dept-leaves') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'Admin']}>
              <Leave user={user} approvalOnly={true} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('dept-contracts') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'Admin']}>
              <ContractApproval user={user} scope="department" onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}



          {/* ── Admin ── */}
          {tab('add-employee') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'HrAdmin']}>
              <EmployeeForm onSuccess={() => setActiveTab('employees')} />
            </RoleGuard>
          )}
          {tab('admin-contracts') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager']}>
              <ContractManagement user={user} onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
           {tab('face-registration') && (
            <RoleGuard user={user} allowedRoles={['Admin']}>
              <FaceRegistration onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('daily-attendance') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'HrAdmin']}>
              <DailyAttendanceAdmin />
            </RoleGuard>
          )}
           {tab('payroll-processing') && (
            <RoleGuard user={user} allowedRoles={['Admin']} customCheck={user?.username === 'hr_cb_01'}>
              <PayrollProcessing user={user} />
            </RoleGuard>
          )}
          {tab('payroll-settings') && (
            <RoleGuard user={user} allowedRoles={['Admin']} customCheck={user?.username === 'hr_cb_01'}>
              <PayrollSettings onBack={() => setActiveTab('dashboard')} />
            </RoleGuard>
          )}
          {tab('insurance-management') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'DepartmentHead']}>
              <InsuranceManagement user={user} />
            </RoleGuard>
          )}
          {tab('admin-roles') && (
            <RoleGuard user={user} allowedRoles={['Admin']}>
              <ComingSoon
                icon="🔐"
                title="Phân quyền User"
                description="Quản lý tài khoản người dùng, gán vai trò, và thiết lập quyền hạn truy cập hệ thống."
                onBack={() => setActiveTab('dashboard')}
              />
            </RoleGuard>
          )}
          {tab('admin-system') && (
            <RoleGuard user={user} allowedRoles={['Admin']}>
              <ComingSoon
                icon="⚙️"
                title="Cấu hình hệ thống"
                description="Quản trị dữ liệu hệ thống, cấu hình tham số, và sao lưu dữ liệu định kỳ."
              />
            </RoleGuard>
          )}

          {/* ── Admin: view employee profile ── */}
          {tab('view-profile') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager']}>
              <Profile mode="id" employeeId={viewingEmployeeId} onBack={() => setActiveTab('employees')} />
            </RoleGuard>
          )}
        </main>
      </div>

      <footer className="py-2 px-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest border-t border-slate-100 bg-white">
        © 2026 HRMS Net • Hệ thống quản trị nhân sự
      </footer>
      <Toaster position="top-right" reverseOrder={false} />
    </div>
  );
}
