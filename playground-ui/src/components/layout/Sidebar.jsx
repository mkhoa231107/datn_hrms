import React from 'react';
import {
    UserCircle, Clock, Umbrella, FileText,
    Users, Calendar, CheckSquare, BarChart2,
     DollarSign, FileSpreadsheet, Shield,
    UserPlus, Settings, ChevronRight, Activity, Camera
} from 'lucide-react';

// Role label và màu badge tiếng Việt
export const ROLE_META = {
    Admin: { label: 'Quản trị viên', color: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border border-rose-200' },
    DepartmentManager: { label: 'Trưởng phòng', color: 'bg-indigo-600', light: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
    DepartmentHead: { label: 'Trưởng bộ phận', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border border-amber-200' },
    Accountant: { label: 'Kế toán', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    CnbSpecialist: { label: 'Chuyên viên C&B', color: 'bg-teal-500', light: 'bg-teal-50 text-teal-700 border border-teal-200' },
    Employee: { label: 'Nhân viên / Công nhân', color: 'bg-slate-500', light: 'bg-slate-50 text-slate-700 border border-slate-200' },
};

export function getPrimaryRole(roles = []) {
    const PRIORITY = ['Admin', 'Accountant', 'CnbSpecialist', 'DepartmentManager', 'DepartmentHead', 'Employee'];
    return PRIORITY.find(r => roles.includes(r)) || 'Employee';
}

/**
 * Defines all navigation items with role-based visibility.
 * showFor: array of roles that CAN see this item. Empty means all.
 */
function getMenuItems(primaryRole) {
    const isAdmin = primaryRole === 'Admin';
    const isDeptMgr = primaryRole === 'DepartmentManager';
    const isDeptHead = primaryRole === 'DepartmentHead';

    const MENUS = {
        personal: {
            label: 'Cá nhân',
            items: [
                { id: 'me', label: 'Hồ sơ của tôi', icon: UserCircle, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Admin', 'Accountant', 'CnbSpecialist'] },
                { id: 'attendance', label: 'Chấm công', icon: Clock, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Accountant', 'CnbSpecialist'] },
                { id: 'my-ot-schedule', label: 'Lịch tăng ca', icon: Calendar, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Accountant', 'CnbSpecialist'] },
                { id: 'leave', label: 'Đơn từ & Nghỉ phép', icon: Umbrella, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Accountant', 'CnbSpecialist'] },
                { id: 'my-contract', label: 'Hợp đồng lao động', icon: FileSpreadsheet, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Accountant', 'CnbSpecialist'] },
                { id: 'my-payslip', label: 'Bảng lương', icon: DollarSign, showFor: ['Employee', 'DepartmentHead', 'DepartmentManager', 'Accountant', 'CnbSpecialist'] },
            ]
        },
        // ─── Team Leader (Tổ trưởng) ─────────────────────────
        team: {
            label: 'Quản lý Bộ phận',
            items: [
                { id: 'ot-assignment', label: 'Đề cử Tăng ca', icon: Calendar, showFor: ['DepartmentHead'] },
                { id: 'team-timesheets', label: 'Công bộ phận', icon: Activity, showFor: ['DepartmentManager', 'Admin'] },
                { id: 'team-schedule', label: 'Xếp ca bộ phận', icon: Calendar, showFor: ['DepartmentHead', 'Admin'] },
                { id: 'team-leaves', label: 'Duyệt đơn bộ phận', icon: CheckSquare, showFor: ['DepartmentHead', 'DepartmentManager', 'Admin'] },
            ]
        },
        // ─── Management (Trưởng phòng / Trưởng bộ phận) ───────────────────
        management: {
            label: 'Quản lý Điều hành',
            items: [
                { id: 'ot-planning', label: 'Kế hoạch OT', icon: BarChart2, showFor: ['DepartmentManager', 'CnbSpecialist'] },
                { id: 'employees', label: 'Nhân sự quản lý', icon: Users, showFor: ['DepartmentManager', 'DepartmentHead', 'CnbSpecialist'] },
                { id: 'dept-activities', label: 'Báo cáo hoạt động', icon: Activity, showFor: ['DepartmentManager', 'DepartmentHead'] },
                { id: 'dept-leaves', label: 'Phê duyệt nghỉ phép', icon: FileSpreadsheet, showFor: ['DepartmentManager', 'DepartmentHead', 'CnbSpecialist'] },
            ]
        },
        // ─── HR Management (C&B) ─────────────────────────────
        hr: {
            label: 'Nhân sự',
            items: [
                { id: 'attendance-management', label: 'Quản lý chấm công', icon: Activity, showFor: ['CnbSpecialist'] },
                { id: 'insurance-management', label: 'Bảo hiểm xã hội', icon: Shield, showFor: ['CnbSpecialist'] },
                { id: 'admin-contracts', label: 'Quản lý Hợp đồng', icon: FileSpreadsheet, showFor: ['CnbSpecialist'] },
                { id: 'admin-roles', label: 'Quản lý Tài khoản', icon: UserPlus, showFor: ['CnbSpecialist'] },
            ]
        },
        // ─── Payroll Management (C&B Specialist) ─────────────────────────────
        payroll: {
            label: 'Tiền lương',
            items: [
                { id: 'payroll-processing', label: 'Tính lương & Thuế', icon: DollarSign, showFor: ['CnbSpecialist', 'Admin'] },
                { id: 'payroll-settings', label: 'Cấu hình lương', icon: Settings, showFor: ['CnbSpecialist', 'Admin'] },
                { id: 'payroll-report', label: 'Báo cáo lương', icon: BarChart2, showFor: ['Accountant', 'CnbSpecialist', 'Admin'] },
            ]
        },
        // ─── System Admin ─────────────────────────────
        admin: {
            label: 'Hệ thống',
            items: [
                { id: 'admin-system', label: 'Cấu hình tham số', icon: Settings, showFor: ['Admin'] },
                { id: 'barcode-attendance', label: 'Điểm danh mã vạch', icon: Camera, showFor: ['Admin'] },
            ]
        }
    };

    // Filter each group: only include items visible to this role
    return Object.entries(MENUS)
        .map(([key, group]) => ({
            ...group,
            key,
            items: group.items.filter(item => item.showFor.includes(primaryRole))
        }))
        .filter(group => group.items.length > 0);
}

export default function Sidebar({ user, activeTab, onTabChange, sidebarOpen, onClose, hasUnsignedContract, hidden }) {
    const roles = user?.roles || [];
    const primaryRole = getPrimaryRole(roles);
    const roleMeta = ROLE_META[primaryRole] || ROLE_META.Employee;
    const menuGroups = getMenuItems(primaryRole);


    return (
        <nav className={`
            fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-slate-100 bg-white/95 backdrop-blur-md overflow-y-auto
            transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:bg-white/50
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${hidden ? 'lg:hidden' : 'lg:flex'}
        `}>
            {/* Header/Role Indicator */}
            <div className="px-4 pt-5 pb-3 relative">
                <div className={`px-3 py-2 rounded-xl flex items-center gap-3 ${roleMeta.color} text-white shadow-sm`}>
                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold shrink-0">
                        {(user?.fullName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 pr-6">
                        <p className="text-xs font-bold truncate">{user?.fullName || '—'}</p>
                        <p className="text-[10px] opacity-80 font-medium truncate">{roleMeta.label}</p>
                    </div>
                </div>
            </div>

            {/* Menu groups */}
            <div className="flex-1 px-3 space-y-1 pb-4">
                {menuGroups.map(group => (
                    <div key={group.key} className="pt-3">
                        <div className="px-3 pb-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                            {group.label}
                        </div>
                        <div className="space-y-0.5">
                            {group.items.map(item => {
                                const active = activeTab === item.id;
                                // Only Employee role is blocked for unsigned contracts
                                const isBlocked = hasUnsignedContract && primaryRole === 'Employee' && item.id !== 'my-contract' && item.id !== 'me';
                                
                                return (
                                    <button
                                        key={item.id + group.key}
                                        onClick={() => !isBlocked && onTabChange(item.id)}
                                        disabled={isBlocked}
                                        className={`
                                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 font-medium text-sm group
                                            ${active
                                                ? `${roleMeta.color} text-white shadow-md`
                                                : isBlocked
                                                    ? 'opacity-40 cursor-not-allowed text-slate-300'
                                                    : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'}
                                        `}
                                    >
                                        <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : isBlocked ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-600'}`} />
                                        <span className="truncate">{item.label}</span>
                                        {active && <ChevronRight className="w-3 h-3 ml-auto text-white/70 shrink-0" />}
                                        {isBlocked && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400" title="Cần ký hợp đồng" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer badge */}
            <div className="px-4 py-3 border-t border-slate-100">
                <div className="bg-white rounded-lg p-3 border border-slate-100 shadow-sm text-center">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">Playground v2</p>
                    <div className="flex justify-center items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-[10px] text-slate-500 font-medium truncate">Backend Online</span>
                    </div>
                </div>
            </div>
        </nav>
    );
}
