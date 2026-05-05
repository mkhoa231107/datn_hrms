import React, { useState, useEffect, useMemo } from 'react';
import { api, attendanceService } from '../../api';
import { toast } from 'react-hot-toast';
import {
    BarChart2, Download, RefreshCw, Filter, ChevronUp, ChevronDown,
    Users, Clock, CheckCircle2, AlertTriangle, Calendar, Building2
} from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const fmtNum = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));

export default function AttendanceSummaryReport() {
    const [periods, setPeriods] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sortKey, setSortKey] = useState('employeeName');
    const [sortDir, setSortDir] = useState('asc');
    const [exporting, setExporting] = useState(false);
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        Promise.all([
            api.get('/WorkSchedules/periods'),
            api.get('/Departments')
        ]).then(([p, d]) => {
            setPeriods(p.data?.data || p.data || []);
            setDepartments((d.data || []).filter(dep => dep.isActive));
        }).catch(() => toast.error('Không thể tải dữ liệu khởi tạo'));
    }, []);

    const fetchReport = async () => {
        if (!selectedPeriod) { toast.error('Vui lòng chọn kỳ lương'); return; }
        setLoading(true);
        try {
            const deptId = selectedDept || 0;
            const res = await api.get(`/attendance/department/${deptId}/timesheets/${selectedPeriod}`);
            const data = res.data?.data || res.data || [];
            setRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            toast.error('Không thể tải dữ liệu báo cáo');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const sorted = useMemo(() => {
        return [...records].sort((a, b) => {
            let av = a[sortKey] ?? 0;
            let bv = b[sortKey] ?? 0;
            if (typeof av === 'string') av = av.toLowerCase();
            if (typeof bv === 'string') bv = bv.toLowerCase();
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [records, sortKey, sortDir]);

    const grouped = useMemo(() => {
        const groups = {};
        sorted.forEach(r => {
            const key = r.departmentName || 'Phòng ban khác';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    }, [sorted]);

    const totals = useMemo(() => ({
        standardDays: records.reduce((s, r) => s + (r.totalWorkingDays || 0), 0),
        actualDays: records.reduce((s, r) => s + (r.adjustedWorkingDays || 0), 0),
        overtimeHours: records.reduce((s, r) => s + (r.overtimeHours || 0), 0),
        leaveDays: records.reduce((s, r) => s + (r.absentDays || 0), 0),
    }), [records]);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ k }) => {
        if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />;
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-violet-600" /> : <ChevronDown size={12} className="text-violet-600" />;
    };

    const handleExport = async () => {
        if (!selectedPeriod) {
            toast.error('Vui lòng chọn kỳ công');
            return;
        }
        setExporting(true);
        try {
            const deptId = selectedDept || 0;
            const res = await attendanceService.exportTimesheetExcel(deptId, selectedPeriod);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            const periodObj = periods.find(p => p.id === parseInt(selectedPeriod));
            const periodName = periodObj?.periodName || selectedPeriod;
            a.download = `BangCong_${deptId}_${periodName}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Xuất file Excel thành công');
        } catch (err) {
            console.error('Error exporting timesheet:', err);
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setExporting(false);
        }
    };

    const TH = ({ label, k, center, className }) => (
        <th
            onClick={() => handleSort(k)}
            className={`px-2 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-violet-600 select-none whitespace-nowrap ${center ? 'text-center' : 'text-left'} ${className || ''}`}
        >
            <div className={`flex items-center gap-1 ${center ? 'justify-center' : ''}`}>{label}<SortIcon k={k} /></div>
        </th>
    );

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <BarChart2 className="text-violet-600" size={28} />
                        Báo cáo chấm công tổng hợp
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Tổng hợp ngày công và tăng ca</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">Hỗ trợ xuất Excel</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button 
                        onClick={fetchReport}
                        className="btn btn-ghost !p-2.5 shadow-sm"
                        title="Làm mới"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {records.length > 0 && (
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="btn btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 !py-2.5 shadow-sm flex-1 md:flex-none whitespace-nowrap"
                        >
                            {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                            Xuất Excel
                        </button>
                    )}
                </div>
            </div>

            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-slate-200/60 mb-8">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Calendar size={12} /> Kỳ lương
                    </label>
                    <select className="input font-bold text-sm" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                        <option value="">-- Chọn kỳ lương --</option>
                        {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                        <Building2 size={12} /> Phòng ban
                    </label>
                    <select className="input font-bold text-sm" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                        <option value="">Tất cả phòng ban</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={fetchReport}
                        disabled={!selectedPeriod || loading}
                        className="btn btn-primary w-full !py-3 flex items-center justify-center gap-2 shadow-lg shadow-violet-200"
                    >
                        {loading ? <RefreshCw size={18} className="animate-spin" /> : <Filter size={18} />}
                        Xem báo cáo
                    </button>
                </div>
            </div>

            {records.length > 0 && (
                <div className={isMobile ? 'kpi-scroll mb-8' : 'grid grid-cols-2 md:grid-cols-4 gap-4 mb-8'}>
                    {[
                        { label: 'Tổng nhân viên', value: records.length, icon: Users, color: 'violet' },
                        { label: 'Ngày công thực tế', value: totals.actualDays, icon: CheckCircle2, color: 'emerald' },
                        { label: 'Giờ tăng ca', value: fmtNum(totals.overtimeHours) + 'h', icon: Clock, color: 'amber' },
                        { label: 'Nghỉ phép', value: totals.leaveDays, icon: AlertTriangle, color: 'blue' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={`card !p-5 flex items-center gap-4 border-l-4 border-l-${color}-500`}>
                            <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                                <h3 className="text-xl font-black text-slate-800 stat-value">{value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {records.length > 0 && (
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-700">Danh sách nhân viên ({records.length})</h3>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="btn btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 !py-2 text-xs flex items-center gap-2"
                        >
                            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            Xuất Excel
                        </button>
                    </div>
                    <div className="table-mobile-scroll">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <TH label="Nhân viên" k="employeeName" className="!pl-8" />
                                    <TH label="Công chuẩn" k="totalWorkingDays" center />
                                    <TH label="Công TT" k="adjustedWorkingDays" center />
                                    <TH label="Giờ OT" k="overtimeHours" center />
                                    <TH label="Vắng" k="absentDays" center />
                                    <TH label="Tỷ lệ" k="onTimeRate" center />
                                    <th className="px-2 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(grouped).map(([dept, rows]) => (
                                    <React.Fragment key={dept}>
                                        <tr className="bg-violet-50">
                                            <td colSpan={9} className="px-4 py-2 text-[11px] font-black text-violet-700 uppercase tracking-wider">
                                                🏢 {dept} — {rows.length} nhân viên
                                            </td>
                                        </tr>
                                        {rows.map((r, i) => (
                                            <tr key={r.employeeId || i} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="pl-8 pr-2 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-slate-700">{r.employeeName}</span>
                                                        <span className="text-[10px] text-slate-400">({r.employeeCode})</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-3 text-center font-bold text-slate-600 text-sm">{r.totalWorkingDays ?? '—'}</td>
                                                <td className="px-2 py-3 text-center">
                                                    <span className={`font-black text-sm ${(r.adjustedWorkingDays ?? 0) < (r.totalWorkingDays ?? 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {r.adjustedWorkingDays ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-2 py-3 text-center font-bold text-amber-600 text-sm">
                                                    {fmtNum(r.overtimeHours)}h
                                                </td>
                                                <td className="px-2 py-3 text-center font-bold text-blue-600 text-sm">{r.absentDays ?? 0}</td>
                                                <td className="px-2 py-3 text-center">
                                                    {(() => {
                                                        const total = r.totalWorkingDays || 1;
                                                        const onTime = 100 * (1 - ((r.lateDays + r.earlyLeaveDays) / total));
                                                        const rate = Math.max(0, Math.min(100, onTime));
                                                        return (
                                                            <span className={`font-black text-sm ${rate >= 90 ? 'text-emerald-600' : rate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                                {fmtNum(rate, 0)}%
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-2 py-3 text-center whitespace-nowrap">
                                                    {r.status === 'Approved' ? (
                                                        <span className="px-2 py-1 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm shadow-emerald-100">ĐÃ CHỐT</span>
                                                    ) : r.status === 'PendingManagerApproval' ? (
                                                        <span className="px-2 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm shadow-amber-100">CHỜ CHỐT</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-lg bg-slate-400 text-white text-[9px] font-black uppercase tracking-wider shadow-sm shadow-slate-100">NHÁP</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                                <tr className="bg-violet-100 border-t-2 border-violet-300">
                                    <td className="pl-8 pr-2 py-3 text-[10px] font-black text-violet-800 text-right uppercase tracking-wider">TỔNG CỘNG</td>
                                    <td className="px-2 py-3 text-center font-black text-violet-800 text-sm">{totals.standardDays}</td>
                                    <td className="px-2 py-3 text-center font-black text-violet-800 text-sm">{totals.actualDays}</td>
                                    <td className="px-2 py-3 text-center font-black text-violet-800 text-sm">{fmtNum(totals.overtimeHours)}h</td>
                                    <td className="px-2 py-3 text-center font-black text-violet-800 text-sm">{totals.leaveDays}</td>
                                    <td colSpan={2} />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && records.length === 0 && selectedPeriod && (
                <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <BarChart2 size={48} className="text-slate-200" />
                    <p className="text-slate-400 font-bold">Không có dữ liệu chấm công cho kỳ và phòng ban đã chọn.</p>
                    <p className="text-slate-300 text-sm">Hãy kiểm tra lại kỳ lương hoặc thực hiện Tổng hợp dữ liệu công trước.</p>
                </div>
            )}
        </div>
    );
}
