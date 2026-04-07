import React, { useState, useEffect } from 'react';
import { employeeService, departmentService } from '../../api';
import { toast } from 'react-hot-toast';
import { Users } from 'lucide-react';

export default function EmployeeList({ user, onViewProfile, onBack }) {
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeptId, setSelectedDeptId] = useState('All');
    const [subDepts, setSubDepts] = useState([]);

    const isScopedManager = (user?.roles?.includes('DepartmentManager') || user?.roles?.includes('DepartmentHead')) && !user?.roles?.includes('Admin');

    useEffect(() => {
        if (isScopedManager && user?.departmentId) {
            setSelectedDeptId(user.departmentId);
        }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [empData, deptData] = await Promise.all([
                employeeService.getAllEmployees(),
                departmentService.getAll()
            ]);
            setEmployees(empData);
            setDepartments(deptData);

            if (user?.departmentId) {
                const subs = deptData.filter(d => d.parentDepartmentId === user.departmentId);
                setSubDepts(subs);
                
                if (isScopedManager) {
                    const recruitmentDept = subs.find(d => 
                        d.departmentName.toLowerCase().includes('tuyển dụng') || 
                        d.departmentName.toLowerCase().includes('recruitment')
                    ) || subs[0] || deptData.find(d => d.id === user.departmentId);
                    
                    if (recruitmentDept) {
                        setSelectedDeptId(recruitmentDept.id);
                    }
                }
            }
        } catch (err) {
            console.error(err);
            toast.error('Lỗi tải danh sách nhân sự');
        } finally {
            setLoading(false);
        }
    };

    // Hàm đệ quy lấy tất cả ID phòng ban con
    const getAllDescendantIds = (deptId, allDepts) => {
        if (!deptId || deptId === 'All') return [];
        let ids = [deptId.toString()];
        const children = allDepts.filter(d => d.parentDepartmentId && d.parentDepartmentId.toString() === deptId.toString());
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, allDepts)];
        });
        return ids;
    };

    const filtered = employees.filter(e => {
        const isAll = selectedDeptId === 'All' || !selectedDeptId;
        if (isAll) return e.id !== user?.id;
        
        // Lấy danh sách ID cho phép (bao gồm cả các phòng ban con nếu là Admin chọn tab)
        const allowedDeptIds = !isScopedManager 
            ? getAllDescendantIds(selectedDeptId, departments)
            : [selectedDeptId.toString()];

        const dId = (e.departmentId !== undefined ? e.departmentId : e.DepartmentId)?.toString();
        const matchesDept = dId && allowedDeptIds.includes(dId);
        
        const deptObj = departments.find(d => d.id.toString() === selectedDeptId.toString());
        const isDeptManager = deptObj && deptObj.managerId && deptObj.managerId.toString() === e.id.toString();

        return (matchesDept || isDeptManager) && e.id !== user?.id;
    });

    // Lấy 5 phòng ban chính cho Admin
    const mainDepts = departments.filter(d => !d.parentDepartmentId).slice(0, 5);

    return (
        <div className="ef-wrap">
            {/* Admin Tabs */}
            {!isScopedManager && (
                <div className="ef-tab-bar no-margin">
                    <div 
                        className={`ef-tab ${selectedDeptId === 'All' ? 'ef-tab-on' : ''}`}
                        onClick={() => setSelectedDeptId('All')}
                    >
                        TẤT CẢ
                    </div>
                    {mainDepts.map(d => (
                        <div 
                            key={d.id}
                            className={`ef-tab ${selectedDeptId.toString() === d.id.toString() ? 'ef-tab-on' : ''}`}
                            onClick={() => setSelectedDeptId(d.id)}
                        >
                            {d.departmentName.toUpperCase()}
                        </div>
                    ))}
                </div>
            )}

            <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between', borderTop: !isScopedManager ? 'none' : '1px solid #e0e0e0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div className="ef-toolbar-title">
                        <Users size={16} style={{ color: '#1a56db' }} />
                        <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Danh Sách Nhân Sự</strong>
                    </div>
                    
                    {isScopedManager && subDepts.length > 0 && (
                        <select 
                            className="ef-select"
                            value={selectedDeptId}
                            onChange={(e) => setSelectedDeptId(e.target.value)}
                            style={{ width: '250px' }}
                        >
                            <option value={user.departmentId}>--- Đơn vị báo cáo trực tiếp ---</option>
                            {subDepts.map(d => (
                                <option key={d.id} value={d.id}>{d.departmentName}</option>
                            ))}
                        </select>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={fetchData} className="ef-btn">
                        Tải Định Kỳ
                    </button>
                    {onBack && (
                         <button onClick={onBack} className="ef-btn">Đóng</button>
                    )}
                </div>
            </div>

            <div className="ef-table-wrap">
                <table className="ef-table no-top-border">
                    <thead>
                        <tr>
                            <th style={{ width: '200px' }}>NHÂN VIÊN</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>MÃ NV</th>
                            {(selectedDeptId === 'All' || !selectedDeptId) && (
                                <th style={{ width: '150px' }}>PHÒNG BAN</th>
                            )}
                            <th style={{ width: '150px' }}>VỊ TRÍ</th>
                            <th style={{ width: '80px', textAlign: 'center' }}>GIỚI TÍNH</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>CCCD</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>TRẠNG THÁI</th>
                            <th style={{ width: '100px', textAlign: 'center' }}>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={selectedDeptId === 'All' ? 8 : 7} className="ef-empty">Đang tải biểu mẫu...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={selectedDeptId === 'All' ? 8 : 7} className="ef-empty">Không có nhân viên tương ứng.</td></tr>
                        ) : filtered.map(emp => (
                            <tr key={emp.id}>
                                <td style={{ fontWeight: 'bold' }}>{emp.fullName}</td>
                                <td style={{ textAlign: 'center' }}>{emp.employeeCode}</td>
                                {(selectedDeptId === 'All' || !selectedDeptId) && (
                                    <td>{emp.departmentName}</td>
                                )}
                                <td>{emp.positionName}</td>
                                <td style={{ textAlign: 'center' }}>{emp.gender || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{emp.identityNumber || '-'}</td>
                                <td style={{ textAlign: 'center' }}>
                                    <span className={emp.isActive ? 'ef-text-ok' : 'ef-text-miss'}>
                                        {emp.isActive ? 'Hoạt động' : 'Đã nghỉ'}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'center' }}>
                                    <button
                                        onClick={() => onViewProfile(emp.id)}
                                        className="ef-btn" style={{ padding: '2px 8px', fontSize: '11px' }}
                                    >
                                        HỒ SƠ
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
