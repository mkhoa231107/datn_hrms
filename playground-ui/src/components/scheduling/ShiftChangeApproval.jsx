import React, { useState, useEffect } from 'react';
import { 
    Check, X, RefreshCw, ArrowLeft, ArrowRightLeft, 
    Calendar, Clock, AlertCircle,
    ChevronRight, CheckCircle2
} from 'lucide-react';
import shiftChangeService from '../../services/shiftChangeService';
import shiftSwapService from '../../services/shiftSwapService';
import ShiftSwapRequestDetail from '../request/ShiftSwapRequestDetail';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import TabFilter from '../ui/TabFilter';

export default function ShiftChangeApproval({ user, onBack }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [viewingSwapId, setViewingSwapId] = useState(null);
    const [confirmApproveId, setConfirmApproveId] = useState(null);
    const [approvingId, setApprovingId] = useState(null);
    const [selectedDept, setSelectedDept] = useState('all');

    useEffect(() => {
        fetchRequests();
    }, [activeTab]);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            let changeData = [];
            let swapData = [];

            if (activeTab === 'pending') {
                [changeData, swapData] = await Promise.all([
                    shiftChangeService.getPendingRequests(),
                    shiftSwapService.getPendingApprovals()
                ]);
            } else {
                [changeData, swapData] = await Promise.all([
                    shiftChangeService.getAllRequests(),
                    shiftSwapService.getApprovalHistory()
                ]);
            }

            const unified = [
                ...(changeData || []).map(r => ({ ...r, _type: 'change' })),
                ...(swapData || []).map(r => ({ 
                    ...r, 
                    _type: 'swap',
                    employeeName: `${r.employeeA?.fullName} ⇄ ${r.employeeB?.fullName}`,
                    employeeCode: r.employeeA?.employeeCode,
                    currentShiftName: "Hoán đổi",
                    requestedShiftName: "Hoán đổi",
                    statusLabel: r.status === 'PendingPartner' ? 'Chờ đối tác' : 
                                 r.status === 'PendingManager' ? 'Chờ Quản lý' : 
                                 r.status === 'PendingHR' ? 'Chờ HR' : r.status
                }))
            ];

            setRequests(unified);
        } catch (err) {
            toast.error('Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        setApprovingId(id);
        try {
            await shiftChangeService.approveRequest(id);
            toast.success("Duyệt đơn thành công");
            fetchRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || "Lỗi khi duyệt đơn");
        } finally {
            setApprovingId(null);
            setConfirmApproveId(null);
        }
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectReason.trim()) return;
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

    if (viewingSwapId) {
        return <ShiftSwapRequestDetail requestId={viewingSwapId} user={user} onBack={() => { setViewingSwapId(null); fetchRequests(); }} />;
    }

    const stats = {
        pending: requests.filter(r => r.status === 'Pending').length,
        swaps: requests.filter(r => r._type === 'swap').length,
        changes: requests.filter(r => r._type === 'change').length
    };

    const deptTabs = [...new Set(requests.map(r => r.employeeDepartmentName || r.departmentName).filter(Boolean))];
    
    const filteredRequests = requests.filter(r => {
        if (selectedDept === 'all') return true;
        const dept = r.employeeDepartmentName || r.departmentName;
        return dept === selectedDept;
    });

    return (
        <div className="flex flex-col gap-6 animate-fade-up pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-violet-600 text-white flex items-center justify-center shadow-lg">
                        <ArrowRightLeft size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Phê duyệt đổi ca</h3>
                        <p className="text-xs text-slate-400 font-medium">Quản lý yêu cầu thay đổi và hoán đổi ca làm việc</p>
                    </div>
                </div>
                {onBack && (
                    <button onClick={onBack} className="btn btn-ghost !py-2 text-xs">
                        <ArrowLeft size={14} /> Quay lại
                    </button>
                )}
            </div>

            {/* KPI Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card !rounded-[8px] flex items-center gap-4 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chờ xử lý</p>
                        <h3 className="text-xl font-black text-slate-800">{stats.pending} Đơn</h3>
                    </div>
                </div>
                <div className="card !rounded-[8px] flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="w-12 h-12 rounded-[8px] bg-blue-50 text-blue-600 flex items-center justify-center">
                        <ArrowRightLeft size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hoán đổi (Swap)</p>
                        <h3 className="text-xl font-black text-slate-800">{stats.swaps} Đơn</h3>
                    </div>
                </div>
                <div className="card !rounded-[8px] flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đổi ca (Change)</p>
                        <h3 className="text-xl font-black text-slate-800">{stats.changes} Đơn</h3>
                    </div>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="card !p-0 !rounded-[8px] overflow-hidden border-2 border-slate-100">
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'pending' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Đang chờ xử lý
                        {activeTab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-600" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`px-8 py-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === 'history' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Lịch sử phê duyệt
                        {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-violet-600" />}
                    </button>
                </div>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full border-collapse table-sticky-head">
                        <thead>
                            <tr className="bg-slate-50/30">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân sự</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Yêu cầu</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Lý do</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-6 py-8"><div className="h-10 bg-slate-100 rounded-[6px] w-full" /></td>
                                    </tr>
                                ))
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={4}>
                                        <EmptyState
                                            icon="document"
                                            title="Không có yêu cầu nào"
                                            description={selectedDept === 'all' ? (activeTab === 'pending' ? 'Tất cả các yêu cầu đã được xử lý.' : 'Chưa có lịch sử phê duyệt nào.') : `Không có yêu cầu nào thuộc bộ phận ${selectedDept}`}
                                            compact
                                        />
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map(r => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-500">
                                                    {r.employeeName?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-700">{r.employeeName}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{r.employeeCode}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-slate-600">{r.currentShiftName}</span>
                                                    <ChevronRight size={12} className="text-slate-300" />
                                                    <span className="text-xs font-black text-violet-600">{r.requestedShiftName}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <Calendar size={10} />
                                                    {new Date(r.startDate).toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-500 font-medium line-clamp-2 max-w-xs">{r.reason}</p>
                                            {r.rejectReason && (
                                                <p className="text-[10px] text-rose-500 font-bold mt-1 bg-rose-50 px-2 py-0.5 rounded inline-block italic">Phản hồi: {r.rejectReason}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-2">
                                                {r._type === 'swap' ? (
                                                    <button 
                                                        onClick={() => setViewingSwapId(r.id)}
                                                        className="btn btn-ghost !py-1.5 !px-3 text-[10px] font-black border-blue-200 text-blue-600 hover:bg-blue-50"
                                                    >
                                                        XEM & KÝ
                                                    </button>
                                                ) : (
                                                    r.status === 'Pending' ? (
                                                        <>
                                                            <button 
                                                                onClick={() => setConfirmApproveId(r.id)}
                                                                disabled={approvingId === r.id}
                                                                className="w-9 h-9 rounded-[6px] bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-sm disabled:opacity-50"
                                                                title="Duyệt đơn"
                                                            >
                                                                {approvingId === r.id
                                                                    ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                                                                    : <Check size={16} strokeWidth={3} />}
                                                            </button>
                                                            <button 
                                                                onClick={() => setRejectingId(r.id)}
                                                                className="w-9 h-9 rounded-[6px] bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center transition-all shadow-sm"
                                                                title="Từ chối"
                                                            >
                                                                <X size={16} strokeWidth={3} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                            r.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                            r.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            {r.statusLabel || r.status}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="card w-full max-w-md shadow-2xl animate-zoom-in">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Từ chối yêu cầu</h3>
                            <button onClick={() => setRejectingId(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleReject} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Lý do từ chối *</label>
                                <textarea 
                                    className="input w-full min-h-[120px] text-sm"
                                    placeholder="Nhập lý do phản hồi cho nhân sự..."
                                    required
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setRejectingId(null)} className="btn btn-ghost flex-1">HỦY</button>
                                <button type="submit" className="btn btn-primary bg-rose-600 hover:bg-rose-700 border-none flex-1">XÁC NHẬN</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ConfirmDialog thay thế window.confirm */}
            <ConfirmDialog
                open={!!confirmApproveId}
                variant="success"
                title="Xác nhận duyệt đơn"
                message="Bạn có chắc chắn muốn ĐỒNG Ý duyệt yêu cầu đổi ca này không?"
                confirmLabel="Duyệt đơn"
                cancelLabel="Hủy"
                loading={!!approvingId}
                onConfirm={() => handleApprove(confirmApproveId)}
                onCancel={() => setConfirmApproveId(null)}
            />
        </div>
    );
}
