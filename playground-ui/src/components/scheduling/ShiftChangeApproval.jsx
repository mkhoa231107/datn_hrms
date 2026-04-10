import React, { useState, useEffect } from 'react';
import { Check, X, RefreshCw } from 'lucide-react';
import shiftChangeService from '../../services/shiftChangeService';
import toast from 'react-hot-toast';

export default function ShiftChangeApproval({ user, onBack }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
    
    // Reject modal
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let data = [];
            if (activeTab === 'pending') {
                data = await shiftChangeService.getPendingRequests();
            } else {
                data = await shiftChangeService.getAllRequests();
            }
            setRequests(data || []);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        if (!window.confirm("Xác nhận ĐỒNG Ý duyệt đơn đổi ca này? Hệ thống sẽ tự động cập nhật lịch làm việc của nhân sự.")) return;
        
        try {
            await shiftChangeService.approveRequest(id);
            toast.success("Duyệt đơn thành công");
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi khi duyệt đơn");
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectReason.trim()) {
            toast.error("Vui lòng nhập lý do từ chối");
            return;
        }

        try {
            await shiftChangeService.rejectRequest(rejectingId, rejectReason);
            toast.success("Đã từ chối đơn");
            setRejectingId(null);
            setRejectReason('');
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi khi từ chối đơn");
        }
    };

    const getStatusBadge = (status, label) => {
        let cls = 'bg-slate-100 text-slate-700';
        if (status === 'Pending') cls = 'bg-amber-100 text-amber-700';
        if (status === 'Approved') cls = 'bg-emerald-100 text-emerald-700';
        if (status === 'Rejected') cls = 'bg-red-100 text-red-700';

        return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
    };

    return (
        <div className="ef-wrap relative animate-fade-in">
            <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between', borderBottom: 'none' }}>
                <div className="ef-toolbar-title">
                    <RefreshCw size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Phê Duyệt Đơn Đổi Ca</strong>
                </div>
                {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
            </div>

            <div className="ef-tab-bar no-margin print:hidden">
                <div 
                    className={`ef-tab ${activeTab === 'pending' ? 'ef-tab-on' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    CHỜ PHÊ DUYỆT
                </div>
                <div 
                    className={`ef-tab ${activeTab === 'history' ? 'ef-tab-on' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    ĐÃ XỬ LÝ
                </div>
            </div>

            <div className="ef-table-wrap">
                <table className="ef-table no-top-border">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>Nhân sự</th>
                            <th style={{ width: '30%' }}>Thông tin đổi ca</th>
                            <th>Lý do</th>
                            <th className="c" style={{ width: '150px' }}>Hành động / Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" className="c italic p-8 text-slate-400">Đang tải danh sách...</td></tr>
                        ) : requests.length === 0 ? (
                            <tr><td colSpan="4" className="c italic p-8 text-slate-400">Không có đơn xin đổi ca nào.</td></tr>
                        ) : (
                            requests.map(r => (
                                <tr key={r.id}>
                                    <td>
                                        <div className="font-bold text-slate-800">{r.employeeCode} - {r.employeeName}</div>
                                        <div className="text-[11px] text-slate-500 mt-1">Ngày nộp: {new Date(r.createdAt).toLocaleDateString('vi-VN')} {new Date(r.createdAt).toLocaleTimeString('vi-VN')}</div>
                                    </td>
                                    <td>
                                        <div className="text-[13px] mb-1">
                                            Từ: <strong>{r.currentShiftName}</strong> ➔ <strong>{r.requestedShiftName}</strong>
                                        </div>
                                        <div className="text-[11px] bg-slate-50 border border-slate-200 inline-block px-2 py-1 rounded">
                                            <strong>Áp dụng:</strong> {new Date(r.startDate).toLocaleDateString('vi-VN')} - {new Date(r.endDate).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-[13px]">{r.reason}</div>
                                        {r.rejectReason && (
                                            <div className="text-[11px] text-red-600 mt-1 bg-red-50 p-1">Lý do từ chối: {r.rejectReason}</div>
                                        )}
                                    </td>
                                    <td className="c">
                                        {r.status === 'Pending' ? (
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    onClick={() => handleApprove(r.id)}
                                                    className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                                    title="Chấp nhận"
                                                >
                                                    <Check size={16} strokeWidth={3} />
                                                </button>
                                                <button 
                                                    onClick={() => setRejectingId(r.id)}
                                                    className="w-8 h-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors shadow-sm"
                                                    title="Từ chối"
                                                >
                                                    <X size={16} strokeWidth={3} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1 items-center">
                                                {getStatusBadge(r.status, r.statusLabel)}
                                                <div className="text-[10px] text-slate-400">{r.approverName}</div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Reject */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 font-sans">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4 border-b pb-2">Từ chối đơn xin đổi ca</h3>
                        <form onSubmit={handleReject}>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Lý do từ chối *</label>
                                <textarea
                                    className="ef-input w-full p-3 border-slate-300"
                                    rows="4"
                                    required
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Nhập lý do phản hồi cho nhân viên..."
                                ></textarea>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                    className="px-4 py-2 rounded font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                                >
                                    HỦY
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    XÁC NHẬN TỪ CHỐI
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
