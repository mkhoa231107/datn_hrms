import { useState, useEffect } from 'react';
import {
    FileText, CheckCircle, Clock, Download,
    Printer, FileSignature, RefreshCw, AlertTriangle,
    Calendar, Hash, Tag, ChevronRight, Shield
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

const fmt = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function MyContract({ user, onSignSuccess, onBack }) {
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showSignModal, setShowSignModal] = useState(false);

    const fetchMyContract = async () => {
        setLoading(true);
        try {
            const response = await api.get('/contracts');
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
                <p className="text-sm text-slate-400 max-w-sm font-medium">
                    Bạn chưa có dữ liệu hợp đồng lao động trên hệ thống. Vui lòng liên hệ bộ phận nhân sự.
                </p>
            </div>
        </div>
    );

    const isActive = contract.status === 'Active';
    const isWaiting = contract.status === 'WaitingSign';
    const typeName = CONTRACT_TYPES[contract.contractType] || contract.contractType;

    return (
        <div className="flex flex-col gap-6 animate-fade-up max-w-5xl mx-auto pb-10">

            {/* ── Action Bar ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Hợp Đồng Lao Động</h3>
                        <p className="text-xs text-slate-400 font-medium">Hồ sơ hợp đồng của bạn với công ty</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isWaiting && (
                        <button
                            onClick={() => setShowSignModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                        >
                            <FileSignature size={14} /> KÝ XÁC NHẬN (E-SIGN)
                        </button>
                    )}
                    <button onClick={handleDownload}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={14} /> TẢI XUỐNG
                    </button>
                    <button onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Printer size={14} /> IN ẤN
                    </button>
                    {onBack && (
                        <button onClick={onBack}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                            Quay lại
                        </button>
                    )}
                </div>
            </div>

            {/* ── Status Banner ── */}
            {isWaiting && (
                <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl print:hidden">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-800">Hợp đồng đang chờ chữ ký của bạn</p>
                        <p className="text-xs text-amber-600 font-medium">Vui lòng xem xét và ký xác nhận để hợp đồng có hiệu lực pháp lý.</p>
                    </div>
                    <button
                        onClick={() => setShowSignModal(true)}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-bold rounded-xl hover:bg-amber-600 transition-all flex-shrink-0"
                    >
                        Ký ngay <ChevronRight size={14} />
                    </button>
                </div>
            )}

            {/* ── Contract Metadata Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
                {[
                    { icon: Hash, label: 'Số hiệu HĐ', value: contract.contractNumber, color: 'indigo' },
                    { icon: Tag, label: 'Loại hợp đồng', value: typeName?.toUpperCase(), color: 'violet' },
                    { icon: Calendar, label: 'Ngày ký', value: fmt(contract.signedDate || contract.startDate), color: 'blue' },
                    { icon: isActive ? CheckCircle : Clock, label: 'Trạng thái', value: isActive ? 'HIỆU LỰC' : 'CHỜ KÝ', color: isActive ? 'emerald' : 'amber' },
                ].map((item) => (
                    <div key={item.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${item.color}-50 text-${item.color}-600`}>
                            <item.icon size={16} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
                        <p className={`text-sm font-black text-${item.color === 'emerald' ? 'emerald' : item.color === 'amber' ? 'amber' : 'slate'}-${item.color === 'emerald' || item.color === 'amber' ? '600' : '800'}`}>
                            {item.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Contract Document Body ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 print:hidden">
                    <Shield size={14} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nội dung hợp đồng</span>
                </div>
                <div className="p-8" style={{ minHeight: '700px' }}>
                    <ContractTemplate contract={contract} />
                    <div className="mt-10 pt-4 border-t border-slate-100 print:hidden">
                        <p className="text-[10px] text-slate-400 font-medium italic text-center">
                            Văn bản này được tạo tự động bởi hệ thống quản trị nhân sự HRMS. Mọi dấu hiệu chỉnh sửa thủ công đối với văn bản xuất file đều làm mất giá trị pháp lý.
                        </p>
                    </div>
                </div>
            </div>

            {showSignModal && (
                <SignatureModal onClose={() => setShowSignModal(false)} onConfirm={handleSignConfirm} />
            )}
        </div>
    );
}
