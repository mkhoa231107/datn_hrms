import { LogOut, Menu, Bell } from 'lucide-react';
import { ROLE_META, getPrimaryRole } from './Sidebar';
import { useState, useEffect, useRef } from 'react';
import NotificationDropdown from './NotificationDropdown';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const TAB_LABELS = {
    'me': 'Hồ sơ của tôi', 'attendance': 'Chấm công',
    'leave': 'Đơn từ & Nghỉ phép', 'my-schedule': 'Lịch ca',
    'shift-change': 'Xin đổi ca', 'my-payslip': 'Bảng lương',
    'my-contract': 'Hợp đồng lao động', 'my-insurance': 'Bảo hiểm',
    'my-ot-schedule': 'Lịch tăng ca', 'employees': 'Nhân viên',
    'ot-assignment': 'Tăng ca', 'dept-leaves': 'Duyệt đơn BP',
    'dept-activities': 'Hoạt động phòng ban', 'ot-planning': 'Kế hoạch OT',
    'team-timesheets': 'Chốt công', 'team-schedule': 'Xếp ca bộ phận',
    'team-leaves': 'Duyệt đơn bộ phận', 'view-profile': 'Hồ sơ nhân viên',
    'attendance-management': 'Quản lý chấm công', 'insurance-management': 'Bảo hiểm xã hội',
    'admin-contracts': 'Quản lý Hợp đồng', 'admin-roles': 'Quản lý Tài khoản',
    'payroll-processing': 'Tính lương & Thuế', 'payroll-settings': 'Cấu hình lương',
    'payroll-report': 'Báo cáo lương', 'dept-contracts': 'Hợp đồng phòng ban',
    'admin-system': 'Cấu hình hệ thống', 'attendance-report': 'BC chấm công',
    'team-shift-approvals': 'Duyệt đổi ca',
};

const TAB_SECTION = {
    'me': 'Cá nhân', 'attendance': 'Cá nhân', 'leave': 'Cá nhân',
    'my-schedule': 'Cá nhân', 'shift-change': 'Cá nhân', 'my-payslip': 'Cá nhân',
    'my-contract': 'Cá nhân', 'my-insurance': 'Cá nhân', 'my-ot-schedule': 'Cá nhân',
    'employees': 'Quản lý', 'ot-assignment': 'Quản lý', 'dept-leaves': 'Quản lý',
    'dept-activities': 'Quản lý', 'ot-planning': 'Điều hành', 'team-timesheets': 'Điều hành',
    'team-schedule': 'Quản lý', 'team-leaves': 'Quản lý', 'view-profile': 'Quản lý',
    'attendance-management': 'Nhân sự', 'insurance-management': 'Nhân sự',
    'admin-contracts': 'Nhân sự', 'admin-roles': 'Nhân sự',
    'payroll-processing': 'Tiền lương', 'payroll-settings': 'Tiền lương',
    'payroll-report': 'Tiền lương', 'dept-contracts': 'Quản lý', 'admin-system': 'Hệ thống',
    'attendance-report': 'Nhân sự', 'team-shift-approvals': 'Quản lý',
};

