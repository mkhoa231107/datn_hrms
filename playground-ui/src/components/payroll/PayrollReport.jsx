import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    BarChart2, Download, RefreshCw, Send,
    Users, DollarSign, ShieldCheck, TrendingUp, Calendar,
    Building2, FileText, X, CheckCircle2, AlertCircle, Wallet
} from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);
const fmtNum = (v, d = 1) => (v == null ? '—' : Number(v).toFixed(d));

// ── Thuế TNCN lũy tiến 7 bậc (2024) ──
function calcPIT(taxableIncome) {
    const brackets = [
        { limit: 5_000_000, rate: 0.05 },
        { limit: 10_000_000, rate: 0.10 },
        { limit: 18_000_000, rate: 0.15 },
        { limit: 32_000_000, rate: 0.20 },
        { limit: 52_000_000, rate: 0.25 },
        { limit: 80_000_000, rate: 0.30 },
        { limit: Infinity,  rate: 0.35 },
    ];
    let tax = 0;
    let prev = 0;
    for (const { limit, rate } of brackets) {
        if (taxableIncome <= prev) break;
        const slice = Math.min(taxableIncome, prev + limit) - prev;
        tax += slice * rate;
        prev += limit;
    }
    return tax;
}

function Modal({ title, subtitle, onClose, children, footer }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                    <div>
                        <h3 className="font-black text-xl text-slate-800 tracking-tight">{title}</h3>
                        {subtitle && <p className="text-sm font-bold text-slate-400 mt-1">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-rose-50 hover:text-rose-600 transition-all text-slate-400 group">
                        <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">{children}</div>
                {footer && <div className="p-6 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl flex justify-end gap-3 shrink-0">{footer}</div>}
            </div>
        </div>
    );
}

// ── Detail Modal ──
function PayslipDetailModal({ record, onClose }) {
    if (!record) return null;
    const bhxh = (record.socialInsurance || 0) + (record.healthInsurance || 0) + (record.unemploymentInsurance || 0);
    const gross = (record.actualWorkingSalary || 0) + (record.overtimePay || 0) + (record.totalAllowances || 0);
    const taxable = Math.max(0, gross - bhxh - 11_000_000); // giảm trừ bản thân
    const pit = calcPIT(taxable);

    return (
        <Modal 
            title={record.employeeName} 
            subtitle={`${record.employeeCode} — ${record.departmentName || '—'}`} 
            onClose={onClose}
        >
            <div className="space-y-4">
                {[
                    { label: 'Ngày công thực tế', value: `${record.actualWorkingDays ?? 0} ngày` },
                    { label: 'Lương theo công', value: fmt(record.actualWorkingSalary) },
                    { label: 'Lương tăng ca (OT)', value: fmt(record.overtimePay) },
                    { label: 'Tổng phụ cấp', value: fmt(record.totalAllowances) },
                    { label: 'Lương GROSS', value: fmt(gross), bold: true },
                    { label: '─ BHXH (8%)', value: `- ${fmt(record.socialInsurance)}`, color: 'text-rose-600' },
                    { label: '─ BHYT (1.5%)', value: `- ${fmt(record.healthInsurance)}`, color: 'text-rose-600' },
                    { label: '─ BHTN (1%)', value: `- ${fmt(record.unemploymentInsurance)}`, color: 'text-rose-600' },
                    { label: '─ Thuế TNCN (ước tính)', value: `- ${fmt(pit)}`, color: 'text-rose-600' },
                    { label: 'Lương NET thực lĩnh', value: fmt(record.netSalary), bold: true, highlight: true },
                ].map(({ label, value, bold, color, highlight }) => (
                    <div key={label} className={`flex justify-between items-center py-2.5 px-3 rounded-xl border border-transparent ${highlight ? 'bg-violet-50 border-violet-100' : 'hover:bg-slate-50'}`}>
                        <span className={`text-xs ${bold ? 'font-black text-slate-700 uppercase tracking-wider' : 'font-bold text-slate-400 uppercase tracking-widest text-[10px]'}`}>{label}</span>
                        <span className={`text-sm font-black ${color || (bold ? 'text-violet-700' : 'text-slate-700')}`}>{value}</span>
                    </div>
                ))}
            </div>
        </Modal>
    );
}

