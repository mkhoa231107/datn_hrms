import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';
import DatePicker, { registerLocale } from 'react-datepicker';
import { vi } from 'date-fns/locale/vi';
import 'react-datepicker/dist/react-datepicker.css';
import { Umbrella, Clock, Paperclip, X, Save, Printer, Check, Trash2, Image as ImageIcon } from 'lucide-react';
import { BASE_URL } from '../../api';
import './LeavePaper.css';

// Register Vietnamese locale for datepicker
registerLocale('vi', vi);

const PUBLIC_HOLIDAYS_2026 = [
    '2026-01-01', // New Year
    '2026-02-16', '2026-02-17', '2026-02-18', '2026-02-19', '2026-02-20', '2026-02-21', '2026-02-22', // Tet
    '2026-04-26', // Hung Kings
    '2026-04-30', // Victory Day
    '2026-05-01', // Labor Day
    '2026-09-02', '2026-09-03'  // National Day
];

const isHoliday = (date) => {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().split('T')[0];
    return PUBLIC_HOLIDAYS_2026.includes(dateStr);
};

// Custom helper as a robust workaround for react-signature-canvas bug
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

export default function LeavePaperModal({ 
    user, 
    leaveTypes, 
    balances = [],
    onClose, 
    onSubmit, 
    mode = 'create', // 'create' or 'view'
    requestData = null // For view mode
}) {
    const roles = user?.roles || [];
    const isDeptHead = roles.includes('DepartmentHead') || roles.includes('Admin');
    const isTeamLead = roles.includes('TeamLeader');
    const canApprove = isDeptHead || isTeamLead;
    const hasStoredSig = !!(user?.signature);
    // Build correct full URL for stored signature
    const storedSigUrl = user?.signature
        ? (user.signature.startsWith('http') ? user.signature : `${BASE_URL}${user.signature}`)
        : null;

    const sigCanvas = useRef(null);
    const approverSigCanvas = useRef(null);

    const [form, setForm] = useState({
        leaveTypeId: '',
        fromDate: null,
        toDate: null,
        reason: '',
        phone: user?.phone || '',
        address: user?.address || '',
        requesterSignature: null,
        attachmentBase64: null,
        commitment: true
    });
    
    const [attachmentPreview, setAttachmentPreview] = useState(null);

    const [approverNote, setApproverNote] = useState('');
    const [approverSig, setApproverSig] = useState(null);

    const activeBalance = balances.find(b => b.leaveTypeId === parseInt(form.leaveTypeId));
    
    const calculateDays = () => {
        if (!form.fromDate || !form.toDate) return 0;
        const start = new Date(form.fromDate);
        const end = new Date(form.toDate);
        if (end < start) return 0;
        let count = 0;
        let cur = new Date(start);
        while (cur <= end) {
            const dow = cur.getDay();
            // User requirement: Open Saturday (6), only Sunday (0) is off
            // Also exclude public holidays
            if (dow !== 0 && !isHoliday(cur)) count++; 
            cur.setDate(cur.getDate() + 1);
        }
        return count;
    };
    const requestedDays = calculateDays();
    const isOverBalance = activeBalance && requestedDays > activeBalance.remainingDays;

    const [validationError, setValidationError] = useState(null);

    const validateForm = () => {
        if (mode !== 'create') return null;
        if (!form.leaveTypeId) return "Vui lòng chọn Loại nghỉ phép.";
        if (!form.fromDate || !form.toDate) return "Vui lòng chọn Thời gian nghỉ (Từ ngày - Đến ngày).";
        if (!form.reason?.trim()) return "Vui lòng nhập Lý do xin nghỉ.";
        if (!form.phone?.trim()) return "Vui lòng nhập Số điện thoại liên lạc.";

        const start = new Date(form.fromDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const currentType = leaveTypes.find(t => t.id === parseInt(form.leaveTypeId));
        const isSick = currentType?.code === 'SICK';

        // 1. Backdating (past dates)
        if (!isSick && start < today) {
            return "Không thể tạo đơn nghỉ lùi về quá khứ (trừ Nghỉ ốm).";
        }

        // 2. Lead Time
        if (!isSick) {
            const leadTimeMs = start.getTime() - today.getTime();
            const leadTimeDays = leadTimeMs / (1000 * 60 * 60 * 24);

            if (requestedDays < 3 && leadTimeDays < 1) {
                return "Đơn nghỉ dưới 3 ngày phải báo trước ít nhất 1 ngày (24h).";
            }
            if (requestedDays >= 3 && leadTimeDays < 7) {
                return "Đơn nghỉ từ 3 ngày trở lên phải báo trước ít nhất 1 tuần (7 ngày).";
            }
        }


        // 3. Balance Check
        if (isOverBalance) return "Số ngày nghỉ vượt quá số dư phép hiện có.";

        // 3.5 Zero working days check
        if (requestedDays === 0) return "Khoảng thời gian đã chọn không có ngày làm việc (trùng cuối tuần/ngày lễ).";

        // 4. Attachment Check for SICK leave
        if (isSick && !form.attachmentBase64 && !requestData?.attachmentUrl) {
            return "Vui lòng đính kèm chứng từ y tế / Giấy khám bệnh cho loại phép Nghỉ ốm.";
        }

        return null;
    };

    useEffect(() => {
        setValidationError(validateForm());
    }, [form, requestedDays, isOverBalance]);

    useEffect(() => {
        if (requestData && mode === 'view') {
            setForm({
                leaveTypeId: requestData.leaveTypeId,
                fromDate: requestData.fromDate ? new Date(requestData.fromDate) : null,
                toDate: requestData.toDate ? new Date(requestData.toDate) : null,
                reason: requestData.reason,
                phone: requestData.phone,
                address: requestData.address,
                commitment: true
            });
        }
    }, [requestData, mode]);

    const handleClearSig = () => sigCanvas.current?.clear();
    const handleClearApproverSig = () => approverSigCanvas.current?.clear();
    const handlePrint = () => window.print();

    const handleFormSubmit = (e) => {
        e.preventDefault();
        if (mode === 'create') {
            let finalSignature = form.requesterSignature;
            
            // Require manual or chosen signature
            if (!finalSignature && sigCanvas.current?.isEmpty()) {
                alert('Vui lòng ký tên vào đơn nghỉ phép trước khi gửi.');
                return;
            }

            if (!finalSignature) {
                const canvas = sigCanvas.current.getCanvas();
                const trimmed = trimCanvasManual(canvas);
                finalSignature = trimmed ? trimmed.toDataURL('image/png') : null;
            }

            if (!finalSignature) {
                alert('Thiếu chữ ký người làm đơn.');
                return;
            }

            if (validationError) {
                alert(validationError);
                return;
            }

            const formatDateLocal = (date) => {
                if (!date) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            onSubmit({ 
                ...form, 
                leaveTypeId: parseInt(form.leaveTypeId, 10), 
                requesterSignature: finalSignature,
                // Use local date format to avoid timezone shifts
                fromDate: formatDateLocal(form.fromDate),
                toDate: formatDateLocal(form.toDate),
            });
        } else if (mode === 'view' && onSubmit && canApprove) {
            // Approval flow
            const canvas = approverSigCanvas.current.getCanvas();
            const trimmed = trimCanvasManual(canvas);
            const signature = trimmed ? trimmed.toDataURL('image/png') : null;
            if (!signature) {
                alert('Vui lòng ký tên người duyệt.');
                return;
            }
            onSubmit({ action: 'approve', note: approverNote, approverSignature: signature });
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File quá lớn. Vui lòng chọn file dưới 5MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, attachmentBase64: reader.result });
                setAttachmentPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '...';
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    };

    const currentType = mode === 'view' ? (requestData?.leaveTypeName || '...') : (leaveTypes.find(t => t.id === parseInt(form.leaveTypeId))?.name || '...');

    return createPortal(
        <div className="leave-paper-overlay">
            <div className="leave-paper-container">
                <div className="leave-paper-header">
                    <div className="leave-paper-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="leave-paper-motto">Độc lập – Tự do – Hạnh phúc</div>
                    <div className="leave-paper-border"></div>
                    <div className="leave-paper-title">ĐƠN XIN NGHỈ PHÉP</div>
                </div>

                <div className="leave-paper-recipient">
                    Kính gửi: Ban Giám Đốc Công Ty và Phòng Hành chính – Nhân sự
                </div>

                <div className="leave-paper-body">
                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Tôi tên là:</span>
                        <strong className="leave-paper-input" style={{ borderBottom: 'none' }}>
                            {mode === 'create' ? user?.fullName : requestData?.employeeName}
                        </strong>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Chức vụ:</span>
                        <span className="leave-paper-input" style={{ minWidth: '150px' }}>
                            {mode === 'create' ? (user?.positionName || '—') : (requestData?.employeePositionName || requestData?.jobTitle || '—')}
                        </span>
                        <span style={{ marginLeft: '15px', minWidth: '80px' }}>Bộ phận:</span>
                        <span className="leave-paper-input">
                            {mode === 'create' ? user?.departmentName : requestData?.employeeDepartmentName}
                        </span>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Mã nhân viên:</span>
                        <span className="leave-paper-input">{mode === 'create' ? user?.employeeCode : requestData?.employeeCode || '...'}</span>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Nay tôi làm đơn này kính mong Ban Giám đốc cho tôi được nghỉ phép:</span>
                        {mode === 'create' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <select 
                                    className="leave-paper-select" 
                                    value={form.leaveTypeId} 
                                    onChange={e => setForm({...form, leaveTypeId: e.target.value})}
                                    required
                                >
                                    <option value="">-- Chọn loại phép --</option>
                                    {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                {activeBalance && (
                                    <div className="leave-balance-info" style={{ 
                                        color: activeBalance.remainingDays <= 0 ? '#ef4444' : '#059669',
                                        backgroundColor: activeBalance.remainingDays <= 0 ? '#fef2f2' : '#f0fdf4',
                                        border: `1px solid ${activeBalance.remainingDays <= 0 ? '#fee2e2' : '#dcfce7'}`
                                     }}>
                                        Số dư hiện tại: <strong>{activeBalance.remainingDays}</strong> ngày
                                    </div>
                                )}
                            </div>
                        ) : (
                            <strong style={{ marginLeft: '10px' }}>{currentType}</strong>
                        )}
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Thời gian từ ngày:</span>
                        {mode === 'create' ? (
                            <DatePicker
                                selected={form.fromDate}
                                onChange={date => setForm({...form, fromDate: date, toDate: form.toDate && date && form.toDate < date ? null : form.toDate})}
                                locale="vi"
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Chọn ngày..."
                                filterDate={d => d.getDay() !== 0 && !isHoliday(d)}
                                minDate={new Date()}
                                className="leave-paper-input"
                                wrapperClassName="inline-block"
                                required
                            />
                        ) : (
                            <strong>{formatDate(form.fromDate)}</strong>
                        )}
                        <span style={{ margin: '0 10px' }}>đến ngày:</span>
                        {mode === 'create' ? (
                            <DatePicker
                                selected={form.toDate}
                                onChange={date => setForm({...form, toDate: date})}
                                locale="vi"
                                dateFormat="dd/MM/yyyy"
                                placeholderText="Chọn ngày..."
                                filterDate={d => d.getDay() !== 0 && !isHoliday(d)}
                                minDate={form.fromDate || new Date()}
                                className="leave-paper-input"
                                wrapperClassName="inline-block"
                                required
                            />
                        ) : (
                            <strong>{formatDate(form.toDate)}</strong>
                        )}
                    </div>

                    {mode === 'create' && requestedDays > 0 && (
                        <div className={`leave-paper-row ${validationError ? 'warning-row' : 'info-row'}`}>
                            <span>Số ngày đăng ký: <strong>{requestedDays}</strong> ngày.</span>
                            {validationError && <span style={{ marginLeft: '10px' }}> ({validationError})</span>}
                        </div>
                    )}

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Lý do xin nghỉ:</span>
                        {mode === 'create' ? (
                            <textarea 
                                className="leave-paper-textarea" 
                                placeholder="Nhập lý do chi tiết..." 
                                value={form.reason} 
                                onChange={e => setForm({...form, reason: e.target.value})}
                                required
                            />
                        ) : (
                            <div style={{ borderBottom: '1px solid #eee', width: '100%', padding: '5px 0' }}>{form.reason}</div>
                        )}
                    </div>

                    <div className="leave-paper-row" style={{ marginTop: '20px' }}>
                        <span>Tôi xin cam đoan đã bàn giao công việc đầy đủ cho bộ phận liên quan.</span>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Số điện thoại liên lạc:</span>
                        {mode === 'create' ? (
                            <input type="text" className="leave-paper-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="09xx..." required />
                        ) : (
                            <span>{form.phone}</span>
                        )}
                    </div>

                    {/* ATTACHMENT SECTION - Only show for SICK leave or if already has attachment */}
                    {((mode === 'create' && leaveTypes.find(t => t.id === parseInt(form.leaveTypeId))?.code === 'SICK') || (mode !== 'create' && requestData?.attachmentUrl)) && (
                        <div className="leave-paper-row" style={{ marginTop: '20px', border: '1px dashed #ddd', padding: '15px', borderRadius: '8px', background: 'rgba(0,0,0,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: '#374151', fontWeight: 'bold' }}>
                                <Paperclip size={18} /> Chứng từ đính kèm {leaveTypes.find(t => t.id === parseInt(form.leaveTypeId))?.code === 'SICK' && <span style={{ color: '#ef4444' }}>(Bắt buộc)</span>}
                            </div>

                            {mode === 'create' ? (
                                <div className="attachment-upload-zone">
                                    {attachmentPreview ? (
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img src={attachmentPreview} alt="Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', border: '1px solid #ddd' }} />
                                            <button 
                                                type="button"
                                                onClick={() => { setAttachmentPreview(null); setForm({ ...form, attachmentBase64: null }); }}
                                                style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="attachment-label">
                                            <ImageIcon size={24} style={{ marginBottom: '5px', color: '#9ca3af' }} />
                                            <span>Click để tải tệp hoặc kéo thả (JPG, PNG)</span>
                                            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                        </label>
                                    )}
                                </div>
                            ) : (
                                requestData?.attachmentUrl ? (
                                    <div className="attachment-view-zone">
                                        <a href={`${BASE_URL}${requestData.attachmentUrl}`} target="_blank" rel="noreferrer">
                                            <img 
                                                src={`${BASE_URL}${requestData.attachmentUrl}`} 
                                                alt="Certificate" 
                                                style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '4px', border: '1px solid #ddd', cursor: 'zoom-in' }} 
                                            />
                                        </a>
                                        <p style={{ fontSize: '11px', color: '#666', marginTop: '5px' }}>* Nhấn vào ảnh để xem kích thước đầy đủ</p>
                                    </div>
                                ) : (
                                    <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Không có minh chứng đính kèm</div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* SIGNATURES SECTION */}
                <div className="leave-paper-signatures">
                    <div className="sig-box">
                        <div className="sig-title">NGƯỜI LÀM ĐƠN</div>
                        <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
                        {mode === 'create' ? (
                            <div className="sig-canvas-wrap">
                                {form.requesterSignature ? (
                                    <div className="sig-image-wrap">
                                        <img 
                                            src={form.requesterSignature} 
                                            alt="Selected Signature" 
                                            className="sig-image"
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'block'); }}
                                        />
                                        <button type="button" onClick={() => setForm({...form, requesterSignature: null})} style={{ fontSize: '11px', padding: '2px 5px', marginTop: '5px' }}>Ký lại thủ công</button>
                                    </div>
                                ) : (
                                    <>
                                        <SignatureCanvas 
                                            ref={sigCanvas}
                                            penColor="black"
                                            canvasProps={{ width: 250, height: 120, className: 'sigCanvas' }}
                                        />
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px', justifyContent: 'center' }}>
                                            <button type="button" onClick={handleClearSig} style={{ fontSize: '11px', padding: '2px 5px' }}>Xóa chữ ký</button>
                                            {hasStoredSig && (
                                                <button type="button" onClick={() => setForm({...form, requesterSignature: storedSigUrl})} style={{ fontSize: '11px', padding: '2px 5px', color: '#1a56db' }}>Sử dụng chữ ký đã lưu</button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            requestData?.requesterSignature ? (
                                <img src={requestData.requesterSignature} alt="Requester Signature" className="sig-image" />
                            ) : <span>(Chưa ký)</span>
                        )}
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                            {mode === 'create' ? user?.fullName : requestData?.employeeName}
                        </div>
                    </div>

                    <div className="sig-box">
                        <div className="sig-title">NGƯỜI XÉT DUYỆT</div>
                        <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>(Ban Giám Đốc/P.Hành chính)</div>
                        {mode === 'view' && !requestData.approverName && onSubmit && canApprove ? (
                            <div className="sig-canvas-wrap">
                                <SignatureCanvas 
                                    ref={approverSigCanvas}
                                    penColor="blue"
                                    canvasProps={{ width: 250, height: 120, className: 'sigCanvas' }}
                                />
                                <button type="button" onClick={handleClearApproverSig} style={{ fontSize: '11px', padding: '2px 5px', marginTop: '5px' }}>Xóa chữ ký</button>
                                <div style={{ marginTop: '10px', width: '90%' }}>
                                    <textarea 
                                        style={{ width: '100%', fontSize: '12px', padding: '5px' }} 
                                        placeholder="Ghi chú duyệt..." 
                                        value={approverNote}
                                        onChange={e => setApproverNote(e.target.value)}
                                    />
                                </div>
                            </div>
                        ) : (
                            requestData?.approverSignature ? (
                                <>
                                    <img src={requestData.approverSignature} alt="Approver Signature" className="sig-image" />
                                    <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                                        Ghi chú: {requestData.approverNote || 'Không có'}
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontStyle: 'italic', fontSize: '1rem' }}>
                                    {requestData?.statusName === 'Pending' || requestData?.status === 0 ? 
                                        (requestData.totalDays <= 3 ? '(Chờ Trưởng bộ phận duyệt)' : '(Chờ Trưởng phòng duyệt)') 
                                        : '(Chưa phê duyệt)'}
                                </div>
                            )
                        )}
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>
                            {requestData?.approverName ? requestData.approverName : (mode === 'view' && onSubmit && canApprove ? user?.fullName : '')}
                        </div>
                    </div>
                </div>

                <div className="leave-paper-footer">
                    <button className="paper-btn paper-btn-secondary" onClick={onClose}>
                        <X size={18} /> Đóng
                    </button>
                    
                    {mode === 'view' && (
                        <button className="paper-btn paper-btn-print" onClick={handlePrint}>
                            <Printer size={18} /> In Phôi Đơn
                        </button>
                    )}

                    {mode === 'create' && (
                        <button className="paper-btn paper-btn-primary" onClick={handleFormSubmit}>
                            <Save size={18} /> Gửi Đơn
                        </button>
                    )}
                    
                    {mode === 'view' && !requestData.approverName && onSubmit && canApprove && (
                        <>
                            <button className="paper-btn paper-btn-danger" onClick={() => onSubmit({ note: approverNote, action: 'reject' })}>
                                <X size={18} /> Từ Chối
                            </button>
                            <button className="paper-btn paper-btn-primary" onClick={handleFormSubmit}>
                                <Check size={18} /> Duyệt Đơn
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
