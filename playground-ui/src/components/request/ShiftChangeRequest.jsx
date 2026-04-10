import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '../../api';
import shiftChangeService from '../../services/shiftChangeService';
import toast from 'react-hot-toast';

export default function ShiftChangeRequest({ onBack }) {
    const [requests, setRequests] = useState([]);
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        requestedShiftId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setFormData(prev => ({ ...prev, startDate: tomorrow.toISOString().split('T')[0], endDate: tomorrow.toISOString().split('T')[0] }));
        
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [reqs, shfs] = await Promise.all([
                shiftChangeService.getMyRequests(),
                api.get('/workshifts')
            ]);
            setRequests(reqs);
            setShifts(shfs.data || []);
            if (shfs.data && shfs.data.length > 0) {
                setFormData(prev => ({ ...prev, requestedShiftId: shfs.data[0].id }));
            }
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.requestedShiftId || !formData.startDate || !formData.endDate || !formData.reason) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            toast.error('Ngày bắt đầu không thể lớn hơn ngày kết thúc');
            return;
        }

        setSubmitting(true);
        try {
            await shiftChangeService.createRequest({
                requestedShiftId: parseInt(formData.requestedShiftId),
                startDate: formData.startDate,
                endDate: formData.endDate,
                reason: formData.reason
            });
            toast.success('Gửi đơn xin đổi ca thành công');
            setFormData(prev => ({ ...prev, reason: '' }));
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi gửi yêu cầu');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-amber-100 text-amber-700';
            case 'Approved': return 'bg-emerald-100 text-emerald-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between' }}>
                <div className="ef-toolbar-title">
                    <RefreshCw size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Đơn Xin Đổi Ca Làm Việc</strong>
                </div>
                {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
            </div>

            <div style={{ display: 'flex', gap: '20px', padding: '15px' }}>
                
                {/* FORM XIN ĐỔI CA */}
                <div style={{ flex: 1 }}>
                    <div className="ef-section-title">Tạo Đơn Xin Đổi Ca</div>
                    <form onSubmit={handleSubmit} className="ef-table-wrap">
                        <table className="ef-table no-top-border">
                            <tbody>
                                <tr>
                                    <th style={{ width: '30%' }}>Ca muốn đổi sang *</th>
                                    <td>
                                        <select 
                                            className="ef-input" 
                                            style={{ width: '100%' }}
                                            value={formData.requestedShiftId}
                                            onChange={e => setFormData({...formData, requestedShiftId: e.target.value})}
                                            required
                                        >
                                            {shifts.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.shiftName} ({s.startTime.substring(0,5)} - {s.endTime.substring(0,5)})
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Từ ngày *</th>
                                    <td>
                                        <input 
                                            type="date" 
                                            className="ef-input" 
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                            style={{ width: '100%' }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th>Đến ngày *</th>
                                    <td>
                                        <input 
                                            type="date" 
                                            className="ef-input" 
                                            required
                                            value={formData.endDate}
                                            min={formData.startDate}
                                            onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                            style={{ width: '100%' }}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <th>Lý do đổi ca *</th>
                                    <td>
                                        <textarea 
                                            className="ef-input" 
                                            rows="3"
                                            required
                                            placeholder="Ghi rõ lý do bạn muốn đổi ca..."
                                            value={formData.reason}
                                            onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                            style={{ width: '100%', resize: 'vertical' }}
                                        ></textarea>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div style={{ padding: '15px 20px', textAlign: 'right', backgroundColor: '#f9f9f9', borderTop: '1px solid #0056b3' }}>
                            <button 
                                type="submit" 
                                disabled={submitting} 
                                style={{ backgroundColor: '#0056b3', color: '#fff', border: 'none', padding: '6px 20px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}>
                                {submitting ? 'ĐANG GỬI...' : 'GỬI ĐƠN'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* LỊCH SỬ FORM */}
                <div style={{ flex: 1.5, minWidth: '400px' }}>
                    <div className="ef-section-title" style={{ marginTop: '0' }}>Lịch Sử Đơn Đổi Ca</div>
                    <div className="ef-table-wrap" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        <table className="ef-table no-top-border">
                            <thead>
                                <tr>
                                    <th>Ngày Gửi</th>
                                    <th>Nội Dung</th>
                                    <th className="c" style={{ width: '100px' }}>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="3" className="c p-4 text-slate-500 italic">Đang tải dữ liệu...</td></tr>
                                ) : requests.length === 0 ? (
                                    <tr><td colSpan="3" className="c p-4 text-slate-500">Chưa có lịch sử gửi đơn.</td></tr>
                                ) : (
                                    requests.map(req => (
                                        <tr key={req.id}>
                                            <td>
                                                <div className="font-bold">{new Date(req.createdAt).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-[11px] text-slate-500">{new Date(req.createdAt).toLocaleTimeString('vi-VN')}</div>
                                            </td>
                                            <td>
                                                <div className="text-sm border border-dashed border-slate-300 p-2 rounded bg-slate-50 mb-1">
                                                    Từ ca: <strong>{req.currentShiftName}</strong> ➔ <strong>{req.requestedShiftName}</strong>
                                                </div>
                                                <div className="text-[12px] font-bold text-slate-700">
                                                    Áp dụng: {new Date(req.startDate).toLocaleDateString('vi-VN')} - {new Date(req.endDate).toLocaleDateString('vi-VN')}
                                                </div>
                                                <div className="text-[12px] italic mt-1 text-slate-600">Lý do: {req.reason}</div>
                                                {req.rejectReason && (
                                                    <div className="text-[11px] text-red-600 font-medium mt-1 bg-red-50 p-1 border border-red-100">
                                                        Lý do từ chối: {req.rejectReason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="c">
                                                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${getStatusColor(req.status)}`}>
                                                    {req.statusLabel}
                                                </span>
                                            </td>
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
}
