import React, { useState, useEffect } from 'react';
import { employeeService, departmentService } from '../../api';
import { toast } from 'react-hot-toast';
import { Users, Search, Filter, Plus, UserCheck, UserMinus, UserPlus, MoreHorizontal, FileText, QrCode, Mail, Phone, ChevronLeft, ChevronRight, Briefcase, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import BarcodePreview from './BarcodePreview';

export default function EmployeeList({ user, onViewProfile, onBack }) {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeptId, setSelectedDeptId] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [barcodeEmp, setBarcodeEmp] = useState(null);
    const [page, setPage] = useState(1);
    const PER_PAGE = 12;

    const isScopedManager = (user?.roles?.includes('TeamLeader') || user?.roles?.includes('DepartmentHead') || user?.roles?.includes('DepartmentManager')) && !user?.roles?.includes('Admin') && !user?.roles?.includes('CnbSpecialist');
    const isReadOnlyViewer = user?.roles?.includes('CnbSpecialist') && !user?.roles?.includes('Admin') && !user?.roles?.includes('DepartmentHead') && !user?.roles?.includes('DepartmentManager');

    useEffect(() => {
        if (isScopedManager && user?.departmentId) {
            setSelectedDeptId(user.departmentId);
        }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empData, deptData] = await Promise.all([
                employeeService.getAllEmployees(),
                departmentService.getAll()
            ]);
            setEmployees(empData);
            setDepartments(deptData);
        } catch (err) {
            toast.error('Lỗi tải danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    };

    const getAllDescendantIds = (deptId, allDepts) => {
        if (!deptId || deptId === 'All') return [];
        let ids = [deptId.toString()];
        const children = allDepts.filter(d => d.parentDepartmentId && d.parentDepartmentId.toString() === deptId.toString());
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, allDepts)];
        });
        return ids;
    };

    const filtered = employees.filter(e => {
        const matchesSearch = e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const isAll = selectedDeptId === 'All' || !selectedDeptId;
        if (isAll) return e.id !== user?.id;
        
        const allowedDeptIds = !isScopedManager 
            ? getAllDescendantIds(selectedDeptId, departments)
            : [selectedDeptId.toString()];

        const dId = (e.departmentId !== undefined ? e.departmentId : e.DepartmentId)?.toString();
        const matchesDept = dId && allowedDeptIds.includes(dId);
        
        const deptObj = departments.find(d => d.id.toString() === selectedDeptId.toString());
        const isDeptManager = deptObj && deptObj.managerId && deptObj.managerId.toString() === e.id.toString();

        return (matchesDept || isDeptManager) && e.id !== user?.id;
    });

    const stats = {
        total: filtered.length,
        active: filtered.filter(e => e.isActive).length,
        inactive: filtered.filter(e => !e.isActive).length
    };

    const visibleRows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filtered.length / PER_PAGE);

    const mainDepts = departments.filter(d => !d.parentDepartmentId).slice(0, 6);

    return (
        <div className="flex flex-col gap-6 animate-fade-up pb-10">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card flex items-center gap-4 border-l-4 border-l-violet-500">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng nhân sự</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <UserCheck size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đang làm việc</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.active}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-rose-500">
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                        <UserMinus size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đã nghỉ việc</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.inactive}</h3>
                    </div>
                </div>
            </div>

            {/* Department Tabs */}
            {!isScopedManager && (
                <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => { setSelectedDeptId('All'); setPage(1); }}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedDeptId === 'All' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        TẤT CẢ
                    </button>
                    {mainDepts.map(d => (
                        <button 
                            key={d.id}
                            onClick={() => { setSelectedDeptId(d.id); setPage(1); }}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedDeptId.toString() === d.id.toString() ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {d.departmentName.toUpperCase()}
                        </button>
                    ))}
                </div>
            )}

            {/* Toolbar */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Mã NV, tên nhân viên..."
                            className="input !pl-10 w-72 !text-sm"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                    </div>
                    <button className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !py-2 text-xs">
                        <Filter size={14} /> Lọc nâng cao
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !p-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {!isReadOnlyViewer && (
                        <button className="btn btn-primary !py-2 !px-4 text-xs">
                            <UserPlus size={14} /> Thêm nhân sự
                        </button>
                    )}
                    {isReadOnlyViewer && (
                        <span className="text-[10px] font-bold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-1">
                            👁 Chỉ xem
                        </span>
                    )}
                </div>
            </div>

            {/* Employee Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhân viên</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã NV</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban & Vị trí</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Giới tính</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-6 py-4"><div className="h-10 skeleton w-full" /></td></tr>
                                ))
                            ) : visibleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <AlertCircle size={40} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-slate-400 font-bold text-sm">Không tìm thấy nhân viên nào</p>
                                    </td>
                                </tr>
                            ) : visibleRows.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-black text-sm transition-transform group-hover:scale-105">
                                                {emp.fullName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{emp.fullName}</span>
                                                <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                                                    <span className="flex items-center gap-1"><Mail size={10} /> {emp.email || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">#{emp.employeeCode}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                                <Briefcase size={12} className="text-slate-400" /> {emp.departmentName}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{emp.positionName}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-bold ${emp.gender === 'Nam' ? 'text-blue-500' : 'text-pink-500'}`}>
                                            {emp.gender || '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {emp.isActive ? (
                                            <span className="badge badge-success">Hoạt động</span>
                                        ) : (
                                            <span className="badge badge-danger">Đã nghỉ</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button 
                                                onClick={() => onViewProfile(emp.id)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-violet-50 hover:text-violet-600 transition-all"
                                                title="Hồ sơ chi tiết"
                                            >
                                                <FileText size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setBarcodeEmp({ code: emp.employeeCode, name: emp.fullName, department: emp.departmentName })}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                                                title="Mã nhân viên"
                                            >
                                                <QrCode size={16} />
                                            </button>
                                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {visibleRows.length} trên {filtered.length} nhân sự
                    </p>
                    <div className="flex items-center gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages || 1}</span>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {barcodeEmp && (
                <BarcodePreview
                    value={barcodeEmp.code}
                    name={barcodeEmp.name}
                    department={barcodeEmp.department}
                    onClose={() => setBarcodeEmp(null)}
                />
            )}
        </div>
    );
}
