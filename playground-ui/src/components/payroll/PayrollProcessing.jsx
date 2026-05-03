import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    TrendingUp, ShieldCheck, FileText, ChevronDown, Filter, Search, DollarSign, ArrowLeft, Download, History, RefreshCw, Calculator, Lock, Play, AlertTriangle, Calendar, Building2, CreditCard, Users, CheckCircle2
} from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);
const fmtNum = (val, dec = 1) => val == null ? '—' : Number(val).toFixed(dec);

const fixName = (str) => {
    if (!str) return str;
    try {
        if (str.includes('Ã') || str.includes('º') || str.includes('£')) {
            return decodeURIComponent(escape(str));
        }
    } catch (e) {}
    return str;
};

export default function PayrollProcessing({ user }) {
    const canManage = user?.roles?.includes('DepartmentHead') || user?.roles?.includes('DepartmentManager') || 
                      user?.roles?.includes('Admin') || user?.roles?.includes('Accountant') || 
                      user?.roles?.includes('CnbSpecialist');

    const [view, setView] = useState('select');
    const [schedulePeriods, setSchedulePeriods] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedSchedPeriod, setSelectedSchedPeriod] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);
    const [payrollPeriod, setPayrollPeriod] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loadingEmps, setLoadingEmps] = useState(false);
    const [records, setRecords] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [allPayrollPeriods, setAllPayrollPeriods] = useState([]);
    const [lockConfirm, setLockConfirm] = useState(false);
    const [locking, setLocking] = useState(false);
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        setLoadingEmps(true);
        Promise.all([
            api.get('/WorkSchedules/periods'),
            api.get('/Departments'),
            api.get('/Payroll/periods')
        ]).then(([sp, d, pp]) => {
            setSchedulePeriods(sp.data?.data || sp.data || []);
            setDepartments((d.data || []).filter(dep => dep.isActive));
            setAllPayrollPeriods(pp.data?.data || pp.data || []);
        }).catch(() => toast.error('Không thể tải dữ liệu khởi tạo'))
          .finally(() => setLoadingEmps(false));
    }, []);

    const handleSelectPeriod = async (id) => {
        if (!id) { setSelectedSchedPeriod(null); setPayrollPeriod(null); setEmployees([]); setSelectedIds([]); return; }
        const sched = schedulePeriods.find(s => s.id === parseInt(id));
        setSelectedSchedPeriod(sched);
        setSelectedDept(null);
        setEmployees([]);
        setSelectedIds([]);

        try {
            const res = await api.get('/Payroll/periods');
            const all = res.data?.data || res.data || [];
            let pp = all.find(p => p.schedulePeriodId === sched.id);
            if (!pp) {
                const create = await api.post('/Payroll/periods', {
                    name: `Bảng lương ${sched.periodName}`,
                    schedulePeriodId: sched.id
                });
                pp = create.data?.data;
            }
            setPayrollPeriod(pp);
        } catch {
            toast.error('Không thể khởi tạo kỳ lương');
        }
    };

    const handleViewHistoryWithPeriod = async (period, deptId) => {
        try {
            const res = await api.get(`/Payroll/periods/${period.id}/records`);
            let all = res.data?.data || res.data || [];
            if (deptId) {
                const dept = departments.find(d => d.id === parseInt(deptId));
                if (dept) {
                    all = all.filter(r => r.departmentName?.includes(dept.departmentName) || dept.departmentName?.includes(r.departmentName));
                }
            }
            setRecords(all);
            setView('result');
        } catch {
            toast.error('Lỗi khi tải dữ liệu lương');
        }
    };

    const handleSelectDept = async (id) => {
        if (!id) { setSelectedDept(null); setEmployees([]); setSelectedIds([]); return; }
        if (!selectedSchedPeriod) { toast.error('Chọn kỳ lương trước'); return; }
        const dept = departments.find(d => d.id === parseInt(id));
        setSelectedDept(dept);
        setSelectedIds([]);
        setLoadingEmps(true);
        try {
            const res = await api.get(`/Payroll/employee-profiles-with-attendance?departmentId=${id}&schedulePeriodId=${selectedSchedPeriod.id}`);
            setEmployees(res.data?.data || []);
        } catch {
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoadingEmps(false);
        }
    };

    const handleCalculate = async () => {
        if (!payrollPeriod) { toast.error('Chọn kỳ lương'); return; }
        if (selectedIds.length === 0) { toast.error('Chọn ít nhất 1 nhân viên'); return; }
        setCalculating(true);
        try {
            await api.post(`/Payroll/periods/${payrollPeriod.id}/calculate-for-employees`, {
                employeeIds: selectedIds
            });
            const res = await api.get(`/Payroll/periods/${payrollPeriod.id}/records`);
            const all = res.data?.data || res.data || [];
            setRecords(all.filter(r => selectedIds.includes(r.employeeId)));
            toast.success(`Tính lương thành công cho ${selectedIds.length} nhân viên`);
            setView('result');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tính lương');
        } finally {
            setCalculating(false);
        }
    };

    const handleLock = () => setLockConfirm(true);

    const executeLock = async () => {
        setLockConfirm(false);
        setLocking(true);
        try {
            await api.post(`/Payroll/periods/${payrollPeriod.id}/approve`);
            toast.success('Bảng lương đã được khóa thành công');
            setPayrollPeriod(prev => ({ ...prev, status: 'Locked' }));
        } catch {
            toast.error('Lỗi khi khóa bảng lương');
        } finally {
            setLocking(false);
        }
    };

    const totals = {
        ltg: records.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0),
        ot: records.reduce((s, r) => s + (r.overtimePay || 0), 0),
        bh: records.reduce((s, r) => s + (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0), 0),
        net: records.reduce((s, r) => s + (r.netSalary || 0), 0)
    };

    return (
        <>
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <DollarSign className="text-violet-600" size={28} />
                        Tính lương & Thuế TNCN
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Xử lý bảng lương dựa trên dữ liệu công đã chốt</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">{view === 'result' ? 'Xem kết quả' : 'Cấu hình tính toán'}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {view === 'result' ? (
                        <div className="flex items-center gap-2">
                             <button onClick={() => setView('select')} className="btn btn-ghost shadow-sm">
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            {canManage && payrollPeriod?.status !== 'Locked' && (
                                <button onClick={handleLock} className="btn btn-ghost border-rose-200 text-rose-600 hover:bg-rose-50 shadow-sm">
                                    <Lock size={16} /> Khóa bảng lương
                                </button>
                            )}
                            <button className="btn btn-primary shadow-lg shadow-violet-200">
                                <Download size={16} /> Xuất Báo Cáo
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setView(view === 'select' ? 'history' : 'select')}
                            className="btn btn-ghost shadow-sm"
                        >
                            {view === 'select' ? <History size={16} /> : <ArrowLeft size={16} />}
                            {view === 'select' ? 'Lịch sử kỳ lương' : 'Quay lại'}
                        </button>
                    )}
                </div>
            </div>

            {view === 'result' && (
                <div className="flex flex-col gap-6">
                    {/* Standard KPI Cards */}
                    <div className={isMobile ? 'kpi-scroll' : 'grid grid-cols-1 md:grid-cols-4 gap-6'}>
                        {[
                            { label: 'Tổng chi trả (Net)', value: fmt(totals.net), icon: CreditCard, color: 'violet' },
                            { label: 'Lương công & OT', value: fmt(totals.ltg + totals.ot), icon: TrendingUp, color: 'blue' },
                            { label: 'Bảo hiểm & Thuế', value: fmt(totals.bh), icon: ShieldCheck, color: 'rose' },
                            { label: 'Số nhân viên', value: records.length + ' NV', icon: Users, color: 'emerald' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className={`card !p-5 flex items-center gap-4 border-l-4 border-l-${color}-500`}>
                                <div className={`w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                    <Icon size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                                    <h3 className="text-lg font-black text-slate-800 stat-value">{value}</h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Table */}
                    <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <span className="text-sm font-black text-slate-700 uppercase tracking-wider">{fixName(payrollPeriod?.name)}</span>
                            <span className={`badge ${payrollPeriod?.status === 'Locked' ? 'badge-success' : 'badge-warning'}`}>
                                {payrollPeriod?.status === 'Locked' ? 'Đã khóa' : 'Đang xử lý'}
                            </span>
                        </div>
                        <div className="table-mobile-scroll">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                                        <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày công</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Lương CB</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Tăng ca</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Phụ cấp</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo hiểm</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest bg-violet-50/50">Thực lĩnh</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {records.map((r, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700">{r.employeeName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{r.employeeCode}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-600">{r.actualWorkingDays}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">{fmt(r.actualWorkingSalary)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">{fmt(r.overtimePay)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-700">{fmt(r.totalAllowances)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-rose-500">({fmt((r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0))})</td>
                                            <td className="px-6 py-4 text-right font-black text-violet-600 bg-violet-50/30">{fmt(r.netSalary)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {view === 'select' && (
                <div className="flex flex-col gap-6">
                    {/* Standard Filter Bar */}
                    <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-slate-200/60">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Calendar size={12} /> Kỳ chấm công (Dữ liệu nguồn)
                            </label>
                            <select 
                                className="input font-bold text-sm"
                                onChange={e => handleSelectPeriod(e.target.value)}
                                value={selectedSchedPeriod?.id || ''}
                            >
                                <option value="">-- Chọn kỳ chấm công --</option>
                                {schedulePeriods.map(sp => {
                                    const rawName = sp.periodName || '';
                                    let fixedName = rawName;
                                    try {
                                        if (rawName.includes('Ã') || rawName.includes('º') || rawName.includes('£')) {
                                            fixedName = decodeURIComponent(escape(rawName));
                                        }
                                    } catch (e) {
                                        fixedName = rawName;
                                    }
                                    return <option key={sp.id} value={sp.id}>{fixedName}</option>;
                                })}
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Building2 size={12} /> Bộ phận xử lý
                            </label>
                            <select 
                                className="input font-bold text-sm"
                                onChange={e => handleSelectDept(e.target.value)}
                                disabled={!selectedSchedPeriod}
                                value={selectedDept?.id || ''}
                            >
                                <option value="">-- Chọn bộ phận --</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={handleCalculate}
                                disabled={selectedIds.length === 0 || calculating}
                                className="btn btn-primary w-full !py-3 flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                            >
                                {calculating ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                                TÍNH LƯƠNG ({selectedIds.length} NHÂN VIÊN)
                            </button>
                        </div>
                    </div>

                    {/* Employee List */}
                    {employees.length > 0 && (
                        <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm animate-fade-up">
                            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                        onChange={e => setSelectedIds(e.target.checked ? employees.map(e => e.employeeId) : [])}
                                        checked={selectedIds.length === employees.length && employees.length > 0}
                                    />
                                    <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Danh sách nhân sự ({employees.length})</span>
                                </div>
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Tìm nhanh..." className="input !pl-9 !py-1.5 !text-xs w-48 bg-white" />
                                </div>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/30 border-b border-slate-100">
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">CHỌN</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">NHÂN VIÊN</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">CHỨC VỤ</th>
                                            <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">TRẠNG THÁI CÔNG</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {employees.map((emp) => (
                                            <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <input 
                                                        type="checkbox" 
                                                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                        checked={selectedIds.includes(emp.employeeId)}
                                                        onChange={() => setSelectedIds(prev => prev.includes(emp.employeeId) ? prev.filter(id => id !== emp.employeeId) : [...prev, emp.employeeId])}
                                                    />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs">
                                                            {emp.fullName.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-700">{emp.fullName}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{emp.employeeCode}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs font-bold text-slate-500">{emp.positionName}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {emp.hasApprovedTimesheet ? (
                                                        <span className="badge badge-success !text-[10px] !px-2">Đã duyệt công</span>
                                                    ) : (
                                                        <span className="badge badge-warning !text-[10px] !px-2">Chờ duyệt công</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loadingEmps && employees.length === 0 && selectedDept && (
                        <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <Users size={48} className="text-slate-200" />
                            <p className="text-slate-400 font-bold">Không tìm thấy nhân sự nào thuộc bộ phận này.</p>
                        </div>
                    )}
                </div>
            )}
        </div>

        <ConfirmDialog
            open={lockConfirm}
            variant="danger"
            title="Khóa bảng lương"
            message="Sau khi khóa, bảng lương sẽ không thể chỉnh sửa thêm. Hành động này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?"
            confirmLabel="Khóa bảng lương"
            cancelLabel="Hủy bỏ"
            loading={locking}
            onConfirm={executeLock}
            onCancel={() => setLockConfirm(false)}
        />
        </>
    );
}
