import React from 'react';
import {
    UserCircle, Clock, Umbrella, Calendar, ArrowLeftRight,
    DollarSign, FileSpreadsheet, Shield, Users, BarChart2,
    UserPlus, Settings, Activity, X, CheckSquare
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
        { id: 'me',              label: 'Hồ sơ',        icon: UserCircle },
        { id: 'employees',       label: 'Nhân viên',    icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
    ],
    DepartmentManager: [
        { id: 'me',              label: 'Hồ sơ',        icon: UserCircle },
        { id: 'employees',       label: 'Nhân viên',    icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
        { id: 'team-timesheets', label: 'Chốt công',    icon: Activity },
    ],
    CnbSpecialist: [
        { id: 'employees',             label: 'Nhân viên',         icon: Users },
        { id: 'attendance-management', label: 'Quản lý chấm công', icon: Clock },
        { id: 'attendance-report',     label: 'BC chấm công',      icon: BarChart2 },
        { id: 'insurance-management',  label: 'Bảo hiểm xã hội',  icon: Shield },
        { id: 'admin-contracts',       label: 'Quản lý hợp đồng', icon: FileSpreadsheet },
        { id: 'admin-roles',           label: 'Quản lý tài khoản',icon: UserPlus },
        { id: 'payroll-processing',    label: 'Tính lương & Thuế',icon: DollarSign },
        { id: 'payroll-settings',      label: 'Cấu hình lương',   icon: Settings },
        { id: 'payroll-report',        label: 'Báo cáo lương',    icon: BarChart2 },
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

export default function Sidebar({ user, activeTab, onTabChange, sidebarOpen, onClose, hasUnsignedContract }) {
    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const menuItems = ROLE_MENUS[primaryRole] || ROLE_MENUS.Employee;
    const { isMobile, isTablet } = useBreakpoint();

    // On mobile: fully hidden unless sidebarOpen (overlay drawer)
    // On tablet: icon-only (64px), always visible
    // On desktop: full sidebar (192px), always visible

    const isIconOnly = isTablet;
    const isHidden = isMobile && !sidebarOpen;

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
                    width: isMobile ? '240px' : isTablet ? '64px' : '192px',
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
                <div style={{ flex: 1, overflowY: 'auto', padding: isIconOnly ? '8px 0' : '8px 0', position: 'relative' }}>
                    {/* Animated active highlight — only on full sidebar */}
                    {!isIconOnly && (() => {
                        const activeIndex = menuItems.findIndex(item => item.id === activeTab);
                        return (
                            <>
                                <div style={{
                                    position: 'absolute', left: '8px', right: '8px', top: 8,
                                    height: '38px', background: 'var(--accent-subtle)',
                                    borderRadius: 'var(--r-md)',
                                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                    transform: `translateY(${activeIndex * 38}px)`,
                                    opacity: activeIndex === -1 ? 0 : 1,
                                    pointerEvents: 'none', zIndex: 0,
                                }} />
                                <div style={{
                                    position: 'absolute', left: 0, top: 8,
                                    width: '3px', height: '38px',
                                    background: 'var(--accent)', borderRadius: '0 4px 4px 0',
                                    boxShadow: '0 0 10px var(--accent-light)',
                                    transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)',
                                    transform: `translateY(${activeIndex * 38}px)`,
                                    opacity: activeIndex === -1 ? 0 : 1,
                                    pointerEvents: 'none', zIndex: 1,
                                }} />
                            </>
                        );
                    })()}

                    {menuItems.map((item) => {
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
                    <div className="nav-footer-text" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>Backend Online</span>
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
}
