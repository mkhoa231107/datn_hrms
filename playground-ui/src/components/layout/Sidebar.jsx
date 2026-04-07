import React from 'react';
import {
    UserCircle, Clock, Umbrella, FileText,
    Users, Calendar, CheckSquare, BarChart2,
     DollarSign, FileSpreadsheet, Shield,
    UserPlus, Settings, ChevronRight, Activity, Briefcase, Camera
} from 'lucide-react';

// Role label và màu badge tiếng Việt
export const ROLE_META = {
    Admin: { label: 'Quản trị viên', color: 'bg-rose-500', light: 'bg-rose-50 text-rose-700 border border-rose-200' },
    HrAdmin: { label: 'HR Admin', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 border border-purple-200' },
    DepartmentManager: { label: 'Trưởng phòng', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border border-amber-200' },
    DepartmentHead: { label: 'Trưởng bộ phận', color: 'bg-sky-500', light: 'bg-sky-50 text-sky-700 border border-sky-200' },
    Employee: { label: 'Nhân viên', color: 'bg-slate-400', light: 'bg-slate-100 text-slate-600 border border-slate-200' },
};

// Returns the primary role for a user (first recognized role)
export function getPrimaryRole(roles = []) {
    const PRIORITY = ['Admin', 'HrAdmin', 'DepartmentManager', 'DepartmentHead', 'Employee'];
    return PRIORITY.find(r => roles.includes(r)) || 'Employee';
}

/**
 * Defines all navigation items with role-based visibility.
 * showFor: array of roles that CAN see this item. Empty means all.
 */
function getMenuItems(primaryRole) {
    const isAdmin = primaryRole === 'Admin' || primaryRole === 'HrAdmin';
    const employeeRoles = ['DepartmentManager', 'DepartmentHead', 'Employee'];

    const MENUS = {
        personal: {
            label: 'Cá nhân',
            items: [
                { id: 'me', label: 'Hồ sơ của tôi', icon: UserCircle, showFor: employeeRoles },
                { id: 'attendance', label: 'Chấm công', icon: Clock, showFor: ['Employee'] },
                { id: 'leave', label: 'Đơn từ & Nghỉ phép', icon: Umbrella, showFor: ['Employee', 'DepartmentHead'] },
                { id: 'time-adjustment', label: 'Yêu cầu điều chỉnh', icon: FileText, showFor: employeeRoles },
                { id: 'my-contract', label: 'Hợp đồng lao động', icon: FileText, showFor: ['Employee', 'DepartmentHead'] },
                { id: 'my-schedule', label: 'Lịch ca của tôi', icon: Calendar, showFor: ['Employee', 'DepartmentHead'] },
                { id: 'my-payslip', label: 'Bảng lương', icon: DollarSign, showFor: ['Employee', 'DepartmentHead'] },
            ]
        },
        // ─── Tổ trưởng ────────────────────────────────────────────────────
        team: {
            label: 'Quản lý Bộ phận',
            items: [
                { id: 'team-timesheets', label: primaryRole === 'DepartmentManager' ? 'Chốt công Bộ phận' : 'Công Bộ phận', icon: Activity, showFor: ['DepartmentHead', 'DepartmentManager'] },
                { id: 'team-schedule', label: 'Xếp ca Bộ phận', icon: Calendar, showFor: ['DepartmentHead'] },
                { id: 'team-leaves', label: 'Duyệt đơn Bộ phận', icon: Umbrella, showFor: ['DepartmentHead'] },
                { id: 'team-contracts', label: 'Duyệt hợp đồng', icon: FileText, showFor: ['DepartmentHead'] },
            ]
        },
        // ─── Trưởng phòng ─────────────────────────────────────────────────
        department: {
            label: 'Quản lý Phòng ban',
            items: [
                { id: 'employees', label: 'Nhân viên bộ phận', icon: Users, showFor: ['DepartmentManager', 'DepartmentHead'] },
                { id: 'dept-activities', label: 'Hoạt động bộ phận', icon: BarChart2, showFor: ['DepartmentManager', 'DepartmentHead'] },
                { id: 'dept-leaves', label: 'Phê duyệt đơn nghỉ', icon: FileText, showFor: ['DepartmentManager'] },
                { id: 'dept-contracts', label: 'Phê duyệt HĐLĐ', icon: FileText, showFor: ['DepartmentManager'] },
            ]
        },

        // ─── Admin / HrAdmin ──────────────────────────────────────────────
        admin: {
            label: 'Quản trị',
            items: [
                { id: 'employees', label: 'Quản lý nhân viên', icon: Users, showFor: ['Admin'] },
                { id: 'add-employee', label: 'Thêm nhân viên', icon: UserPlus, showFor: ['Admin'] },
                { id: 'admin-contracts', label: 'Quản lý HĐLĐ', icon: FileText, showFor: ['Admin', 'DepartmentManager'] },
                { id: 'face-registration', label: 'Quét khuôn mặt', icon: Camera, showFor: ['Admin'] },
                { id: 'admin-roles', label: 'Phân quyền User', icon: Shield, showFor: ['Admin'] },
                { id: 'admin-system', label: 'Cấu hình hệ thống', icon: Settings, showFor: ['Admin'] },
                { id: 'payroll-processing', label: primaryRole === 'Admin' ? 'Xem bảng lương' : 'Xử lý lương & C&B', icon: DollarSign, showFor: ['Admin', 'DepartmentHead'] },
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
    const menuGroups = getMenuItems(primaryRole).map(group => ({
        ...group,
        items: group.items.filter(item => {
            if (item.id === 'payroll-processing') {
                if (primaryRole === 'Admin') return true;
                if (primaryRole === 'DepartmentHead' && user?.departmentId === 7) return true;
                return false;
            }
            return true;
        })
    })).filter(group => group.items.length > 0);

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
