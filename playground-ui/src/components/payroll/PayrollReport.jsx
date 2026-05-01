import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    BarChart2, Download, RefreshCw, ChevronRight, ChevronDown,
    Users, DollarSign, ShieldCheck, TrendingUp, Calendar,
    Building2, CreditCard, FileText, X
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

// ── Detail Modal ──
function PayslipDetailModal({ record, onClose }) {
    if (!record) return null;
    const bhxh = (record.socialInsurance || 0) + (record.healthInsurance || 0) + (record.unemploymentInsurance || 0);
    const gross = (record.actualWorkingSalary || 0) + (record.overtimePay || 0) + (record.totalAllowances || 0);
    const taxable = Math.max(0, gross - bhxh - 11_000_000); // giảm trừ bản thân
    const pit = calcPIT(taxable);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl animate-fade-up">
                <div className="bg-violet-600 text-white p-6 rounded-t-2xl flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black">{record.employeeName}</h3>
                        <p className="text-violet-200 text-sm">{record.employeeCode} — {record.departmentName || '—'}</p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-6 space-y-3">
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
                        <div key={label} className={`flex justify-between items-center py-2 border-b border-slate-50 ${highlight ? 'bg-violet-50 -mx-2 px-2 rounded-lg border-violet-200' : ''}`}>
                            <span className={`text-sm ${bold ? 'font-black text-slate-700' : 'text-slate-500'}`}>{label}</span>
                            <span className={`text-sm font-bold ${color || (bold ? 'text-violet-700' : 'text-slate-700')}`}>{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
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
                    actualWorkingSalary: r.actualWorkingSalary ?? 0,
                    overtimePay: r.overtimePay ?? 0,
                    totalAllowances: r.totalAllowances ?? 0,
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

    return (
        <div className="flex flex-col gap-6 animate-fade-up pb-10">
            {/* Header */}
            <div className="card bg-violet-600 text-white !p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <DollarSign size={28} /> Báo Cáo Lương & Thuế Tổng Hợp
                    </h2>
                    <p className="text-violet-100 text-sm">Xem chi tiết bảng lương, bảo hiểm và thuế TNCN theo kỳ lương và phòng ban.</p>
                </div>
                <BarChart2 size={120} className="absolute right-[-20px] top-[-20px] text-white/10 rotate-12" />
            </div>

            {/* Filters */}
            <div className="card grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50 border-2 border-slate-100">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Kỳ lương
                    </label>
                    <select className="input font-bold text-sm" value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}>
                        <option value="">-- Chọn kỳ lương --</option>
                        {periods.map(p => <option key={p.id} value={p.id}>{p.name || p.periodName}</option>)}
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
                    <button onClick={fetchReport} disabled={!selectedPeriod || loading} className="btn btn-primary w-full !py-3 flex items-center justify-center gap-2">
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <BarChart2 size={16} />}
                        Tải báo cáo
                    </button>
                </div>
            </div>

            {/* KPI Summary Cards */}
            {filtered.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng quỹ lương (Net)', value: fmt(totals.net), icon: DollarSign, color: 'violet', sub: `${totals.count} nhân viên` },
                        { label: 'BHXH DN đóng (~17.5%)', value: fmt(totals.bhdn), icon: ShieldCheck, color: 'emerald', sub: 'Doanh nghiệp chịu' },
                        { label: 'Tổng BH nhân viên', value: fmt(totals.bhnv), icon: TrendingUp, color: 'rose', sub: 'NV đóng (8+1.5+1%)' },
                        { label: 'Số nhân viên', value: `${totals.count} NV`, icon: Users, color: 'blue', sub: 'trong kỳ này' },
                    ].map(({ label, value, icon: Icon, color, sub }) => (
                        <div key={label} className={`card border-l-4 border-l-${color}-500`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{label}</p>
                                    <h3 className="text-base font-black text-slate-800 truncate">{value}</h3>
                                    <p className="text-[10px] text-slate-400">{sub}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            {filtered.length > 0 && (
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-700">
                            Chi tiết bảng lương — {periods.find(p => p.id === parseInt(selectedPeriod))?.name || ''}
                        </h3>
                        <button onClick={exportExcel} disabled={exporting} className="btn btn-ghost border-emerald-200 text-emerald-700 hover:bg-emerald-50 !py-2 text-xs flex items-center gap-2">
                            {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                            Xuất Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    {['#', 'Nhân viên', 'Phòng ban', 'Ngày công', 'Lương CB', 'OT', 'Phụ cấp', 'Bảo hiểm NV', 'Thực lĩnh', 'Chi tiết'].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((r, i) => {
                                    const bh = (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0);
                                    return (
                                        <tr key={r.id || i} className="hover:bg-violet-50/30 transition-colors group cursor-pointer" onClick={() => setDetailRecord(r)}>
                                            <td className="px-4 py-3 text-xs font-bold text-slate-400">{i + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-700">{r.employeeName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{r.employeeCode}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{r.departmentName || '—'}</td>
                                            <td className="px-4 py-3 text-center font-bold text-slate-600">{r.actualWorkingDays ?? '—'}</td>
                                            <td className="px-4 py-3 text-right text-sm text-slate-700">{fmt(r.actualWorkingSalary)}</td>
                                            <td className="px-4 py-3 text-right text-sm text-amber-600">{fmt(r.overtimePay)}</td>
                                            <td className="px-4 py-3 text-right text-sm text-blue-600">{fmt(r.totalAllowances)}</td>
                                            <td className="px-4 py-3 text-right text-sm text-rose-500">({fmt(bh)})</td>
                                            <td className="px-4 py-3 text-right font-black text-violet-700">{fmt(r.netSalary)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <button className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 transition-colors mx-auto">
                                                    <FileText size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {/* Total row */}
                                <tr className="bg-violet-100 border-t-2 border-violet-300">
                                    <td colSpan={4} className="px-4 py-3 text-xs font-black text-violet-800 uppercase">TỔNG CỘNG ({totals.count} NV)</td>
                                    <td className="px-4 py-3 text-right font-black text-violet-800">{fmt(filtered.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0))}</td>
                                    <td className="px-4 py-3 text-right font-black text-violet-800">{fmt(filtered.reduce((s, r) => s + (r.overtimePay || 0), 0))}</td>
                                    <td className="px-4 py-3 text-right font-black text-violet-800">{fmt(filtered.reduce((s, r) => s + (r.totalAllowances || 0), 0))}</td>
                                    <td className="px-4 py-3 text-right font-black text-violet-800">({fmt(totals.bhnv)})</td>
                                    <td className="px-4 py-3 text-right font-black text-violet-800">{fmt(totals.net)}</td>
                                    <td />
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && filtered.length === 0 && selectedPeriod && (
                <div className="card flex flex-col items-center justify-center py-20 gap-4 text-center">
                    <DollarSign size={48} className="text-slate-200" />
                    <p className="text-slate-400 font-bold">Chưa có dữ liệu lương cho kỳ này.</p>
                    <p className="text-slate-300 text-sm">Hãy thực hiện Tính lương trong trang "Tính lương & Thuế" trước.</p>
                </div>
            )}

            {detailRecord && <PayslipDetailModal record={detailRecord} onClose={() => setDetailRecord(null)} />}
        </div>
    );
}
