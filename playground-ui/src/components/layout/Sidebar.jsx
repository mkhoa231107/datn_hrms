import React from 'react';
import {
    UserCircle, Clock, Umbrella, Calendar, ArrowLeftRight,
    DollarSign, FileSpreadsheet, Shield, Users, BarChart2,
    UserPlus, Settings, Activity, X, CheckSquare, LogOut, LayoutDashboard
} from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export const ROLE_META = {
    Admin:             { label: 'Quản trị viên',        color: 'bg-rose-500',    light: 'bg-rose-50 text-rose-700 border border-rose-200',    hex: '#EF4444' },
    DepartmentManager: { label: 'Trưởng phòng',          color: 'bg-indigo-600',  light: 'bg-indigo-50 text-indigo-700 border border-indigo-200', hex: '#4F46E5' },
    DepartmentHead:    { label: 'Trưởng bộ phận',        color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border border-amber-200',   hex: '#D97706' },
    Accountant:        { label: 'Kế toán',               color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border border-emerald-200', hex: '#059669' },
    CnbSpecialist:     { label: 'Chuyên viên C&B',       color: 'bg-teal-500',    light: 'bg-teal-50 text-teal-700 border border-teal-200',     hex: '#0D9488' },
    Employee:          { label: 'Nhân viên / Công nhân', color: 'bg-violet-600',  light: 'bg-violet-50 text-violet-700 border border-violet-200', hex: '#7C3AED' },
};

export function getPrimaryRole(roles = []) {
    const PRIORITY = ['Admin', 'Accountant', 'CnbSpecialist', 'DepartmentManager', 'DepartmentHead', 'Employee'];
    return PRIORITY.find(r => roles.includes(r)) || 'Employee';
}

const ROLE_MENUS = {
    Employee: [
        { id: 'me',           label: 'Hồ sơ',              icon: UserCircle },
        { id: 'attendance',   label: 'Chấm công',           icon: Clock },
        { id: 'leave',        label: 'Nghỉ phép',          icon: Umbrella },
        { id: 'my-schedule',  label: 'Lịch ca',             icon: Calendar },
        { id: 'shift-change', label: 'Xin đổi ca',          icon: ArrowLeftRight },
        { id: 'my-payslip',   label: 'Bảng lương',          icon: DollarSign },
        { id: 'my-contract',  label: 'Hợp đồng',            icon: FileSpreadsheet },
        { id: 'my-insurance', label: 'Bảo hiểm',            icon: Shield },
    ],
    DepartmentHead: [
        { isHeader: true, label: 'CÁ NHÂN' },
        { id: 'me',              label: 'Hồ sơ',        icon: UserCircle },
        { id: 'attendance',   label: 'Chấm công',           icon: Clock },
        { id: 'leave',        label: 'Nghỉ phép',          icon: Umbrella },
        { id: 'my-schedule',  label: 'Lịch ca',             icon: Calendar },
        { id: 'my-payslip',   label: 'Bảng lương',          icon: DollarSign },
        { id: 'my-contract',  label: 'Hợp đồng',            icon: FileSpreadsheet },
        { isHeader: true, label: 'QUẢN LÝ BỘ PHẬN' },
        { id: 'employees',       label: 'Nhân viên',    icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
    ],
    DepartmentManager: [
        { isHeader: true, label: 'CÁ NHÂN' },
        { id: 'me',              label: 'Hồ sơ',        icon: UserCircle },
        { id: 'attendance',   label: 'Chấm công',           icon: Clock },
        { id: 'leave',        label: 'Nghỉ phép',          icon: Umbrella },
        { id: 'my-schedule',  label: 'Lịch ca',             icon: Calendar },
        { id: 'my-payslip',   label: 'Bảng lương',          icon: DollarSign },
        { id: 'my-contract',  label: 'Hợp đồng',            icon: FileSpreadsheet },
        { isHeader: true, label: 'QUẢN LÝ BỘ PHẬN' },
        { id: 'employees',       label: 'Nhân viên',    icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
    ],
    CnbSpecialist: [
        { id: 'cnb-dashboard',         label: 'Dashboard C&B',     icon: LayoutDashboard },
        { isHeader: true, label: 'NHÂN SỰ' },
        { id: 'employees',             label: 'Nhân viên',         icon: Users },
        { id: 'admin-contracts',       label: 'Quản lý hợp đồng', icon: FileSpreadsheet },
        { id: 'admin-roles',           label: 'Quản lý tài khoản',icon: UserPlus },
        { isHeader: true, label: 'CHẤM CÔNG' },
        { id: 'attendance-management', label: 'Quản lý chấm công', icon: Clock },
        { id: 'team-timesheets',       label: 'Chốt công',         icon: CheckSquare },
        { id: 'attendance-report',     label: 'BC chấm công',      icon: BarChart2 },
        { isHeader: true, label: 'TIỀN LƯƠNG' },
        { id: 'payroll-processing',    label: 'Tính lương & Thuế',icon: DollarSign },
        { id: 'payroll-settings',      label: 'Cấu hình lương',   icon: Settings },
        { id: 'payroll-report',        label: 'Báo cáo lương',    icon: BarChart2 },
        { id: 'insurance-management',  label: 'Bảo hiểm xã hội',  icon: Shield },
    ],
    Accountant: [
        { id: 'payroll-processing', label: 'Tính lương & Thuế', icon: DollarSign },
        { id: 'payroll-report',     label: 'Báo cáo lương',     icon: BarChart2 },
    ],
    Admin: [
        { id: 'me',                 label: 'Hồ sơ',              icon: UserCircle },
        { id: 'employees',          label: 'Nhân viên',           icon: Users },
        { id: 'admin-contracts',    label: 'Quản lý Hợp đồng',   icon: FileSpreadsheet },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca',     icon: ArrowLeftRight },
        { id: 'admin-roles',        label: 'Quản lý Tài khoản',  icon: UserPlus },
        { id: 'payroll-processing', label: 'Tính lương & Thuế',  icon: DollarSign },
        { id: 'admin-system',       label: 'Cấu hình hệ thống',  icon: Settings },
    ],
};

export default function Sidebar({ user, activeTab, onTabChange, sidebarOpen, onClose, onLogout, hasUnsignedContract }) {
    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const menuItems = ROLE_MENUS[primaryRole] || ROLE_MENUS.Employee;
    const { isMobile, isTablet } = useBreakpoint();

    // On mobile: fully hidden unless sidebarOpen (overlay drawer)
    // On tablet/desktop: toggle between full (192px) and icon-only (64px)
    const isIconOnly = isTablet ? !sidebarOpen : (!isMobile && !sidebarOpen);
    const isHidden = false; // We use CSS transform/width to handle visibility/collapse

    if (isHidden) return (
        <>
            {/* Backdrop when open on mobile — won't render since sidebar is hidden, but keep for safety */}
        </>
    );

    return (
        <>
            {/* Mobile overlay backdrop */}
            {isMobile && sidebarOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15, 10, 30, 0.55)',
                        backdropFilter: 'blur(3px)',
                        zIndex: 40,
                    }}
                />
            )}

            <nav
                className={isIconOnly ? 'sidebar-icon-only' : ''}
                style={{
                    width: isMobile ? '240px' : (isIconOnly ? '64px' : '192px'),
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border)',
                    transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
                    overflow: 'hidden',
                    // Mobile: fixed drawer
                    ...(isMobile ? {
                        position: 'fixed',
                        insetY: 0,
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 50,
                        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                        transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
                    } : {}),
                }}
            >
                {/* Mobile: header with close button */}
                {isMobile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 16px 12px',
                        borderBottom: '1px solid var(--border)',
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Menu
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '8px', borderRadius: 'var(--r-md)',
                                border: 'none', background: 'transparent',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                                minHeight: '44px', minWidth: '44px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Nav items */}
                <div 
                    className="sidebar-items-container"
                    style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '8px 0', 
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isIconOnly ? '4px' : '0px'
                    }}
                >
                    {/* Animated active highlight */}
                    {(() => {
                        const activeIndex = menuItems.findIndex(item => item.id === activeTab);
                        if (activeIndex === -1) return null;

                        // Dimensions matching CSS/Inline styles
                        const itemHeight = isMobile ? 48 : (isIconOnly ? 48 : 38);
                        const itemGap = isIconOnly ? 4 : 0; 
                        const containerPadding = 8;
                        
                        let offset = 0;
                        for (let i = 0; i < activeIndex; i++) {
                            if (menuItems[i].isHeader) {
                                offset += isIconOnly ? 16 : 32;
                            } else {
                                offset += itemHeight + itemGap;
                            }
                        }
                        
                        const indicatorTop = containerPadding + offset;

                        return (
                            <>
                                <div style={{
                                    position: 'absolute', 
                                    left: '8px', 
                                    right: '8px', 
                                    top: indicatorTop,
                                    height: `${itemHeight}px`, 
                                    background: 'var(--accent-subtle)',
                                    borderRadius: 'var(--r-md)',
                                    transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                    opacity: 1,
                                    pointerEvents: 'none', zIndex: 0,
                                }} />
                                {!isIconOnly && (
                                    <div style={{
                                        position: 'absolute', left: 0, top: indicatorTop,
                                        width: '3px', height: `${itemHeight}px`,
                                        background: 'var(--accent)', borderRadius: '0 4px 4px 0',
                                        boxShadow: '0 0 10px var(--accent-light)',
                                        transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                        opacity: 1,
                                        pointerEvents: 'none', zIndex: 1,
                                    }} />
                                )}
                            </>
                        );
                    })()}

                    {menuItems.map((item, index) => {
                        if (item.isHeader) {
                            return !isIconOnly ? (
                                <div key={`header-${index}`} style={{
                                    height: '32px',
                                    padding: '12px 16px 4px 16px',
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    color: 'var(--text-secondary)',
                                    opacity: 0.6,
                                    letterSpacing: '0.05em',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    textTransform: 'uppercase'
                                }}>
                                    {item.label}
                                </div>
                            ) : (
                                <div key={`header-${index}`} style={{ height: '16px' }} />
                            );
                        }

                        const active = activeTab === item.id;
                        const isBlocked = hasUnsignedContract
                            && primaryRole === 'Employee'
                            && item.id !== 'my-contract'
                            && item.id !== 'me';

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (!isBlocked) {
                                        onTabChange(item.id);
                                        if (isMobile) onClose();
                                    }
                                }}
                                disabled={isBlocked}
                                title={isBlocked ? 'Vui lòng ký hợp đồng trước' : item.label}
                                data-label={item.label}
                                className={`nav-item ${active ? 'active' : ''}`}
                                style={{
                                    ...(isBlocked ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
                                    ...(isMobile ? { height: '48px', fontSize: '14px' } : {}),
                                }}
                            >
                                <item.icon
                                    style={{
                                        width: '16px', height: '16px', flexShrink: 0,
                                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                    }}
                                />
                                {!isIconOnly && (
                                    <span className="nav-label" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {item.label}
                                    </span>
                                )}
                                {isBlocked && !isIconOnly && (
                                    <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer — hidden on icon-only mode */}
                {!isIconOnly && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                        <button
                            onClick={onLogout}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 16px',
                                border: 'none',
                                background: 'transparent',
                                color: '#EF4444',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <LogOut size={16} />
                            <span>Đăng xuất</span>
                        </button>
                        
                        <div className="nav-footer-text" style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', opacity: 0.8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>Backend Online</span>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
