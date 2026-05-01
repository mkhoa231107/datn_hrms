import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { 
    FileText, Calendar, Download, Search, CheckCircle2,
    Users, CreditCard, TrendingUp, ShieldCheck
} from 'lucide-react';
import ExcelJS from 'exceljs';
import EmptyState from '../ui/EmptyState';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);
const fmtNum = (val, dec = 1) => val == null ? '—' : Number(val).toFixed(dec);

export default function PayrollReport({ user }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        api.get('/Payroll/periods')
            .then(res => setPeriods(res.data?.data || res.data || []))
            .catch(() => toast.error('Không thể tải danh sách kỳ lương'));
    }, []);

    const handleSelectPeriod = async (id) => {
        if (!id) {
            setSelectedPeriod(null);
            setRecords([]);
            return;
        }
        const period = periods.find(p => p.id === parseInt(id));
        setSelectedPeriod(period);
        setLoading(true);
        try {
            const res = await api.get(`/Payroll/periods/${period.id}/records`);
            setRecords(res.data?.data || res.data || []);
        } catch {
            toast.error('Lỗi tải dữ liệu báo cáo lương');
        } finally {
            setLoading(false);
        }
    };

    const handleExportExcel = async () => {
        if (!records.length) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('BaoCaoLuong');
            
            worksheet.columns = [
                { header: 'STT', key: 'stt', width: 5 },
                { header: 'Mã NV', key: 'empCode', width: 15 },
                { header: 'Họ tên', key: 'empName', width: 25 },
                { header: 'Phòng ban', key: 'deptName', width: 20 },
                { header: 'Chức vụ', key: 'posName', width: 20 },
                { header: 'Lương CB (Theo chuẩn)', key: 'basicSal', width: 20 },
                { header: 'Tổng công', key: 'days', width: 12 },
                { header: 'Lương công', key: 'actualSal', width: 20 },
                { header: 'Tăng ca', key: 'otPay', width: 15 },
                { header: 'Phụ cấp', key: 'allowance', width: 15 },
                { header: 'Bảo hiểm', key: 'insurance', width: 15 },
                { header: 'Thuế TNCN', key: 'tax', width: 15 },
                { header: 'Thực nhận (Net)', key: 'net', width: 20 }
            ];
            
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1D5DB' } };
            
            filteredRecords.forEach((r, idx) => {
                worksheet.addRow({
                    stt: idx + 1,
                    empCode: r.employeeCode,
                    empName: r.employeeName,
                    deptName: r.departmentName,
                    posName: r.positionName,
                    basicSal: r.basicSalary,
                    days: r.actualWorkingDays,
                    actualSal: r.actualWorkingSalary,
                    otPay: r.overtimePay,
                    allowance: r.totalAllowances,
                    insurance: (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0),
                    tax: r.personalIncomeTax,
                    net: r.netSalary
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Bao_Cao_Luong_${selectedPeriod?.name?.replace(/ /g, '_')}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            toast.success('Xuất file thành công');
        } catch {
            toast.error('Lỗi khi xuất Excel');
        }
    };

    const filteredRecords = records.filter(r => 
        r.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.departmentName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totals = {
        ltg: filteredRecords.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0),
        ot: filteredRecords.reduce((s, r) => s + (r.overtimePay || 0), 0),
        bh: filteredRecords.reduce((s, r) => s + (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0), 0),
        tax: filteredRecords.reduce((s, r) => s + (r.personalIncomeTax || 0), 0),
        net: filteredRecords.reduce((s, r) => s + (r.netSalary || 0), 0)
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            <div className="card bg-slate-800 text-white !p-8 flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <FileText size={28} /> Báo Cáo Lương Chi Tiết
                    </h2>
                    <p className="text-slate-300 text-sm max-w-md">Tra cứu và xuất báo cáo chi tiết thu nhập, thuế, bảo hiểm của nhân viên theo từng kỳ lương.</p>
                </div>
            </div>

            <div className="card bg-slate-50/50 border-2 border-slate-100 flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex flex-col gap-2 flex-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Chọn Kỳ Lương
                    </label>
                    <select className="input font-bold text-sm" onChange={e => handleSelectPeriod(e.target.value)}>
                        <option value="">-- Tất cả kỳ lương --</option>
                        {periods.map(p => <option key={p.id} value={p.id}>{p.name} - {p.status}</option>)}
                    </select>
                </div>
                {selectedPeriod && (
                    <div className="flex flex-col gap-2 flex-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Search size={12} /> Tìm kiếm nhân viên
                        </label>
                        <input 
                            type="text" 
                            className="input text-sm" 
                            placeholder="Nhập tên, mã NV, phòng ban..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}
                <div className="flex gap-2">
                    <button 
                        className="btn btn-primary !py-2.5 flex items-center gap-2"
                        disabled={!selectedPeriod || filteredRecords.length === 0}
                        onClick={handleExportExcel}
                    >
                        <Download size={16} /> Xuất Excel
                    </button>
                </div>
            </div>

            {selectedPeriod && !loading && filteredRecords.length > 0 && (
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
                            <h3 className="text-xl font-black text-slate-800">{fmt(totals.bh + totals.tax)}</h3>
                        </div>
                    </div>
                    <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số nhân viên</p>
                            <h3 className="text-xl font-black text-slate-800">{filteredRecords.length} NV</h3>
                        </div>
                    </div>
                </div>
            )}

            {loading && <div className="text-center text-slate-400 py-10">Đang tải dữ liệu...</div>}

            {selectedPeriod && !loading && filteredRecords.length === 0 && (
                <EmptyState 
                    icon="file" 
                    title="Không có dữ liệu" 
                    description="Không tìm thấy bản ghi lương nào cho kỳ và tiêu chí tìm kiếm này." 
                />
            )}

            {selectedPeriod && !loading && filteredRecords.length > 0 && (
                <div className="card !p-0 overflow-hidden border-2 border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
                                    <th className="px-4 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng ban</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Lương CB</th>
                                    <th className="px-4 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Công</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Phụ cấp</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảm trừ</th>
                                    <th className="px-4 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest bg-violet-50/50">Thực lĩnh</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredRecords.map((r, idx) => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-4 text-xs font-bold text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700">{r.employeeName}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{r.employeeCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs font-bold text-slate-500">{r.departmentName}</span>
                                        </td>
                                        <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(r.basicSalary)}</td>
                                        <td className="px-4 py-4 text-center font-bold text-slate-600">{fmtNum(r.actualWorkingDays)}</td>
                                        <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(r.totalAllowances)}</td>
                                        <td className="px-4 py-4 text-right font-medium text-rose-500">
                                            ({fmt((r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0) + (r.personalIncomeTax || 0))})
                                        </td>
                                        <td className="px-4 py-4 text-right font-black text-violet-600 bg-violet-50/30">{fmt(r.netSalary)}</td>
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
