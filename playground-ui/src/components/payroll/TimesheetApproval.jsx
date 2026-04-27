import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { CheckSquare } from 'lucide-react';

export default function TimesheetApproval({ user, onBack }) {
    const [periods, setPeriods]               = useState([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState('');
    const [summaries, setSummaries]           = useState([]);
    const [loading, setLoading]               = useState(false);
    const [finaling, setFinaling]             = useState(false);
    const [searchQuery, setSearchQuery]       = useState('');
    const [showAll, setShowAll]               = useState(false);

    const roles     = user?.roles || [];
    const isAdmin   = roles.includes('Admin');
    const isManager = roles.includes('DepartmentManager') || isAdmin;
    const isHead    = roles.includes('DepartmentHead');

    useEffect(() => { fetchPeriods(); }, []);

    const fetchPeriods = async () => {
        try {
            const response = await api.get('/WorkSchedules/periods');
            const data = response.data.data || response.data || [];
            setPeriods(data);
            if (data.length > 0) {
                setSelectedPeriodId(data[0].id);
                fetchSummaries(data[0].id);
            }
        } catch {
            toast.error('Không thể tải danh sách kỳ công');
        }
    };

    const fetchSummaries = async (periodId) => {
        if (!periodId || !user) return;
        
        let deptId = user.departmentId;
        if (isAdmin) {
            deptId = showAll ? 0 : (user.departmentId || 0);
        }

        setLoading(true);
        try {
            const response = await api.get(`/Attendance/department/${deptId}/timesheets/${periodId}`);
            setSummaries(response.data.data || []);
        } catch {
            toast.error('Lỗi lấy dữ liệu bảng công');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (summaryId) => {
        try {
            await api.post(`/Attendance/timesheet/${summaryId}/approve`);
            toast.success('Đã thực hiện thao tác thành công');
            fetchSummaries(selectedPeriodId);
        } catch {
            toast.error('Lỗi khi duyệt công');
        }
    };

    const handleApproveAll = async () => {
        if (!selectedPeriodId) return;
        const pendingItems = filteredSummaries.filter(canActOn);
        if (pendingItems.length === 0) { 
            toast.error('Không có nhân viên cần duyệt/chốt'); 
            return; 
        }
        
        let actionLabel = isAdmin ? "Phê duyệt Tất Cả (Admin)" : "Chốt Công Nhóm";
        if (!window.confirm(`Bạn có chắc chắn [${actionLabel}] cho ${pendingItems.length} nhân viên?`)) return;
        
        setLoading(true);
        try {
            const deptId = isAdmin && showAll ? 0 : (user?.departmentId || 0);
            await api.post(`/Attendance/department/${deptId}/timesheets/${selectedPeriodId}/approve-all`);
            toast.success('Thao tác thành công');
            fetchSummaries(selectedPeriodId);
        } catch {
            toast.error('Lỗi hệ thống khi duyệt nhanh');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!selectedPeriodId) return;
        if (!window.confirm("Hệ thống sẽ quét lại toàn bộ dữ liệu chấm công thô để tạo bảng tổng hợp mới cho kỳ này. Bạn có chắc chắn?")) return;
        
        setLoading(true);
        try {
            await api.post(`/Attendance/finalize/${selectedPeriodId}`);
            toast.success('Đã tổng hợp dữ liệu công thành công!');
            fetchSummaries(selectedPeriodId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Lỗi khi tổng hợp dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!selectedPeriodId) return;
        const deptId = isAdmin && showAll ? 0 : (user?.departmentId || 0);
        
        setLoading(true);
        try {
            const response = await api.get(`/Attendance/department/${deptId}/export/${selectedPeriodId}`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `BangCong_${deptId}_${selectedPeriodId}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Đang tải file Excel...');
        } catch {
            toast.error('Lỗi khi xuất file Excel');
        } finally {
            setLoading(false);
        }
    };

    const canActOn = (s) => {
        if (s.employeeId == user?.employeeId) return false;
        if (isAdmin) return s.status !== 'Approved' && s.status !== 'Rejected';
        
        if (isManager) {
            if (s.isAdmin) return false;
            // Manager can approve anything that is not already approved
            return s.status !== 'Approved' && s.status !== 'Rejected';
        }
        
        // Head is no longer authorized for timesheet approval
        return false;
    };

    const filteredSummaries = summaries.filter(s => {
        if (!s.employeeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (!isAdmin) {
            if (s.employeeId == user?.employeeId) return false;
            if (s.isAdmin) return false;
        } else {
            if (s.employeeId == user?.employeeId) return false;
        }
        return true;
    });

    const approvedCount = filteredSummaries.filter(s => s.status === 'Approved').length;
    const pendingCount = filteredSummaries.filter(canActOn).length;

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar print:hidden">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="ef-toolbar-title">
                        <CheckSquare size={16} style={{ color: '#1a56db' }} />
                        <strong>
                            {isManager ? 'CHỐT BẢNG CÔNG' : 'DUYỆT BẢNG CÔNG'}
                        </strong>
                    </div>
                    
                    <select
                        className="ef-select"
                        value={selectedPeriodId}
                        onChange={(e) => { setSelectedPeriodId(e.target.value); fetchSummaries(e.target.value); }}
                        style={{ minWidth: '180px' }}
                    >
                        {periods.map(p => <option key={p.id} value={p.id}>{p.periodName.replace('Kỳ lương', 'Kỳ')}</option>)}
                    </select>

                    {isAdmin && (
                        <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <input
                                type="checkbox"
                                checked={showAll}
                                onChange={(e) => { setShowAll(e.target.checked); fetchSummaries(selectedPeriodId); }}
                            />
                            Toàn công ty
                        </label>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handleFinalize} 
                        disabled={loading || !selectedPeriodId} 
                        className="ef-btn"
                        style={{ backgroundColor: '#10b981', color: 'white', borderColor: '#10b981' }}
                    >
                        TỔNG HỢP DỮ LIỆU
                    </button>
                    <button 
                        onClick={handleExport} 
                        disabled={loading || !selectedPeriodId} 
                        className="ef-btn"
                        style={{ backgroundColor: '#4f46e5', color: 'white', borderColor: '#4f46e5' }}
                    >
                        XUẤT EXCEL
                    </button>
                    <button 
                        onClick={handleApproveAll} 
                        disabled={loading || !selectedPeriodId} 
                        className="ef-btn ef-btn-primary"
                    >
                        CHỐT CÔNG NHANH ({pendingCount})
                    </button>
                    {onBack && (
                         <button onClick={onBack} className="ef-btn">Đóng</button>
                    )}
                </div>
            </div>

            <div className="ef-table-wrap" style={{ marginBottom: '15px' }}>
                <table className="ef-table no-top-border">
                    <tbody>
                        <tr>
                            <th style={{ width: '15%', backgroundColor: '#f4f4f4', fontWeight: 'bold' }}>TỔNG NHÂN SỰ</th>
                            <td className="c" style={{ width: '15%', fontWeight: 'bold' }}>{filteredSummaries.length}</td>
                            <th style={{ width: '15%', backgroundColor: '#f4f4f4', fontWeight: 'bold' }}>{isManager ? 'ĐÃ CHỐT' : 'ĐÃ DUYỆT ĐẠT'}</th>
                            <td className="c ef-text-ok" style={{ width: '15%', fontWeight: 'bold' }}>{approvedCount}</td>
                            <th style={{ width: '15%', backgroundColor: '#f4f4f4', fontWeight: 'bold' }}>{isManager ? 'CHỜ CHỐT' : 'CHỜ DUYỆT'}</th>
                            <td className="c ef-text-miss" style={{ width: '15%', fontWeight: 'bold' }}>{pendingCount}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="ef-toolbar print:hidden">
                 <input
                     type="text"
                     placeholder="Tìm tên nhân viên..."
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="ef-input"
                     style={{ width: '300px' }}
                 />
            </div>

            <div className="ef-table-wrap">
                <table className="ef-table no-top-border">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>NHÂN VIÊN</th>
                            <th className="c">NGÀY CÔNG</th>
                            <th className="c">TĂNG CA</th>
                            <th className="c" title="M: Muộn | S: Sớm">
                                VI PHẠM (M|S)
                            </th>
                            <th className="c">NGÀY VẮNG</th>
                            <th className="c" style={{ width: '120px' }}>TRẠNG THÁI</th>
                            <th className="c" style={{ width: '120px' }}>QUYẾT ĐỊNH</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="ef-empty">Đang tải dữ liệu...</td></tr>
                        ) : filteredSummaries.length === 0 ? (
                            <tr><td colSpan="7" className="ef-empty">Không có dữ liệu.</td></tr>
                        ) : filteredSummaries.map(s => (
                            <tr key={s.id}>
                                <td style={{ fontWeight: 'bold' }}>{s.employeeName}</td>
                                <td className="c"><strong>{s.adjustedWorkingDays}</strong></td>
                                <td className="c">{s.overtimeHours > 0 ? `${s.overtimeHours}h` : '-'}</td>
                                <td className="c">{(s.lateDays + s.earlyLeaveDays) > 0 ? <span className="ef-text-miss" style={{ fontSize: '11px' }}>M:{s.lateDays} | S:{s.earlyLeaveDays}</span> : '-'}</td>
                                <td className="c">{s.absentDays > 0 ? <span className="ef-text-miss">{s.absentDays}</span> : '-'}</td>
                                <td className="c">
                                   {s.status === 'Approved' ? <span className="ef-text-ok" style={{ fontSize: '10px', fontWeight: 'bold' }}>ĐÃ CHỐT</span> :
                                    s.status === 'PendingManagerApproval' ? <span style={{ color: '#d97706', fontSize: '10px', fontWeight: 'bold' }}>ĐÃ DUYỆT</span> :
                                    <span style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}>CHỜ DUYỆT</span>}
                                </td>
                                <td className="c">
                                    {canActOn(s) ? (
                                        <button onClick={() => handleApprove(s.id)} className="ef-btn" style={{ padding: '4px 8px', fontSize: '10px' }}>
                                            {isManager ? 'CHỐT' : (isHead ? 'DUYỆT' : 'PHÊ DUYỆT')}
                                        </button>
                                    ) : (
                                        <span style={{ fontSize: '10px', color: '#cbd5e1' }}>-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
