import { useState, useEffect } from 'react';
import {
    FileText, CheckCircle, Clock, Download,
    Printer, FileSignature, RefreshCw, AlertTriangle,
    Calendar, Hash, Tag, ChevronRight, Shield,
    Building2, User, Banknote, CalendarDays
} from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import ContractTemplate from './ContractTemplate';
import SignatureModal from './SignatureModal';

const CONTRACT_TYPES = {
    Probation: 'Thử việc',
    FixedTerm: 'Có thời hạn',
    Indefinite: 'Vô thời hạn',
    Seasonal: 'Thời vụ',
    PartTime: 'Bán thời gian'
};

const fmt = (d) => d
    ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '—';

const fmtMoney = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function MyContract({ user, onSignSuccess, onBack }) {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSignModal, setShowSignModal] = useState(false);
    const [showDocument, setShowDocument] = useState(false);

    const fetchMyContract = async () => {
        setLoading(true);
        try {
            const response = await api.get('/contracts?personal=true');
            if (response.data?.length > 0) {
                const sorted = [...response.data].sort((a, b) => b.id - a.id);
                setContract(sorted[0]);
            }
        } catch {
            toast.error('Không thể tải thông tin hợp đồng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMyContract(); }, []);

    const handleSignConfirm = async (signatureData) => {
        try {
            await api.post(`/contracts/${contract.id}/sign`, { signature: signatureData });
            toast.success('Ký hợp đồng thành công!');
            setShowSignModal(false);
            await fetchMyContract();
            if (onSignSuccess) await onSignSuccess();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi ký hợp đồng');
        }
    };

    const handleDownload = async () => {
        try {
            const response = await api.get(`/contracts/${contract.id}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `HopDong_${contract.contractNumber}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error('Lỗi khi tải hợp đồng');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <RefreshCw size={40} className="text-violet-500 animate-spin" />
            <p className="text-slate-400 font-bold text-sm">Đang truy xuất hồ sơ hợp đồng...</p>
        </div>
    );

    if (!contract) return (
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-800">Chưa Có Hợp Đồng</h4>
                <p className="text-sm text-slate-400 max-w-sm font-medium text-justify">
                    Bạn chưa có dữ liệu hợp đồng lao động trên hệ thống. Vui lòng liên hệ bộ phận nhân sự.
                </p>
            </div>
        </div>
    );

    const isActive = contract.status === 'Active';
    const isWaiting = contract.status === 'WaitingSign';
    const typeName = CONTRACT_TYPES[contract.contractType] || contract.contractType;

    const statusBadge = () => {
        if (isActive) return { label: 'ĐANG HIỆU LỰC', color: 'emerald' };
        if (isWaiting) return { label: 'CHỜ KÝ XÁC NHẬN', color: 'amber' };
        return { label: contract.status?.toUpperCase(), color: 'slate' };
    };
    const badge = statusBadge();

    return (
        <div className="p-6 animate-fade-up">
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <FileText className="text-indigo-600" size={28} />
                        Hợp Đồng Lao Động của tôi
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Hồ sơ hợp đồng giữa bạn và công ty</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full bg-${badge.color}-100 text-${badge.color}-700`}>
                            {badge.label}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isWaiting && (
                        <button
                            onClick={() => setShowSignModal(true)}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <FileSignature size={14} /> KÝ XÁC NHẬN (E-SIGN)
                        </button>
                    )}
                    <button onClick={handleDownload} className="btn btn-ghost shadow-sm flex items-center gap-2">
                        <Download size={14} /> Tải xuống
                    </button>
                    <button onClick={() => window.print()} className="btn btn-ghost shadow-sm flex items-center gap-2">
                        <Printer size={14} /> In ấn
                    </button>
                    <button onClick={() => setShowDocument(!showDocument)} className="btn btn-ghost shadow-sm flex items-center gap-2">
                        <FileText size={14} /> {showDocument ? 'Ẩn HĐ' : 'Xem HĐ'}
                    </button>
                </div>
            </div>

            {/* ── Alert Banner ── */}
            {isWaiting && (
                <div className="mb-6 flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl print:hidden">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Clock size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800 text-justify">Hợp đồng đang chờ chữ ký điện tử của bạn</p>
                        <p className="text-xs text-amber-600 font-medium text-justify">Vui lòng xem xét nội dung và ký xác nhận để hợp đồng có hiệu lực pháp lý.</p>
                    </div>
                    <button
                        onClick={() => setShowSignModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all flex-shrink-0 shadow-sm"
                    >
                        Ký ngay <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* ── KPI Cards (CNB_HR pattern) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 print:hidden">
                {[
                    { icon: Hash, label: 'Số hợp đồng', value: contract.contractNumber, color: 'indigo' },
                    { icon: Tag, label: 'Loại hợp đồng', value: typeName?.toUpperCase(), color: 'violet' },
                    { icon: CalendarDays, label: 'Hiệu lực từ', value: fmt(contract.startDate), color: 'blue' },
                    { icon: isActive ? CheckCircle : Clock, label: 'Trạng thái', value: badge.label, color: badge.color === 'emerald' ? 'emerald' : badge.color === 'amber' ? 'amber' : 'slate' },
                ].map((item) => (
                    <div key={item.label} className={`card !p-4 flex items-center gap-3 border-l-4 border-l-${item.color}-500 shadow-sm`}>
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${item.color}-50 text-${item.color}-600 shrink-0`}>
                            <item.icon size={16} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                            <p className="text-xs font-black text-slate-700 truncate">{item.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Contract Detail Info Card ── */}
            <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm mb-6 print:hidden">
                <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin chi tiết hợp đồng</span>
                </div>
                <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { label: 'Họ và tên NLĐ', value: contract.employeeName || user?.fullName || '—', icon: User },
                        { label: 'Phòng ban / Chức vụ', value: `${contract.departmentName || '—'} / ${contract.positionName || '—'}`, icon: Building2 },
                        { label: 'Mức lương cơ bản', value: fmtMoney(contract.basicSalary), icon: Banknote },
                        { label: 'Ngày bắt đầu', value: fmt(contract.startDate), icon: Calendar },
                        { label: 'Ngày kết thúc', value: contract.endDate ? fmt(contract.endDate) : 'Vô thời hạn', icon: Calendar },
                        { label: 'Ngày ký', value: fmt(contract.signedDate || contract.startDate), icon: FileSignature },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                                <Icon size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                                <p className="text-sm font-bold text-slate-700 text-justify">{value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Contract Document Body (toggle) ── */}
            {showDocument && (
                <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm mb-6">
                    <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
                        <Shield size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nội dung hợp đồng lao động</span>
                    </div>
                    <div className="p-4 sm:p-8 [&_p]:text-justify [&_span]:text-justify [&_li]:text-justify" style={{ minHeight: '700px' }}>
                        <ContractTemplate contract={contract} />
                        <div className="mt-10 pt-4 border-t border-slate-100">
                            <p className="text-[10px] text-slate-400 font-medium italic text-center">
                                Văn bản này được tạo tự động bởi hệ thống quản trị nhân sự HRMS. Mọi dấu hiệu chỉnh sửa thủ công đối với văn bản xuất file đều làm mất giá trị pháp lý.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Notice Footer (CNB_HR pattern) ── */}
            <div className="card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3 print:hidden">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <Shield size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 leading-tight text-justify">
                    Hợp đồng lao động này có giá trị pháp lý. Nếu có bất kỳ thắc mắc nào về nội dung hoặc điều khoản, vui lòng liên hệ bộ phận <strong>Nhân sự (HR)</strong> để được hỗ trợ kịp thời.
                </span>
            </div>

            {showSignModal && (
                <SignatureModal onClose={() => setShowSignModal(false)} onConfirm={handleSignConfirm} />
            )}
        </div>
    );
}