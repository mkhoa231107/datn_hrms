import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    BarChart2, Download, RefreshCw, Filter, ChevronUp, ChevronDown,
    Users, Clock, CheckCircle2, AlertTriangle, Calendar, Building2
} from 'lucide-react';

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
            // Fetch timesheets for selected dept or dept=0 (all)
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

    // Sort logic
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

    // Group by department
    const grouped = useMemo(() => {
        const groups = {};
        sorted.forEach(r => {
            const key = r.departmentName || 'Không xác định';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });
        return groups;
    }, [sorted]);

    const totals = useMemo(() => ({
        standardDays: records.reduce((s, r) => s + (r.standardWorkingDays || 0), 0),
        actualDays: records.reduce((s, r) => s + (r.actualWorkingDays || 0), 0),
        overtimeHours: records.reduce((s, r) => s + (r.totalOvertimeHours || 0), 0),
        leaveDays: records.reduce((s, r) => s + (r.approvedLeaveDays || 0), 0),
    }), [records]);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ k }) => {
        if (sortKey !== k) return <ChevronUp size={12} className="opacity-20" />;
        return sortDir === 'asc' ? <ChevronUp size={12} className="text-violet-600" /> : <ChevronDown size={12} className="text-violet-600" />;
    };

    const exportExcel = async () => {
        if (records.length === 0) { toast.error('Không có dữ liệu để xuất'); return; }
        setExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();

            const periodObj = periods.find(p => p.id === parseInt(selectedPeriod));
            const periodName = periodObj?.periodName || selectedPeriod;

            // ── Sheet 1: Chi tiết ──
            const ws = wb.addWorksheet('Chi tiết chấm công');
            ws.columns = [
                { header: 'STT', key: 'stt', width: 6 },
                { header: 'Mã NV', key: 'employeeCode', width: 12 },
                { header: 'Họ tên', key: 'employeeName', width: 24 },
                { header: 'Phòng ban', key: 'departmentName', width: 20 },
                { header: 'Ngày công chuẩn', key: 'standardWorkingDays', width: 16 },
                { header: 'Ngày công thực tế', key: 'actualWorkingDays', width: 18 },
                { header: 'Giờ tăng ca', key: 'totalOvertimeHours', width: 14 },
                { header: 'Ngày nghỉ phép', key: 'approvedLeaveDays', width: 16 },
                { header: 'Tỷ lệ đúng giờ (%)', key: 'onTimeRate', width: 20 },
                { header: 'Trạng thái', key: 'status', width: 14 },
            ];

            // Header style
            ws.getRow(1).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            ws.getRow(1).height = 24;

            sorted.forEach((r, i) => {
                const row = ws.addRow({
                    stt: i + 1,
                    employeeCode: r.employeeCode || '',
                    employeeName: r.employeeName || '',
                    departmentName: r.departmentName || '',
                    standardWorkingDays: r.standardWorkingDays ?? 0,
                    actualWorkingDays: r.actualWorkingDays ?? 0,
                    totalOvertimeHours: fmtNum(r.totalOvertimeHours),
                    approvedLeaveDays: r.approvedLeaveDays ?? 0,
                    onTimeRate: r.onTimeRate != null ? fmtNum(r.onTimeRate) + '%' : '—',
                    status: r.status === 2 ? 'Đã duyệt' : r.status === 1 ? 'Bộ phận duyệt' : 'Chưa duyệt',
                });
                if (i % 2 === 1) {
                    row.eachCell(cell => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                    });
                }
            });

            // Total row
            const totalRow = ws.addRow({
                stt: '', employeeCode: '', employeeName: 'TỔNG CỘNG', departmentName: '',
                standardWorkingDays: totals.standardDays,
                actualWorkingDays: totals.actualDays,
                totalOvertimeHours: fmtNum(totals.overtimeHours),
                approvedLeaveDays: totals.leaveDays,
                onTimeRate: '', status: ''
            });
            totalRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDD6FE' } };
            });

            // ── Sheet 2: Tổng hợp theo phòng ban ──
            const ws2 = wb.addWorksheet('Tổng hợp phòng ban');
            ws2.columns = [
                { header: 'Phòng ban', key: 'dept', width: 24 },
                { header: 'Số NV', key: 'count', width: 10 },
                { header: 'Tổng ngày công TT', key: 'actualDays', width: 20 },
                { header: 'Tổng giờ OT', key: 'otHours', width: 16 },
                { header: 'Tổng ngày nghỉ', key: 'leaveDays', width: 16 },
            ];
            ws2.getRow(1).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            ws2.getRow(1).height = 24;

            Object.entries(grouped).forEach(([dept, rows]) => {
                ws2.addRow({
                    dept,
                    count: rows.length,
                    actualDays: rows.reduce((s, r) => s + (r.actualWorkingDays || 0), 0),
                    otHours: fmtNum(rows.reduce((s, r) => s + (r.totalOvertimeHours || 0), 0)),
                    leaveDays: rows.reduce((s, r) => s + (r.approvedLeaveDays || 0), 0),
                });
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BaoCaoChamCong_${periodName}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Xuất Excel thành công!');
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi xuất Excel');
        } finally {
            setExporting(false);
        }
    };

    const TH = ({ label, k }) => (
        <th
            onClick={() => handleSort(k)}
            className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider cursor-pointer hover:text-violet-600 select-none whitespace-nowrap"
        >
            <div className="flex items-center gap-1">{label}<SortIcon k={k} /></div>
        </th>
    );

    return (
        <div className="flex flex-col gap-6 animate-fade-up pb-10">
            {/* Header */}
            <div className="card bg-violet-600 text-white !p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <BarChart2 size={28} /> Báo Cáo Chấm Công Tổng Hợp
                    </h2>
                    <p className="text-violet-100 text-sm">Tổng hợp ngày công, giờ tăng ca và nghỉ phép theo kỳ và phòng ban.</p>
                </div>
                <BarChart2 size={120} className="absolute right-[-20px] top-[-20px] text-white/10 rotate-12" />
            </div>

            {/* Filter bar */}
            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-2 border-slate-100">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Kỳ lương
                    </label>
                    <select className="input font-bold text-sm" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                        <option value="">-- Chọn kỳ lương --</option>
                        {periods.map(p => <option key={p.id} value={p.id}>{p.periodName}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Building2 size={12} /> Phòng ban
                    </label>
                    <select className="input font-bold text-sm" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                        <option value="">Tất cả phòng ban</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                    </select>
                </div>
                <div className="flex items-end gap-2">
                    <button
                        onClick={fetchReport}
                        disabled={!selectedPeriod || loading}
                        className="btn btn-primary w-full !py-3 flex items-center justify-center gap-2"
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Filter size={16} />}
                        Xem báo cáo
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            {records.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng nhân viên', value: records.length + ' NV', icon: Users, color: 'violet' },
                        { label: 'Tổng ngày công TT', value: totals.actualDays + ' ngày', icon: CheckCircle2, color: 'emerald' },
                        { label: 'Tổng giờ tăng ca', value: fmtNum(totals.overtimeHours) + ' giờ', icon: Clock, color: 'amber' },
                        { label: 'Tổng ngày nghỉ phép', value: totals.leaveDays + ' ngày', icon: AlertTriangle, color: 'blue' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={`card flex items-center gap-4 border-l-4 border-l-${color}-500`}>
                            <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                                <h3 className="text-lg font-black text-slate-800">{value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Table + Export */}
            {records.length > 0 && (
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-700">Danh sách nhân viên ({records.length})</h3>
                        <button
                            onClick={exportExcel}
                            disabled={exporting}
                            className="btn btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 !py-2 text-xs flex items-center gap-2"
                        >
                            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            Xuất Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider w-10">#</th>
                                    <TH label="Họ tên" k="employeeName" />
                                    <TH label="Phòng ban" k="departmentName" />
                                    <TH label="Ngày công chuẩn" k="standardWorkingDays" />
                                    <TH label="Ngày công TT" k="actualWorkingDays" />
                                    <TH label="Giờ OT" k="totalOvertimeHours" />
                                    <TH label="Nghỉ phép" k="approvedLeaveDays" />
                                    <TH label="Tỷ lệ đúng giờ" k="onTimeRate" />
                                    <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(grouped).map(([dept, rows]) => (
                                    <React.Fragment key={dept}>
                                        {/* Dept sub-header */}
                                        <tr className="bg-violet-50">
                                            <td colSpan={9} className="px-4 py-2 text-[11px] font-black text-violet-700 uppercase tracking-wider">
                                                🏢 {dept} — {rows.length} nhân viên
                                            </td>
                                        </tr>
                                        {rows.map((r, i) => (
                                            <tr key={r.employeeId || i} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 text-xs text-slate-400 font-bold">{i + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-700">{r.employeeName}</span>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase">{r.employeeCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{r.departmentName}</td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-600">{r.standardWorkingDays ?? '—'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-black text-sm ${(r.actualWorkingDays ?? 0) < (r.standardWorkingDays ?? 0) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                        {r.actualWorkingDays ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-amber-600">
                                                    {fmtNum(r.totalOvertimeHours)}h
                                                </td>
                                                <td className="px-4 py-3 text-center font-medium text-blue-600">{r.approvedLeaveDays ?? 0}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {r.onTimeRate != null ? (
                                                        <span className={`font-bold text-sm ${r.onTimeRate >= 90 ? 'text-emerald-600' : r.onTimeRate >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                            {fmtNum(r.onTimeRate)}%
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.status === 2 ? (
                                                        <span className="badge badge-success">Đã duyệt</span>
                                                    ) : r.status === 1 ? (
                                                        <span className="badge badge-warning">BP duyệt</span>
                                                    ) : (
                                                        <span className="badge badge-accent">Chưa duyệt</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Dept subtotal */}
                                        <tr className="bg-slate-50 border-t border-violet-100">
                                            <td colSpan={3} className="px-4 py-2 text-xs font-black text-slate-500 text-right">Tổng {dept}:</td>
                                            <td className="px-4 py-2 text-center font-black text-slate-700">
                                                {rows.reduce((s, r) => s + (r.standardWorkingDays || 0), 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center font-black text-emerald-700">
                                                {rows.reduce((s, r) => s + (r.actualWorkingDays || 0), 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center font-black text-amber-700">
                                                {fmtNum(rows.reduce((s, r) => s + (r.totalOvertimeHours || 0), 0))}h
                                            </td>
                                            <td className="px-4 py-2 text-center font-black text-blue-700">
                                                {rows.reduce((s, r) => s + (r.approvedLeaveDays || 0), 0)}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </React.Fragment>
                                ))}
                                {/* Grand total */}
                                <tr className="bg-violet-100 border-t-2 border-violet-300">
                                    <td colSpan={3} className="px-4 py-3 text-xs font-black text-violet-800 text-right uppercase tracking-wider">TỔNG CỘNG</td>
                                    <td className="px-4 py-3 text-center font-black text-violet-800">{totals.standardDays}</td>
                                    <td className="px-4 py-3 text-center font-black text-violet-800">{totals.actualDays}</td>
                                    <td className="px-4 py-3 text-center font-black text-violet-800">{fmtNum(totals.overtimeHours)}h</td>
                                    <td className="px-4 py-3 text-center font-black text-violet-800">{totals.leaveDays}</td>
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
