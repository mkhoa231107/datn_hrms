import React, { useState, useEffect } from 'react';
import { leaveService } from '../../api';
import { 
    Umbrella, Plus, Info, Clock, CheckCircle2, XCircle, 
    ChevronLeft, ChevronRight, Download, RefreshCw, 
    Calendar, FileText, Filter, Search, User, 
    History, Briefcase, CalendarDays
} from 'lucide-react';
import LeavePaperModal from './LeavePaperModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';
import TabFilter from '../ui/TabFilter';
import toast from 'react-hot-toast';
import { useBreakpoint } from '../../hooks/useBreakpoint';

export default function Leave({ user, approvalOnly = false, onBack }) {
    const roles = user?.roles || [];
    const isApprover = roles.some(r => ['Admin', 'DepartmentManager', 'DepartmentHead', 'TeamLeader'].includes(r));

    const [tab, setTab] = useState(approvalOnly ? 'pending' : 'overview');
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;

    const [balances, setBalances] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [deptRequests, setDeptRequests] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [cancelConfirmId, setCancelConfirmId] = useState(null);
    const [cancelling, setCancelling] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { isMobile } = useBreakpoint();

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [approvalModal, setApprovalModal] = useState(null);
    const [activeDeptTab, setActiveDeptTab] = useState('all');
    const [allSubDepts, setAllSubDepts] = useState([]);

    useEffect(() => { init(); }, [approvalOnly, tab]);

    const init = async () => {
        setLoading(true);
        try {
            if (!approvalOnly) {
                const [types, balance, requests] = await Promise.all([
                    leaveService.getTypes(),
                    leaveService.getMyBalance(),
                    leaveService.getMyRequests(),
                ]);
                const typeData = types.data || (types.success ? types.data : types);
                setLeaveTypes(Array.isArray(typeData) ? typeData : []);
                setBalances(balance.data || balance);
                setMyRequests(requests.data || requests);
            }
            if (isApprover && (approvalOnly || tab === 'pending' || tab === 'history')) {
                const [appRes, histRes] = await Promise.all([
                    leaveService.getToApprove(),
                    leaveService.getApprovalHistory(),
                ]);
                const data = appRes.data || appRes;
                setDeptRequests(data);
                setApprovalHistory(histRes.data || histRes);
                const foundDepts = [...new Set(data.map(r => r.employeeDepartmentName))].filter(Boolean);
                setAllSubDepts(foundDepts);
            }
        } catch (e) { 
            console.error(e); 
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (formData) => {
        try {
            const res = await leaveService.createRequest(formData);
            if (res.success) {
                toast.success('Gửi đơn nghỉ phép thành công!');
                setCreateModal(false);
                await init();
                setTab('history');
            } else {
                toast.error(res.message || 'Gửi đơn thất bại.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi hệ thống khi tạo đơn.');
        }
    };

    const handleApproval = async (approvalData) => {
        if (!approvalModal) return;
        try {
            if (approvalData.action === 'approve') {
                await leaveService.approveRequest(approvalModal.id, approvalData.note, approvalData.approverSignature);
                toast.success('Đã duyệt đơn nghỉ phép.');
            } else {
                await leaveService.rejectRequest(approvalModal.id, approvalData.note);
                toast.success('Đã từ chối đơn nghỉ phép.');
            }
            setApprovalModal(null);
            await init();
        } catch (err) { toast.error('Thao tác thất bại.'); }
    };

    const handleCancel = async (id) => {
        setCancelling(true);
        try {
            await leaveService.cancelRequest(id);
            toast.success('Đã hủy đơn nghỉ phép.');
            await init();
        } catch (err) { toast.error('Không thể hủy đơn.'); }
        finally {
            setCancelling(false);
            setCancelConfirmId(null);
        }
    };

    const formatDate = d => {
        if (!d) return '--';
        return new Date(d).toLocaleDateString('vi-VN');
    };

    const exportExcel = async () => {
        setExporting(true);
        try {
            // Mapping department name to ID or using current filters
            const res = await leaveService.exportExcel(null, new Date().getFullYear());
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `BaoCaoNghiPhep_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success('Xuất Excel thành công!');
        } catch (err) {
            console.error(err);
            toast.error('Lỗi khi xuất Excel');
        } finally {
            setExporting(false);
        }
    };

    let rawData = [];
    if (!approvalOnly) {
        if (tab === 'history') rawData = myRequests;
        else rawData = []; // Overview handles balances separately
    } else {
        if (tab === 'pending') {
            rawData = deptRequests.filter(r => r.statusName === 'Pending' || r.status === 0);
            if (activeDeptTab !== 'all') {
                rawData = rawData.filter(r => r.employeeDepartmentName?.trim().toLowerCase() === activeDeptTab.trim().toLowerCase());
            }
        } else {
            rawData = approvalHistory;
        }
    }

    rawData.sort((a, b) => new Date(b.createdAt || b.fromDate) - new Date(a.createdAt || a.fromDate));
    
    const totalPages = Math.max(1, Math.ceil(rawData.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const visibleRows = rawData.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    const getStatusBadge = (r) => {
        const status = r.statusName || r.status;
        if (status === 'Pending' || status === 0) return <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider border border-amber-100">Chờ duyệt</span>;
        if (status === 'Approved' || status === 1) return <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100">Đã duyệt</span>;
        if (status === 'Rejected' || status === 2) return <span className="px-2 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider border border-rose-100">Từ chối</span>;
        if (status === 'Cancelled' || status === 3) return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border border-slate-200">Đã hủy</span>;
        return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider">{status}</span>;
    };

    const mainTabs = !approvalOnly 
        ? [ { id: 'overview', label: 'TỔNG QUAN HẠN MỨC' }, { id: 'history', label: 'LỊCH SỬ ĐƠN TỪ' } ]
        : [ { id: 'pending', label: 'CHỜ XÉT DUYỆT' }, { id: 'history', label: 'LỊCH SỬ DUYỆT' } ];

    return (
        <div className="p-6 animate-fade-up">
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Umbrella className="text-indigo-600" size={28} />
                        {approvalOnly ? 'Quản lý duyệt nghỉ phép' : 'Nghỉ phép của tôi'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Quản lý hạn mức và danh sách đơn xin nghỉ phép</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm uppercase font-bold tracking-wider">Năm 2026</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={init} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    {!approvalOnly && (
                        <button onClick={() => setCreateModal(true)} className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-200">
                            <Plus size={16} /> Đăng ký nghỉ
                        </button>
                    )}
                    {approvalOnly && (
                        <button onClick={exportExcel} disabled={exporting} className="btn btn-ghost shadow-sm flex items-center gap-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50">
                            <Download size={16} /> Xuất báo cáo
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tab Navigation (Standardized) ── */}
            <TabFilter 
                tabs={mainTabs}
                activeTabId={tab}
                onTabChange={(id) => { setTab(id); setPage(1); }}
                className="mb-8"
            />

            {tab === 'overview' && !approvalOnly && (
                <>
                    {/* ── KPI Cards for Balance ── */}
                    <div className={isMobile ? 'kpi-scroll mb-8' : 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'}>
                        {balances.map(b => (
                            <div key={b.leaveTypeId} className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm group hover:shadow-md transition-all">
                                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <Briefcase size={20} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-slate-800">{b.leaveTypeName}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Hạn mức theo chính sách</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-2xl font-black text-indigo-600 leading-none">{b.remainingDays}</span>
                                        <span className="text-xs text-slate-400 font-bold ml-1">/{b.totalDays}</span>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest mb-2">
                                        <span className="text-slate-400">Tiến độ sử dụng</span>
                                        <span className="text-indigo-600">{Math.round((b.usedDays / b.totalDays) * 100)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-1000 shadow-sm"
                                            style={{ width: `${(b.usedDays / b.totalDays) * 100}%` }}
                                        />
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-4">
                                        <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                                            <p className="text-[9px] font-black text-emerald-400 uppercase">Đã dùng</p>
                                            <p className="text-sm font-black text-emerald-600">{b.usedDays} ngày</p>
                                        </div>
                                        <div className="bg-amber-50/50 p-2 rounded-xl border border-amber-100">
                                            <p className="text-[9px] font-black text-amber-400 uppercase">Còn lại</p>
                                            <p className="text-sm font-black text-amber-600">{b.remainingDays} ngày</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="card border-dashed border-2 border-slate-200 bg-slate-50/30 flex flex-col items-center justify-center gap-4 py-12 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group" onClick={() => setCreateModal(true)}>
                            <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                <Plus size={28} />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-slate-700">Đăng ký nghỉ phép mới</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Gửi đơn lên cấp trên phê duyệt</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {(tab === 'history' || tab === 'pending') && (
                <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                    {/* ── Table Header Toolbar ── */}
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <History size={18} className="text-slate-400" />
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                {approvalOnly && tab === 'pending' ? 'Danh sách chờ xét duyệt' : 'Lịch sử yêu cầu'}
                            </h3>
                            <span className="px-3 py-1 bg-slate-200 text-slate-600 text-[10px] font-black rounded-full uppercase whitespace-nowrap">{rawData.length} đơn</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            {approvalOnly && tab === 'pending' && allSubDepts.length > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border border-slate-200 shadow-sm">
                                    <Filter size={14} className="text-slate-400" />
                                    <select 
                                        className="text-[11px] font-bold outline-none bg-transparent cursor-pointer"
                                        value={activeDeptTab}
                                        onChange={(e) => { setActiveDeptTab(e.target.value); setPage(1); }}
                                    >
                                        <option value="all">TẤT CẢ PHÒNG BAN</option>
                                        {allSubDepts.map(d => <option key={d} value={d}>{d.toUpperCase()}</option>)}
                                    </select>
                                </div>
                            )}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Tìm theo tên NV..." 
                                    className="input !py-1.5 !pl-9 !pr-4 !text-[11px] w-48 bg-white border-slate-200"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="table-mobile-scroll">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">STT</th>
                                    {approvalOnly && <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>}
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại nghỉ</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Số ngày</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lý do</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={8} className="px-6 py-6"><div className="h-4 skeleton w-full rounded" /></td>
                                        </tr>
                                    ))
                                ) : visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <EmptyState
                                                icon="document"
                                                title="Không tìm thấy dữ liệu"
                                                description={!approvalOnly ? 'Bạn chưa có yêu cầu nghỉ phép nào.' : 'Hiện tại không có đơn nào cần xử lý.'}
                                                compact
                                            />
                                        </td>
                                    </tr>
                                ) : visibleRows.map((r, i) => (
                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-400">
                                            {(safePage - 1) * PER_PAGE + i + 1}
                                        </td>
                                        {approvalOnly && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                                        {r.employeeName?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-700 leading-tight">{r.employeeName}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{r.employeeDepartmentName || 'NV'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-600">{r.leaveTypeName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700">{formatDate(r.fromDate)}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">đến {formatDate(r.toDate)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-base font-black text-indigo-600">{r.totalDays}</span>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <p className="text-xs text-slate-500 line-clamp-1 italic" title={r.reason}>{r.reason}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(r)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {tab === 'pending' && approvalOnly ? (
                                                <button onClick={() => setApprovalModal(r)} className="btn btn-primary !py-1 !px-4 !text-[10px] shadow-sm">
                                                    XỬ LÝ
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {(r.statusName === 'Pending' || r.status === 0) ? (
                                                        <button onClick={() => setCancelConfirmId(r.id)} className="btn btn-ghost !py-1 !px-3 !text-[10px] text-rose-500 hover:bg-rose-50 border-rose-100 font-black">
                                                            HỦY ĐƠN
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setApprovalModal(r)} className="btn btn-ghost !py-1 !px-3 !text-[10px] font-black border-slate-200">
                                                            CHI TIẾT
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-xs font-medium text-slate-400">
                            Hiển thị {visibleRows.length} trên {rawData.length} bản ghi
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages || 1}</span>
                            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="mt-6 card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <Info size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 leading-tight">
                    Chính sách nghỉ phép tuân thủ Luật Lao động hiện hành. Các loại nghỉ phép có hưởng lương (Phép năm, Ốm đau, Thai sản) sẽ được bộ phận <strong>Nhân sự</strong> chốt vào cuối tháng để tính lương. Vui lòng gửi đơn trước 24h để được phê duyệt kịp thời.
                </span>
            </div>

            {createModal && (
                <LeavePaperModal 
                    user={user} 
                    leaveTypes={leaveTypes} 
                    balances={balances}
                    onClose={() => setCreateModal(false)} 
                    onSubmit={handleCreate} 
                    mode="create"
                />
            )}

            {approvalModal && (
                <LeavePaperModal 
                    user={user} 
                    leaveTypes={leaveTypes} 
                    balances={balances}
                    onClose={() => setApprovalModal(null)} 
                    onSubmit={handleApproval} 
                    mode="view"
                    requestData={approvalModal}
                />
            )}

            <ConfirmDialog
                open={!!cancelConfirmId}
                variant="danger"
                title="Xác nhận hủy đơn"
                message="Bạn có chắc chắn muốn hủy đơn xin nghỉ phép này không? Hành động này sẽ xóa dữ liệu và không thể khôi phục."
                confirmLabel="ĐỒNG Ý HỦY"
                cancelLabel="QUAY LẠI"
                loading={cancelling}
                onConfirm={() => handleCancel(cancelConfirmId)}
                onCancel={() => setCancelConfirmId(null)}
            />
        </div>
    );
}
