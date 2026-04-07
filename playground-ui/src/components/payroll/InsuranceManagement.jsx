import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { Search, Shield, Save, Loader2, Filter, User, RefreshCw } from 'lucide-react';
import '../dashboard/Enterprise.css';


export default function InsuranceManagement({ user, onBack }) {
    const [employees, setEmployees] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [mainDepartments, setMainDepartments] = useState([]);
    const [subDepartments, setSubDepartments] = useState([]);
    const [selectedMainId, setSelectedMainId] = useState(0);
    const [activeTabId, setActiveTabId] = useState(0);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(null); 
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDepartments();
    }, []);

    useEffect(() => {
        if (allDepartments.length > 0) {
            const subs = allDepartments.filter(d => d.parentDepartmentId === selectedMainId).slice(0, 2);
            setSubDepartments(subs);
            if (subs.length > 0) {
                setActiveTabId(subs[0].id);
            } else {
                setActiveTabId(selectedMainId); // Fallback to main if no subs
            }
        }
    }, [selectedMainId, allDepartments]);

    useEffect(() => {
        if (activeTabId !== null) {
            fetchInsuranceData(activeTabId);
        }
    }, [activeTabId]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/Departments');
            const data = res.data || [];
            setAllDepartments(data);
            
            // Get 5 main departments (top level)
            const mains = data.filter(d => d.parentDepartmentId === null).slice(0, 5);
            setMainDepartments(mains);
            
            if (!selectedMainId && mains.length > 0) {
                setSelectedMainId(mains[0].id);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchInsuranceData = async (deptId) => {
        if (deptId === 0) return;
        setLoading(true);
        try {
            const response = await api.get(`/Insurance/department/${deptId}`);
            setEmployees(response.data.data || []);
        } catch (error) {
            console.error('Error fetching insurance data:', error);
            // toast.error('Không thể tải dữ liệu bảo hiểm');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (empId, data) => {
        setSaving(empId);
        try {
            await api.post(`/Insurance/employee/${empId}`, data);
            toast.success('Cập nhật thành công!');
            // Update local state instead of refetching all
            setEmployees(prev => prev.map(e => e.employeeId === empId ? { ...e, ...data } : e));
        } catch (error) {
            console.error('Error updating insurance:', error);
            toast.error('Lỗi khi lưu dữ liệu');
        } finally {
            setSaving(null);
        }
    };

    const toggleField = (emp, field) => {
        const newData = {
            isSocialEnabled: emp.isSocialEnabled,
            isHealthEnabled: emp.isHealthEnabled,
            isUnemploymentEnabled: emp.isUnemploymentEnabled,
            isHealthcareEnabled: emp.isHealthcareEnabled,
            healthcareAmount: emp.healthcareAmount,
            isLifeInsuranceEnabled: emp.isLifeInsuranceEnabled,
            lifeInsuranceAmount: emp.lifeInsuranceAmount,
            additionalInsuranceAmount: emp.additionalInsuranceAmount,
            note: emp.note
        };
        newData[field] = !emp[field];
        handleUpdate(emp.employeeId, newData);
    };

    const handleAmountChange = (empId, val) => {
        setEmployees(prev => prev.map(e => e.employeeId === empId ? { ...e, additionalInsuranceAmount: parseFloat(val) || 0 } : e));
    };

    const filteredEmployees = employees.filter(e => 
        e.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="ef-wrap animate-fade-in">
            {/* Header Toolbar */}
            <div className="ef-toolbar" style={{ borderBottom: 'none' }}>
                <div className="ef-toolbar-title">
                    <Shield size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Cấu hình Bảo hiểm Nhân viên</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => fetchInsuranceData(activeTabId)} className="ef-btn">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={14} /> LÀM MỚI
                    </button>
                    {onBack && <button onClick={onBack} className="ef-btn">ĐÓNG</button>}
                </div>
            </div>

            {/* Filter Bar */}
            <div className="ef-toolbar" style={{ background: '#f8fafc', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>PHÒNG BAN:</span>
                    <select 
                        value={selectedMainId}
                        onChange={(e) => setSelectedMainId(parseInt(e.target.value))}
                        className="ef-select"
                        style={{ width: '220px' }}
                    >
                        {mainDepartments.map(d => (
                            <option key={d.id} value={d.id}>{d.departmentName}</option>
                        ))}
                    </select>
                </div>

                <div style={{ position: 'relative', flex: 1, maxWidth: '250px', marginLeft: '10px' }}>
                    <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', color: '#64748b' }} />
                    <input 
                        type="text"
                        placeholder="Tìm nhân viên..."
                        className="ef-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '32px' }}
                    />
                </div>

                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginLeft: 'auto' }}>
                    TỔNG: {filteredEmployees.length} NV
                </div>
            </div>

            {/* Sub-Department Tabs */}
            <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 15px' }}>
                {subDepartments.length > 0 ? subDepartments.map(sub => (
                    <button
                        key={sub.id}
                        onClick={() => setActiveTabId(sub.id)}
                        style={{
                            padding: '12px 20px',
                            fontSize: '13px',
                            fontWeight: activeTabId === sub.id ? 'bold' : 'normal',
                            color: activeTabId === sub.id ? '#1a56db' : '#64748b',
                            borderBottom: activeTabId === sub.id ? '3px solid #1a56db' : '3px solid transparent',
                            background: 'none',
                            borderTop: 'none',
                            borderLeft: 'none',
                            borderRight: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {sub.departmentName.toUpperCase()}
                    </button>
                )) : (
                    <div style={{ padding: '12px 0', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Không có bộ phận nhỏ trực thuộc
                    </div>
                )}
            </div>

            <div className="ef-table-wrap">
                <table className="ef-table" style={{ borderTop: 'none' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '220px' }}>NHÂN VIÊN / BỘ PHẬN</th>
                            <th className="c" style={{ width: '100px' }}>BHXH (8%)</th>
                            <th className="c" style={{ width: '100px' }}>BHYT (1.5%)</th>
                            <th className="c" style={{ width: '100px' }}>BHTN (1%)</th>
                            <th className="c" style={{ width: '120px' }}>PVI SỨC KHỎE</th>
                            <th className="c" style={{ width: '120px' }}>NHÂN THỌ</th>
                            <th style={{ width: '200px' }}>Ghi chú / Thu khác</th>
                            <th className="c" style={{ width: '80px' }}>LƯU</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Đang tải dữ liệu...</td>
                            </tr>
                        ) : filteredEmployees.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '60px', color: '#888' }}>Không có dữ liệu nhân viên.</td>
                            </tr>
                        ) : filteredEmployees.map(e => (
                            <tr key={e.employeeId}>
                                <td>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#1a56db' }}>{e.employeeName}</div>
                                            {e.status === 2 && (
                                                <span style={{ fontSize: '9px', background: '#dcfce7', color: '#166534', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>CHÍNH THỨC</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                                            <span style={{ fontWeight: 'bold' }}>{e.employeeCode}</span>
                                            <span>|</span>
                                            <span>{e.departmentName || 'Chưa gán bộ phận'}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="c" title={e.status === 2 ? "Bắt buộc đối với nhân viên chính thức" : ""}>
                                    <input 
                                        type="checkbox" 
                                        checked={e.isSocialEnabled} 
                                        onChange={() => toggleField(e, 'isSocialEnabled')} 
                                        disabled={e.status === 2}
                                        style={e.status === 2 ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                    />
                                    {e.status === 2 && <div style={{ fontSize: '8px', color: '#166534', fontWeight: 'bold' }}>BẮT BUỘC</div>}
                                </td>
                                <td className="c" title={e.status === 2 ? "Bắt buộc đối với nhân viên chính thức" : ""}>
                                    <input 
                                        type="checkbox" 
                                        checked={e.isHealthEnabled} 
                                        onChange={() => toggleField(e, 'isHealthEnabled')} 
                                        disabled={e.status === 2}
                                        style={e.status === 2 ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                    />
                                    {e.status === 2 && <div style={{ fontSize: '8px', color: '#166534', fontWeight: 'bold' }}>BẮT BUỘC</div>}
                                </td>
                                <td className="c" title={e.status === 2 ? "Bắt buộc đối với nhân viên chính thức" : ""}>
                                    <input 
                                        type="checkbox" 
                                        checked={e.isUnemploymentEnabled} 
                                        onChange={() => toggleField(e, 'isUnemploymentEnabled')} 
                                        disabled={e.status === 2}
                                        style={e.status === 2 ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                                    />
                                    {e.status === 2 && <div style={{ fontSize: '8px', color: '#166534', fontWeight: 'bold' }}>BẮT BUỘC</div>}
                                </td>
                                <td className="c">
                                    <input type="checkbox" checked={e.isHealthcareEnabled} onChange={() => toggleField(e, 'isHealthcareEnabled')} />
                                    {e.isHealthcareEnabled && (
                                        <div style={{ marginTop: '4px' }}>
                                            <input 
                                                type="number" 
                                                value={e.healthcareAmount} 
                                                className="ef-input"
                                                style={{ width: '90px', fontSize: '11px', padding: '2px 5px', textAlign: 'right' }}
                                                onChange={(ev) => setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, healthcareAmount: parseFloat(ev.target.value) || 0 } : item))}
                                            />
                                        </div>
                                    )}
                                </td>
                                <td className="c">
                                    <input type="checkbox" checked={e.isLifeInsuranceEnabled} onChange={() => toggleField(e, 'isLifeInsuranceEnabled')} />
                                    {e.isLifeInsuranceEnabled && (
                                        <div style={{ marginTop: '4px' }}>
                                            <input 
                                                type="number" 
                                                value={e.lifeInsuranceAmount} 
                                                className="ef-input"
                                                style={{ width: '90px', fontSize: '11px', padding: '2px 5px', textAlign: 'right' }}
                                                onChange={(ev) => setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, lifeInsuranceAmount: parseFloat(ev.target.value) || 0 } : item))}
                                            />
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>Khác (VND):</span>
                                            <input 
                                                type="number"
                                                value={e.additionalInsuranceAmount}
                                                onChange={(ev) => handleAmountChange(e.employeeId, ev.target.value)}
                                                className="ef-input"
                                                style={{ width: '100%', fontSize: '11px', textAlign: 'right', padding: '2px 5px' }}
                                            />
                                        </div>
                                        <input 
                                            type="text"
                                            value={e.note || ''}
                                            placeholder="Ghi chú bảo hiểm..."
                                            className="ef-input"
                                            onChange={(ev) => {
                                                const val = ev.target.value;
                                                setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, note: val } : item));
                                            }}
                                            style={{ width: '100%', fontSize: '11px', padding: '2px 5px' }}
                                        />
                                    </div>
                                </td>
                                <td className="c">
                                    <button 
                                        onClick={() => handleUpdate(e.employeeId, {
                                            isSocialEnabled: e.isSocialEnabled,
                                            isHealthEnabled: e.isHealthEnabled,
                                            isUnemploymentEnabled: e.isUnemploymentEnabled,
                                            isHealthcareEnabled: e.isHealthcareEnabled,
                                            healthcareAmount: e.healthcareAmount,
                                            isLifeInsuranceEnabled: e.isLifeInsuranceEnabled,
                                            lifeInsuranceAmount: e.lifeInsuranceAmount,
                                            additionalInsuranceAmount: e.additionalInsuranceAmount,
                                            note: e.note
                                        })}
                                        disabled={saving === e.employeeId}
                                        title="Lưu cấu hình"
                                        className={`ef-btn ef-btn-sm ${saving === e.employeeId ? '' : 'ef-btn-primary'}`}
                                    >
                                        {saving === e.employeeId ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div style={{ padding: '10px 15px', border: '1px solid #ccc', borderTop: 'none', background: '#f8fafc', color: '#64748b', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={14} style={{ color: '#1a56db' }} />
                <span>Hệ thống tự động áp dụng cấu hình bảo hiểm này khi tính lương kỳ tiếp theo. Các thay đổi sẽ có hiệu lực ngay lập tức.</span>
            </div>
        </div>
    );
}
