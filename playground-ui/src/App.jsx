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
import AttendanceManagement from './components/attendance/AttendanceManagement';
import AttendanceSummaryReport from './components/attendance/AttendanceSummaryReport';
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

// Inject global keyframes for page transitions
const pageTransitionStyle = document.createElement('style');
pageTransitionStyle.textContent = `
  @keyframes pageEnter {
    0%   { opacity: 0; transform: translateY(18px); }
    100% { opacity: 1; transform: translateY(0); }
  }
`;
if (!document.head.querySelector('#page-enter-keyframes')) {
  pageTransitionStyle.id = 'page-enter-keyframes';
  document.head.appendChild(pageTransitionStyle);
}

// import DailyAttendanceAdmin from './components/attendance/DailyAttendanceAdmin';
import BarcodeAttendancePage from './components/attendance/BarcodeAttendancePage';

import ShiftChangeRequest from './components/request/ShiftChangeRequest';
import ShiftChangeApproval from './components/scheduling/ShiftChangeApproval';
import UserRoles from './components/admin/UserRoles';
import OvertimePlanList from './components/overtime/OvertimePlanList';
import OvertimeGrid from './components/overtime/OvertimeGrid';
import MyOvertimeSchedule from './components/overtime/MyOvertimeSchedule';
import AccountantDashboard from './components/dashboard/AccountantDashboard';


