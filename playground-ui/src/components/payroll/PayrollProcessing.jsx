import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    Calculator, Lock, ChevronRight, CheckCircle2,
    Users, Play, Download, RefreshCw, AlertTriangle,
    ArrowLeft, Calendar, Building2, History, CreditCard,
    TrendingUp, ShieldCheck, FileText, ChevronDown, Filter, Search
} from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);
const fmtNum = (val, dec = 1) => val == null ? '—' : Number(val).toFixed(dec);

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

    const handleLock = async () => {
        if (!window.confirm('Xác nhận khóa bảng lương? Sau khi khóa không thể chỉnh sửa.')) return;
        try {
            await api.post(`/Payroll/periods/${payrollPeriod.id}/approve`);
            toast.success('Bảng lương đã được khóa thành công');
            setPayrollPeriod(prev => ({ ...prev, status: 'Locked' }));
        } catch {
            toast.error('Lỗi khi khóa bảng lương');
        }
    };

    const totals = {
        ltg: records.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0),
        ot: records.reduce((s, r) => s + (r.overtimePay || 0), 0),
        bh: records.reduce((s, r) => s + (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0), 0),
        net: records.reduce((s, r) => s + (r.netSalary || 0), 0)
    };

    if (view === 'result') {
        return (
            <div className="flex flex-col gap-6 animate-fade-up pb-10">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card flex items-center gap-4 border-l-4 border-l-violet-500">
                        <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng chi trả (Net)</p>
                            <h3 className="text-xl font-black text-slate-800">{fmt(totals.net)}</h3>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4 border-l-4 border-l-blue-500">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lương công & OT</p>
                            <h3 className="text-xl font-black text-slate-800">{fmt(totals.ltg + totals.ot)}</h3>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4 border-l-4 border-l-rose-500">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bảo hiểm & Thuế</p>
                            <h3 className="text-xl font-black text-slate-800">{fmt(totals.bh)}</h3>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số nhân viên</p>
                            <h3 className="text-xl font-black text-slate-800">{records.length} NV</h3>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('select')} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !py-2 text-xs">
                            <ArrowLeft size={14} /> Quay lại
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-2" />
                        <span className="text-sm font-black text-slate-700">{payrollPeriod?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {canManage && payrollPeriod?.status !== 'Locked' && (
                            <button onClick={handleLock} className="btn btn-ghost border-rose-200 text-rose-600 hover:bg-rose-50 !py-2 text-xs">
                                <Lock size={14} /> Khóa bảng lương
                            </button>
                        )}
                        <button className="btn btn-primary !py-2 !px-4 text-xs">
                            <Download size={14} /> Xuất Báo Cáo
                        </button>
                    </div>
                </div>

                {/* Payroll Table */}
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
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
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* Step Selection Header */}
            <div className="card bg-violet-600 text-white !p-8 flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2">Tính Toán Lương Thưởng</h2>
                    <p className="text-violet-100 text-sm max-w-md">Chọn kỳ lương và phòng ban để bắt đầu quy trình tính toán thu nhập cho nhân sự.</p>
                </div>
                <Calculator size={120} className="absolute right-[-20px] top-[-20px] text-white/10 rotate-12" />
            </div>

            {/* Filter Toolbar */}
            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-2 border-slate-100">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Kỳ Lương
                    </label>
                    <select className="input font-bold text-sm" onChange={e => handleSelectPeriod(e.target.value)}>
                        <option value="">-- Chọn kỳ lương --</option>
                        {schedulePeriods.map(sp => <option key={sp.id} value={sp.id}>{sp.periodName}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} /> Phòng Ban
                    </label>
                    <select className="input font-bold text-sm" onChange={e => handleSelectDept(e.target.value)}>
                        <option value="">-- Chọn phòng ban --</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                </div>
                <div className="flex items-end gap-2">
                    <button 
                        onClick={handleCalculate}
                        disabled={selectedIds.length === 0 || calculating}
                        className="btn btn-primary w-full !py-3 flex items-center justify-center gap-2"
                    >
                        {calculating ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                        TÍNH LƯƠNG ({selectedIds.length})
                    </button>
                </div>
            </div>

            {/* Employee Selection List */}
            {employees.length > 0 && (
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                onChange={e => setSelectedIds(e.target.checked ? employees.map(e => e.employeeId) : [])}
                                checked={selectedIds.length === employees.length}
                            />
                            <span className="text-sm font-black text-slate-700 uppercase tracking-wider">Danh sách nhân sự ({employees.length})</span>
                        </div>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Tìm nhanh..." className="input !pl-9 !py-1.5 !text-xs w-48" />
                        </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full border-collapse">
                            <tbody className="divide-y divide-slate-50">
                                {employees.map((emp) => (
                                    <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 w-12">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                checked={selectedIds.includes(emp.employeeId)}
                                                onChange={() => setSelectedIds(prev => prev.includes(emp.employeeId) ? prev.filter(id => id !== emp.employeeId) : [...prev, emp.employeeId])}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-[10px]">
                                                    {emp.fullName.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{emp.fullName}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{emp.employeeCode}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-500">{emp.positionName}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {emp.hasApprovedTimesheet ? (
                                                <span className="badge badge-success !text-[10px]">Đã duyệt công</span>
                                            ) : (
                                                <span className="badge badge-warning !text-[10px]">Chờ duyệt công</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
