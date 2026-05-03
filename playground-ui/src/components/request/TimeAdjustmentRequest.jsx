import React, { useState, useEffect } from 'react';
import '../employee/EmployeeFlat.css';
import attendanceService from '../../services/attendanceService';
import { toast } from 'react-hot-toast';
import { Clock } from 'lucide-react';

const TimeAdjustmentRequest = () => {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [myRequests, setMyRequests] = useState([]);
    const [formData, setFormData] = useState({
        requestedDate: new Date().toISOString().split('T')[0],
        type: 'MissingCheckIn',
        reason: '',
        correctedCheckIn: '',
        correctedCheckOut: ''
    });

    useEffect(() => {
        loadMyRequests();
    }, []);

    const loadMyRequests = async () => {
        setLoading(true);
        try {
            const result = await attendanceService.getMyAdjustmentRequests();
            if (result.success) {
                setMyRequests(result.data);
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            toast.error('Không thể tải lịch sử yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.reason.trim()) {
            toast.error('Vui lòng nhập lý do điều chỉnh!');
            return;
        }

        setSubmitting(true);

        try {
            const submitData = {
                requestedDate: formData.requestedDate,
                type: formData.type,
                reason: formData.reason
            };

            if (formData.type === 'MissingCheckIn' || formData.type === 'WrongTime') {
                if (formData.correctedCheckIn) {
                    submitData.correctedCheckIn = `${formData.requestedDate}T${formData.correctedCheckIn}:00`;
                }
            }

            if (formData.type === 'MissingCheckOut' || formData.type === 'WrongTime') {
                if (formData.correctedCheckOut) {
                    submitData.correctedCheckOut = `${formData.requestedDate}T${formData.correctedCheckOut}:00`;
                }
            }

            const result = await attendanceService.createAdjustmentRequest(submitData);

            if (result.success) {
                toast.success('Gửi yêu cầu điều chỉnh thành công!');
                setFormData({
                    requestedDate: new Date().toISOString().split('T')[0],
                    type: 'MissingCheckIn',
                    reason: '',
                    correctedCheckIn: '',
                    correctedCheckOut: ''
                });
                loadMyRequests();
            } else {
                toast.error(result.message || 'Gửi yêu cầu thất bại!');
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || 'Lỗi kết nối hệ thống!';
            toast.error(errorMsg);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusText = (status) => {
        const texts = {
            'Pending': 'Chờ Duyệt',
            'Approved': 'Đã Duyệt',
            'Rejected': 'Từ Chối'
        };
        return texts[status] || status;
    };

    const getStatusStyle = (status) => {
        switch(status) {
            case 'Approved': return 'ef-text-ok';
            case 'Rejected': return 'ef-text-late';
            case 'Pending':  return 'ef-text-warn';
            default: return 'ef-text-na';
        }
    };

    const getTypeText = (type) => {
        const types = {
            'MissingCheckIn': 'Quên Check-In',
            'MissingCheckOut': 'Quên Check-Out',
            'WrongTime': 'Sai Giờ Chấm Công'
        };
        return types[type] || type;
    };

    const formatTimeOnly = (dateTimeStr) => {
        if (!dateTimeStr) return '--:--';
        try {
            return dateTimeStr.split('T')[1].substring(0, 5);
        } catch {
            return '--:--';
        }
    };

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar" style={{ justifyContent: 'space-between' }}>
                <div className="ef-toolbar-title">
                    <Clock size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Yêu Cầu Giải Trình Chấm Công</strong>
                </div>
                <button onClick={loadMyRequests} className="ef-btn">Làm mới</button>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginTop: '15px', flexWrap: 'wrap' }}>
                {/* Form area */}
                <div style={{ flex: '1', minWidth: '300px', border: '1px solid #ccc', backgroundColor: '#fafafa' }}>
                    <div className="ef-section-title" style={{ margin: '0', padding: '12px 15px', borderBottom: '1px solid #ccc', backgroundColor: '#f4f4f4' }}>
                        Tạo Yêu Cầu Mới
                    </div>
                    <form onSubmit={handleSubmit} style={{ padding: '15px' }}>
                        <div style={{ marginBottom: '10px' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Ngày Điều Chỉnh:</strong>
                                <input 
                                    type="date" 
                                    name="requestedDate" 
                                    value={formData.requestedDate} 
                                    onChange={handleInputChange} 
                                    max={new Date().toISOString().split('T')[0]} 
                                    required 
                                className="ef-input" 
                                />
                            </div>

                        <div style={{ marginBottom: '10px' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Loại Yêu Cầu:</strong>
                            <select 
                                name="type" 
                                value={formData.type} 
                                onChange={handleInputChange} 
                                required 
                                className="ef-select"
                            >
                                <option value="MissingCheckIn">Quên Check-In (Giờ Vào)</option>
                                <option value="MissingCheckOut">Quên Check-Out (Giờ Ra)</option>
                                <option value="WrongTime">Sai Cả Giờ Vào & Ra</option>
                            </select>
                        </div>

                            {(formData.type === 'MissingCheckIn' || formData.type === 'WrongTime') && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>Giờ Vào Đúng:</strong>
                                    <input 
                                        type="time" 
                                        name="correctedCheckIn" 
                                        value={formData.correctedCheckIn} 
                                        onChange={handleInputChange} 
                                        required
                                    className="ef-input" 
                                    />
                                </div>
                            )}

                            {(formData.type === 'MissingCheckOut' || formData.type === 'WrongTime') && (
                            <div style={{ marginBottom: '10px' }}>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>Giờ Ra Đúng:</strong>
                                    <input 
                                        type="time" 
                                        name="correctedCheckOut" 
                                        value={formData.correctedCheckOut} 
                                        onChange={handleInputChange} 
                                        required
                                    className="ef-input" 
                                    />
                                </div>
                            )}

                        <div style={{ marginBottom: '15px' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>Lý Do Chi Tiết:</strong>
                            <textarea 
                                name="reason" 
                                value={formData.reason} 
                                onChange={handleInputChange} 
                                placeholder="Ví dụ: Hệ thống camera không nhận diện..." 
                                rows="3" 
                                required 
                                className="ef-textarea"
                            />
                        </div>

                        <button type="submit" disabled={submitting} className="ef-btn ef-btn-primary" style={{ width: '100%' }}>
                            {submitting ? 'ĐANG GỬI...' : 'GỬI YÊU CẦU DUYỆT'}
                        </button>
                    </form>
                </div>

                {/* History table area */}
                <div style={{ flex: '2', minWidth: '400px' }}>
                    <div className="ef-section-title" style={{ marginTop: '0', paddingTop: '0' }}>
                        Lịch Sử Giải Trình
                    </div>
                    <div className="ef-table-wrap" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <table className="ef-table no-top-border">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: '120px' }}>Ngày Điều Chỉnh</th>
                                    <th style={{ width: '150px' }}>Loại Yêu Cầu</th>
                                    <th>Lý Do & Chi Tiết</th>
                                    <th className="c" style={{ width: '100px' }}>Trạng Thái</th>
                                    <th style={{ width: '120px' }}>Người Duyệt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && myRequests.length === 0 ? (
                                    <tr><td colSpan="5" className="ef-empty">Đang tải...</td></tr>
                                ) : myRequests.length === 0 ? (
                                    <tr><td colSpan="5" className="ef-empty">Không có đơn giải trình nào.</td></tr>
                                ) : (
                                    myRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td className="c" style={{ fontWeight: 'bold' }}>
                                                            {new Date(request.requestedDate).toLocaleDateString('vi-VN')}
                                                </td>
                                            <td>{getTypeText(request.type)}</td>
                                            <td>
                                                <div style={{ marginBottom: '5px' }}>{request.reason}</div>
                                                    {(request.correctedCheckIn || request.correctedCheckOut) && (
                                                    <div style={{ fontSize: '11px', color: '#1a56db', fontWeight: 'bold' }}>
                                                        Cập nhật: {formatTimeOnly(request.correctedCheckIn)} - {formatTimeOnly(request.correctedCheckOut)}
                                                        </div>
                                                    )}
                                                </td>
                                            <td className={`c ${getStatusStyle(request.status)}`} style={{ fontWeight: 'bold' }}>
                                                {getStatusText(request.status)}
                                                </td>
                                            <td>{request.approverName || '--'}</td>
                                            </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeAdjustmentRequest;
