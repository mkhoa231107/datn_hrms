import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    Calculator, Lock, ChevronRight, CheckCircle2,
    Users, Play, Download, RefreshCw, AlertTriangle,
    ArrowLeft, Calendar, Building2, History
} from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);
const fmtNum = (val, dec = 1) => val == null ? '—' : Number(val).toFixed(dec);

// ── Minimal step breadcrumb ──────────────────────────────────────────────────
function Breadcrumb({ items }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
            {items.map((item, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <ChevronRight size={12} style={{ color: '#cbd5e1' }} />}
                    <span style={{ color: i === items.length - 1 ? '#1e293b' : '#94a3b8', fontWeight: i === items.length - 1 ? 600 : 400 }}>
                        {item}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PayrollProcessing({ user }) {
    // Only the C&B Department Head (Dept 7) can calculate/re-calculate or lock payroll.
    // Admin role is restricted to view-only as per requirements.
    const canManageValue = user?.roles?.includes('DepartmentHead') && user?.departmentId === 7;
    const canManage = canManageValue;

    // View: 'select' = chọn + nhân viên, 'result' = bảng kết quả
    const [view, setView] = useState('select');

    // Filter state
    const [schedulePeriods, setSchedulePeriods] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedSchedPeriod, setSelectedSchedPeriod] = useState(null);
    const [selectedDept, setSelectedDept] = useState(null);
    const [payrollPeriod, setPayrollPeriod] = useState(null);

    // Employee list state
    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loadingEmps, setLoadingEmps] = useState(false);

    // Result state
    const [records, setRecords] = useState([]);
    const [calculating, setCalculating] = useState(false);
    const [allPayrollPeriods, setAllPayrollPeriods] = useState([]);

    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoadingEmps(true);
        Promise.all([
            api.get('/WorkSchedules/periods'),
            api.get('/Departments'),
            api.get('/Payroll/periods')
        ]).then(([sp, d, pp]) => {
            setSchedulePeriods(sp.data?.data || sp.data || []);
            setDepartments((d.data || []).filter(dep => dep.isActive));
            setAllPayrollPeriods(pp.data?.data || pp.data || []);
        }).catch(() => toast.error('Không thể tải dữ liệu khởi tạo'))
          .finally(() => setLoadingEmps(false));
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleSelectPeriod = async (id) => {
        if (!id) { setSelectedSchedPeriod(null); setPayrollPeriod(null); setEmployees([]); setSelectedIds([]); return; }
        const sched = schedulePeriods.find(s => s.id === parseInt(id));
        setSelectedSchedPeriod(sched);
        setSelectedDept(null);
        setEmployees([]);
        setSelectedIds([]);

        try {
            const res = await api.get('/Payroll/periods');
            const all = res.data?.data || res.data || [];
            let pp = all.find(p => p.schedulePeriodId === sched.id);
            if (!pp) {
                const create = await api.post('/Payroll/periods', {
                    name: `Bảng lương ${sched.periodName}`,
                    schedulePeriodId: sched.id
                });
                pp = create.data?.data;
            }
            setPayrollPeriod(pp);
            
            // For Admin, if they have already selected a department, reload results
            if (!canManage && selectedDept && pp) {
                handleViewHistoryWithPeriod(pp, selectedDept.id);
            }
        } catch {
            toast.error('Không thể khởi tạo kỳ lương');
        }
    };

    const handleViewHistoryWithPeriod = async (period, deptId) => {
        try {
            const res = await api.get(`/Payroll/periods/${period.id}/records`);
            let all = res.data?.data || res.data || [];
            if (deptId) {
                const dept = departments.find(d => d.id === parseInt(deptId));
                if (dept) {
                    all = all.filter(r => r.departmentName?.includes(dept.departmentName) || dept.departmentName?.includes(r.departmentName));
                }
            }
            setRecords(all);
            setView('result');
        } catch {
            toast.error('Lỗi khi tải dữ liệu lương');
        }
    };

    const handleSelectDept = async (id) => {
        if (!id) { setSelectedDept(null); setEmployees([]); setSelectedIds([]); return; }
        if (!selectedSchedPeriod) { toast.error('Chọn kỳ lương trước'); return; }
        const dept = departments.find(d => d.id === parseInt(id));
        setSelectedDept(dept);
        setSelectedIds([]);
        setLoadingEmps(true);
        try {
            const res = await api.get(`/Payroll/employee-profiles-with-attendance?departmentId=${id}&schedulePeriodId=${selectedSchedPeriod.id}`);
            const emps = res.data?.data || [];
            setEmployees(emps);
            
            // For Admin, if they select a department, automatically try to load the result
            if (!canManage && payrollPeriod) {
                handleViewHistoryWithPeriod(payrollPeriod, id);
            }
        } catch {
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoadingEmps(false);
        }
    };

    const toggleAll = () => {
        if (selectedIds.length === employees.length) setSelectedIds([]);
        else setSelectedIds(employees.map(e => e.employeeId));
    };

    const toggleOne = (id) => setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    const handleCalculate = async () => {
        if (!payrollPeriod) { toast.error('Chọn kỳ lương'); return; }
        if (selectedIds.length === 0) { toast.error('Chọn ít nhất 1 nhân viên'); return; }
        setCalculating(true);
        try {
            await api.post(`/Payroll/periods/${payrollPeriod.id}/calculate-for-employees`, {
                employeeIds: selectedIds
            });
            const res = await api.get(`/Payroll/periods/${payrollPeriod.id}/records`);
            const all = res.data?.data || res.data || [];
            setRecords(all.filter(r => selectedIds.includes(r.employeeId)));
            toast.success(`Tính lương thành công cho ${selectedIds.length} nhân viên`);
            setView('result');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Lỗi khi tính lương');
        } finally {
            setCalculating(false);
        }
    };

    const handleViewHistory = async () => {
        if (!payrollPeriod) { toast.error('Chọn kỳ lương'); return; }
        try {
            const res = await api.get(`/Payroll/periods/${payrollPeriod.id}/records`);
            let all = res.data?.data || res.data || [];
            
            // Lọc theo phòng ban nếu có chọn
            if (selectedDept) {
                // Tên phòng ban trong bảng lương trả về có chữ "Phòng", cần check khớp một phần
                all = all.filter(r => r.departmentName?.includes(selectedDept.departmentName) || selectedDept.departmentName?.includes(r.departmentName));
            }
            
            if (all.length === 0) {
                toast.error('Chưa có dữ liệu tính lương cho kỳ/phòng ban này');
                return;
            }
            
            setRecords(all);
            setView('result');
        } catch {
            toast.error('Lỗi khi tải lịch sử tính lương');
        }
    };

    const loadHistoryList = async () => {
        try {
            const res = await api.get('/Payroll/periods');
            setAllPayrollPeriods(res.data?.data || res.data || []);
            setView('history_list');
        } catch {
            toast.error('Lỗi tải danh sách lịch sử');
        }
    };

    const handleViewHistoryDirect = async (period) => {
        try {
            const res = await api.get(`/Payroll/periods/${period.id}/records`);
            const all = res.data?.data || res.data || [];
            if(all.length === 0){ toast.error('Kỳ này chưa có dữ liệu'); return; }
            setRecords(all);
            
            // Tìm schedulePeriod tương ứng để hiển thị đúng Breadcrumb
            const sched = schedulePeriods.find(s => s.id === period.schedulePeriodId);
            if(sched) setSelectedSchedPeriod(sched);
            
            setPayrollPeriod(period);
            setSelectedDept(null);
            setView('result');
        } catch {
            toast.error('Lỗi khi tải bảng lương');
        }
    };

    const handleLock = async () => {
        if (!window.confirm('Xác nhận khóa bảng lương? Sau khi khóa không thể chỉnh sửa.')) return;
        try {
            await api.post(`/Payroll/periods/${payrollPeriod.id}/approve`);
            toast.success('Bảng lương đã được khóa thành công');
            setPayrollPeriod(prev => ({ ...prev, status: 'Locked' }));
        } catch {
            toast.error('Lỗi khi khóa bảng lương');
        }
    };

    const handleExportExcel = () => {
        if (records.length === 0) {
            toast.error('Không có dữ liệu để xuất');
            return;
        }
        
        // Define CSV headers
        const headers = ['STT', 'Mã NV', 'Họ tên', 'Phòng ban', 'Chức danh', 'Lương công', 'Tăng ca', 'Bảo hiểm', 'Thực lĩnh'];
        
        // Map records to CSV rows
        const rows = records.map((r, idx) => {
            const bh = (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0);
            return [
                idx + 1,
                r.employeeCode,
                `"${r.employeeName}"`,
                `"${r.departmentName}"`,
                `"${r.positionName || ''}"`,
                r.actualWorkingSalary,
                r.overtimePay,
                bh,
                r.netSalary
            ].join(',');
        });
        
        // Combine headers and rows
        const csvContent = [headers.join(','), ...rows].join('\n');
        
        // Add BOM so Excel opens UTF-8 correctly
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Bang_Luong_${selectedDept?.departmentName || 'Tat_Ca'}_${selectedSchedPeriod?.periodName || 'Ky_Luong'}.csv`.replace(/\s+/g, '_');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Đã xuất file bảng lương');
    };

    const isLocked = payrollPeriod?.status === 'Locked';
    const allSelected = employees.length > 0 && selectedIds.length === employees.length;

    // Totals
    const totalLtg = records.reduce((s, r) => s + (r.actualWorkingSalary || 0), 0);
    const totalLot = records.reduce((s, r) => s + (r.overtimePay || 0), 0);
    const totalBh  = records.reduce((s, r) => s + (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0), 0);
    const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);

    // Breadcrumb labels
    const breadcrumb = [
        'Tính lương',
        selectedSchedPeriod?.periodName,
        selectedDept?.departmentName,
        view === 'result' ? 'Kết quả' : null
    ].filter(Boolean);

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: HISTORY LIST (Dashboard lịch sử các tháng)
    // ══════════════════════════════════════════════════════════════════════════
    if (view === 'history_list') {
        return (
            <div className="ef-wrap animate-fade-in pb-20">
                <div className="ef-toolbar" style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="ef-toolbar-title">
                        <History size={15} style={{ color: '#475569' }} />
                        <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                            Danh sách lịch sử các đợt tính lương
                        </strong>
                    </div>
                    <button className="ef-btn" onClick={() => setView('select')} style={{fontWeight: 500}}>
                        <ArrowLeft size={14} style={{ marginRight: '6px' }}/> Trở về màn hình tính lương
                    </button>
                </div>
                
                <div style={{ padding: '24px' }}>
                    {allPayrollPeriods.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            Chưa có dữ liệu lịch sử tính lương nào.
                        </div>
                    ) : (
                        <div style={{ borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table className="ef-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>Kỳ gốc (ID)</th>
                                        <th>Tên bảng lương</th>
                                        <th>Trạng thái</th>
                                        <th>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPayrollPeriods.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ textAlign: 'center', color: '#64748b' }}>#{p.schedulePeriodId}</td>
                                            <td style={{ fontWeight: 500, color: '#0f172a' }}>{p.name}</td>
                                            <td>
                                                <span style={{
                                                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '12px',
                                                    backgroundColor: p.status === 'Locked' ? '#dcfce7' : '#fef08a',
                                                    color: p.status === 'Locked' ? '#166534' : '#854d0e'
                                                }}>
                                                    {p.status === 'Locked' ? 'Đã Chốt & Khóa' : 'Đang mở (Nháp)'}
                                                </span>
                                            </td>
                                            <td>
                                                <button 
                                                    className="ef-btn"
                                                    style={{ height: '28px', fontSize: '11px', background: '#f8fafc', border: '1px solid #cbd5e1' }}
                                                    onClick={() => handleViewHistoryDirect(p)}
                                                >
                                                    <CheckCircle2 size={12} style={{marginRight: '4px', color: '#4f46e5'}} /> Lấy dữ liệu gần nhất
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: SELECT (chọn kỳ lương + phòng ban + nhân viên)
    // ══════════════════════════════════════════════════════════════════════════
    if (view === 'select') {
        return (
            <div className="ef-wrap animate-fade-in pb-20">
                {/* ── Toolbar ── */}
                <div className="ef-toolbar" style={{ borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="ef-toolbar-title">
                        <Calculator size={15} style={{ color: '#475569' }} />
                        <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                            {canManage ? 'Tính Lương' : 'Bảng Lương Nhân Viên'} <span style={{ color: '#94a3b8', fontWeight: 400 }}>— {canManage ? 'Tổ Lương Thưởng' : 'Dữ liệu đã tính'}</span>
                        </strong>
                    </div>
                    
                    <button 
                        className="ef-btn" 
                        style={{ height: '32px', background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe', fontWeight: 600 }}
                        onClick={loadHistoryList}
                    >
                        <History size={14} style={{ marginRight: '6px' }} />
                        Trung tâm Lịch sử tính lương
                    </button>
                </div>

                {/* ── Breadcrumb ── */}
                <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <Breadcrumb items={breadcrumb} />
                </div>

                {/* ── Filter Row ── */}
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Kỳ lương */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />Kỳ lương
                        </label>
                        <select
                            className="ef-select"
                            style={{ width: '200px' }}
                            value={selectedSchedPeriod?.id || ''}
                            onChange={e => handleSelectPeriod(e.target.value)}
                        >
                            <option value="">— Chọn kỳ lương —</option>
                            {schedulePeriods.map(sp => (
                                <option key={sp.id} value={sp.id}>{sp.periodName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Phòng ban */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            <Building2 size={11} style={{ display: 'inline', marginRight: '4px' }} />Phòng ban
                        </label>
                        <select
                            className="ef-select"
                            style={{ width: '220px' }}
                            value={selectedDept?.id || ''}
                            onChange={e => handleSelectDept(e.target.value)}
                            disabled={!selectedSchedPeriod}
                        >
                            <option value="">— Chọn phòng ban —</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                    {payrollPeriod && (
                        <button 
                            className="ef-btn" 
                            style={{ 
                                height: '34px', 
                                alignSelf: 'flex-end', 
                                marginLeft: 'auto', 
                                background: '#f8fafc', 
                                border: '1px solid #cbd5e1', 
                                color: '#0f172a', 
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                            onClick={handleViewHistory}
                        >
                            <History size={14} style={{ color: '#64748b' }} />
                            Xem lại bảng lương {selectedDept ? 'đã tính' : 'toàn công ty'}
                        </button>
                    )}

                    {loadingEmps && <RefreshCw size={15} className="animate-spin" style={{ color: '#94a3b8', marginBottom: '6px' }} />}
                </div>

                {/* ── Action bar (only when employees loaded) ── */}
                {employees.length > 0 && (
                    <div className="ef-toolbar" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#475569' }}>
                                Đã chọn <strong style={{ color: '#1e293b' }}>{selectedIds.length}</strong> / {employees.length} nhân viên
                            </span>
                            <button
                                className="ef-btn"
                                style={{ fontSize: '11px', padding: '4px 10px' }}
                                onClick={toggleAll}
                            >
                                {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                            </button>
                        </div>
                        {canManage ? (
                            <button
                                onClick={handleCalculate}
                                disabled={selectedIds.length === 0 || calculating || isLocked}
                                className="ef-btn ef-btn-primary"
                                style={{ fontWeight: 600, minWidth: '140px' }}
                            >
                                {calculating
                                    ? <><RefreshCw size={13} className="animate-spin" /> Đang tính...</>
                                    : <><Play size={13} /> Tính lương</>
                                }
                            </button>
                        ) : (
                            <button
                                onClick={handleViewHistory}
                                className="ef-btn ef-btn-primary"
                                style={{ fontWeight: 600, background: '#0ea5e9', borderColor: '#0ea5e9' }}
                            >
                                <History size={14} /> Xem dữ liệu lương
                            </button>
                        )}
                    </div>
                )}

                {/* ── Employee Table ── */}
                {employees.length > 0 ? (
                    <div className="ef-table-wrap">
                        <table className="ef-table" style={{ borderTop: 'none', minWidth: '860px' }}>
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: '38px' }}>
                                        <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                                    </th>
                                    <th style={{ width: '40px' }} className="c">STT</th>
                                    <th style={{ width: '110px' }}>Mã NV</th>
                                    <th>Họ tên</th>
                                    <th>Chức danh</th>
                                    <th className="r" style={{ width: '130px' }}>Lương CB</th>
                                    <th className="c" style={{ width: '90px' }}>Ngày công</th>
                                    <th className="c" style={{ width: '90px' }}>Giờ OT</th>
                                    <th className="c" style={{ width: '110px' }}>Bảng công</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, idx) => {
                                    const checked = selectedIds.includes(emp.employeeId);
                                    const approved = emp.hasApprovedTimesheet;
                                    return (
                                        <tr
                                            key={emp.employeeId}
                                            onClick={() => toggleOne(emp.employeeId)}
                                            className="hover:bg-slate-50 cursor-pointer"
                                            style={{ opacity: approved ? 1 : 0.5 }}
                                        >
                                            <td className="c p-2" onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" checked={checked} onChange={() => toggleOne(emp.employeeId)} />
                                            </td>
                                            <td className="c p-3 text-xs text-slate-400">{idx + 1}</td>
                                            <td className="p-3 text-xs font-mono font-bold text-slate-600">{emp.employeeCode}</td>
                                            <td className="p-3 font-semibold text-slate-800">{emp.fullName}</td>
                                            <td className="p-3 text-xs text-slate-500">{emp.positionName}</td>
                                            <td className="p-3 text-right text-slate-700">{fmt(emp.basicSalary)}</td>
                                            <td className="p-3 text-center font-semibold text-slate-700">{fmtNum(emp.actualWorkingDays)}</td>
                                            <td className="p-3 text-center text-slate-600">{fmtNum(emp.overtimeHours)}h</td>
                                            <td className="p-3 text-center">
                                                {approved ? (
                                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 7px', borderRadius: '3px', border: '1px solid #bbf7d0' }}>
                                                        Đã duyệt
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#b45309', background: '#fffbeb', padding: '2px 7px', borderRadius: '3px', border: '1px solid #fde68a' }}>
                                                        Chưa duyệt
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    !loadingEmps && selectedDept && (
                        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                            Không có nhân viên nào trong phòng ban này.
                        </div>
                    )
                )}

                {/* ── Empty state ── */}
                {!selectedSchedPeriod && (
                    <div style={{ padding: '64px 24px', textAlign: 'center' }}>
                        <Calculator size={40} style={{ margin: '0 auto 14px', color: '#cbd5e1' }} />
                        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '6px' }}>Chọn kỳ lương và phòng ban để bắt đầu</p>
                        <p style={{ fontSize: '12px', color: '#cbd5e1' }}>Công thức: Lương thực lĩnh = (Lương công + Tăng ca) − Bảo hiểm</p>
                    </div>
                )}
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VIEW: RESULT (bảng kết quả sau khi tính)
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="ef-wrap animate-fade-in pb-20">
            {/* ── Toolbar ── */}
            <div className="ef-toolbar" style={{ borderBottom: '1px solid #e2e8f0' }}>
                <div className="ef-toolbar-title">
                    <button
                        onClick={() => setView('select')}
                        className="ef-btn"
                        style={{ padding: '4px 10px', marginRight: '4px' }}
                    >
                        <ArrowLeft size={13} /> Quay lại
                    </button>
                    <Calculator size={15} style={{ color: '#475569' }} />
                    <strong style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1e293b' }}>
                        Kết quả tính lương
                    </strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {canManage && !isLocked && (
                        <button onClick={handleLock} className="ef-btn" style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
                            <Lock size={13} /> Khóa bảng lương
                        </button>
                    )}
                    {isLocked && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', padding: '4px 10px', background: '#fef2f2', borderRadius: '4px', border: '1px solid #fecaca' }}>
                            🔒 Đã khóa
                        </span>
                    )}
                    <button onClick={handleExportExcel} className="ef-btn"><Download size={13} /> Xuất Excel</button>
                </div>
            </div>

            {/* ── Breadcrumb ── */}
            <div style={{ padding: '8px 16px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                <Breadcrumb items={breadcrumb} />
            </div>

            {/* ── Summary Bar ── */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
                {[
                    { label: 'Lương công (Ltg)', value: fmt(totalLtg), muted: true },
                    { label: 'Tăng ca (Lot)', value: fmt(totalLot), muted: true },
                    { label: 'Bảo hiểm (BH)', value: fmt(totalBh), muted: true },
                    { label: 'Tổng thực lĩnh', value: fmt(totalNet), highlight: true },
                ].map(item => (
                    <div key={item.label}>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                            {item.label}
                        </div>
                        <div style={{ fontSize: item.highlight ? '16px' : '14px', fontWeight: item.highlight ? 700 : 500, color: item.highlight ? '#1e293b' : '#475569' }}>
                            {item.value}
                        </div>
                    </div>
                ))}
                <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
                    {records.length} nhân viên · {selectedDept?.departmentName} · {selectedSchedPeriod?.periodName}
                </div>
            </div>

            {/* ── Result Table ── */}
            <div className="ef-table-wrap">
                <table className="ef-table" style={{ borderTop: 'none', minWidth: '760px' }}>
                    <thead>
                        <tr>
                            <th className="c" style={{ width: '44px' }}>STT</th>
                            <th style={{ width: '110px' }}>Mã NV</th>
                            <th>Họ tên</th>
                            <th className="r" style={{ width: '150px' }}>Lương công</th>
                            <th className="r" style={{ width: '130px' }}>Tăng ca</th>
                            <th className="r" style={{ width: '140px' }}>Bảo hiểm</th>
                            <th className="r" style={{ width: '160px', background: '#f8fafc' }}>Thực lĩnh</th>
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((r, idx) => {
                            const bh = (r.socialInsurance || 0) + (r.healthInsurance || 0) + (r.unemploymentInsurance || 0);
                            return (
                                <tr key={r.id} className="hover:bg-slate-50 transition">
                                    <td className="p-3 text-xs text-slate-400 text-center">{idx + 1}</td>
                                    <td className="p-3 text-xs font-mono text-slate-500">{r.employeeCode}</td>
                                    <td className="p-3">
                                        <div className="font-semibold text-slate-800">{r.employeeName}</div>
                                        <div className="text-xs text-slate-400">{r.departmentName}</div>
                                    </td>
                                    <td className="p-3 text-right text-slate-600">{fmt(r.actualWorkingSalary)}</td>
                                    <td className="p-3 text-right text-slate-600">{fmt(r.overtimePay)}</td>
                                    <td className="p-3 text-right text-slate-500 text-sm">({fmt(bh)})</td>
                                    <td className="p-3 text-right bg-slate-50">
                                        <span className="font-bold text-slate-900">{fmt(r.netSalary)}</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc' }}>
                            <td colSpan={3} className="p-3 text-sm font-semibold text-slate-500 text-right">Tổng cộng</td>
                            <td className="p-3 text-right font-semibold text-slate-700">{fmt(totalLtg)}</td>
                            <td className="p-3 text-right font-semibold text-slate-700">{fmt(totalLot)}</td>
                            <td className="p-3 text-right font-semibold text-slate-500">({fmt(totalBh)})</td>
                            <td className="p-3 text-right bg-slate-50">
                                <span className="font-bold text-slate-900 text-base">{fmt(totalNet)}</span>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
