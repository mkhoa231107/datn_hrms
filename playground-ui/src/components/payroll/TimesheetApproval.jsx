import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { CheckSquare, Search, FileDown, Zap, Users, CheckCircle2, Clock, Filter, ChevronLeft, ChevronRight, Download, RefreshCw, AlertCircle } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export default function TimesheetApproval({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [departments, setDepartments] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState('');
    const [page, setPage] = useState(1);
    const PER_PAGE = 15;
    const [confirm, setConfirm] = useState({ open: false, type: null, pendingCount: 0 });
    const closeConfirm = () => setConfirm({ open: false, type: null, pendingCount: 0 });
    const { isMobile } = useBreakpoint();

    const roles = user?.roles || [];
    const isAdmin = roles.includes('Admin') || roles.includes('HrAdmin') || roles.includes('CnbSpecialist');
    const isManager = roles.includes('DepartmentManager') || isAdmin || roles.includes('DepartmentHead');

    useEffect(() => { 
        fetchPeriods(); 
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/Departments');
            let depts = response.data || [];
            
            // Nếu không phải admin, chỉ lấy phòng ban của user và phòng ban con
            if (!isAdmin && user?.departmentId) {
                depts = depts.filter(d => d.id === user.departmentId || d.parentDepartmentId === user.departmentId);
            }
            
            setDepartments(depts);
            
            // Set default selected department
            if (!isAdmin && user?.departmentId) {
                setSelectedDeptId(user.departmentId.toString());
            } else if (isAdmin) {
                setSelectedDeptId('0'); // 0 means all
            }
        } catch {
            console.error("Lỗi lấy danh sách phòng ban");
        }
    };

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/WorkSchedules/periods');
            const data = response.data.data || response.data || [];
            setPeriods(data);
            if (data.length > 0) {
                setSelectedPeriodId(data[0].id);
                // fetchSummaries will be called by useEffect when period or dept changes
            }
        } catch {
            toast.error('Không thể tải danh sách kỳ công');
        }
    };

    useEffect(() => {
        if (selectedPeriodId && selectedDeptId !== '') {
            fetchSummaries(selectedPeriodId, selectedDeptId);
        }
    }, [selectedPeriodId, selectedDeptId]);

    const fetchSummaries = async (periodId, deptId) => {
        if (!periodId || !user) return;
        
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
            fetchSummaries(selectedPeriodId, selectedDeptId);
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
        setConfirm({ open: true, type: 'approveAll', pendingCount: pendingItems.length });
    };

    const executeApproveAll = async () => {
        closeConfirm();
        setLoading(true);
        try {
            await api.post(`/Attendance/department/${selectedDeptId}/timesheets/${selectedPeriodId}/approve-all`);
            toast.success('Đã chốt công hàng loạt');
            fetchSummaries(selectedPeriodId, selectedDeptId);
        } catch {
            toast.error('Lỗi hệ thống khi duyệt nhanh');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!selectedPeriodId) return;
        setConfirm({ open: true, type: 'finalize', pendingCount: 0 });
    };

    const executeFinalize = async () => {
        closeConfirm();
        setLoading(true);
        try {
            await api.post(`/Attendance/finalize/${selectedPeriodId}`);
            toast.success('Tái tổng hợp thành công');
            fetchSummaries(selectedPeriodId, selectedDeptId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tổng hợp dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedPeriodId) return;
        
        setLoading(true);
        try {
            const response = await api.get(`/Attendance/department/${selectedDeptId}/export/${selectedPeriodId}`, {
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
        <>
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* KPI Summary */}
            <div className={isMobile ? 'kpi-scroll' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}>
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
            <div className="card flex flex-col gap-3 bg-slate-50/50">
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
                        onChange={(e) => { setSelectedPeriodId(e.target.value); setPage(1); }}
                    >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
                    </select>
                    
                    {/* Thanh filter bộ phận mới */}
                    <select
                        className="input !py-2 !text-xs font-bold w-48 bg-indigo-50/50 text-indigo-700 border-indigo-100"
                        value={selectedDeptId}
                        onChange={(e) => { setSelectedDeptId(e.target.value); setPage(1); }}
                    >
                        {isAdmin && <option value="0">Toàn công ty</option>}
                        {departments.map(d => (
                            <option key={d.id} value={d.id}>{d.departmentName}</option>
                        ))}
                    </select>
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
                <div className="table-mobile-scroll">
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

        {/* ── ConfirmDialog: Chốt công hàng loạt ── */}
        <ConfirmDialog
            open={confirm.open && confirm.type === 'approveAll'}
            variant="warning"
            title="Xác nhận chốt công hàng loạt"
            message={`Hành động này sẽ phê duyệt bảng công cho ${confirm.pendingCount} nhân viên đang hiển thị. Bạn có chắc chắn muốn tiếp tục?`}
            confirmLabel="Chốt công ngay"
            cancelLabel="Hủy bỏ"
            loading={loading}
            onConfirm={executeApproveAll}
            onCancel={closeConfirm}
        />

        {/* ── ConfirmDialog: Tái tổng hợp ── */}
        <ConfirmDialog
            open={confirm.open && confirm.type === 'finalize'}
            variant="info"
            title="Tái tổng hợp dữ liệu công"
            message="Hệ thống sẽ xóa và tính toán lại toàn bộ bảng công từ dữ liệu chấm công thô mới nhất. Các bản ghi đã duyệt sẽ bị ghi đè."
            confirmLabel="Tái tổng hợp"
            cancelLabel="Hủy bỏ"
            loading={loading}
            onConfirm={executeFinalize}
            onCancel={closeConfirm}
        />
        </>
    );
}
