import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { 
    LayoutDashboard, Users, Settings, Search, Filter, 
    Save, RefreshCw, TrendingUp, DollarSign, Clock, 
    UserCheck, AlertCircle, FileText, ChevronRight
} from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function AccountantDashboard({ user }) {
    const [activeSubTab, setActiveSubTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalSalary: 0,
        pendingApprovals: 0,
        averageCoefficient: 0
    });

    const [positions, setPositions] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            const [posRes, empRes, deptRes] = await Promise.all([
                api.get('/Positions'),
                api.get('/Payroll/employee-profiles'),
                api.get('/Departments')
            ]);
            
            const posData = posRes.data || [];
            const empData = empRes.data?.data || [];
            const depts = deptRes.data || [];

            setPositions(posData);
            setEmployees(empData);
            setDepartments(depts);

            // Mock stats based on data
            setStats({
                totalEmployees: empData.length,
                totalSalary: empData.reduce((acc, curr) => acc + (curr.basicSalary || 0), 0) * 26, // Estimate
                pendingApprovals: 5, // Mock
                averageCoefficient: (posData.reduce((acc, curr) => acc + (curr.defaultCoefficient || 1), 0) / (posData.length || 1)).toFixed(2)
            });
        } catch (error) {
            toast.error('Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCoefficient = async (posId, newValue) => {
        try {
            // This endpoint might need to be created in backend
            await api.put(`/Positions/${posId}/coefficient`, { coefficient: parseFloat(newValue) });
            toast.success('Cập nhật hệ số thành công');
            setPositions(prev => prev.map(p => p.id === posId ? { ...p, defaultCoefficient: newValue } : p));
        } catch (error) {
            toast.error('Lỗi khi cập nhật hệ số');
        }
    };

    const handleUpdateEmployeeProfile = async (empId, field, value) => {
        try {
            const emp = employees.find(e => e.employeeId === empId);
            let finalValue = value;
            if (['coefficient', 'insuranceSalary', 'numberOfDependents', 'actualWorkingDays', 'overtimeHours', 'paidLeaveDays', 'unpaidLeaveDays'].includes(field)) {
                finalValue = parseFloat(value) || 0;
            }
            const updated = { ...emp, [field]: finalValue };
            
            // Send only required fields for update if needed, but here we send the object
            await api.put(`/Payroll/employee-profiles/${empId}`, {
                insuranceSalary: updated.insuranceSalary,
                numberOfDependents: updated.numberOfDependents,
                coefficient: updated.coefficient
            });
            
            setEmployees(prev => prev.map(e => e.employeeId === empId ? updated : e));
            toast.success('Đã lưu thay đổi');
        } catch (error) {
            toast.error('Lỗi khi lưu thay đổi');
        }
    };

    const filteredEmployees = employees.filter(e => {
        const matchesSearch = e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesDept = deptFilter === '' || e.departmentName.includes(deptFilter);
        return matchesSearch && matchesDept;
    });

    return (
        <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <LayoutDashboard className="text-emerald-600" />
                    Bảng điều khiển Kế toán
                </h1>
                <p className="text-slate-500 text-sm">Chào mừng trở lại, quản lý tiền lương và quyết toán thuế.</p>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng nhân sự', value: stats.totalEmployees, icon: Users, color: 'bg-blue-500' },
                    { label: 'Dự chi lương', value: fmt(stats.totalSalary), icon: DollarSign, color: 'bg-emerald-500' },
                    { label: 'Hệ số TB', value: stats.averageCoefficient, icon: TrendingUp, color: 'bg-amber-500' },
                    { label: 'Chờ phê duyệt', value: stats.pendingApprovals, icon: UserCheck, color: 'bg-indigo-500' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                        <div className={`${s.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-${s.color.split('-')[1]}-200`}>
                            <s.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                            <p className="text-xl font-black text-slate-700">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area with Tabs */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden flex-1">
                {/* Custom Tab Header */}
                <div className="flex items-center px-6 border-b border-slate-100 bg-slate-50/50">
                    {[
                        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
                        { id: 'coefficients', label: 'Cấu hình hệ số', icon: Settings },
                        { id: 'allowances', label: 'Phụ cấp theo chức vụ', icon: DollarSign },
                        { id: 'employees', label: 'Dữ liệu lương nhân viên', icon: Users },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setActiveSubTab(t.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                                activeSubTab === t.id 
                                ? 'border-emerald-500 text-emerald-600 bg-white shadow-[0_-4px_10px_-5px_rgba(0,0,0,0.05)]' 
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                            }`}
                        >
                            <t.icon size={16} />
                            {t.label}
                        </button>
                    ))}
                    <div className="ml-auto">
                        <button 
                            onClick={loadDashboardData}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Tải lại dữ liệu"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6 overflow-auto flex-1">
                    {activeSubTab === 'dashboard' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                            <div className="space-y-6">
                                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
                                    <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                                        <AlertCircle size={18} />
                                        Hướng dẫn nghiệp vụ
                                    </h3>
                                    <ul className="space-y-3 text-sm text-emerald-700/80">
                                        <li className="flex gap-2">
                                            <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</div>
                                            Kiểm tra và cập nhật hệ số lương cho các vị trí công tác mới.
                                        </li>
                                        <li className="flex gap-2">
                                            <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</div>
                                            Đối soát dữ liệu chấm công và tăng ca của nhân viên trước khi tính lương.
                                        </li>
                                        <li className="flex gap-2">
                                            <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</div>
                                            Sử dụng công thức: <strong>Hệ số × 4.96tr / 26 × Ngày công</strong> để tính lương cơ bản.
                                        </li>
                                    </ul>
                                </div>
                                
                                <div className="border border-slate-100 rounded-2xl p-6">
                                    <h3 className="font-bold text-slate-700 mb-4">Hoạt động gần đây</h3>
                                    <div className="space-y-4">
                                        {[
                                            { action: 'Tính lương tháng 10', time: '2 giờ trước', user: 'Kế toán 01' },
                                            { action: 'Cập nhật hệ số Manager', time: '5 giờ trước', user: 'Admin' },
                                            { action: 'Xuất báo cáo quyết toán', time: 'Hôm qua', user: 'Kế toán 01' },
                                        ].map((act, i) => (
                                            <div key={i} className="flex items-center gap-4">
                                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-700">{act.action}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">{act.time} • {act.user}</p>
                                                </div>
                                                <ChevronRight size={14} className="text-slate-300" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-8">
                                <TrendingUp size={48} className="text-slate-300 mb-4" />
                                <h3 className="font-bold text-slate-400">Biểu đồ phân tích lương</h3>
                                <p className="text-xs text-slate-400 max-w-[200px]">Tính năng phân tích trực quan đang được tối ưu hóa dữ liệu.</p>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'coefficients' && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-700">Hệ số lương theo Chức vụ</h3>
                                    <p className="text-xs text-slate-400">Hệ số này sẽ được áp dụng mặc định khi tính lương cho nhân viên thuộc chức vụ tương ứng.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                        <input 
                                            type="text" 
                                            placeholder="Tìm chức vụ..." 
                                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none w-64 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tên Chức vụ</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Hệ số mặc định</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {positions.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-700">{p.positionName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">{p.departmentName || 'Toàn công ty'}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        defaultValue={p.defaultCoefficient || 1.0}
                                                        className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                                                        onBlur={(e) => handleUpdateCoefficient(p.id, e.target.value)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors">
                                                        <Save size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'allowances' && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-700">Phụ cấp mặc định theo Chức vụ</h3>
                                    <p className="text-xs text-slate-400">Các khoản phụ cấp này sẽ được áp dụng mặc định cho nhân viên thuộc chức vụ tương ứng.</p>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="w-full text-left min-w-[1000px]">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Tên Chức vụ</th>
                                            <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Ăn ca</th>
                                            <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Điện thoại</th>
                                            <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Xăng xe</th>
                                            <th className="px-4 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Nhà ở</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {positions.map(p => (
                                            <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-700">{p.positionName}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">{p.departmentName || 'Toàn công ty'}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input 
                                                        type="number" 
                                                        defaultValue={p.defaultMealAllowance || 0}
                                                        className="w-full px-2 py-1.5 border border-transparent group-hover:border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:border-emerald-500 outline-none bg-transparent"
                                                        id={`meal-${p.id}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input 
                                                        type="number" 
                                                        defaultValue={p.defaultPhoneAllowance || 0}
                                                        className="w-full px-2 py-1.5 border border-transparent group-hover:border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:border-emerald-500 outline-none bg-transparent"
                                                        id={`phone-${p.id}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input 
                                                        type="number" 
                                                        defaultValue={p.defaultPetrolAllowance || 0}
                                                        className="w-full px-2 py-1.5 border border-transparent group-hover:border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:border-emerald-500 outline-none bg-transparent"
                                                        id={`petrol-${p.id}`}
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input 
                                                        type="number" 
                                                        defaultValue={p.defaultHousingAllowance || 0}
                                                        className="w-full px-2 py-1.5 border border-transparent group-hover:border-slate-200 rounded-lg text-center font-bold text-slate-700 focus:border-emerald-500 outline-none bg-transparent"
                                                        id={`housing-${p.id}`}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={async () => {
                                                            const meal = document.getElementById(`meal-${p.id}`).value;
                                                            const phone = document.getElementById(`phone-${p.id}`).value;
                                                            const petrol = document.getElementById(`petrol-${p.id}`).value;
                                                            const housing = document.getElementById(`housing-${p.id}`).value;
                                                            try {
                                                                await api.put(`/Positions/${p.id}/allowances`, {
                                                                    meal: parseFloat(meal),
                                                                    phone: parseFloat(phone),
                                                                    petrol: parseFloat(petrol),
                                                                    housing: parseFloat(housing)
                                                                });
                                                                toast.success('Cập nhật phụ cấp thành công');
                                                            } catch (error) {
                                                                toast.error('Lỗi khi cập nhật phụ cấp');
                                                            }
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'employees' && (
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                            {/* Filter Bar from Image 2 */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm theo tên hoặc mã nhân viên..." 
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select 
                                        value={deptFilter}
                                        onChange={(e) => setDeptFilter(e.target.value)}
                                        className="pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none appearance-none shadow-sm transition-all min-w-[200px]"
                                    >
                                        <option value="">Tất cả bộ phận</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.departmentName}>{d.departmentName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Data Table from Image 2 Logic */}
                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                                <table className="w-full text-left min-w-[1200px]">
                                    <thead className="bg-slate-50/80 backdrop-blur-sm sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">STT</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Mã NV</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Họ và Tên</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Hệ số</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Ngày công</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">Tăng ca</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-center">Nghỉ 100%</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-28 text-center">Nghỉ ko lương</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lương CB</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map((e, idx) => (
                                            <tr key={e.employeeId} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 py-4 text-center text-xs text-slate-400">{idx + 1}</td>
                                                <td className="px-4 py-4 text-xs font-mono font-bold text-slate-600">{e.employeeCode}</td>
                                                <td className="px-4 py-4">
                                                    <p className="font-bold text-slate-700">{e.fullName}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase font-medium">{e.departmentName}</p>
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        value={e.coefficient || 1.0}
                                                        onChange={(el) => handleUpdateEmployeeProfile(e.employeeId, 'coefficient', el.target.value)}
                                                        className="w-16 px-1 py-1 border border-transparent group-hover:border-slate-200 rounded text-center text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={e.actualWorkingDays || 0}
                                                        onChange={(el) => handleUpdateEmployeeProfile(e.employeeId, 'actualWorkingDays', el.target.value)}
                                                        className="w-16 px-1 py-1 border border-transparent group-hover:border-slate-200 rounded text-center text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={e.overtimeHours || 0}
                                                        onChange={(el) => handleUpdateEmployeeProfile(e.employeeId, 'overtimeHours', el.target.value)}
                                                        className="w-16 px-1 py-1 border border-transparent group-hover:border-slate-200 rounded text-center text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={e.paidLeaveDays || 0}
                                                        onChange={(el) => handleUpdateEmployeeProfile(e.employeeId, 'paidLeaveDays', el.target.value)}
                                                        className="w-16 px-1 py-1 border border-transparent group-hover:border-slate-200 rounded text-center text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-center">
                                                    <input 
                                                        type="number" 
                                                        value={e.unpaidLeaveDays || 0}
                                                        onChange={(el) => handleUpdateEmployeeProfile(e.employeeId, 'unpaidLeaveDays', el.target.value)}
                                                        className="w-16 px-1 py-1 border border-transparent group-hover:border-slate-200 rounded text-center text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 bg-transparent"
                                                    />
                                                </td>
                                                <td className="px-4 py-4 text-right text-xs font-black text-slate-700">
                                                    {fmt(e.basicSalary)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
