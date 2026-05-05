import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-hot-toast';
import { X, User, Calendar, Info, Phone, MapPin, Signature, Printer, Save, Check, Clock } from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import shiftSwapService from '../../services/shiftSwapService';
import api from '../../api';
import '../leave/LeavePaper.css';

// Custom helper for trimming signature canvas
const trimCanvasManual = (canvas) => {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const pixels = ctx.getImageData(0, 0, width, height);
    const data = pixels.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
                found = true;
            }
        }
    }
    if (!found) return null;
    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;
    const trimmedCtx = trimmedCanvas.getContext('2d');
    trimmedCtx.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    return trimmedCanvas;
};

const ShiftSwapRequestModal = ({ isOpen, onClose, onRefresh }) => {
    const [submitting, setSubmitting] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [currentAssignedShiftId, setCurrentAssignedShiftId] = useState(null);
    const sigCanvas = useRef(null);
    
    const [formData, setFormData] = useState({
        partnerId: '',
        targetShiftId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        reason: '',
        phoneNumber: '',
        address: '',
        signatureA: '' 
    });

    useEffect(() => {
        if (isOpen) {
            fetchInitialData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && formData.startDate) {
            fetchCurrentAssignedShift();
        }
    }, [formData.startDate, isOpen]);

    const fetchCurrentAssignedShift = async () => {
        try {
            const res = await api.get(`/workschedules/my-schedule?date=${formData.startDate}`);
            if (res.data && res.data.shiftId) {
                setCurrentAssignedShiftId(res.data.shiftId);
            } else {
                setCurrentAssignedShiftId(null);
            }
        } catch (error) {
            console.error("Error fetching assigned shift:", error);
            setCurrentAssignedShiftId(null);
        }
    };

    const fetchInitialData = async () => {
        try {
            const profile = await api.get('/employees/my-profile').then(res => res.data);
            setMyProfile(profile);
            
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 3);

            setFormData(prev => ({
                ...prev,
                startDate: defaultDate.toISOString().split('T')[0],
                endDate: defaultDate.toISOString().split('T')[0],
                phoneNumber: profile.phone || '',
                address: profile.address || '',
                signatureA: profile.signature || ''
            }));

            const deptId = profile.departmentId;
            const empList = await api.get(`/employees?departmentId=${deptId}`).then(res => res.data);
            const shiftList = await api.get('/workshifts').then(res => res.data);
            const standardCodes = ['HC', 'C1', 'C2', 'C3'];
            const filteredShifts = shiftList.filter(s => standardCodes.includes(s.shiftCode));
            setShifts(filteredShifts);

            const myCodePrefix = profile.employeeCode ? profile.employeeCode.substring(0, profile.employeeCode.lastIndexOf('-')) : '';
            const filteredList = empList.filter(e => {
                if (e.id === profile.id) return false;
                if (!e.employeeCode || !profile.employeeCode) return e.departmentId === profile.departmentId;
                if (e.employeeCode.toUpperCase().endsWith('-MGR')) return false;
                const targetPrefix = e.employeeCode.substring(0, e.employeeCode.lastIndexOf('-'));
                return targetPrefix.toUpperCase() === myCodePrefix.toUpperCase();
            });
            setColleagues(filteredList);

        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Không thể tải thông tin khởi tạo");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClearSig = () => sigCanvas.current?.clear();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let finalSignature = formData.signatureA;
        if (!finalSignature && sigCanvas.current && !sigCanvas.current.isEmpty()) {
            const canvas = sigCanvas.current.getCanvas();
            const trimmed = trimCanvasManual(canvas);
            finalSignature = trimmed ? trimmed.toDataURL('image/png') : null;
        }

        if (!formData.partnerId || !formData.targetShiftId || !formData.startDate || !formData.endDate || !formData.reason) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc.");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reqDate = new Date(formData.startDate);
        const diffDays = Math.ceil((reqDate - today) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 3) {
            toast.error("Đơn hoán đổi ca phải được gửi trước ít nhất 3 ngày so với ngày bắt đầu hoán đổi.");
            return;
        }

        if (!finalSignature) {
            toast.error("Vui lòng ký tên điện tử trước khi gửi.");
            return;
        }

        setSubmitting(true);
        try {
            await shiftSwapService.createRequest({ ...formData, signatureA: finalSignature });
            toast.success("Gửi đơn hoán đổi ca thành công!");
            onRefresh && onRefresh();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi gửi đơn.");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const selectedPartner = colleagues.find(c => c.id === parseInt(formData.partnerId));

    return createPortal(
        <div className="leave-paper-overlay">
            <div className="leave-paper-container">
                <div className="leave-paper-header">
                    <div className="leave-paper-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="leave-paper-motto">Độc lập – Tự do – Hạnh phúc</div>
                    <div className="leave-paper-border"></div>
                    <div className="leave-paper-title">ĐƠN XIN HOÁN ĐỔI CA LÀM VIỆC</div>
                </div>

                <div className="leave-paper-recipient">
                    Kính gửi: Ban Giám đốc Công ty và Phòng Hành chính – Nhân sự
                </div>

                <div className="leave-paper-body">
                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Tôi tên là:</span>
                        <strong className="leave-paper-input" style={{ borderBottom: 'none' }}>
                            {myProfile?.fullName}
                        </strong>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Mã nhân viên:</span>
                        <span className="leave-paper-input">{myProfile?.employeeCode}</span>
                        <span style={{ marginLeft: '15px', minWidth: '80px' }}>Bộ phận:</span>
                        <span className="leave-paper-input">{myProfile?.departmentName}</span>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Số điện thoại:</span>
                        <input 
                            type="text" 
                            name="phoneNumber" 
                            value={formData.phoneNumber} 
                            onChange={handleInputChange} 
                            className="leave-paper-input"
                        />
                        <span style={{ marginLeft: '15px', minWidth: '80px' }}>Địa chỉ:</span>
                        <input 
                            type="text" 
                            name="address" 
                            value={formData.address} 
                            onChange={handleInputChange} 
                            className="leave-paper-input"
                        />
                    </div>

                    <div className="leave-paper-row" style={{ marginTop: '20px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        <strong className="uppercase">Nội dung hoán đổi:</strong>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Thời gian từ ngày:</span>
                        <input 
                            type="date" 
                            name="startDate" 
                            value={formData.startDate} 
                            onChange={handleInputChange} 
                            className="leave-paper-input"
                        />
                        <span style={{ margin: '0 10px' }}>đến ngày:</span>
                        <input 
                            type="date" 
                            name="endDate" 
                            value={formData.endDate} 
                            onChange={handleInputChange} 
                            className="leave-paper-input"
                        />
                    </div>
                    <div style={{ fontSize: '11px', color: '#dc2626', marginBottom: '15px', fontStyle: 'italic', paddingLeft: '160px' }}>
                        * Lưu ý: Đơn phải gửi trước ít nhất 3 ngày để bộ phận quản lý kịp thời xử lý.
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Chọn ca đổi sang:</span>
                        <select 
                            name="targetShiftId" 
                            value={formData.targetShiftId} 
                            onChange={handleInputChange} 
                            className="leave-paper-select"
                            required
                        >
                            <option value="">-- Chọn ca đổi --</option>
                            {shifts.map(s => (
                                <option 
                                    key={s.id} 
                                    value={s.id} 
                                    disabled={s.id === currentAssignedShiftId}
                                >
                                    {s.shiftName} ({s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Đối tác đổi ca (Bên B):</span>
                        <select 
                            name="partnerId" 
                            value={formData.partnerId} 
                            onChange={handleInputChange} 
                            className="leave-paper-select"
                            required
                        >
                            <option value="">-- Chọn đồng nghiệp --</option>
                            {colleagues.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.employeeCode})</option>)}
                        </select>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Lý do điều chỉnh:</span>
                        <textarea 
                            name="reason" 
                            value={formData.reason} 
                            onChange={handleInputChange} 
                            className="leave-paper-textarea"
                            placeholder="Nhập lý do chi tiết..."
                            required
                        />
                    </div>

                    <div className="leave-paper-row" style={{ marginTop: '20px', fontStyle: 'italic', textAlign: 'center', width: '100%', display: 'block' }}>
                        "Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng và thực hiện đúng ca làm việc đã đổi."
                    </div>
                </div>

                <div className="leave-paper-signatures" style={{ gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.8rem' }}>
                    <div className="sig-box">
                        <div className="sig-title">NGƯỜI LÀM ĐƠN (Bên A)</div>
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
                        <div className="sig-canvas-wrap">
                            {formData.signatureA && formData.signatureA !== 'MOCK_SIGNATURE_PROMPT' ? (
                                <div className="sig-image-wrap">
                                    <img src={formData.signatureA} alt="Signature A" className="sig-image" />
                                    <button type="button" onClick={() => setFormData({...formData, signatureA: ''})} style={{ fontSize: '11px', padding: '2px 5px', marginTop: '5px' }}>Ký lại</button>
                                </div>
                            ) : (
                                <>
                                    <SignatureCanvas 
                                        ref={sigCanvas}
                                        penColor="black"
                                        canvasProps={{ width: 200, height: 100, className: 'sigCanvas' }}
                                    />
                                    <div style={{ marginTop: '5px' }}>
                                        <button type="button" onClick={handleClearSig} style={{ fontSize: '11px', padding: '2px 5px' }}>Xóa chữ ký</button>
                                    </div>
                                </>
                            )}
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>{myProfile?.fullName}</div>
                    </div>

                    <div className="sig-box">
                        <div className="sig-title">ĐỐI TÁC ĐỔI CA (Bên B)</div>
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>(Chờ xác nhận)</div>
                        <div className="sig-canvas-wrap" style={{ border: 'none', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#999', fontStyle: 'italic' }}>— Chưa xác nhận —</span>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>{selectedPartner?.fullName || '............................'}</div>
                    </div>

                    <div className="sig-box">
                        <div className="sig-title">TRƯỞNG BỘ PHẬN</div>
                        <div style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>(Phê duyệt)</div>
                        <div className="sig-canvas-wrap" style={{ border: 'none', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ color: '#999', fontStyle: 'italic' }}>— Chờ duyệt —</span>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>............................</div>
                    </div>
                </div>

                <div className="leave-paper-footer">
                    <button className="paper-btn paper-btn-secondary" onClick={onClose}>
                        <X size={18} /> Đóng
                    </button>
                    <button className="paper-btn paper-btn-primary" onClick={handleSubmit} disabled={submitting}>
                        {submitting ? <Clock size={18} className="animate-spin" /> : <Save size={18} />}
                        {submitting ? 'Đang gửi...' : 'Gửi Đơn'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ShiftSwapRequestModal;
