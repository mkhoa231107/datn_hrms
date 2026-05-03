import React from 'react';
import {
    UserCircle, Clock, Umbrella, Calendar, ArrowLeftRight,
    DollarSign, FileSpreadsheet, Shield, Users, BarChart2,
    UserPlus, Settings, Activity, CheckSquare,
} from 'lucide-react';

// Role → bottom nav shortcut (max 5 items)
const BOTTOM_NAV_ITEMS = {
    Employee: [
        { id: 'me',           label: 'Hồ sơ',     icon: UserCircle },
        { id: 'attendance',   label: 'Chấm công',  icon: Clock },
        { id: 'leave',        label: 'Nghỉ phép',  icon: Umbrella },
        { id: 'my-schedule',  label: 'Lịch ca',    icon: Calendar },
        { id: 'my-payslip',   label: 'Lương',      icon: DollarSign },
    ],
    DepartmentHead: [
        { id: 'me',              label: 'Hồ sơ',      icon: UserCircle },
        { id: 'employees',       label: 'Nhân viên',  icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn',  icon: CheckSquare },
        { id: 'team-shift-approvals', label: 'Đổi ca', icon: ArrowLeftRight },
        { id: 'dept-activities', label: 'Hoạt động',  icon: Activity },
    ],
    DepartmentManager: [
        { id: 'me',              label: 'Hồ sơ',      icon: UserCircle },
        { id: 'employees',       label: 'Nhân viên',  icon: Users },
        { id: 'dept-leaves',     label: 'Duyệt đơn',  icon: CheckSquare },
        { id: 'team-timesheets', label: 'Chốt công',  icon: Activity },
        { id: 'dept-activities', label: 'Hoạt động',  icon: Activity },
    ],
    CnbSpecialist: [
        { id: 'employees',             label: 'Nhân sự',    icon: Users },
        { id: 'attendance-management', label: 'Chấm công',  icon: Clock },
        { id: 'payroll-processing',    label: 'Lương',      icon: DollarSign },
        { id: 'insurance-management',  label: 'Bảo hiểm',  icon: Shield },
        { id: 'admin-roles',           label: 'Tài khoản',  icon: UserPlus },
    ],
    Accountant: [
        { id: 'payroll-processing', label: 'Tính lương', icon: DollarSign },
        { id: 'payroll-report',     label: 'Báo cáo',    icon: BarChart2 },
    ],
    Admin: [
        { id: 'me',                 label: 'Hồ sơ',     icon: UserCircle },
        { id: 'employees',          label: 'Nhân viên',  icon: Users },
        { id: 'payroll-processing', label: 'Lương',      icon: DollarSign },
        { id: 'admin-roles',        label: 'Tài khoản',  icon: UserPlus },
        { id: 'admin-system',       label: 'Hệ thống',   icon: Settings },
    ],
};

export default function BottomNav({ primaryRole, activeTab, onTabChange, hasUnsignedContract }) {
    const items = BOTTOM_NAV_ITEMS[primaryRole] || BOTTOM_NAV_ITEMS.Employee;

    return (
        <nav
            aria-label="Bottom navigation"
            style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 60,
                height: 'calc(56px + env(safe-area-inset-bottom))',
                paddingBottom: 'env(safe-area-inset-bottom)',
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'stretch',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
            }}
        >
            {items.map((item) => {
                const isActive = activeTab === item.id;
                const isBlocked = hasUnsignedContract
                    && primaryRole === 'Employee'
                    && item.id !== 'my-contract'
                    && item.id !== 'me';

                return (
                    <button
                        key={item.id}
                        onClick={() => !isBlocked && onTabChange(item.id)}
                        disabled={isBlocked}
                        aria-label={item.label}
                        aria-current={isActive ? 'page' : undefined}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            border: 'none',
                            background: 'transparent',
                            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                            opacity: isBlocked ? 0.4 : 1,
                            cursor: isBlocked ? 'not-allowed' : 'pointer',
                            minHeight: '44px',
                            position: 'relative',
                            transition: 'color 0.2s ease',
                            padding: '4px 2px 0',
                        }}
                    >
                        {/* Active indicator dot */}
                        {isActive && (
                            <span style={{
                                position: 'absolute',
                                top: '6px',
                                width: '4px',
                                height: '4px',
                                borderRadius: '50%',
                                background: 'var(--accent)',
                            }} />
                        )}
                        <item.icon
                            size={20}
                            strokeWidth={isActive ? 2.5 : 1.8}
                        />
                        <span style={{
                            fontSize: '10px',
                            fontWeight: isActive ? 700 : 500,
                            letterSpacing: '0.02em',
                            lineHeight: 1,
                        }}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </nav>
    );
}