export default function PayrollReport() {
    const [periods, setPeriods] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedDept, setSelectedDept] = useState('');
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [detailRecord, setDetailRecord] = useState(null);
    const [showSendConfirm, setShowSendConfirm] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);

    useEffect(() => {
        Promise.all([
            api.get('/Payroll/periods'),
            api.get('/Departments')
        ]).then(([p, d]) => {
            const allPeriods = p.data?.data || p.data || [];
            setPeriods(allPeriods);
            setDepartments((d.data || []).filter(dep => dep.isActive));
            // Auto-select latest period
            if (allPeriods.length > 0) setSelectedPeriod(String(allPeriods[allPeriods.length - 1].id));
        }).catch(() => toast.error('Không thể tải dữ liệu'));
    }, []);

    // Auto-load when period changes
    useEffect(() => {
        if (selectedPeriod) fetchReport();
    }, [selectedPeriod]);

    const fetchReport = async () => {
        if (!selectedPeriod) return;
        setLoading(true);
        try {
            const res = await api.get(`/Payroll/periods/${selectedPeriod}/records`);
            let data = res.data?.data || res.data || [];
            setRecords(Array.isArray(data) ? data : []);
        } catch {
            toast.error('Không thể tải dữ liệu lương');
            setRecords([]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = useMemo(() => {
        if (!selectedDept) return records;
        const dept = departments.find(d => d.id === parseInt(selectedDept));
        if (!dept) return records;
        return records.filter(r => r.departmentName?.includes(dept.departmentName) || dept.departmentName?.includes(r.departmentName));
    }, [records, selectedDept, departments]);

    const totals = useMemo(() => ({
        gross: filtered.reduce((s, r) => s + (r.actualWorkingSalary || 0) + (r.overtimePay || 0) + (r.totalAllowances || 0), 0),
        bhdn: filtered.reduce((s, r) => s + (r.socialInsurance || 0) * (17.5 / 8), 0), // DN đóng ~17.5% tương đương
        bhnv: filtered.reduce((s, r) => s + (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0), 0),
        net: filtered.reduce((s, r) => s + (r.netSalary || 0), 0),
        count: filtered.length,
    }), [filtered]);

    const exportExcel = async () => {
        if (filtered.length === 0) { toast.error('Không có dữ liệu'); return; }
        setExporting(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const wb = new ExcelJS.Workbook();
            const periodObj = periods.find(p => p.id === parseInt(selectedPeriod));
            const periodName = periodObj?.name || selectedPeriod;

            const ws = wb.addWorksheet('Bảng lương tổng hợp');
            ws.columns = [
                { header: 'STT', key: 'stt', width: 6 },
                { header: 'Mã NV', key: 'employeeCode', width: 12 },
                { header: 'Họ tên', key: 'employeeName', width: 24 },
                { header: 'Phòng ban', key: 'departmentName', width: 20 },
                { header: 'Ngày công', key: 'actualWorkingDays', width: 12 },
                { header: 'Lương CB', key: 'actualWorkingSalary', width: 18 },
                { header: 'OT', key: 'overtimePay', width: 16 },
                { header: 'Phụ cấp', key: 'totalAllowances', width: 16 },
                { header: 'BHXH NV', key: 'bhxhNv', width: 14 },
                { header: 'BHYT NV', key: 'bhytNv', width: 14 },
                { header: 'BHTN NV', key: 'bhtnNv', width: 14 },
                { header: 'Thuế TNCN', key: 'pit', width: 16 },
                { header: 'Thực lĩnh (Net)', key: 'netSalary', width: 20 },
            ];
            ws.getRow(1).eachCell(cell => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = { bottom: { style: 'thin', color: { argb: 'FF6D28D9' } } };
            });
            ws.getRow(1).height = 26;

            filtered.forEach((r, i) => {
                const bhxh = r.socialInsurance || 0;
                const bhyt = r.healthInsurance || 0;
                const bhtn = r.unemploymentInsurance || 0;
                const gross = (r.actualWorkingSalary || 0) + (r.overtimePay || 0) + (r.totalAllowances || 0);
                const taxable = Math.max(0, gross - bhxh - bhyt - bhtn - 11_000_000);
                const pit = calcPIT(taxable);
                const row = ws.addRow({
                    stt: i + 1,
                    employeeCode: r.employeeCode || '',
                    employeeName: r.employeeName || '',
                    departmentName: r.departmentName || '',
                    actualWorkingDays: r.actualWorkingDays ?? 0,
                    actualWorkingSalary: r.actualWorkingSalary || 0,
                    overtimePay: r.overtimePay || 0,
                    totalAllowances: r.totalAllowances || 0,
                    bhxhNv: bhxh,
                    bhytNv: bhyt,
                    bhtnNv: bhtn,
                    pit: Math.round(pit),
                    netSalary: r.netSalary ?? 0,
                });
                // Format currency columns
                ['actualWorkingSalary','overtimePay','totalAllowances','bhxhNv','bhytNv','bhtnNv','pit','netSalary'].forEach(col => {
                    const cell = row.getCell(col);
                    cell.numFmt = '#,##0 [$₫-42A]';
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
                actualWorkingDays: filtered.reduce((s, r) => s + (r.actualWorkingDays || 0), 0),
                actualWorkingSalary: filtered.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0),
                overtimePay: filtered.reduce((s, r) => s + (r.overtimePay || 0), 0),
                totalAllowances: filtered.reduce((s, r) => s + (r.totalAllowances || 0), 0),
                bhxhNv: filtered.reduce((s, r) => s + (r.socialInsurance || 0), 0),
                bhytNv: filtered.reduce((s, r) => s + (r.healthInsurance || 0), 0),
                bhtnNv: filtered.reduce((s, r) => s + (r.unemploymentInsurance || 0), 0),
                pit: '',
                netSalary: filtered.reduce((s, r) => s + (r.netSalary || 0), 0),
            });
            totalRow.eachCell(cell => {
                cell.font = { bold: true };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDD6FE' } };
            });

            const buf = await wb.xlsx.writeBuffer();
            const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `BaoCaoLuong_${periodName}.xlsx`;
            a.click(); URL.revokeObjectURL(url);
            toast.success('Xuất Excel thành công!');
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi xuất Excel');
        } finally {
            setExporting(false);
        }
    };

    const sendPayslips = async () => {
        setSending(true);
        setSendResult(null);
        try {
            const res = await api.post(`/Payroll/periods/${selectedPeriod}/send-payslips`);
            const result = res.data;
            setSendResult(result);
            if (result.success) toast.success(result.message);
            else toast.error(result.message || 'Có lỗi xảy ra');
        } catch (err) {
            const msg = err.response?.data?.message || 'Lỗi kết nối server';
            toast.error(msg);
            setSendResult({ success: false, message: msg });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <DollarSign className="text-violet-600" size={28} />
                        Báo cáo Lương & Thuế
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Tổng hợp chi phí nhân sự, bảo hiểm và thuế theo từng kỳ lương</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">{filtered.length} bản ghi</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchReport} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} /> Làm mới
                    </button>
                    <button 
                        onClick={() => setShowSendConfirm(true)}
                        disabled={!selectedPeriod || filtered.length === 0}
                        className="btn btn-ghost border-violet-200 text-violet-700 hover:bg-violet-50 shadow-sm"
                    >
                        <Send size={16} /> Gửi phiếu lương
                    </button>
                    <button 
                        onClick={exportExcel} 
                        disabled={exporting || filtered.length === 0} 
                        className="btn btn-primary shadow-lg shadow-violet-200"
                    >
                        {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        Xuất Excel
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Quỹ lương Net', value: fmt(totals.net), icon: Wallet, color: 'violet', sub: 'Thực lĩnh của NV' },
                    { label: 'BH DN đóng', value: fmt(totals.bhdn), icon: Building2, color: 'emerald', sub: 'Chi phí doanh nghiệp' },
                    { label: 'Tổng BH NV', value: fmt(totals.bhnv), icon: ShieldCheck, color: 'rose', sub: 'Khấu trừ vào lương' },
                    { label: 'Số nhân sự', value: totals.count, icon: Users, color: 'amber', sub: 'Có trong bảng lương' },
                ].map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} className={`card !p-5 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm`}>
                        <div className={`w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                            <Icon size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{label}</p>
                            <h3 className="text-lg font-black text-slate-800 stat-value truncate">{value}</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{sub}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Standard Filter Bar */}
            <div className="card !p-4 bg-slate-50/50 border-slate-200/60 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kỳ tính lương</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className="input !pl-11 !py-2.5 bg-white border-slate-200 font-bold" 
                                value={selectedPeriod} 
                                onChange={e => setSelectedPeriod(e.target.value)}
                            >
                                <option value="">-- Chọn kỳ lương --</option>
                                {periods.map(p => {
                                    const rawName = p.name || p.periodName || '';
                                    let fixedName = rawName;
                                    try {
                                        // Fix common UTF-8 encoding issues (Mojibake)
                                        if (rawName.includes('Ã') || rawName.includes('º') || rawName.includes('£')) {
                                            fixedName = decodeURIComponent(escape(rawName));
                                        }
                                    } catch (e) {
                                        fixedName = rawName;
                                    }
                                    return <option key={p.id} value={p.id}>{fixedName}</option>;
                                })}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phòng ban</label>
                        <div className="relative">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <select 
                                className="input !pl-11 !py-2.5 bg-white border-slate-200 font-bold" 
                                value={selectedDept} 
                                onChange={e => setSelectedDept(e.target.value)}
                            >
                                <option value="">Tất cả phòng ban</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">#</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng ban</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ngày công</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Lương CB</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">OT</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Phụ cấp</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Bảo hiểm NV</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thực lĩnh</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Xem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-20 text-center text-slate-400 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="animate-spin text-violet-500" size={32} />
                                            <span>Đang xử lý dữ liệu báo cáo...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="10" className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        {selectedPeriod ? 'Không có dữ liệu lương cho kỳ này.' : 'Vui lòng chọn kỳ lương để xem báo cáo.'}
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {filtered.map((r, i) => {
                                        const bh = (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0);
                                        return (
                                            <tr key={r.id || i} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4 text-center font-bold text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-700">{r.employeeName}</span>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">@{r.employeeCode}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-xs font-medium text-slate-500">{r.departmentName || '—'}</td>
                                                <td className="px-4 py-4 text-center font-black text-slate-600">{r.actualWorkingDays ?? '—'}</td>
                                                <td className="px-4 py-4 text-right text-xs font-bold text-slate-700">{fmt(r.actualWorkingSalary)}</td>
                                                <td className="px-4 py-4 text-right text-xs font-bold text-amber-600">{fmt(r.overtimePay)}</td>
                                                <td className="px-4 py-4 text-right text-xs font-bold text-blue-600">{fmt(r.totalAllowances)}</td>
                                                <td className="px-4 py-4 text-right text-xs font-bold text-rose-500">({fmt(bh)})</td>
                                                <td className="px-4 py-4 text-right font-black text-violet-700">{fmt(r.netSalary)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => setDetailRecord(r)}
                                                        className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 transition-colors mx-auto shadow-sm"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Summary Row */}
                                    <tr className="bg-slate-50 font-black">
                                        <td colSpan={4} className="px-6 py-4 text-[10px] uppercase text-slate-500 tracking-widest">TỔNG CỘNG ({totals.count} NV)</td>
                                        <td className="px-4 py-4 text-right text-xs text-slate-700">{fmt(filtered.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0))}</td>
                                        <td className="px-4 py-4 text-right text-xs text-amber-600">{fmt(filtered.reduce((s, r) => s + (r.overtimePay || 0), 0))}</td>
                                        <td className="px-4 py-4 text-right text-xs text-blue-600">{fmt(filtered.reduce((s, r) => s + (r.totalAllowances || 0), 0))}</td>
                                        <td className="px-4 py-4 text-right text-xs text-rose-500">({fmt(totals.bhnv)})</td>
                                        <td className="px-4 py-4 text-right text-base text-violet-700">{fmt(totals.net)}</td>
                                        <td></td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {detailRecord && (
                <PayslipDetailModal 
                    record={detailRecord} 
                    onClose={() => setDetailRecord(null)} 
                />
            )}

            {/* Send Confirm Modal */}
            {showSendConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-up">
                        <div className="bg-violet-600 text-white p-6 rounded-t-2xl">
                            <h3 className="text-lg font-black flex items-center gap-2"><Send size={20} /> Gửi phiếu lương</h3>
                            <p className="text-violet-200 text-sm mt-1">{periods.find(p => p.id === parseInt(selectedPeriod))?.name}</p>
                        </div>
                        <div className="p-6">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-700">
                                <p className="font-bold mb-1">⚠️ Xác nhận gửi</p>
                                <p>Thao tác này sẽ gửi thông báo trong app và email (nếu đã cấu hình) cho <strong>{records.length} nhân viên</strong>. Không thể hoàn tác.</p>
                            </div>
                            {sendResult && (
                                <div className={`rounded-xl p-4 mb-4 flex items-start gap-3 ${sendResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
                                    {sendResult.success
                                        ? <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                                        : <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />}
                                    <div>
                                        <p className={`text-sm font-bold ${sendResult.success ? 'text-emerald-700' : 'text-rose-700'}`}>{sendResult.message}</p>
                                        {sendResult.failedList?.length > 0 && (
                                            <ul className="text-xs text-rose-600 mt-1 list-disc ml-4">
                                                {sendResult.failedList.map((f, i) => <li key={i}>{f}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="flex gap-3 justify-end">
                                <button onClick={() => { setShowSendConfirm(false); setSendResult(null); }} className="btn btn-ghost !py-2 text-sm">
                                    Hủy
                                </button>
                                <button
                                    onClick={sendPayslips}
                                    disabled={sending}
                                    className="btn btn-primary !py-2 text-sm flex items-center gap-2"
                                >
                                    {sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                                    {sending ? 'Đang gửi...' : 'Xác nhận gửi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
