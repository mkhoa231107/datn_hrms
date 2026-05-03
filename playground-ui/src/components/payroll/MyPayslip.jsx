import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    Wallet, Calendar, Printer, RefreshCw, AlertTriangle,
    ArrowUpRight, ArrowDownRight, HandCoins, TrendingUp,
    TrendingDown, Info, FileText, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function MyPayslip({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialFetch, setInitialFetch] = useState(true);
    const { isMobile } = useBreakpoint();

    useEffect(() => { fetchPeriods(); }, []);

    const decodeUTF8 = (str) => {
        try { return decodeURIComponent(escape(str)); } catch { return str; }
    };

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/Payroll/periods');
            const data = response.data?.data || response.data || [];
            if (Array.isArray(data)) {
                const parsePeriod = (name) => {
                    const match = name.match(/Tháng (\d+)\/(\d+)/i);
                    if (match) return new Date(parseInt(match[2]), parseInt(match[1]) - 1, 1);
                    return new Date(0);
                };
                const sorted = data.sort((a, b) => parsePeriod(a.name) - parsePeriod(b.name));
                const sanitized = sorted.map(p => ({ ...p, name: decodeUTF8(p.name) }));
                setPeriods(sanitized);
                if (sanitized.length > 0) {
                    const latest = sanitized[sanitized.length - 1];
                    setSelectedPeriodId(latest.id);
                    await fetchPayslip(latest.id);
                }
            }
        } catch {
            toast.error('Không thể tải danh sách kỳ lương');
        } finally {
            setInitialFetch(false);
        }
    };

    const fetchPayslip = async (periodId) => {
        if (!periodId) return;
        setLoading(true);
        try {
            const r = await api.get(`/Payroll/my-payslip/${periodId}`);
            setPayslip(r.data?.data || r.data);
        } catch {
            setPayslip(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPeriod = (id) => {
        setSelectedPeriodId(id);
        fetchPayslip(id);
    };

    // Generate static list of 12 months for 2026
    const currentYear = 2026;
    const staticMonths = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const name = `Tháng ${month.toString().padStart(2, '0')}/${currentYear}`;
        return { month, year: currentYear, name };
    });

    // Match static month to a real period ID from API
    const getPeriodIdForMonth = (month, year) => {
        const found = periods.find(p => {
            const match = p.name.match(/Tháng (\d+)\/(\d+)/i);
            return match && parseInt(match[1]) === month && parseInt(match[2]) === year;
        });
        return found ? found.id : `empty-${month}-${year}`;
    };

    const handleSelectMonth = (val) => {
        if (val.startsWith('empty-')) {
            setSelectedPeriodId(val);
            setPayslip(null);
        } else {
            setSelectedPeriodId(parseInt(val));
            fetchPayslip(parseInt(val));
        }
    };

    const selectedMonthObj = staticMonths.find(m => getPeriodIdForMonth(m.month, m.year) == selectedPeriodId);
    const displayPeriodName = selectedMonthObj ? selectedMonthObj.name : 'Chọn kỳ lương';
    const isLocked = periods.find(p => p.id == selectedPeriodId)?.status === 'Locked';

    if (initialFetch) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <RefreshCw size={40} className="text-violet-500 animate-spin" />
            <p className="text-slate-500 font-bold text-sm">Đang tải dữ liệu lương...</p>
        </div>
    );

    return (
        <div className="p-6 animate-fade-up">
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Wallet className="text-violet-600" size={28} />
                        Phiếu lương của tôi
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-sm">Báo cáo thu nhập và khấu trừ hàng tháng</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${isLocked ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isLocked ? '🔒 ĐÃ CHỐT SỔ' : '📝 DỰ TOÁN / CHƯA CÓ'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3 print:hidden">
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            className="input !py-2 !pl-9 !pr-4 text-xs font-black appearance-none bg-white cursor-pointer w-64 shadow-sm"
                            value={selectedPeriodId}
                            onChange={e => handleSelectMonth(e.target.value)}
                        >
                            {staticMonths.map(m => {
                                const pId = getPeriodIdForMonth(m.month, m.year);
                                return (
                                    <option key={m.name} value={pId}>
                                        {m.name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    <button onClick={() => !selectedPeriodId.toString().startsWith('empty-') && fetchPayslip(selectedPeriodId)} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    <button onClick={() => window.print()} className="btn btn-ghost shadow-sm">
                        <Printer size={16} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-4">
                    <RefreshCw size={32} className="text-violet-500 animate-spin" />
                    <p className="text-slate-400 font-bold text-xs">Đang truy xuất dữ liệu chi tiết...</p>
                </div>
            ) : payslip ? (
                <>
                    {/* ── KPI Cards (CNB_HR pattern) ── */}
                    <div className={isMobile ? 'kpi-scroll mb-6' : 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'}>
                        {[
                            { label: 'Tổng thu nhập (GROSS)', value: payslip.grossSalary, icon: ArrowUpRight, color: 'indigo', desc: 'Bao gồm lương + phụ cấp + OT' },
                            { label: 'Khấu trừ & Thuế', value: payslip.totalDeductions, icon: ArrowDownRight, color: 'rose', desc: 'BHXH + BHYT + BHTN + TNCN' },
                            { label: 'Thực lĩnh (NET)', value: payslip.netSalary, icon: HandCoins, color: 'violet', desc: 'Chuyển khoản ngày 05 hàng tháng' },
                        ].map(({ label, value, icon: Icon, color, desc }) => (
                            <div key={label} className={`card !p-4 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm`}>
                                <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
                                    <h3 className="text-lg font-black text-slate-800 truncate">{fmt(value)}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* ── Employee Info Card ── */}
                    <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm mb-6">
                        <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thông tin nhân viên — {displayPeriodName}</span>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                            {[
                                { label: 'Nhân viên', value: payslip.employeeName },
                                { label: 'Mã nhân viên', value: `#${payslip.employeeCode}` },
                                { label: 'Phòng ban', value: payslip.departmentName },
                                { label: 'Chức vụ', value: payslip.positionName },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
                                    <p className="text-sm font-bold text-slate-700">{value || '—'}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Detailed Payslip Table ── */}
                    <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm mb-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                            {/* Earnings Column */}
                            <div>
                                <div className="px-6 py-4 bg-emerald-50/40 border-b border-slate-100 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Các khoản thu nhập</h4>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {[
                                        { label: 'Lương cơ bản (HĐLĐ)', val: payslip.basicSalary, sub: 'Mức lương cố định theo hợp đồng' },
                                        { label: 'Lương thực tế (Công)', val: payslip.actualWorkingSalary, sub: 'Tính theo ngày công thực tế', highlight: true },
                                        { label: 'Lương tăng ca (OT)', val: payslip.overtimePay, sub: 'Tiền làm thêm giờ đã được duyệt' },
                                        { label: 'Phụ cấp & Thưởng', val: (payslip.totalAllowances || 0) + (payslip.bonus || 0), sub: 'Ăn trưa, xăng xe, thưởng KPI...' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                            <div>
                                                <p className={`text-sm font-bold ${item.highlight ? 'text-violet-600' : 'text-slate-700'}`}>{item.label}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">{item.sub}</p>
                                            </div>
                                            <span className={`text-sm font-black ${item.highlight ? 'text-violet-600' : 'text-slate-600'}`}>{fmt(item.val)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tổng thu nhập (A)</span>
                                    <span className="text-base font-black text-slate-800">{fmt(payslip.grossSalary)}</span>
                                </div>
                            </div>

                            {/* Deductions Column */}
                            <div>
                                <div className="px-6 py-4 bg-rose-50/40 border-b border-slate-100 flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-rose-500 rounded-full" />
                                    <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Các khoản khấu trừ</h4>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {[
                                        { label: 'BHXH (8%)', val: payslip.socialInsurance, sub: 'Theo quy định nhà nước' },
                                        { label: 'BHYT (1.5%)', val: payslip.healthInsurance, sub: 'Theo quy định nhà nước' },
                                        { label: 'BHTN (1%)', val: payslip.unemploymentInsurance, sub: 'Theo quy định nhà nước' },
                                        { label: 'Thuế TNCN (Tạm tính)', val: payslip.personalIncomeTax, sub: 'Biểu thuế lũy tiến', warning: true },
                                        { label: 'Khấu trừ khác', val: payslip.otherDeductions, sub: 'Vi phạm, trễ giờ, v.v.' },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors">
                                            <div>
                                                <p className={`text-sm font-bold ${item.warning ? 'text-rose-500' : 'text-slate-700'}`}>{item.label}</p>
                                                <p className="text-[10px] text-slate-500 font-bold">{item.sub}</p>
                                            </div>
                                            <span className={`text-sm font-black ${item.warning ? 'text-rose-500' : 'text-slate-600'}`}>({fmt(item.val)})</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tổng khấu trừ (B)</span>
                                    <span className="text-base font-black text-slate-800">({fmt(payslip.totalDeductions)})</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Footer */}
                        <div className="px-8 py-7 bg-violet-50 border-t-2 border-violet-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">Thực lĩnh chuyển khoản (A − B)</p>
                                <p className="text-xs text-slate-500 font-bold">Thanh toán qua ngân hàng vào ngày 05 hàng tháng</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-black tracking-tight text-slate-800">{fmt(payslip.netSalary)}</span>
                                <span className="text-[10px] font-black text-violet-600 bg-white border border-violet-200 px-2.5 py-1 rounded-lg mt-1 shadow-sm">ĐÃ BAO GỒM TẤT CẢ PHỤ CẤP</span>
                            </div>
                        </div>
                    </div>

                    {/* Info Note */}
                    <div className="card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3 print:hidden">
                        <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
                            <Info size={18} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 leading-tight">
                            Phiếu lương này được trích xuất tự động từ hệ thống HRMS. Nếu có thắc mắc, vui lòng liên hệ bộ phận <strong>C&B (Phòng Nhân Sự)</strong> trước ngày 08 hàng tháng.
                        </span>
                    </div>
                </>
            ) : (
                <div className="card flex flex-col items-center justify-center py-32 gap-6 text-center border-dashed border-2 border-slate-200 bg-slate-50/30">
                    <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-300 border border-slate-100">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-xl font-black text-slate-800">Chưa có dữ liệu {displayPeriodName}</h4>
                        <p className="text-sm text-slate-500 max-w-sm font-bold leading-relaxed">
                            Phiếu lương cho kỳ này chưa được khởi tạo hoặc chưa được phê duyệt chính thức trên hệ thống.
                        </p>
                    </div>
                    <button onClick={fetchPeriods} className="btn btn-primary !px-10 shadow-indigo-200">
                        <RefreshCw size={16} className="mr-2" /> Cập nhật lại
                    </button>
                </div>
            )}
        </div>
    );
}
