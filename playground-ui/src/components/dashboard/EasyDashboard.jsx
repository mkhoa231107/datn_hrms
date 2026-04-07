import React, { useState } from 'react';
import './EasyDashboard.css';
import { 
    Settings, UserCircle, Clock, Umbrella, 
    Calendar, CheckSquare, Activity, Search,
    FileText, FileSpreadsheet, Shield, DollarSign, Users, BarChart2, Briefcase
} from 'lucide-react';
import { getPrimaryRole } from '../layout/Sidebar';

const ROLE_MODULES = {
    Admin: [
        { id: 'admin-system',         label: 'Hệ thống',    icon: Settings,      color: 'module-blue' },
        { id: 'employees',            label: 'Nhân viên',    icon: Users,         color: 'module-rose' },
        { id: 'daily-attendance',     label: 'Quản lý Công', icon: Clock,         color: 'module-amber' },
        { id: 'admin-contracts',      label: 'Quản lý HĐLĐ', icon: FileText,      color: 'module-indigo' },
        { id: 'face-registration',    label: 'Đăng ký khuôn mặt', icon: Activity,  color: 'module-teal' },
        { id: 'admin-roles',          label: 'Phân quyền user', icon: Shield,      color: 'module-violet' },
        { id: 'payroll-processing',   label: 'Tính lương',  icon: DollarSign,    color: 'module-rose' },
    ],
    DepartmentHead: [
        { id: 'admin-system',    label: 'Hệ thống',   icon: Settings,     color: 'module-blue' },
        { id: 'me',              label: 'Hồ sơ',      icon: UserCircle,   color: 'module-orange' },
        { id: 'attendance',      label: 'Chấm công',  icon: Clock,        color: 'module-rose' },
        { id: 'leave',           label: 'Đơn từ',     icon: Umbrella,     color: 'module-amber' },
        { id: 'team-schedule',   label: 'Xếp ca',     icon: Calendar,     color: 'module-cyan' },
        { id: 'team-leaves',     label: 'Duyệt đơn',  icon: CheckSquare,  color: 'module-violet' },
        { id: 'team-timesheets', label: 'Duyệt công', icon: Activity,     color: 'module-teal' },
        { id: 'payroll-processing', label: 'Tính lương', icon: DollarSign, color: 'module-rose' },
        { id: 'insurance-management', label: 'Bảo hiểm', icon: Shield,     color: 'module-violet' },
    ],
    DepartmentManager: [
        { id: 'admin-system',         label: 'Hệ thống',     icon: Settings,        color: 'module-blue' },
        { id: 'me',                   label: 'Hồ sơ',        icon: UserCircle,      color: 'module-orange' },
        { id: 'employees',            label: 'Nhân viên',    icon: Users,           color: 'module-rose' },
        { id: 'dept-leaves',          label: 'Duyệt đơn',    icon: FileText,        color: 'module-amber' },
        { id: 'dept-activities',      label: 'Hoạt động PB', icon: BarChart2,       color: 'module-indigo' },
        { id: 'dept-contracts',       label: 'Duyệt HĐLĐ',  icon: FileSpreadsheet, color: 'module-cyan' },
        { id: 'team-timesheets',      label: 'Duyệt công',   icon: Activity,        color: 'module-teal' },
        { id: 'payroll-processing',   label: 'Tính lương',  icon: DollarSign,      color: 'module-rose' },
        { id: 'insurance-management', label: 'Bảo hiểm',    icon: Shield,          color: 'module-violet' },
    ],
    Employee: [
        { id: 'admin-system', label: 'Hệ thống',   icon: Settings,      color: 'module-blue' },
        { id: 'me',           label: 'Hồ sơ',       icon: UserCircle,    color: 'module-orange' },
        { id: 'attendance',   label: 'Chấm công',   icon: Clock,         color: 'module-rose' },
        { id: 'my-schedule',  label: 'Lịch ca',     icon: Calendar,      color: 'module-cyan' },
        { id: 'leave',        label: 'Đơn từ',      icon: Umbrella,      color: 'module-amber' },
        { id: 'my-payslip',   label: 'Bảng lương',  icon: DollarSign,    color: 'module-teal' },
        { id: 'my-insurance', label: 'Bảo hiểm',    icon: Shield,        color: 'module-violet' },
        { id: 'my-contract',  label: 'Hợp đồng',    icon: FileText,      color: 'module-indigo' },
    ],
};

export default function EasyDashboard({ user, onModuleClick }) {
    const [hoveredId, setHoveredId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 8;

    React.useEffect(() => {
        setCurrentPage(0);
    }, [searchQuery]);

    const primaryRole = getPrimaryRole(user?.roles);
    const modules = (ROLE_MODULES[primaryRole] || ROLE_MODULES.Employee).map(m => {
        // Dynamic label for Admin
        if (m.id === 'payroll-processing' && primaryRole === 'Admin') {
            return { ...m, label: 'Xem bảng lương' };
        }
        return m;
    }).filter(m => {
        // Special: Payroll is for Admin or C&B Dept Head (Dept 7)
        if (m.id === 'payroll-processing') {
            if (primaryRole === 'Admin') return true;
            if (primaryRole === 'DepartmentHead' && user?.departmentId === 7) return true;
            return false;
        }
        return true;
    });
    const filtered = modules.filter(m =>
        m.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const pageCount = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const displayedModules = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

    return (
        <div className="easy-dashboard-container animate-in fade-in duration-700">
            {/* Background Decorations */}
            <div className="bg-decoration-1"></div>
            <div className="bg-decoration-2"></div>

            <div className="dashboard-content">
                {/* Search Bar */}
                <div className="search-section">
                    <div className="search-wrapper">
                        <Search className="search-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm ứng dụng"
                            className="search-input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Modules Grid */}
                <div className="modules-grid-wrapper">
                    <div className="modules-grid">
                        {displayedModules.map((module) => (
                            <button
                                key={module.id}
                                className={`module-card ${hoveredId === module.id ? 'is-hovered' : ''}`}
                                onClick={() => onModuleClick(module.id)}
                                onMouseEnter={() => setHoveredId(module.id)}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <div className={`module-icon-box ${module.color}`}>
                                    <module.icon size={32} strokeWidth={1.5} />
                                </div>
                                <span className="module-label">{module.label}</span>
                                {hoveredId === module.id && (
                                    <div className="module-badge">Chọn {module.label}</div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Carousel Dots */}
            {pageCount > 1 && (
                <div className="carousel-dots">
                    {[...Array(pageCount)].map((_, i) => (
                        <span 
                            key={i} 
                            className={`dot ${currentPage === i ? 'active' : ''}`}
                            onClick={() => setCurrentPage(i)}
                            style={{ cursor: 'pointer' }}
                        ></span>
                    ))}
                </div>
            )}
        </div>
    );
}
