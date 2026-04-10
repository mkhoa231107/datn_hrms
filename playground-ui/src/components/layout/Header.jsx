import { LogOut, Menu, Bell } from 'lucide-react';
import { ROLE_META, getPrimaryRole } from './Sidebar';
import { useState, useRef, useEffect } from 'react';
import NotificationDropdown from './NotificationDropdown';

// Navigation items per role (horizontal top nav)
export function getNavItems(primaryRole) {
    const allItems = {
        // Personal items (all internal roles)
        me:               { id: 'me',               label: 'Hồ sơ',              roles: ['Admin','DepartmentManager','DepartmentHead','Employee','HrAdmin'] },
        attendance:       { id: 'attendance',        label: 'Chấm công',          roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        leave:            { id: 'leave',             label: 'Đơn từ & Nghỉ phép', roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        'my-schedule':    { id: 'my-schedule',       label: 'Lịch ca',            roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        'shift-change':   { id: 'shift-change',      label: 'Xin đổi ca',         roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        'my-payslip':     { id: 'my-payslip',        label: 'Bảng lương',         roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        'my-contract':    { id: 'my-contract',       label: 'Hợp đồng',           roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },
        'my-insurance':   { id: 'my-insurance',      label: 'Bảo hiểm',           roles: ['Admin','DepartmentManager','DepartmentHead','Employee'] },

        // Department Head
        'team-attendance':{ id: 'team-attendance',   label: 'Tăng ca Bộ phận',    roles: ['DepartmentHead','Admin'] },
        'team-schedule':  { id: 'team-schedule',     label: 'Lịch làm việc BP',     roles: ['DepartmentHead','Admin'] },
        'team-shift-approvals': { id: 'team-shift-approvals', label: 'Duyệt đổi ca BP', roles: ['DepartmentHead','Admin'] },
        'team-leaves':    { id: 'team-leaves',       label: 'Duyệt đơn BP',       roles: ['DepartmentHead','Admin'] },
        'team-timesheets':{ 
            id: 'team-timesheets',   
            label: primaryRole === 'DepartmentManager' ? 'Chốt công BP' : 'Duyệt công BP',      
            roles: ['DepartmentHead','DepartmentManager','Admin'] 
        },

        // Department Manager
        employees:        { id: 'employees',         label: 'Nhân viên',           roles: ['DepartmentManager','Admin','HrAdmin'] },
        'dept-leaves':    { id: 'dept-leaves',       label: 'Duyệt đơn PB',       roles: ['DepartmentManager','Admin'] },
        'dept-activities':{ id: 'dept-activities',   label: 'Hoạt động PB',       roles: ['DepartmentManager','Admin'] },

        // Admin
        'admin-contracts':{ id: 'admin-contracts',   label: 'Quản lý HĐLĐ',      roles: ['Admin','DepartmentManager'] },
        'payroll-processing':{ id: 'payroll-processing', label: 'Lương',          roles: ['Admin', 'DepartmentHead'] },
        'insurance-management':{ id: 'insurance-management', label: 'Bảo hiểm',   roles: ['Admin','DepartmentManager','DepartmentHead'] },
        'face-registration':{ id: 'face-registration', label: 'Quét khuôn mặt', roles: ['Admin'] },
    };

    const ORDER = {
        Admin:             ['me','employees','admin-contracts','payroll-processing','insurance-management','face-registration'],
        DepartmentManager: ['me','employees','dept-leaves','dept-activities','team-timesheets','admin-contracts'],
        DepartmentHead:    ['me','leave','team-schedule','team-shift-approvals','team-leaves','team-timesheets', 'payroll-processing'],
        Employee:          ['me','attendance','leave','my-schedule','shift-change','my-payslip','my-contract','my-insurance'],
        HrAdmin:           ['me','employees'],
    };

    const ids = ORDER[primaryRole] || ORDER.Employee;
    return ids
        .map(id => allItems[id])
        .filter(item => item && item.roles.includes(primaryRole));
}

export default function Header({ user, onLogout, onToggleSidebar, activeTab, onTabChange }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });
    const navRef = useRef(null);

    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const meta = ROLE_META[primaryRole] || ROLE_META.Employee;
    const navItems = getNavItems(primaryRole).filter(item => {
        // Special case: Payroll is only for Admin (view) and C&B Dept Head (manage)
        if (item.id === 'payroll-processing') {
            if (primaryRole === 'Admin') return true;
            if (primaryRole === 'DepartmentHead' && user?.departmentId === 7) return true;
            return false;
        }
        return true;
    });

    useEffect(() => {
        if (!navRef.current) return;
        // Wait a tick for rendering to finish before measuring
        setTimeout(() => {
            if (!navRef.current) return;
            const activeBtn = navRef.current.querySelector('[data-active="true"]');
            if (activeBtn) {
                setIndicatorStyle({
                    left: activeBtn.offsetLeft,
                    width: activeBtn.offsetWidth,
                    opacity: 1
                });
            }
        }, 50);
    }, [activeTab, navItems]);

    // Get label of the current active tab
    const activeMeta = navItems.find(n => n.id === activeTab);
    const activeLabel = activeMeta?.label || 'Trang chủ';

    // Breadcrumb: role > section
    const groupMap = {
        me: 'Cá nhân', attendance: 'Cá nhân', leave: 'Cá nhân',
        'my-schedule': 'Cá nhân', 'my-payslip': 'Cá nhân', 'my-contract': 'Cá nhân', 'my-insurance': 'Cá nhân',
        'team-attendance': 'Bộ phận', 'team-schedule': 'Bộ phận',
        'team-leaves': 'Bộ phận', 'team-timesheets': 'Bộ phận',
        employees: 'Phòng ban', 'dept-leaves': 'Phòng ban', 'dept-activities': 'Phòng ban',
        'admin-contracts': 'Quản trị', 'admin-recruitment': 'Quản trị',
        'payroll-processing': 'Quản trị', 'insurance-management': 'Quản trị',
        'face-registration': 'Quản trị',
    };
    const sectionLabel = groupMap[activeTab] || 'Tổng quan';

    return (
        <div className="sticky top-0 z-50">
            {/* ── Main top bar ── */}
            <header className="bg-white border-b border-slate-200 h-14 px-4 flex items-center justify-between shadow-sm">
                {/* Left: Logo + hamburger */}
                <div className="flex items-center gap-3 shrink-0">
                    <button
                        onClick={onToggleSidebar}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                {/* Left-aligned: Horizontal nav tabs */}
                <nav ref={navRef} className="relative flex-1 flex flex-row h-full items-center justify-start overflow-x-auto scrollbar-none ml-6 gap-2">
                    {/* Animated Underline */}
                    <div 
                        className="absolute bottom-0 h-[3px] bg-violet-600 transition-all duration-300 ease-out z-10 rounded-t-sm"
                        style={indicatorStyle}
                    />
                    
                    {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                data-active={isActive}
                                onClick={() => onTabChange(item.id)}
                                className={`
                                    relative px-3 md:px-4 h-full flex items-center justify-center text-[13px] font-semibold whitespace-nowrap transition-colors duration-150
                                    ${isActive
                                        ? 'text-violet-600'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }
                                `}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </nav>

                {/* Right: avatar circle + bell + logout */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Role badge */}
                    <span className={`hidden md:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${meta.light} whitespace-nowrap`}>
                        {meta.label}
                    </span>

                    {/* Notification Bell */}
                    <div className="relative">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={`p-2 relative rounded-lg transition-colors ${
                                showNotifications
                                    ? 'text-indigo-600 bg-indigo-50'
                                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50'
                            }`}
                            title="Thông báo"
                        >
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white animate-pulse" />
                        </button>
                        {showNotifications && (
                            <NotificationDropdown
                                user={user}
                                onClose={() => setShowNotifications(false)}
                            />
                        )}
                    </div>

                    {/* Avatar circle */}
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white cursor-default shadow-sm border-2 border-white ${meta.color}`}
                        title={user?.fullName}
                    >
                        {(user?.fullName || 'U').charAt(0).toUpperCase()}
                    </div>

                    {/* Logout */}
                    <button
                        onClick={onLogout}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Đăng xuất"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* ── Sub-bar: page title + breadcrumb ── */}
            <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{activeLabel}</span>
                <span className="text-slate-400">
                    {meta.label}
                    <span className="mx-1.5 text-slate-300">›</span>
                    {sectionLabel}
                    <span className="mx-1.5 text-slate-300">›</span>
                    <span className="text-slate-600 font-medium">{activeLabel}</span>
                </span>
            </div>
        </div>
    );
}
