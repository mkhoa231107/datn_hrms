import React, { useState, useEffect } from 'react';
import { leaveService } from '../../api';
import { Umbrella, Plus, Info, Clock, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import LeavePaperModal from './LeavePaperModal';
import ConfirmDialog from '../ui/ConfirmDialog';
import EmptyState from '../ui/EmptyState';

export default function Leave({ user, approvalOnly = false, onBack }) {
    const roles = user?.roles || [];
    const isApprover = roles.some(r => ['Admin', 'DepartmentHead', 'TeamLeader'].includes(r));

    const [tab, setTab] = useState(approvalOnly ? 'pending' : 'overview');
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;

    const [balances, setBalances] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [deptRequests, setDeptRequests] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [flash, setFlash] = useState(null);
    const [cancelConfirmId, setCancelConfirmId] = useState(null);
    const [cancelling, setCancelling] = useState(false);

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

    const showMsg = (ok, text) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 4500); };

    const handleCreate = async (formData) => {
        try {
            const res = await leaveService.createRequest(formData);
            if (res.success) {
                showMsg(true, 'Gửi đơn nghỉ phép thành công!');
                setCreateModal(false);
                await init();
                setTab('history');
            } else {
                showMsg(false, res.message || 'Gửi đơn thất bại.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Lỗi hệ thống khi tạo đơn.';
            showMsg(false, msg);
        }
    };

    const handleApproval = async (approvalData) => {
        if (!approvalModal) return;
        try {
            if (approvalData.action === 'approve') {
                await leaveService.approveRequest(approvalModal.id, approvalData.note, approvalData.approverSignature);
                showMsg(true, 'Đã duyệt đơn nghỉ phép.');
            } else {
                await leaveService.rejectRequest(approvalModal.id, approvalData.note);
                showMsg(true, 'Đã từ chối đơn nghỉ phép.');
            }
            setApprovalModal(null);
            await init();
        } catch (err) { showMsg(false, 'Thao tác thất bại.'); }
    };

    const handleCancel = async (id) => {
        setCancelling(true);
        try {
            await leaveService.cancelRequest(id);
            showMsg(true, 'Đã hủy đơn nghỉ phép.');
            await init();
        } catch (err) { showMsg(false, 'Không thể hủy đơn.'); }
        finally {
            setCancelling(false);
            setCancelConfirmId(null);
        }
    };

    const formatDate = d => {
        if (!d) return '--';
        return new Date(d).toLocaleDateString('vi-VN');
    };

    let rawData = [];
    if (!approvalOnly) {
        if (tab === 'history') rawData = myRequests;
    } else {
        if (tab === 'pending') {
            rawData = deptRequests.filter(r => r.statusName === 'Pending');
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
        if (status === 'Pending' || status === 0) return <span className="badge badge-warning">Chờ duyệt</span>;
        if (status === 'Approved' || status === 1) return <span className="badge badge-success">Đã duyệt</span>;
        if (status === 'Rejected' || status === 2) return <span className="badge badge-danger">Từ chối</span>;
        if (status === 'Cancelled' || status === 3) return <span className="badge badge-accent">Đã hủy</span>;
        return <span className="badge badge-accent">{status}</span>;
    };

    const exportToExcel = async () => {
        if (!rawData || rawData.length === 0) {
            showMsg(false, 'Không có dữ liệu để xuất');
            return;
        }
        
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('LichSuNghiPhep');
            
            worksheet.columns = [
                { header: 'STT', key: 'stt', width: 5 },
                { header: 'Nhân viên', key: 'empName', width: 25 },
                { header: 'Phòng ban', key: 'deptName', width: 20 },
                { header: 'Loại phép', key: 'leaveType', width: 20 },
                { header: 'Từ ngày', key: 'fromDate', width: 15 },
                { header: 'Đến ngày', key: 'toDate', width: 15 },
                { header: 'Số ngày', key: 'totalDays', width: 10 },
                { header: 'Lý do', key: 'reason', width: 30 },
                { header: 'Trạng thái', key: 'status', width: 15 }
            ];
            
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
            
            rawData.forEach((r, idx) => {
                const statusStr = r.statusName || (r.status === 0 ? 'Pending' : r.status === 1 ? 'Approved' : r.status === 2 ? 'Rejected' : 'Cancelled');
                worksheet.addRow({
                    stt: idx + 1,
                    empName: r.employeeName || user?.fullName || 'N/A',
                    deptName: r.employeeDepartmentName || user?.departmentName || 'N/A',
                    leaveType: r.leaveTypeName,
                    fromDate: formatDate(r.fromDate),
                    toDate: formatDate(r.toDate),
                    totalDays: r.totalDays,
                    reason: r.reason,
                    status: statusStr
                });
            });
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `LichSuNghiPhep_${new Date().toISOString().slice(0,10)}.xlsx`;
            anchor.click();
            window.URL.revokeObjectURL(url);
            showMsg(true, 'Xuất file thành công');
        } catch (e) {
            console.error(e);
            showMsg(false, 'Lỗi khi xuất file Excel');
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {flash && (
                <div className={`fixed top-6 right-6 z-[9999] px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 ${flash.ok ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                    {flash.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    <span className="font-bold text-sm">{flash.text}</span>
                </div>
            )}

            <div className="flex items-center gap-2 border-b border-slate-200">
                {!approvalOnly ? (
                    <>
                        <button onClick={() => setTab('overview')} className={`px-6 py-3 text-sm font-bold transition-all relative ${tab === 'overview' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Tổng quan
                            {tab === 'overview' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                        </button>
                        <button onClick={() => setTab('history')} className={`px-6 py-3 text-sm font-bold transition-all relative ${tab === 'history' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Lịch sử đơn
                            {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => setTab('pending')} className={`px-6 py-3 text-sm font-bold transition-all relative ${tab === 'pending' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Chờ xét duyệt
                            {tab === 'pending' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                        </button>
                        <button onClick={() => setTab('history')} className={`px-6 py-3 text-sm font-bold transition-all relative ${tab === 'history' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}>
                            Lịch sử duyệt
                            {tab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                        </button>
                    </>
                )}
            </div>

            {tab === 'overview' && !approvalOnly && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {balances.map(b => (
                        <div key={b.leaveTypeId} className="card flex flex-col gap-4 group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                                        <Umbrella size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-700">{b.leaveTypeName}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hạn mức năm 2026</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-black text-violet-600">{b.remainingDays}</span>
                                    <span className="text-xs text-slate-400 font-bold ml-1">/{b.totalDays}</span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-slate-400">Đã sử dụng: {b.usedDays} ngày</span>
                                    <span className="text-violet-600">{Math.round((b.usedDays / b.totalDays) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-violet-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${(b.usedDays / b.totalDays) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="card border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3 py-8 hover:border-violet-300 hover:bg-violet-50/30 transition-all cursor-pointer" onClick={() => setCreateModal(true)}>
                        <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-violet-600">
                            <Plus size={24} />
                        </div>
                        <p className="font-bold text-slate-600">Đăng ký nghỉ phép</p>
                    </div>
                </div>
            )}

            {(tab === 'history' || tab === 'pending') && (
                <div className="card !p-0 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                            <Clock size={18} className="text-slate-400" />
                            <h3 className="text-lg font-bold text-slate-800">
                                {approvalOnly && tab === 'pending' ? 'Danh sách chờ duyệt' : 'Lịch sử đơn từ'}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {approvalOnly && tab === 'pending' && allSubDepts.length > 0 && (
                                <select 
                                    className="input !py-1.5 !text-xs font-bold w-48"
                                    value={activeDeptTab}
                                    onChange={e => { setActiveDeptTab(e.target.value); setPage(1); }}
                                >
                                    <option value="all">Tất cả bộ phận</option>
                                    {allSubDepts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            )}
                            {(tab === 'history' || tab === 'pending') && (
                                <button onClick={exportToExcel} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-slate-50 !py-1.5" title="Xuất Excel">
                                    <Download size={16} /> Xuất Excel
                                </button>
                            )}
                            {!approvalOnly && (
                                <button onClick={() => setCreateModal(true)} className="btn btn-primary !py-1.5">
                                    <Plus size={16} /> Đăng ký nghỉ
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">STT</th>
                                    {approvalOnly && <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhân viên</th>}
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Loại phép</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thời gian</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số ngày</th>
                                    <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lý do</th>
                                    <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                                    <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={8} className="px-6 py-4"><div className="h-4 skeleton w-full" /></td>
                                        </tr>
                                    ))
                                ) : visibleRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8}>
                                            <EmptyState
                                                icon="document"
                                                title="Không tìm thấy đơn nào"
                                                description={!approvalOnly ? 'Bạn chưa có đơn nghỉ phép nào. Hãy tạo đơn mới!' : 'Không có đơn nào đang chờ xử lý.'}
                                                action={!approvalOnly ? { label: 'Tạo đơn nghỉ', onClick: () => setCreateModal(true) } : undefined}
                                                compact
                                            />
                                        </td>
                                    </tr>
                                ) : visibleRows.map((r, i) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                            {(safePage - 1) * PER_PAGE + i + 1}
                                        </td>
                                        {approvalOnly && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase">
                                                        {r.employeeName?.substring(0, 2)}
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700">{r.employeeName}</div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-600">{r.leaveTypeName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{formatDate(r.fromDate)}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">đến {formatDate(r.toDate)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-sm font-black text-violet-600">{r.totalDays}</span>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <p className="text-sm text-slate-500 truncate" title={r.reason}>{r.reason}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(r)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {tab === 'pending' && approvalOnly ? (
                                                <button onClick={() => setApprovalModal(r)} className="btn btn-primary !py-1 !px-4 text-xs">
                                                    Xử lý
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-end gap-2">
                                                    {(r.statusName === 'Pending' || r.status === 0) ? (
                                                        <button onClick={() => setCancelConfirmId(r.id)} className="btn btn-ghost !py-1 !px-4 text-xs text-rose-500 hover:bg-rose-50 border-rose-100">
                                                            Hủy
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setApprovalModal(r)} className="btn btn-ghost !py-1 !px-4 text-xs">
                                                            Chi tiết
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

                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-xs font-medium text-slate-400">
                            Hiển thị {visibleRows.length} trên {rawData.length} đơn
                        </p>
                        <div className="flex items-center gap-2">
                            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all">
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages}</span>
                            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                title="Hủy đơn nghỉ phép"
                message="Bạn có chắc chắn muốn hủy đơn này không? Hành động này không thể hoàn tác."
                confirmLabel="Xác nhận hủy"
                cancelLabel="Quay lại"
                loading={cancelling}
                onConfirm={() => handleCancel(cancelConfirmId)}
                onCancel={() => setCancelConfirmId(null)}
            />
        </div>
    );
}
