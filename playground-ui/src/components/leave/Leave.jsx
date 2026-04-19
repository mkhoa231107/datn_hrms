import React, { useState, useEffect } from 'react';
import '../employee/EmployeeFlat.css';
import { leaveService, attendanceService } from '../../api';
import shiftSwapService from '../../services/shiftSwapService';
import { Umbrella, Clock, RefreshCw } from 'lucide-react';
import LeavePaperModal from './LeavePaperModal';
import ShiftSwapRequestDetail from '../request/ShiftSwapRequestDetail';

export default function Leave({ user, approvalOnly = false, onBack }) {
    const roles = user?.roles || [];
    const isApprover = roles.some(r => ['Admin', 'DepartmentHead', 'TeamLeader'].includes(r));
    const isManager = roles.some(r => ['Admin', 'DepartmentHead'].includes(r));

    const [tab, setTab] = useState(approvalOnly ? 'pending' : 'overview');
    const [subTab, setSubTab] = useState('leave'); // 'leave' or 'overtime'
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;

    const [balances, setBalances] = useState([]);
    const [myRequests, setMyRequests] = useState([]);
    const [myOtRequests, setMyOtRequests] = useState([]);
    const [deptRequests, setDeptRequests] = useState([]);
    const [deptOtRequests, setDeptOtRequests] = useState([]);
    const [deptSwapRequests, setDeptSwapRequests] = useState([]);
    const [approvalHistory, setApprovalHistory] = useState([]);
    const [leaveTypes, setLeaveTypes] = useState([]);
    
    const [loading, setLoading] = useState(false);
    const [flash, setFlash] = useState(null);

    // Modals
    const [createModal, setCreateModal] = useState(false);
    const [createOtModal, setCreateOtModal] = useState(false);
    const [viewingSwapId, setViewingSwapId] = useState(null);
    
    const [form, setForm] = useState({ leaveTypeId: '', fromDate: '', toDate: '', reason: '' });
    const [otForm, setOtForm] = useState({ date: '', startTime: '17:00', endTime: '19:00', reason: '' });

    const [approvalModal, setApprovalModal] = useState(null);
    const [approvalNote, setApprovalNote] = useState('');
    const [activeDeptTab, setActiveDeptTab] = useState('all');
    const [allSubDepts, setAllSubDepts] = useState([]);
    const [deptSwapTab, setDeptSwapTab] = useState('all');
    const [allSwapDepts, setAllSwapDepts] = useState([]);

    useEffect(() => { init(); }, [approvalOnly, tab, subTab]);

    const init = async () => {
        try {
            if (!approvalOnly) {
                if (subTab === 'leave') {
                    const [types, balance, requests] = await Promise.all([
                        leaveService.getTypes(),
                        leaveService.getMyBalance(),
                        leaveService.getMyRequests(),
                    ]);
                    const typeData = types.data || (types.success ? types.data : types);
                    setLeaveTypes(Array.isArray(typeData) ? typeData : []);
                    setBalances(balance.data || balance);
                    setMyRequests(requests.data || requests);
                } else {
                    const otRes = await attendanceService.getMyOvertime();
                    setMyOtRequests(otRes.data || otRes);
                }
            }
            if (isApprover && (approvalOnly || tab === 'pending')) {
                if (subTab === 'leave') {
                    const [appRes, histRes] = await Promise.all([
                        leaveService.getToApprove(),
                        leaveService.getApprovalHistory(),
                    ]);
                    const data = appRes.data || appRes;
                    setDeptRequests(data);
                    setApprovalHistory(histRes.data || histRes);
                    const foundDepts = [...new Set(data.map(r => r.employeeDepartmentName))].filter(Boolean);
                    setAllSubDepts(foundDepts);
                } else if (subTab === 'overtime') {
                    const deptId = user?.departmentId || 1;
                    // Fallback since getPendingOvertime is not implemented yet
                    const appRes = { data: [] }; 
                    const histRes = { data: [] };
                    try {
                        if (typeof attendanceService.getDepartmentOvertime === 'function') {
                            const res = await attendanceService.getDepartmentOvertime(deptId);
                            if (res) histRes.data = res.data || res;
                        }
                    } catch (err) {
                        console.warn("Could not fetch overtime data", err);
                    }
                    setDeptOtRequests(appRes.data);
                    setApprovalHistory(histRes.data);
                } else if (subTab === 'swap') {
                    const [appRes, histRes] = await Promise.all([
                        shiftSwapService.getPendingApprovals(),
                        shiftSwapService.getApprovalHistory()
                    ]);
                    const swapArr = Array.isArray(appRes) ? appRes : [];
                    setDeptSwapRequests(swapArr);
                    
                    const histArr = Array.isArray(histRes) ? histRes : [];
                    setApprovalHistory(histArr);
                    
                    // Extract unique departments from swap requests
                    const swapDepts = [...new Set(swapArr.map(r => r.employeeA?.department?.departmentName).filter(Boolean))];
                    setAllSwapDepts(swapDepts);
                }
            }
        } catch (e) { console.error(e); }
    };

    const showMsg = (ok, text) => { setFlash({ ok, text }); setTimeout(() => setFlash(null), 4500); };

    const handleCreate = async (formData) => {
        setLoading(true);
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
        } finally { setLoading(false); }
    };

    const handleCreateOt = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await attendanceService.submitOvertimeRequest(otForm);
            if (res.success) {
                showMsg(true, 'Gửi đơn tăng ca thành công!');
                setOtForm({ date: '', startTime: '17:00', endTime: '19:00', reason: '' });
                setCreateOtModal(false);
                await init();
                setTab('history');
            } else {
                showMsg(false, res.message || 'Gửi đơn thất bại.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Lỗi hệ thống khi tạo đơn.';
            showMsg(false, msg);
        } finally { setLoading(false); }
    };

    const handleApproval = async (approvalData) => {
        if (!approvalModal) return;
        try {
            const isOt = subTab === 'overtime';
            if (isOt) {
                const res = await attendanceService.reviewOvertimeRequest({
                    requestId: approvalModal.requestId,
                    status: approvalData.action === 'approve' ? 'Approved' : 'Rejected',
                    note: approvalData.note
                });
                if (res.success) showMsg(true, 'Đã cập nhật trạng thái đơn tăng ca.');
            } else {
                if (approvalData.action === 'approve') {
                    await leaveService.approveRequest(approvalModal.id, approvalData.note, approvalData.approverSignature);
                    showMsg(true, 'Đã duyệt đơn nghỉ phép.');
                } else {
                    await leaveService.rejectRequest(approvalModal.id, approvalData.note);
                    showMsg(true, 'Đã từ chối đơn nghỉ phép.');
                }
            }
            setApprovalModal(null);
            await init();
        } catch (err) { showMsg(false, 'Thao tác thất bại.'); }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn này?')) return;
        try {
            if (subTab === 'overtime') {
                showMsg(false, 'Tính năng hủy tăng ca đang được cập nhật.');
            } else {
                await leaveService.cancelRequest(id);
                showMsg(true, 'Đã hủy đơn nghỉ phép.');
            }
            await init();
        } catch (err) { showMsg(false, 'Không thể hủy đơn.'); }
    };

    const formatDate = d => {
        if (!d) return '--';
        return new Date(d).toLocaleDateString('vi-VN');
    };

    let rawData = [];
    if (!approvalOnly && tab === 'history') {
        rawData = subTab === 'leave' ? myRequests : myOtRequests;
    }
    if (approvalOnly) {
        if (tab === 'pending') {
            if (subTab === 'leave') {
                rawData = deptRequests.filter(r => r.statusName === 'Pending');
                if (activeDeptTab !== 'all') {
                    rawData = rawData.filter(r => r.employeeDepartmentName?.trim().toLowerCase() === activeDeptTab.trim().toLowerCase());
                }
            } else if (subTab === 'overtime') {
                rawData = deptOtRequests;
            } else if (subTab === 'swap') {
                rawData = deptSwapRequests;
                if (deptSwapTab !== 'all') {
                    rawData = rawData.filter(r => r.employeeA?.department?.departmentName?.trim().toLowerCase() === deptSwapTab.trim().toLowerCase());
                }
            }
        }
        else rawData = approvalHistory;
    }

    if (statusFilter !== 'all' && !approvalOnly && tab === 'history') {
        rawData = rawData.filter(r => (r.statusName || r.status) === statusFilter);
    }

    rawData.sort((a, b) => new Date(b.createdAt || b.date || b.fromDate) - new Date(a.createdAt || a.date || a.fromDate));
    
    const totalPages = Math.max(1, Math.ceil(rawData.length / PER_PAGE));
    const safePage = Math.min(page, totalPages);
    const visibleRows = rawData.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

    const isManagerRole = roles.includes('DepartmentManager') || roles.includes('DepartmentHead') || roles.includes('Admin');

    const getStatusClass = (status) => {
        switch(status) {
            case 'Approved': case 'Đã Duyệt': return 'ef-text-ok';
            case 'Rejected': case 'Từ Chối': return 'ef-text-late';
            case 'Pending':  case 'Chờ Duyệt': return 'ef-text-warn';
            default: return 'ef-text-na';
        }
    };

    const getStatusText = (r) => {
        const status = r.statusName || r.status;
        if (status === 'Pending' || status === 0) {
            if (subTab === 'leave') {
                return r.totalDays <= 3 ? 'Chờ TBP Duyệt' : 'Chờ Trưởng Phòng Duyệt';
            }
            return 'Chờ Duyệt';
        }
        switch(status) {
            case 'Approved': case 1: return 'Đã Duyệt';
            case 'Rejected': case 2: return 'Từ Chối';
            case 'Cancelled': case 3: return 'Đã Hủy';
            default: return status;
        }
    };

    return (
        <div className="ef-wrap">
            {flash && <div className={`ef-flash ${flash.ok ? 'ok' : 'err'}`}>{flash.text}</div>}

            <div className="ef-tab-bar">
                {!approvalOnly ? (
                    <>
                        <div className={`ef-tab ${tab === 'overview' ? 'ef-tab-on' : ''}`} onClick={() => { setTab('overview'); setPage(1); }}>Tổng Quan</div>
                        <div className={`ef-tab ${tab === 'history' ? 'ef-tab-on' : ''}`} onClick={() => { setTab('history'); setPage(1); }}>Đơn Của Tôi</div>
                    </>
                ) : (
                    <>
                        <div className={`ef-tab ${tab === 'pending' ? 'ef-tab-on' : ''}`} onClick={() => { setTab('pending'); setPage(1); }}>Chờ Xét Duyệt</div>
                        <div className={`ef-tab ${tab === 'history' ? 'ef-tab-on' : ''}`} onClick={() => { setTab('history'); setPage(1); }}>Lịch Sử Duyệt</div>
                    </>
                )}
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid #eee', marginBottom: '20px', background: '#f9fafb', padding: '0 15px' }}>
                <div 
                    onClick={() => { setSubTab('leave'); setPage(1); }}
                    style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: subTab === 'leave' ? '2px solid #1a56db' : 'none', color: subTab === 'leave' ? '#1a56db' : '#666', fontWeight: 'bold' }}
                > Nghỉ Phép </div>
                <div 
                    onClick={() => { setSubTab('overtime'); setPage(1); }}
                    style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: subTab === 'overtime' ? '2px solid #1a56db' : 'none', color: subTab === 'overtime' ? '#1a56db' : '#666', fontWeight: 'bold' }}
                > Tăng Ca </div>
                <div 
                    onClick={() => { setSubTab('swap'); setPage(1); }}
                    style={{ padding: '12px 20px', cursor: 'pointer', borderBottom: subTab === 'swap' ? '2px solid #1a56db' : 'none', color: subTab === 'swap' ? '#1a56db' : '#666', fontWeight: 'bold' }}
                > Đổi Ca </div>
            </div>

            {!approvalOnly && tab === 'overview' && subTab === 'leave' && (
                <>
                    <div className="ef-section-title">Số dư phép hiện tại</div>
                    <div className="ef-table-wrap" style={{ marginBottom: '20px' }}>
                        <table className="ef-table no-top-border">
                            <thead>
                                <tr>
                                    <th>Loại Nghỉ Phép</th>
                                    <th className="c">Tổng Số Ngày</th>
                                    <th className="c">Đã Dùng</th>
                                    <th className="c">Còn Lại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {balances.map(b => (
                                    <tr key={b.leaveTypeId}>
                                        <td style={{ fontWeight: 'bold' }}>{b.leaveTypeName}</td>
                                        <td className="c">{b.totalDays}</td>
                                        <td className="c">{b.usedDays}</td>
                                        <td className="c" style={{ fontWeight: 'bold', color: '#1a56db' }}>{b.remainingDays}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Content: History / Pending List */}
            {(tab === 'history' || tab === 'pending' || (tab === 'overview' && subTab === 'overtime')) && (
                <>
                    {/* Department Filter Tabs for Leave */}
                    {approvalOnly && tab === 'pending' && subTab === 'leave' && allSubDepts.length > 0 && (
                        <div className="ef-toolbar print:hidden" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minHeight: '44px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                                <button
                                    onClick={() => { setActiveDeptTab('all'); setPage(1); }}
                                    style={{
                                        padding: '10px 20px', fontSize: '12px', fontWeight: 'bold',
                                        border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                        background: activeDeptTab === 'all' ? '#fff' : 'transparent',
                                        color: activeDeptTab === 'all' ? '#1a56db' : '#64748b',
                                        borderBottom: activeDeptTab === 'all' ? '3px solid #1a56db' : '3px solid transparent',
                                    }}
                                >
                                    TẤT CẢ ({deptRequests.filter(r => r.statusName === 'Pending').length})
                                </button>
                                {allSubDepts.map(deptName => {
                                    const count = deptRequests.filter(r => r.statusName === 'Pending' && r.employeeDepartmentName === deptName).length;
                                    const isActive = activeDeptTab === deptName;
                                    return (
                                        <button key={deptName} onClick={() => { setActiveDeptTab(deptName); setPage(1); }}
                                            style={{
                                                padding: '10px 20px', fontSize: '12px', fontWeight: 'bold',
                                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                                                background: isActive ? '#fff' : 'transparent',
                                                color: isActive ? '#1a56db' : '#64748b',
                                                borderBottom: isActive ? '3px solid #1a56db' : '3px solid transparent',
                                            }}
                                        >
                                            {deptName.toUpperCase()} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Department Filter Tabs for Swap */}
                    {approvalOnly && tab === 'pending' && subTab === 'swap' && (
                        <div className="ef-toolbar print:hidden" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minHeight: '44px', marginBottom: '15px' }}>
                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center', padding: '0 8px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', marginRight: '4px' }}>🏢 PHÒNG BAN:</span>
                                <button
                                    onClick={() => { setDeptSwapTab('all'); setPage(1); }}
                                    style={{
                                        padding: '8px 16px', fontSize: '12px', fontWeight: 'bold',
                                        border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '4px',
                                        background: deptSwapTab === 'all' ? '#1a56db' : '#e2e8f0',
                                        color: deptSwapTab === 'all' ? '#fff' : '#475569',
                                    }}
                                >
                                    Tất Cả ({deptSwapRequests.length})
                                </button>
                                {allSwapDepts.map(deptName => {
                                    const count = deptSwapRequests.filter(r => r.employeeA?.department?.departmentName?.trim().toLowerCase() === deptName.trim().toLowerCase()).length;
                                    const isActive = deptSwapTab === deptName.trim().toLowerCase();
                                    return (
                                        <button key={deptName}
                                            onClick={() => { setDeptSwapTab(deptName.trim().toLowerCase()); setPage(1); }}
                                            style={{
                                                padding: '8px 16px', fontSize: '12px', fontWeight: 'bold',
                                                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', borderRadius: '4px',
                                                background: isActive ? '#1a56db' : '#e2e8f0',
                                                color: isActive ? '#fff' : '#475569',
                                            }}
                                        >
                                            {deptName} ({count})
                                        </button>
                                    );
                                })}
                                {deptSwapRequests.length === 0 && (
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', marginLeft: '8px' }}>Không có đơn nào đang chờ duyệt</span>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="ef-toolbar">
                        <div className="ef-toolbar-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                            <div className="ef-toolbar-title">
                                {subTab === 'leave' ? <Umbrella size={16} /> : (subTab === 'overtime' ? <Clock size={16} /> : <RefreshCw size={16} />)}
                                <strong style={{ textTransform: 'uppercase' }}>
                                    {approvalOnly && tab === 'pending' ? 'Chờ xét duyệt' : (subTab === 'leave' ? 'Lịch sử nghỉ phép' : (subTab === 'overtime' ? 'Lịch sử tăng ca' : 'Lịch sử hoán đổi'))}
                                </strong>
                            </div>
                        </div>
                        <div className="ef-toolbar-right">
                            {!approvalOnly && (
                                <button onClick={() => subTab === 'leave' ? setCreateModal(true) : setCreateOtModal(true)} className="ef-btn ef-btn-primary">
                                    + {subTab === 'leave' ? 'Tạo Đơn Phép' : 'Xin Tăng Ca'}
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="ef-table-wrap">
                        <table className="ef-table no-top-border">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: '50px' }}>STT</th>
                                    {approvalOnly && <th>Nhân Viên</th>}
                                    {subTab === 'leave' ? (
                                        <>
                                            <th>Loại Phép</th>
                                            <th>Từ Ngày</th>
                                            <th>Đến Ngày</th>
                                            <th className="c">Số Ngày</th>
                                        </>
                                    ) : subTab === 'swap' ? (
                                        <>
                                            <th>Bên A</th>
                                            <th>Bên B</th>
                                            <th>Thời Gian Đổi</th>
                                            <th>Ca Đổi Sang</th>
                                        </>
                                    ) : (
                                        <>
                                            <th>Ngày Làm</th>
                                            <th>Giờ Bắt Đầu</th>
                                            <th>Giờ Kết Thúc</th>
                                            <th className="c">Tổng Giờ</th>
                                        </>
                                    )}
                                    <th>Lý Do</th>
                                    <th>Trạng Thái</th>
                                    <th className="c" style={{ width: '100px' }}>Thao Tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleRows.length === 0 ? (
                                    <tr><td colSpan={10} className="ef-empty">Không có dữ liệu</td></tr>
                                ) : visibleRows.map((r, i) => (
                                    <tr key={r.id}>
                                        <td className="c">{(safePage - 1) * PER_PAGE + i + 1}</td>
                                        {approvalOnly && <td style={{ fontWeight: 'bold' }}>{r.employeeName}</td>}
                                        {subTab === 'leave' ? (
                                            <>
                                                <td>{r.leaveTypeName}</td>
                                                <td>{formatDate(r.fromDate)}</td>
                                                <td>{formatDate(r.toDate)}</td>
                                                <td className="c"><strong>{r.totalDays}</strong></td>
                                            </>
                                        ) : subTab === 'overtime' ? (
                                            <>
                                                <td>{formatDate(r.date)}</td>
                                                <td>{r.startTime}</td>
                                                <td>{r.endTime}</td>
                                                <td className="c"><strong>{r.totalHours}h</strong></td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{r.employeeA?.fullName || r.employeeAId}</td>
                                                <td>{r.employeeB?.fullName || r.employeeBId}</td>
                                                <td>{formatDate(r.startDate)} - {formatDate(r.endDate)}</td>
                                                <td>{r.targetShiftId}</td>
                                            </>
                                        )}
                                        <td>{r.reason}</td>
                                         <td className={getStatusClass(r.statusName || r.status)}>
                                            {getStatusText(r)}
                                        </td>
                                        <td className="c">
                                            {tab === 'pending' && approvalOnly ? (
                                                <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                                    {subTab === 'swap' ? (
                                                        <button onClick={() => setViewingSwapId(r.id)} className="ef-btn ef-btn-success ef-btn-sm">DUYỆT</button>
                                                    ) : (
                                                        <button onClick={() => setApprovalModal(r)} className="ef-btn ef-btn-success ef-btn-sm">DUYỆT</button>
                                                    )}
                                                </div>
                                            ) : (
                                                (r.statusName || r.status) === 'Pending' ? 
                                                <button onClick={() => handleCancel(r.id)} className="ef-btn ef-btn-danger ef-btn-sm">HỦY</button>
                                                : <button onClick={() => subTab === 'swap' ? setViewingSwapId(r.id) : setApprovalModal(r)} className="ef-btn ef-btn-secondary ef-btn-sm">XEM</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination omitted for brevity but should be here */}
                </>
            )}

            {/* Leave Create Modal */}
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

            {/* Overtime Create Modal */}
            {createOtModal && (
                <div className="ef-modal-overlay">
                    <div className="ef-modal-content">
                        <div className="ef-modal-header"><span>Đăng Ký Tăng Ca</span><button onClick={() => setCreateOtModal(false)}>X</button></div>
                        <div className="ef-modal-body">
                            <p style={{ color: '#666', fontSize: '13px', marginBottom: '15px' }}>* Đơn tăng ca phải được gửi trước ít nhất 1 ngày.</p>
                            <form id="ot-form" onSubmit={handleCreateOt}>
                                <div className="mb-3">
                                    <strong>Ngày Tăng Ca:</strong>
                                    <input type="date" required className="ef-input" value={otForm.date} onChange={e => setOtForm({...otForm, date: e.target.value})} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{ flex: 1 }}><strong>Giờ Bắt Đầu:</strong><input type="time" required className="ef-input" value={otForm.startTime} onChange={e => setOtForm({...otForm, startTime: e.target.value})} /></div>
                                    <div style={{ flex: 1 }}><strong>Giờ Kết Thúc:</strong><input type="time" required className="ef-input" value={otForm.endTime} onChange={e => setOtForm({...otForm, endTime: e.target.value})} /></div>
                                </div>
                                <div className="mt-3"><strong>Lý Do Tăng Ca:</strong><textarea className="ef-textarea" required value={otForm.reason} onChange={e => setOtForm({...otForm, reason: e.target.value})} placeholder="Vd: Hoàn thành báo cáo tháng..." /></div>
                            </form>
                        </div>
                        <div className="ef-modal-footer">
                            <button className="ef-btn" onClick={() => setCreateOtModal(false)}>Hủy</button>
                            <button type="submit" form="ot-form" className="ef-btn ef-btn-primary">Gửi Đơn</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Approval / View Modal */}
            {approvalModal && subTab === 'leave' && (
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

            {/* Overtime Approval Modal (Keep legacy style for now) */}
            {approvalModal && subTab === 'overtime' && (
                <div className="ef-modal-overlay">
                    <div className="ef-modal-content" style={{ maxWidth: '400px' }}>
                        <div className="ef-modal-header">
                            <span style={{ color: '#15803d' }}>Duyệt Tăng Ca</span>
                            <button onClick={() => setApprovalModal(null)}>X</button>
                        </div>
                        <div className="ef-modal-body">
                            <strong>Ghi chú phản hồi:</strong>
                            <textarea className="ef-textarea" value={approvalNote} onChange={e => setApprovalNote(e.target.value)} placeholder="Nhập ý kiến (không bắt buộc)..." />
                        </div>
                        <div className="ef-modal-footer">
                            <button className="ef-btn" onClick={() => setApprovalModal(null)}>Hủy</button>
                            <button onClick={() => handleApproval({ action: 'approve', note: approvalNote })} className="ef-btn ef-btn-success">Xác Nhận</button>
                        </div>
                    </div>
                </div>
            )}
            {viewingSwapId && (
                <div className="ef-modal-overlay" style={{ zIndex: 100 }}>
                    <div className="ef-modal-content" style={{ maxWidth: '1000px', width: '95%', padding: 0 }}>
                        <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                            <h3 className="font-bold uppercase text-slate-700">Chi tiết đơn hoán đổi ca</h3>
                            <button onClick={() => setViewingSwapId(null)} className="text-slate-400 hover:text-slate-600">
                                <i className="fas fa-times"></i> Đóng
                            </button>
                        </div>
                        <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                            <ShiftSwapRequestDetail 
                                requestId={viewingSwapId} 
                                onBack={() => { setViewingSwapId(null); init(); }} 
                                user={user}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