// Default tab per role when first logged in
const DEFAULT_TAB = {
  Admin: 'admin-roles',
  Accountant: 'payroll-processing',
  CnbSpecialist: 'payroll-processing',
  DepartmentHead: 'employees',
  Employee: 'me',
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

  // Professional Loading Screen Component
  const PremiumLoader = ({ message }) => (
    <div style={{ 
      height: '100dvh', width: '100vw', 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
      background: '#0F0A1E', position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden' 
    }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124, 58, 237, 0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
        {/* Animated Logo */}
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '32px', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', animation: 'pulse-slow 2.5s ease-in-out infinite' }}>
          HRMS <span style={{ color: '#A78BFA' }}>Net</span>
        </div>
        
        {/* Minimalist Progress Container */}
        <div style={{ width: '220px', height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ 
            height: '100%', width: '100%', 
            background: 'linear-gradient(90deg, transparent, #7C3AED, #A78BFA, #7C3AED, transparent)', 
            animation: 'shimmer-progress 2.5s infinite ease-in-out' 
          }} />
        </div>
        
        <p style={{ color: 'rgba(167, 139, 250, 0.7)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '10px' }}>
          {message || 'Đang chuẩn bị không gian làm việc...'}
        </p>
      </div>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { opacity: 0.7; transform: scale(0.98); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes shimmer-progress { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </div>
  );

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
          setActiveTab(data.username === 'hr_rec_01' ? 'me' : (DEFAULT_TAB[primary] || 'me'));
        }
      } catch {
        authService.logout();
      }
    }
    // Force a small delay to showcase the professional loader
    setTimeout(() => setInitializing(false), 1500);
  };

  const handleLogin = async (userData) => {
    const primary = getPrimaryRole(userData.roles || []);
    const waiting = await checkUnsignedContracts(userData.roles || []);
    
    setUser(userData);
    if (waiting) {
      setActiveTab('my-contract');
      toast.error("Bạn cần ký hợp đồng để sử dụng hệ thống", { duration: 6000, icon: '📄' });
    } else {
      setActiveTab(userData.username === 'hr_rec_01' ? 'me' : (DEFAULT_TAB[primary] || 'me'));
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

  if (initializing) return <PremiumLoader message="Khởi tạo hệ thống..." />;

  if (!user) {
      if (publicView === 'barcode') {
          return <BarcodeAttendancePage onBack={() => setPublicView(false)} />;
      }
      return (
        <div className="app-reveal" style={{ height: '100dvh' }}>
          <Login onLoginSuccess={handleLogin} onShowPublic={() => setPublicView('barcode')} />
        </div>
      );
  }


  const tab = (id) => activeTab === id;

  const handleTabChange = (t) => {
    if (hasUnsignedContract && t !== 'my-contract' && t !== 'me') return;
    setActiveTab(t);
    setViewingEmployeeId(null);
    setSidebarOpen(false);
  };

  const commonRoles = ['Admin', 'Accountant', 'CnbSpecialist', 'DepartmentManager', 'DepartmentHead', 'Employee'];

  return (
    <div className="app-reveal" style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', background: 'var(--bg-base)', color: 'var(--text-primary)', overflow: 'hidden' }}>
      <Header 
        user={user} 
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        activeTab={activeTab}
      />

      <div style={{ display: 'flex', flex: 1, width: '100%', overflow: 'hidden' }}>
        <Sidebar 
          user={user} 
          activeTab={activeTab} 
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          hasUnsignedContract={hasUnsignedContract}
          onTabChange={handleTabChange}
        />

        <main style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', minWidth: 0, background: 'var(--bg-base)' }}>
          <div key={activeTab}>
          {/* Thông báo bắt buộc ký hợp đồng */}
          {hasUnsignedContract && (
            <div className="mb-6 bg-amber-600 rounded-xl p-4 text-white shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
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



          {/* ── Personal (All roles) ── */}
          {tab('me') && (
            <RoleGuard user={user} allowedRoles={commonRoles}>
              <Profile mode="me" onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('attendance') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Tính năng Điểm danh bị khóa" 
                  description="Bạn không thể thực hiện chấm công hoặc xem dữ liệu điểm danh khi chưa hoàn tất ký kết hợp đồng."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <Attendance onBack={() => setActiveTab('me')} />
              )}
            </RoleGuard>
          )}
          {tab('leave') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Tính năng Nghỉ phép bị khóa" 
                  description="Bạn không thể gửi đơn nghỉ phép hoặc theo dõi số dư phép khi chưa ký hợp đồng xác nhận."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <Leave user={user} onBack={() => setActiveTab('me')} />
              )}
            </RoleGuard>
          )}
          {tab('time-adjustment') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
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
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              <MyContract user={user} onSignSuccess={checkUnsignedContracts} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('my-schedule') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Lịch làm việc bị khóa" 
                  description="Thông tin ca làm việc của bạn tạm thời bị ẩn. Vui lòng ký kết hợp đồng để nhận lịch công tác."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <MySchedule user={user} onBack={() => setActiveTab('me')} />
              )}
            </RoleGuard>
          )}
          {tab('shift-change') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              {hasUnsignedContract ? (
                <RestrictedView 
                  title="Bị khóa" 
                  description="Đổi ca tạm thời bị ẩn. Vui lòng ký kết hợp đồng trước."
                  onGoToContract={() => setActiveTab('my-contract')} 
                />
              ) : (
                <ShiftChangeRequest user={user} onBack={() => setActiveTab('me')} />
              )}
            </RoleGuard>
          )}
          {tab('my-payslip') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              <MyPayslip user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('my-insurance') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'DepartmentHead', 'TeamLeader', 'Employee', 'Accountant', 'CnbSpecialist']}>
              <MyInsurance user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('my-ot-schedule') && (
            <RoleGuard user={user} allowedRoles={commonRoles}>
              <MyOvertimeSchedule user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}

          {/* ── Team Management (Team Leader) ── */}
          {tab('ot-assignment') && (
            <RoleGuard user={user} allowedRoles={['TeamLeader', 'DepartmentHead']}>
              <OvertimeGrid user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('team-timesheets') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'Admin']}>
              <TimesheetApproval user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('team-schedule') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'Admin']}>
              <SchedulingMatrix user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('team-shift-approvals') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager', 'Admin', 'CnbSpecialist']}>
              <ShiftChangeApproval user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('team-leaves') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager', 'Admin', 'CnbSpecialist']}>
              <Leave user={user} approvalOnly={true} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}

          {/* ── Department Management (Department Head) ── */}
          {tab('ot-planning') && (
            <RoleGuard user={user} allowedRoles={['DepartmentManager', 'CnbSpecialist']}>
              <OvertimePlanList user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('employees') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager', 'CnbSpecialist']}>
              <EmployeeList user={user} onViewProfile={handleViewEmployee} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('dept-activities') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager']}>
              <DeptActivities user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('dept-leaves') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager', 'CnbSpecialist']}>
              <Leave user={user} approvalOnly={true} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('dept-contracts') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'DepartmentManager']}>
              <ContractApproval user={user} scope="department" onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}



          {/* ── C&B Specialist / Accountant ── */}
          {tab('payroll-processing') && (
            <RoleGuard user={user} allowedRoles={['CnbSpecialist', 'Admin', 'Accountant']}>
              <PayrollProcessing user={user} />
            </RoleGuard>
          )}
          {tab('payroll-settings') && (
            <RoleGuard user={user} allowedRoles={['CnbSpecialist', 'Admin']}>
              <PayrollSettings onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('payroll-report') && (
            <RoleGuard user={user} allowedRoles={['Accountant', 'CnbSpecialist', 'Admin']}>
              <ComingSoon 
                title="Báo cáo lương & Thuế" 
                description="Hệ thống đang tổng hợp dữ liệu báo cáo chi tiết cho kỳ lương hiện tại."
              />
            </RoleGuard>
          )}
          {tab('attendance-management') && (
            <RoleGuard user={user} allowedRoles={['CnbSpecialist']}>
              <AttendanceManagement onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('attendance-report') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'DepartmentManager', 'CnbSpecialist']}>
              <AttendanceSummaryReport user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('insurance-management') && (
            <RoleGuard user={user} allowedRoles={['CnbSpecialist']}>
              <InsuranceManagement user={user} />
            </RoleGuard>
          )}


          
          {/* ── Admin Only ── */}
          {tab('add-employee') && (
            <RoleGuard user={user} allowedRoles={['Admin']}>
              <EmployeeForm onSuccess={() => setActiveTab('employees')} />
            </RoleGuard>
          )}
          {tab('admin-contracts') && (
            <RoleGuard user={user} allowedRoles={['CnbSpecialist']}>
              <ContractManagement user={user} onBack={() => setActiveTab('me')} />
            </RoleGuard>
          )}
          {tab('barcode-attendance') && (
            <RoleGuard user={user} allowedRoles={['Admin']}>
              <BarcodeAttendancePage />
            </RoleGuard>
          )}
          {tab('admin-roles') && (
            <RoleGuard user={user} allowedRoles={['Admin', 'CnbSpecialist']}>
              <UserRoles user={user} onBack={() => setActiveTab('me')} />
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

          {/* ── Shared: view employee profile ── */}
          {tab('view-profile') && (
            <RoleGuard user={user} allowedRoles={['DepartmentHead', 'TeamLeader', 'DepartmentManager', 'CnbSpecialist']}>
              <Profile mode="id" employeeId={viewingEmployeeId} onBack={() => setActiveTab('employees')} />
            </RoleGuard>
          )}
          </div>{/* end page-enter */}
        </main>
      </div>

      <footer style={{
        padding: '10px 32px',
        textAlign: 'center',
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        opacity: 0.7,
      }}>
        © 2026 HRMS Net • Hệ thống quản trị nhân sự
      </footer>
      <Toaster 
        position="top-center" 
        reverseOrder={false} 
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            color: '#1e293b',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
            style: {
              background: 'rgba(236, 253, 245, 0.9)',
              color: '#065f46',
              border: '1px solid rgba(167, 243, 208, 0.5)',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
            style: {
              background: 'rgba(254, 242, 242, 0.9)',
              color: '#991b1b',
              border: '1px solid rgba(254, 226, 226, 0.5)',
            },
          },
        }}
      />
    </div>
  );
}

