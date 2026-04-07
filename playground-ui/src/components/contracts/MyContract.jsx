import { useState, useEffect } from 'react';
import '../employee/EmployeeFlat.css';
import {
    FileText,
    CheckCircle,
    Clock,
    Download,
    Printer,
    FileSignature,
    Loader2
} from 'lucide-react';

import { api } from '../../api';
import toast from 'react-hot-toast';
import ContractTemplate from './ContractTemplate';
import SignatureModal from './SignatureModal';

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
            toast.error('Không thể tải thông vị hợp đồng');
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
            link.setAttribute('download', `HopDong_CuaToi_${contract.contractNumber}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch {
            toast.error('Lỗi khi tải hợp đồng');
        }
    };

    if (loading) return (
        <div className="ef-wrap" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <strong>Đang truy xuất hồ sơ hợp đồng...</strong>
        </div>
    );

    if (!contract) return (
        <div className="ef-wrap" style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '10px' }}>Chưa Có Hợp Đồng</h3>
            <p style={{ color: '#555' }}>Bạn chưa có dữ liệu hợp đồng lao động trên hệ thống.</p>
        </div>
    );

    const isActive = contract.status === 'Active';
    const isWaiting = contract.status === 'WaitingSign';

    const getContractTypeName = (type) => {
        const types = { 'Probation': 'Thử việc', 'FixedTerm': 'Có thời hạn', 'Indefinite': 'Vô thời hạn', 'Seasonal': 'Thời vụ', 'PartTime': 'Bán thời gian' };
        return types[type] || type;
    };

    return (
        <div className="ef-wrap">


            <div className="ef-toolbar print:hidden">
                <div className="ef-toolbar-title">
                    <FileText size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ textTransform: 'uppercase' }}>HỒ SƠ HỢP ĐỒNG LAO ĐỘNG</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleDownload} className="ef-btn">
                        <Download size={14} style={{ marginRight: '6px' }} /> TẢI XUỐNG
                    </button>
                    {isWaiting && (
                        <button 
                            onClick={() => setShowSignModal(true)} 
                            className="ef-btn"
                            style={{ background: '#4f46e5', color: '#fff', border: 'none', fontWeight: 'bold' }}
                        >
                            <FileSignature size={14} style={{ marginRight: '6px' }} /> KÝ XÁC NHẬN (E-SIGN)
                        </button>
                    )}
                    <button onClick={() => window.print()} className="ef-btn">
                        <Printer size={14} style={{ marginRight: '6px' }} /> IN VĂN BẢN
                    </button>
                    {onBack && <button onClick={onBack} className="ef-btn">QUAY LẠI</button>}
                </div>
            </div>

            <div className="ef-table-wrap print:hidden" style={{ margin: '15px 15px 20px 15px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                <table className="ef-table no-top-border">
                    <tbody>
                        <tr>
                            <td style={{ width: '20%', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Số Hiệu HĐ</td>
                            <td style={{ fontWeight: 'bold' }}>{contract.contractNumber}</td>
                            <td style={{ width: '20%', fontWeight: 'bold', backgroundColor: '#fafafa' }}>Loại Hợp Đồng</td>
                            <td>{(getContractTypeName(contract.contractType) || '').toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: 'bold', backgroundColor: '#fafafa' }}>Trạng Thái</td>
                            <td colSpan="3" className={`c ${isActive ? 'ef-text-ok' : 'ef-text-miss'}`} style={{ fontWeight: 'bold', textAlign: 'left' }}>
                                {isActive ? 'ĐANG HIỆU LỰC' : 'CHỜ KÝ XÁC NHẬN'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* ── Contract Body ── */}
            <div style={{ border: '1px solid #ccc', padding: '30px', backgroundColor: '#fff', minHeight: '800px', margin: '0 1px' }}>
                <ContractTemplate contract={contract} />
                
                <div className="print:hidden" style={{ marginTop: '40px', paddingTop: '15px', borderTop: '1px solid #eee', fontSize: '11px', color: '#888' }}>
                    Văn bản này được tạo tự động bởi hệ thống quản trị nhân sự EHRM. Mọi dấu hiệu chỉnh sửa thủ công đối với văn bản xuất file đều làm mất giá trị pháp lý.
                </div>
            </div>

            {showSignModal && (
                <SignatureModal onClose={() => setShowSignModal(false)} onConfirm={handleSignConfirm} />
            )}
        </div>
    );
}
