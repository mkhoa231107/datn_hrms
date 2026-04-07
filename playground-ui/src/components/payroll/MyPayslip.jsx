import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { Calculator, Download, ChevronRight, Printer, AlertTriangle, RefreshCw, HandCoins, Calendar, Info } from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

function Breadcrumb({ items }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            {items.map((item, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={12} style={{ color: '#cbd5e1' }} />}
                    <span style={{ color: i === items.length - 1 ? '#1e293b' : '#94a3b8', fontWeight: i === items.length - 1 ? 600 : 400 }}>
                        {item}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
}

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
                // Sắp xếp kỳ lương mới nhất lên đầu
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

    const selectedPeriodName = periods.find(p => p.id == selectedPeriodId)?.name || 'Kỳ lương';

    const breadcrumb = ['Cá nhân', 'Bảng lương', selectedPeriodName];

    if (initialFetch) {
        return (
            <div className="ef-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: '#94a3b8' }} />
            </div>
        );
    }

    return (
        <div className="ef-wrap animate-fade-in pb-20">
            {/* ── Toolbar ── */}
            <div className="ef-toolbar print:hidden" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div className="ef-toolbar-title">
                    <HandCoins size={15} style={{ color: '#475569' }} />
                    <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                        Phiếu Lương Cá Nhân
                    </strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => window.print()} className="ef-btn">
                        <Printer size={13} /> In phiếu lương
                    </button>
                </div>
            </div>

            {/* ── Breadcrumb ── */}
            <div className="print:hidden" style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                <Breadcrumb items={breadcrumb} />
            </div>

            {/* ── Filter Row ── */}
            <div className="print:hidden" style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} /> Chọn kỳ lương
                    </label>
                    <select
                        className="ef-select"
                        style={{ width: '260px' }}
                        value={selectedPeriodId}
                        onChange={e => handleSelectPeriod(e.target.value)}
                    >
                        {periods.length === 0 && <option value="">— Chưa có kỳ lương —</option>}
                        {periods.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} {p.status === 'Locked' ? '(Đã chốt)' : '(Dự toán)'}
                            </option>
                        ))}
                    </select>
                </div>
                {loading && <RefreshCw size={15} className="animate-spin" style={{ color: '#94a3b8', marginBottom: '6px' }} />}
            </div>

            {/* ── Payload ── */}
            {!loading && payslip ? (
                <div className="print-section" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
                    {/* Header Paga */}
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Phiếu Lương Chi Tiết
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>{selectedPeriodName}</p>
                    </div>

                    {/* Employee Info */}
                    <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Họ tên nhân viên</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{payslip.employeeName}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Mã nhân viên</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500, fontFamily: 'monospace' }}>{payslip.employeeCode}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Phòng ban</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{payslip.departmentName}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Chức danh</div>
                            <div style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>{payslip.positionName}</div>
                        </div>
                    </div>

                    {/* Summary Boxes */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Tổng thu nhập</div>
                            <div style={{ fontSize: '18px', color: '#1e293b', fontWeight: 700 }}>{fmt(payslip.grossSalary)}</div>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '4px' }}>Tổng khấu trừ</div>
                            <div style={{ fontSize: '18px', color: '#475569', fontWeight: 700 }}>{fmt(payslip.totalDeductions)}</div>
                        </div>
                        <div style={{ border: '1px solid #cbd5e1', background: '#f8fafc', padding: '16px', borderRadius: '6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: '#475569', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Thực lĩnh (NET)</div>
                            <div style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800 }}>{fmt(payslip.netSalary)}</div>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>Khoản mục</th>
                                <th style={{ textAlign: 'right', padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 600, width: '200px' }}>Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* A. THU NHẬP */}
                            <tr>
                                <td colSpan={2} style={{ padding: '12px 12px 8px', fontWeight: 700, color: '#1e293b', fontSize: '12px', textTransform: 'uppercase' }}>
                                    A. Thu nhập (Earnings)
                                </td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Lương cơ bản (Theo HĐLĐ)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>{fmt(payslip.basicSalary)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Lương thực tế (Theo ngày công)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{fmt(payslip.actualWorkingSalary)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Lương làm thêm giờ (Overtime)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{fmt(payslip.overtimePay)}</td>
                            </tr>
                            {(payslip.totalAllowances > 0 || payslip.bonus > 0) && (
                                <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                    <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Phụ cấp & Thưởng</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 600 }}>{fmt((payslip.totalAllowances || 0) + (payslip.bonus || 0))}</td>
                                </tr>
                            )}
                            <tr>
                                <td style={{ padding: '12px 12px', fontWeight: 600, color: '#334155' }}>Tổng cộng thu nhập</td>
                                <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700, color: '#1e293b' }}>{fmt(payslip.grossSalary)}</td>
                            </tr>

                            {/* B. KHẤU TRỪ */}
                            <tr>
                                <td colSpan={2} style={{ padding: '24px 12px 8px', fontWeight: 700, color: '#1e293b', fontSize: '12px', textTransform: 'uppercase' }}>
                                    B. Khấu trừ (Deductions)
                                </td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Bảo hiểm Xã hội (BHXH)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmt(payslip.socialInsurance)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Bảo hiểm Y tế (BHYT)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmt(payslip.healthInsurance)}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Bảo hiểm Thất nghiệp (BHTN)</td>
                                <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmt(payslip.unemploymentInsurance)}</td>
                            </tr>
                            {payslip.personalIncomeTax > 0 && (
                                <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                    <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Thuế TNCN (Tạm thu)</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmt(payslip.personalIncomeTax)}</td>
                                </tr>
                            )}
                            {payslip.otherDeductions > 0 && (
                                <tr style={{ borderBottom: '1px dashed #e2e8f0' }}>
                                    <td style={{ padding: '10px 12px 10px 24px', color: '#475569' }}>Trừ khác (Đi trễ, vi phạm,...)</td>
                                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#475569' }}>{fmt(payslip.otherDeductions)}</td>
                                </tr>
                            )}
                            <tr>
                                <td style={{ padding: '12px 12px', fontWeight: 600, color: '#334155' }}>Tổng cộng khấu trừ</td>
                                <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{fmt(payslip.totalDeductions)}</td>
                            </tr>

                             {/* TOTAL NET */}
                             <tr>
                                <td style={{ padding: '16px 12px', fontWeight: 700, color: '#0f172a', fontSize: '14px', borderTop: '2px solid #cbd5e1' }}>
                                    THỰC LĨNH CHUYỂN KHOẢN (NET)
                                </td>
                                <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '16px', borderTop: '2px solid #cbd5e1' }}>
                                    {fmt(payslip.netSalary)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                     <div className="print:hidden" style={{ marginTop: '32px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                            <Info size={14} /> Ghi chú bảng lương
                        </div>
                        Số liệu trên được tính toán tự động dựa trên mức lương HĐLĐ, ngày công phê duyệt và công thức từ Phòng Nhân Sự. Mọi thắc mắc liên quan (công, tăng ca, bảo hiểm), vui lòng liên hệ nhân sự phụ trách trong vòng 03 ngày làm việc kể từ lúc nhận phiếu lương.
                    </div>
                </div>
            ) : !loading && !payslip ? (
                <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                    <AlertTriangle size={40} style={{ margin: '0 auto 14px', color: '#cbd5e1' }} />
                    <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>Không có dữ liệu bảng lương</p>
                    <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Kỳ lương này chưa được chốt hoặc bạn không có dữ liệu để hiển thị.</p>
                </div>
            ) : null}
        </div>
    );
}
