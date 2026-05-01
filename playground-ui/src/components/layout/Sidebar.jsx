import React from 'react';
import {
    UserCircle, Clock, Umbrella, Calendar, ArrowLeftRight,
    DollarSign, FileSpreadsheet, Shield, Users, BarChart2,
    UserPlus, Settings, Activity, X, CheckSquare
} from 'lucide-react';

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
        { id: 'ot-assignment',   label: 'Tăng ca',      icon: Calendar },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
    ],
    DepartmentManager: [
        { id: 'me',              label: 'Hồ sơ',        icon: UserCircle },
        { id: 'employees',       label: 'Nhân viên',    icon: Users },
        { id: 'ot-planning',     label: 'Kế hoạch OT',  icon: BarChart2 },
        { id: 'dept-leaves',     label: 'Duyệt đơn BP', icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Duyệt đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động PB', icon: Activity },
        { id: 'team-timesheets', label: 'Chốt công',    icon: Activity },
    ],
    CnbSpecialist: [
        { id: 'employees',             label: 'Nhân viên',         icon: Users },
        { id: 'attendance-management', label: 'Quản lý chấm công', icon: Clock },
        { id: 'insurance-management',  label: 'Bảo hiểm xã hội',  icon: Shield },
        { id: 'admin-contracts',       label: 'Quản lý hợp đồng', icon: FileSpreadsheet },
        { id: 'team-shift-approvals',  label: 'Duyệt đổi ca',     icon: ArrowLeftRight },
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
    const meta = ROLE_META[primaryRole] || ROLE_META.Employee;
    const menuItems = ROLE_MENUS[primaryRole] || ROLE_MENUS.Employee;

    return (
        <>
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={onClose}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(15, 10, 30, 0.5)',
                        backdropFilter: 'blur(2px)',
                        zIndex: 40,
                    }}
                    className="lg:hidden"
                />
            )}

            <nav
                style={{
                    width: '192px',
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-surface)',
                    borderRight: '1px solid var(--border)',
                    transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
                className={`
                    fixed inset-y-0 left-0 z-50
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0 lg:static lg:z-auto
                `}
            >
                {/* Mobile close */}
                <div
                    className="lg:hidden flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Menu
                    </span>
                    <button
                        onClick={onClose}
                        style={{ padding: '4px', borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>


                {/* Nav items */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', position: 'relative' }}>
                    {/* Animated Indicators */}
                    {(() => {
                        const activeIndex = menuItems.findIndex(item => item.id === activeTab);
                        return (
                            <>
                                {/* Floating highlight background */}
                                <div style={{
                                    position: 'absolute',
                                    left: '8px',
                                    right: '8px',
                                    top: 8,
                                    height: '38px',
                                    background: 'var(--accent-subtle)',
                                    borderRadius: 'var(--r-md)',
                                    transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: `translateY(${activeIndex * 38}px)`,
                                    opacity: activeIndex === -1 ? 0 : 1,
                                    pointerEvents: 'none',
                                    zIndex: 0,
                                }} />
                                {/* Vertical indicator bar */}
                                <div style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 8,
                                    width: '3px',
                                    height: '38px',
                                    background: 'var(--accent)',
                                    borderRadius: '0 4px 4px 0',
                                    boxShadow: '0 0 10px var(--accent-light)',
                                    transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    transform: `translateY(${activeIndex * 38}px)`,
                                    opacity: activeIndex === -1 ? 0 : 1,
                                    pointerEvents: 'none',
                                    zIndex: 1,
                                }} />
                            </>
                        );
                    })()}

                    {menuItems.map((item, idx) => {
                        const active = activeTab === item.id;
                        const isBlocked = hasUnsignedContract
                            && primaryRole === 'Employee'
                            && item.id !== 'my-contract'
                            && item.id !== 'me';

                        return (
                            <button
                                key={item.id}
                                onClick={() => !isBlocked && onTabChange(item.id)}
                                disabled={isBlocked}
                                title={isBlocked ? 'Vui lòng ký hợp đồng trước' : item.label}
                                className={`nav-item ${active ? 'active' : ''}`}
                                style={{
                                    ...(isBlocked ? {
                                        opacity: 0.4,
                                        cursor: 'not-allowed',
                                    } : {}),
                                }}
                            >
                                <item.icon
                                    style={{
                                        width: '14px', height: '14px', flexShrink: 0,
                                        color: active ? 'var(--accent)' : 'var(--text-secondary)',
                                    }}
                                />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.label}
                                </span>
                                {isBlocked && (
                                    <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: '#D97706', flexShrink: 0 }} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 500 }}>Backend Online</span>
                    </div>
                </div>
            </nav>
        </>
    );
}
