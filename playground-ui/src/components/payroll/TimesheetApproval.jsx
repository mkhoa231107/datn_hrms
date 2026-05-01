import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { CheckSquare, Search, FileDown, Zap, Users, CheckCircle2, Clock, Filter, ChevronLeft, ChevronRight, Download, RefreshCw, AlertCircle } from 'lucide-react';

export default function TimesheetApproval({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [page, setPage] = useState(1);
    const PER_PAGE = 15;

    const roles = user?.roles || [];
    const isAdmin = roles.includes('Admin');
    const isManager = roles.includes('DepartmentManager') || isAdmin;

    useEffect(() => { fetchPeriods(); }, []);

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/WorkSchedules/periods');
            const data = response.data.data || response.data || [];
            setPeriods(data);
            if (data.length > 0) {
                setSelectedPeriodId(data[0].id);
                fetchSummaries(data[0].id);
            }
        } catch {
            toast.error('Không thể tải danh sách kỳ công');
        }
    };

    const fetchSummaries = async (periodId) => {
        if (!periodId || !user) return;
        
        let deptId = user.departmentId;
        if (isAdmin) {
            deptId = showAll ? 0 : (user.departmentId || 0);
        }

        setLoading(true);
        try {
            const response = await api.get(`/Attendance/department/${deptId}/timesheets/${periodId}`);
            setSummaries(response.data.data || []);
        } catch {
            toast.error('Lỗi lấy dữ liệu bảng công');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (summaryId) => {
        try {
            await api.post(`/Attendance/timesheet/${summaryId}/approve`);
            toast.success('Đã phê duyệt thành công');
            fetchSummaries(selectedPeriodId);
        } catch {
            toast.error('Lỗi khi duyệt công');
        }
    };

    const handleApproveAll = async () => {
        if (!selectedPeriodId) return;
        const pendingItems = filteredSummaries.filter(canActOn);
        if (pendingItems.length === 0) { 
            toast.error('Không có nhân viên cần duyệt/chốt'); 
            return; 
        }
        
        if (!window.confirm(`Xác nhận chốt công cho ${pendingItems.length} nhân viên đang hiển thị?`)) return;
        
        setLoading(true);
        try {
            const deptId = isAdmin && showAll ? 0 : (user?.departmentId || 0);
            await api.post(`/Attendance/department/${deptId}/timesheets/${selectedPeriodId}/approve-all`);
            toast.success('Đã chốt công hàng loạt');
            fetchSummaries(selectedPeriodId);
        } catch {
            toast.error('Lỗi hệ thống khi duyệt nhanh');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!selectedPeriodId) return;
        if (!window.confirm("Hệ thống sẽ tái tổng hợp dữ liệu công dựa trên dữ liệu thô mới nhất. Tiếp tục?")) return;
        
        setLoading(true);
        try {
            await api.post(`/Attendance/finalize/${selectedPeriodId}`);
            toast.success('Tái tổng hợp thành công');
            fetchSummaries(selectedPeriodId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tổng hợp dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedPeriodId) return;
        const deptId = isAdmin && showAll ? 0 : (user?.departmentId || 0);
        
        setLoading(true);
        try {
            const response = await api.get(`/Attendance/department/${deptId}/export/${selectedPeriodId}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `BangCong_${selectedPeriodId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Tải xuống thành công');
        } catch {
            toast.error('Lỗi khi xuất file');
        } finally {
            setLoading(false);
        }
    };

    const canActOn = (s) => {
        if (s.employeeId == user?.employeeId) return false;
        if (isAdmin) return s.status !== 'Approved' && s.status !== 'Rejected';
        if (isManager) {
            if (s.isAdmin) return false;
            return s.status !== 'Approved' && s.status !== 'Rejected';
        }
        return false;
    };

    const filteredSummaries = summaries.filter(s => {
        const matchesSearch = s.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             s.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (!isAdmin) {
            if (s.employeeId == user?.employeeId) return false;
            if (s.isAdmin) return false;
        }
        return true;
    });

    const stats = {
        total: filteredSummaries.length,
        approved: filteredSummaries.filter(s => s.status === 'Approved').length,
        pending: filteredSummaries.filter(canActOn).length
    };

    const visibleRows = filteredSummaries.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    const totalPages = Math.ceil(filteredSummaries.length / PER_PAGE);

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card flex items-center gap-4 border-l-4 border-l-indigo-500">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng nhân sự</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã chốt công</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.approved}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chờ phê duyệt</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.pending}</h3>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Mã NV, tên..."
                            className="input !pl-10 w-64 !text-sm"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                        />
                    </div>
                    <select
                        className="input !py-2 !text-xs font-bold w-48"
                        value={selectedPeriodId}
                        onChange={(e) => { setSelectedPeriodId(e.target.value); fetchSummaries(e.target.value); }}
                    >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
                    </select>
                    {isAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <div className={`w-10 h-5 rounded-full transition-all relative ${showAll ? 'bg-violet-600' : 'bg-slate-200'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showAll}
                                    onChange={(e) => { setShowAll(e.target.checked); fetchSummaries(selectedPeriodId); }}
                                />
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showAll ? 'left-6' : 'left-1'}`} />
                            </div>
                            <span className="text-xs font-bold text-slate-600">Toàn công ty</span>
                        </label>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleFinalize} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !py-2 text-xs">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Tổng hợp lại
                    </button>
                    <button onClick={handleExport} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !py-2 text-xs">
                        <Download size={14} /> Xuất Excel
                    </button>
                    <button onClick={handleApproveAll} className="btn btn-primary !py-2 !px-4 text-xs">
                        <Zap size={14} /> Chốt nhanh ({stats.pending})
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="card !p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhân viên</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày công</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tăng ca</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vi phạm (M|S)</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vắng mặt</th>
                                <th className="px-6 py-4 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr key={i}><td colSpan={7} className="px-6 py-4"><div className="h-6 skeleton w-full" /></td></tr>
                                ))
                            ) : visibleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <AlertCircle size={40} className="mx-auto text-slate-200 mb-2" />
                                        <p className="text-slate-400 font-bold text-sm">Không tìm thấy dữ liệu phù hợp</p>
                                    </td>
                                </tr>
                            ) : visibleRows.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                {s.employeeName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{s.employeeName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold">#{s.employeeCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-black text-indigo-600">{s.adjustedWorkingDays}</span>
                                        <span className="text-[10px] text-slate-400 ml-1">/ {s.standardWorkingDays}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-sm font-bold ${s.overtimeHours > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {s.overtimeHours > 0 ? `+${s.overtimeHours}h` : '--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className={`text-xs font-bold ${s.lateDays > 0 ? 'text-rose-500' : 'text-slate-300'}`}>M:{s.lateDays}</span>
                                            <span className="text-slate-200">|</span>
                                            <span className={`text-xs font-bold ${s.earlyLeaveDays > 0 ? 'text-rose-500' : 'text-slate-300'}`}>S:{s.earlyLeaveDays}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-sm font-bold ${s.absentDays > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                                            {s.absentDays > 0 ? s.absentDays : '--'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {s.status === 'Approved' ? (
                                            <span className="badge badge-success">Đã chốt</span>
                                        ) : s.status === 'PendingManagerApproval' ? (
                                            <span className="badge badge-warning">Đã duyệt</span>
                                        ) : (
                                            <span className="badge badge-accent">Chờ xử lý</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {canActOn(s) ? (
                                            <button onClick={() => handleApprove(s.id)} className="btn btn-primary !py-1 !px-4 text-xs">
                                                Phê duyệt
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Completed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {visibleRows.length} trên {filteredSummaries.length} nhân viên
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
        </div>
    );
}
