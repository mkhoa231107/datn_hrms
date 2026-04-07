import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import attendanceService from '../../services/attendanceService';
import { toast } from 'react-hot-toast';
import { Activity } from 'lucide-react';

export default function OvertimeScheduling({ user, onBack }) {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    const [formData, setFormData] = useState({
        date: '',
        startTime: '17:30',
        endTime: '19:00',
        reason: 'Hoàn thành tiến độ dự án'
    });

    const [recentRequests, setRecentRequests] = useState([]);

    useEffect(() => {
        fetchEmployees();
        fetchRecentRequests();
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData(prev => ({ ...prev, date: tomorrow.toISOString().split('T')[0] }));
    }, []);

    const isAdmin = user?.roles?.includes('Admin') || user?.roles?.includes('HrAdmin');

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const deptId = isAdmin ? 0 : (user?.departmentId || 0);
            const res = await api.get(`/employees?departmentId=${deptId}`);
            setEmployees(res.data.data || res.data || []);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải danh sách nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentRequests = async () => {
        try {
            const deptId = isAdmin ? 0 : (user?.departmentId || 0);
            const res = await attendanceService.getDepartmentOvertime(deptId);
            if (res.success) setRecentRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleEmployee = (emp) => {
        if (selectedEmployees.find(e => e.id === emp.id)) {
            setSelectedEmployees(selectedEmployees.filter(e => e.id !== emp.id));
        } else {
            setSelectedEmployees([...selectedEmployees, emp]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (selectedEmployees.length === 0) {
            toast.error('Vui lòng chọn ít nhất một nhân viên');
            return;
        }

        const start = new Date(`2000-01-01T${formData.startTime}`);
        const end = new Date(`2000-01-01T${formData.endTime}`);
        const diffMs = end - start;
        const diffMins = diffMs / (1000 * 60);

        if (diffMins < 30 || diffMins > 120) {
            toast.error('Thời gian tăng ca phải từ 30 phút đến tối đa 2 tiếng');
            return;
        }

        setSubmitting(true);
        try {
            const res = await attendanceService.scheduleOvertime({
                date: formData.date,
                startTime: formData.startTime + ':00',
                endTime: formData.endTime + ':00',
                reason: formData.reason,
                employeeIds: selectedEmployees.map(e => e.id)
            });

            if (res.success) {
                toast.success('Đã báo trước lịch tăng ca thành công!');
                setSelectedEmployees([]);
                fetchRecentRequests();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi gửi yêu cầu');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredEmployees = employees.filter(e => 
        e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase())
    ).filter(e => e.id !== user?.employeeId);

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between' }}>
                <div className="ef-toolbar-title">
                    <Activity size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Danh Sách Đăng Ký Tăng Ca</strong>
                </div>
                {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
            </div>

            <div style={{ display: 'flex', gap: '20px', padding: '15px' }}>
                
                {/* ── FORM LẬP KẾ HOẠCH BÊN TRÁI ── */}
                <div style={{ flex: 1 }}>
                    <div className="ef-section-title">Thông Tin Tăng Ca Dự Kiến</div>
                    <form onSubmit={handleSubmit} className="ef-table-wrap">
                        <table className="ef-table no-top-border">
                            <tbody>
                                <tr>
                                    <th style={{ width: '30%' }}>Ngày áp dụng *</th>
                                    <td>
                                        <input 
                                            type="date" 
                                            className="ef-input" 
                                            required
                                            min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                            value={formData.date}
                                            onChange={(e) => setFormData({...formData, date: e.target.value})}
                                            style={{ width: '100%' }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th>Thời gian bắt đầu *</th>
                                    <td>
                                        <input 
                                            type="time" 
                                            className="ef-input" 
                                            required
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                                            style={{ width: '100%' }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th>Thời gian kết thúc *</th>
                                    <td>
                                        <input 
                                            type="time" 
                                            className="ef-input" 
                                            required
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                                            style={{ width: '100%' }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th>Lý do *</th>
                                    <td>
                                        <textarea 
                                            className="ef-input" 
                                            rows="2"
                                            required
                                            value={formData.reason}
                                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                            style={{ width: '100%', resize: 'vertical' }}
                                        ></textarea>
                                    </td>
                                </tr>
                                <tr>
                                    <th>
                                        Nhân viên áp dụng <br/>
                                        <span style={{ fontWeight: 'normal' }}>({selectedEmployees.length} đã chọn)</span>
                                    </th>
                                    <td>
                                        <input 
                                            type="text" 
                                            className="ef-input" 
                                            placeholder="Tìm mã / tên nhân viên..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            style={{ width: '100%', marginBottom: '10px' }}
                                        />
                                        <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ccc', padding: '5px' }}>
                                            {filteredEmployees.length === 0 ? <p className="ef-empty">Không tìm thấy</p> : 
                                                filteredEmployees.map(emp => {
                                                    const isChecked = selectedEmployees.some(e => e.id === emp.id);
                                                    return (
                                                        <label key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer', borderBottom: '1px solid #eee' }}>
                                                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleEmployee(emp)} />
                                                            <span style={{ fontSize: '13px' }}><strong>{emp.employeeCode}</strong> - {emp.fullName}</span>
                                                        </label>
                                                    )
                                                })
                                            }
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ padding: '15px 20px', textAlign: 'right', backgroundColor: '#f9f9f9', borderTop: '1px solid #0056b3' }}>
                            <button 
                                type="submit" 
                                disabled={submitting || selectedEmployees.length === 0} 
                                style={{ backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '6px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                {submitting ? 'ĐANG TẠO...' : 'TẠO YÊU CẦU OT'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── LỊCH SỬ BÊN PHẢI ── */}
                <div style={{ flex: 1, minWidth: '350px' }}>
                    <div className="ef-section-title" style={{ marginTop: '0' }}>Lịch Sử Báo Trước</div>
                    <div className="ef-table-wrap">
                        <table className="ef-table no-top-border">
                            <thead>
                                <tr>
                                    <th style={{ width: '30%' }}>Ngày / Giờ</th>
                                    <th>Diễn giải</th>
                                    <th style={{ width: '60px', textAlign: 'center' }}>SL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentRequests.length === 0 ? (
                                    <tr><td colSpan="3" className="ef-empty">Chưa có lịch sử tăng ca</td></tr>
                                ) : recentRequests.map(req => (
                                    <tr key={req.id}>
                                        <td>
                                            <strong>{new Date(req.date).toLocaleDateString('vi-VN')}</strong><br/>
                                            <span style={{ fontSize: '11px', color: '#666' }}>{req.startTime.substring(0,5)} - {req.endTime.substring(0,5)}</span>
                                        </td>
                                        <td style={{ fontSize: '12px' }}>
                                            {req.reason}
                                            <div style={{ marginTop: '5px', fontSize: '11px', color: '#888' }}>
                                                {req.employeeNames.slice(0, 3).join(', ')}
                                                {req.employeeCount > 3 && ` (+${req.employeeCount - 3})`}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#0056b3' }}>
                                            {req.employeeCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
