import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { Calculator, Download, ChevronRight, Printer, AlertTriangle, RefreshCw, HandCoins, Calendar, Info, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function MyPayslip({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(false);
    const [initialFetch, setInitialFetch] = useState(true);

    useEffect(() => {
        fetchPeriods();
    }, []);

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/Payroll/periods');
            const data = response.data?.data || response.data || [];
            if (Array.isArray(data)) {
                const sorted = data.sort((a, b) => b.id - a.id);
                setPeriods(sorted);
                if (sorted.length > 0) {
                    const latest = sorted[0];
                    setSelectedPeriodId(latest.id);
                    await fetchPayslip(latest.id);
                }
            }
        } catch (e) {
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

    const selectedPeriod = periods.find(p => p.id == selectedPeriodId);
    const selectedPeriodName = selectedPeriod?.name || 'Kỳ lương';

    if (initialFetch) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <RefreshCw size={40} className="text-violet-500 animate-spin" />
                <p className="text-slate-400 font-bold text-sm">Đang tải dữ liệu lương...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-up max-w-5xl mx-auto pb-10">
            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-100">
                        <Wallet size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Phiếu lương chi tiết</h3>
                        <p className="text-xs text-slate-400 font-medium">Báo cáo thu nhập và khấu trừ hàng tháng</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            className="input !py-1.5 !pl-9 !pr-4 text-xs font-bold appearance-none bg-white cursor-pointer w-56"
                            value={selectedPeriodId}
                            onChange={e => handleSelectPeriod(e.target.value)}
                        >
                            {periods.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} {p.status === 'Locked' ? '🔒' : '📝'}
                                </option>
                            ))}
                        </select>
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <button onClick={() => window.print()} className="btn btn-ghost !p-2 text-slate-600">
                        <Printer size={18} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <RefreshCw size={32} className="text-violet-500 animate-spin" />
                    <p className="text-slate-400 font-bold text-xs">Đang truy xuất dữ liệu chi tiết...</p>
                </div>
            ) : payslip ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card flex flex-col gap-4 bg-indigo-50 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <TrendingUp size={100} className="text-indigo-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                                    <ArrowUpRight size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Tổng thu nhập</p>
                                    <h3 className="text-xl font-black text-indigo-900">{fmt(payslip.grossSalary)}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="card flex flex-col gap-4 bg-rose-50 relative overflow-hidden">
                            <div className="absolute -right-4 -bottom-4 opacity-10">
                                <TrendingDown size={100} className="text-rose-600" />
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center">
                                    <ArrowDownRight size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Khấu trừ & Thuế</p>
                                    <h3 className="text-xl font-black text-rose-900">{fmt(payslip.totalDeductions)}</h3>
                                </div>
                            </div>
                        </div>

                        <div className="card flex flex-col gap-4 bg-violet-600 text-white relative overflow-hidden shadow-xl shadow-violet-100 border-none">
                            <div className="absolute -right-4 -bottom-4 opacity-20">
                                <HandCoins size={100} className="text-white" />
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <HandCoins size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-violet-100 uppercase tracking-widest">Thực lĩnh (NET)</p>
                                    <h3 className="text-2xl font-black">{fmt(payslip.netSalary)}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Payslip View */}
                    <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                        {/* Company / Employee Info Header */}
                        <div className="px-8 py-10 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white font-black text-xl">HR</div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">HRMS SYSTEM CORP</h2>
                                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{selectedPeriodName}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold">
                                    <span className={`px-2 py-1 rounded-md ${selectedPeriod?.status === 'Locked' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {selectedPeriod?.status === 'Locked' ? 'CHỐT SỔ' : 'DỰ TOÁN'}
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span className="text-slate-500">ID: #{payslip.employeeCode}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 bg-white/60 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nhân viên</p>
                                    <p className="text-sm font-bold text-slate-700">{payslip.employeeName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phòng ban</p>
                                    <p className="text-sm font-bold text-slate-700">{payslip.departmentName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chức vụ</p>
                                    <p className="text-sm font-bold text-slate-700">{payslip.positionName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hình thức</p>
                                    <p className="text-sm font-bold text-slate-700">Chuyển khoản</p>
                                </div>
                            </div>
                        </div>

                        {/* Breakdown Ledger */}
                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Earnings Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÁC KHOẢN THU NHẬP</h4>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'Lương cơ bản (HĐLĐ)', val: payslip.basicSalary, sub: 'Mức lương cố định' },
                                            { label: 'Lương thực tế (Công)', val: payslip.actualWorkingSalary, sub: 'Tính theo ngày công thực tế', highlight: true },
                                            { label: 'Lương tăng ca (OT)', val: payslip.overtimePay, sub: 'Tiền làm thêm giờ đã duyệt' },
                                            { label: 'Phụ cấp & Thưởng', val: (payslip.totalAllowances || 0) + (payslip.bonus || 0), sub: 'Ăn trưa, xăng xe, thưởng KPI' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between group">
                                                <div>
                                                    <p className={`text-sm font-bold ${item.highlight ? 'text-violet-600' : 'text-slate-700'}`}>{item.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{item.sub}</p>
                                                </div>
                                                <span className={`text-sm font-black ${item.highlight ? 'text-violet-600' : 'text-slate-600'}`}>{fmt(item.val)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t-2 border-slate-50 flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Tổng thu nhập (A)</span>
                                        <span className="text-lg font-black text-slate-800">{fmt(payslip.grossSalary)}</span>
                                    </div>
                                </div>

                                {/* Deductions Column */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                        <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">CÁC KHOẢN KHẤU TRỪ</h4>
                                    </div>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'BHXH (8%)', val: payslip.socialInsurance },
                                            { label: 'BHYT (1.5%)', val: payslip.healthInsurance },
                                            { label: 'BHTN (1%)', val: payslip.unemploymentInsurance },
                                            { label: 'Thuế TNCN (Tạm tính)', val: payslip.personalIncomeTax, warning: true },
                                            { label: 'Khấu trừ khác', val: payslip.otherDeductions, sub: 'Vi phạm, trễ giờ, v.v.' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <div>
                                                    <p className={`text-sm font-bold ${item.warning ? 'text-rose-500' : 'text-slate-700'}`}>{item.label}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{item.sub || 'Theo quy định nhà nước'}</p>
                                                </div>
                                                <span className={`text-sm font-black ${item.warning ? 'text-rose-500' : 'text-slate-600'}`}>({fmt(item.val)})</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t-2 border-slate-50 flex items-center justify-between">
                                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Tổng khấu trừ (B)</span>
                                        <span className="text-lg font-black text-slate-800">({fmt(payslip.totalDeductions)})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Net Footer */}
                        <div className="px-8 py-8 bg-violet-600 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-1">
                                <h3 className="text-xl font-black uppercase tracking-tight">Thực lĩnh chuyển khoản (A - B)</h3>
                                <p className="text-xs text-violet-200 font-bold opacity-80 uppercase tracking-widest">Thanh toán qua ngân hàng vào ngày 05 hàng tháng</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-black tracking-tight">{fmt(payslip.netSalary)}</span>
                                <span className="text-[10px] font-bold text-violet-200 bg-white/10 px-2 py-0.5 rounded mt-1">ĐÃ BAO GỒM TẤT CẢ PHỤ CẤP</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 print:hidden">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-400 flex-shrink-0">
                            <Info size={20} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">Thông tin hỗ trợ</p>
                            <p className="text-xs text-slate-400 leading-relaxed font-medium">
                                Phiếu lương này được trích xuất tự động từ hệ thống quản lý nhân sự. Nếu có bất kỳ thắc mắc nào về số ngày công, mức lương hoặc các khoản khấu trừ, vui lòng liên hệ bộ phận <strong>C&B (Phòng Nhân Sự)</strong> trước ngày 08 hàng tháng để được hỗ trợ giải đáp.
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="card flex flex-col items-center justify-center py-32 gap-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-2">
                        <h4 className="text-lg font-bold text-slate-800">Không tìm thấy phiếu lương</h4>
                        <p className="text-sm text-slate-400 max-w-sm font-medium">Dữ liệu lương cho kỳ này có thể chưa được chốt hoặc chưa được phê duyệt để hiển thị cho nhân viên.</p>
                    </div>
                    <button onClick={fetchPeriods} className="btn btn-primary !px-8">
                        Thử lại
                    </button>
                </div>
            )}
        </div>
    );
}