export default function Header({ user, onLogout, onToggleSidebar, activeTab }) {
    const [showNotifications, setShowNotifications] = useState(false);
    const [hasNewNotif, setHasNewNotif] = useState(true);
    const bellRef = useRef(null);
    const { isMobile } = useBreakpoint();

    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const meta = ROLE_META[primaryRole] || ROLE_META.Employee;
    const activeLabel = TAB_LABELS[activeTab] || 'Trang chủ';
    const sectionLabel = TAB_SECTION[activeTab] || 'Tổng quan';
    const initials = (user?.fullName || 'U').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

    useEffect(() => {
        if (!showNotifications) return;
        const handler = (e) => {
            if (bellRef.current && !bellRef.current.contains(e.target)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showNotifications]);

    const accentColorMap = {
        Admin: '#EF4444', DepartmentManager: '#4F46E5', DepartmentHead: '#D97706',
        Accountant: '#059669', CnbSpecialist: '#0D9488', Employee: '#7C3AED',
    };
    const accentHex = accentColorMap[primaryRole] || '#7C3AED';

    return (
        <div className="sticky top-0 z-50">
            {/* ── Top bar ── */}
            <header
                className="glass-surface h-14 flex items-center justify-between"
                style={{
                    borderBottom: '1px solid var(--border)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    padding: isMobile ? '0 12px' : '0 16px',
                }}
            >
                {/* Left: hamburger + logo + page title (mobile) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', flexShrink: 0 }}>
                    <button
                        onClick={onToggleSidebar}
                        className="hover-trigger transition-all duration-200"
                        style={{
                            padding: '10px', borderRadius: 'var(--r-md)',
                            border: 'none', background: 'transparent',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            minHeight: '44px', minWidth: '44px',
                        }}
                        onMouseEnter={e => { 
                            e.currentTarget.style.background = 'var(--accent-subtle)'; 
                            e.currentTarget.style.color = 'var(--accent)'; 
                        }}
                        onMouseLeave={e => { 
                            e.currentTarget.style.background = 'transparent'; 
                            e.currentTarget.style.color = 'var(--text-secondary)'; 
                        }}
                        title="Bật/Tắt thanh điều hướng"
                    >
                        <Menu size={20} />
                    </button>

                    <span
                        className="text-gradient"
                        style={{
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: isMobile ? '14px' : '15px',
                            fontWeight: 800,
                            letterSpacing: '-0.02em',
                        }}
                    >
                        HRMS Net
                    </span>

                    {/* Page title inline — mobile only */}
                    {isMobile && (
                        <span style={{
                            fontSize: '12px', fontWeight: 600,
                            color: 'var(--text-secondary)', opacity: 0.7,
                            maxWidth: '110px', overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                            {activeLabel}
                        </span>
                    )}
                </div>

                <div style={{ flex: 1 }} />

                {/* Right: role badge + bell + avatar + logout */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '4px' : '8px', flexShrink: 0 }}>
                    {!isMobile && (
                        <span className="badge badge-accent" style={{ fontSize: '10px' }}>
                            {meta.label}
                        </span>
                    )}

                    <div style={{ position: 'relative' }} ref={bellRef}>
                        <button
                            onClick={() => { setShowNotifications(v => !v); setHasNewNotif(false); }}
                            style={{
                                padding: '10px', borderRadius: 'var(--r-md)', border: 'none',
                                background: showNotifications ? 'var(--accent-subtle)' : 'transparent',
                                color: showNotifications ? 'var(--accent)' : 'var(--text-secondary)',
                                cursor: 'pointer', position: 'relative',
                                minHeight: '44px', minWidth: '44px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.18s ease, color 0.18s ease',
                            }}
                            onMouseEnter={e => {
                                if (!showNotifications) {
                                    e.currentTarget.style.background = 'var(--accent-subtle)';
                                    e.currentTarget.style.color = 'var(--accent)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!showNotifications) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                }
                            }}
                            title="Thông báo"
                        >
                            <Bell size={18} />
                            {hasNewNotif && (
                                <span style={{
                                    position: 'absolute', top: '8px', right: '8px',
                                    width: '7px', height: '7px',
                                    background: '#EF4444', borderRadius: '50%',
                                    border: '1.5px solid var(--bg-surface)',
                                    animation: 'pulse 2s infinite',
                                }} />
                            )}
                        </button>
                        {showNotifications && (
                            <NotificationDropdown user={user} onClose={() => setShowNotifications(false)} />
                        )}
                    </div>

                    <div
                        style={{
                            width: '34px', height: '34px', borderRadius: 'var(--r-md)',
                            background: accentHex,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 700, color: '#fff',
                            boxShadow: `0 2px 8px ${accentHex}44`,
                            flexShrink: 0,
                        }}
                        title={user?.fullName}
                    >
                        {initials}
                    </div>

                    <button
                        onClick={onLogout}
                        style={{
                            padding: '10px', borderRadius: 'var(--r-md)', border: 'none',
                            background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                            minHeight: '44px', minWidth: '44px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.18s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#DC2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        title="Đăng xuất"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* ── Breadcrumb sub-bar — hidden on mobile ── */}
            {!isMobile && (
                <div style={{
                    background: 'var(--bg-base)', borderBottom: '1px solid var(--border)',
                    padding: '6px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '11px', fontWeight: 500, letterSpacing: '0.02em',
                }}>
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{meta.label}</span>
                    <span style={{ color: 'var(--border-strong)' }}>›</span>
                    <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>{sectionLabel}</span>
                    <span style={{ color: 'var(--border-strong)' }}>›</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{activeLabel}</span>
                </div>
            )}
        </div>
    );
}
