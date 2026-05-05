import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Check, X, ArrowLeft, Signature, Printer, Save } from 'lucide-react';
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

const ShiftSwapRequestDetail = ({ requestId, onBack, user }) => {
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [myProfile, setMyProfile] = useState(null);
    const approverSigCanvas = useRef(null);

    useEffect(() => {
        fetchRequest();
    }, [requestId]);

    const fetchRequest = async () => {
        setLoading(true);
        try {
            const [data, profile] = await Promise.all([
                shiftSwapService.getById(requestId),
                api.get('/employees/my-profile').then(res => res.data)
            ]);
            setRequest(data);
            setMyProfile(profile);
        } catch (error) {
            toast.error("Không thể tải chi tiết đơn.");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => window.print();

    const handleDownloadPdf = async () => {
        try {
            const blob = await shiftSwapService.downloadPdf(requestId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Don_Doi_Ca_${requestId}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            toast.error("Lỗi khi tải PDF.");
        }
    };

    const handleClearApproverSig = () => approverSigCanvas.current?.clear();

    const processAction = async (approved) => {
        let signature = null;
        if (approved) {
            if (approverSigCanvas.current && !approverSigCanvas.current.isEmpty()) {
                const canvas = approverSigCanvas.current.getCanvas();
                const trimmed = trimCanvasManual(canvas);
                signature = trimmed ? trimmed.toDataURL('image/png') : null;
            } else {
                toast.error("Vui lòng ký tên trước khi duyệt.");
                return;
            }
        }

        setSubmitting(true);
        try {
            const actionType = isPartner ? 'partner' : 'manager';
            if (actionType === 'partner') {
                await shiftSwapService.respondAsPartner(requestId, { accepted: approved, signatureB: signature });
            } else if (actionType === 'manager') {
                await shiftSwapService.approveByManager(requestId, { approved, signatureManager: signature, rejectReason });
            }
            
            toast.success(approved ? "Đã duyệt thành công!" : "Đã từ chối đơn.");
            fetchRequest();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi xử lý.");
        } finally {
            setSubmitting(false);
            setShowRejectForm(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Đang tải...</div>;
    if (!request) return <div className="p-10 text-center text-red-500">Không tìm thấy dữ liệu.</div>;

    const myEmpId = myProfile?.id || user?.employeeId || user?.EmployeeId;
    const myCode = myProfile?.employeeCode || user?.employeeCode;
    const myName = myProfile?.fullName || user?.fullName;

    const isPartner = (
        (myEmpId && request.employeeBId && parseInt(myEmpId) === parseInt(request.employeeBId)) ||
        (myCode && request.employeeB?.employeeCode && myCode.trim() === request.employeeB.employeeCode.trim()) ||
        (myName && request.employeeB?.fullName && myName.trim().toLowerCase() === request.employeeB.fullName.trim().toLowerCase())
    ) && (request.status === 'PendingPartner');
                      
    const isManager = (
        (myEmpId && request.employeeA?.department?.managerId && parseInt(myEmpId) === parseInt(request.employeeA.department.managerId)) ||
        (myEmpId && request.managerId && parseInt(myEmpId) === parseInt(request.managerId)) ||
        (myCode && request.employeeA?.department?.manager?.employeeCode && myCode.trim() === request.employeeA.department.manager.employeeCode.trim())
    ) && (request.status === 'PendingManager');
                      
    const canAction = isPartner || isManager;

    const getStatusLabel = (status) => {
        switch(status) {
            case 'PendingPartner': return 'Chờ đối tác xác nhận';
            case 'PendingManager': return 'Chờ quản lý duyệt';
            case 'Approved': return 'Thành công';
            case 'Rejected': return 'Đã từ chối';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    return (
        <div className="leave-paper-overlay" style={{ background: '#f3f4f6', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
            <div className="w-full mb-6 flex justify-between items-center max-w-4xl mx-auto px-4 no-print">
                <button onClick={onBack} className="paper-btn paper-btn-secondary">
                    <ArrowLeft size={16} /> Quay lại
                </button>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPdf} className="paper-btn paper-btn-secondary">
                        <Download size={14} /> PDF
                    </button>
                    <button onClick={handlePrint} className="paper-btn paper-btn-print">
                        <Printer size={14} /> In đơn
                    </button>
                </div>
            </div>

            <div className="leave-paper-container">
                {/* Status Badge Overlay */}
                <div className={`absolute top-8 right-[-35px] rotate-45 px-10 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md z-10 no-print
                    ${request.status === 'Approved' ? 'bg-green-600' : request.status === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                    {getStatusLabel(request.status)}
                </div>

                <div className="leave-paper-header">
                    <div className="leave-paper-nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="leave-paper-motto">Độc lập – Tự do – Hạnh phúc</div>
                    <div className="leave-paper-border"></div>
                    <div className="leave-paper-title">ĐƠN XIN HOÁN ĐỔI CA LÀM VIỆC</div>
                </div>

                <div className="leave-paper-recipient">
                    Kính gửi: Ban Giám Đốc Công Ty và Phòng Hành chính – Nhân sự
                </div>

                <div className="leave-paper-body">
                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Tôi tên là:</span>
                        <strong className="leave-paper-input" style={{ borderBottom: 'none' }}>
                            {request.employeeA?.fullName}
                        </strong>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Mã nhân viên:</span>
                        <span className="leave-paper-input">{request.employeeA?.employeeCode}</span>
                        <span style={{ marginLeft: '15px', minWidth: '80px' }}>Bộ phận:</span>
                        <span className="leave-paper-input">{request.employeeA?.department?.departmentName}</span>
                    </div>

                    <div className="leave-paper-row">
                        <span className="leave-paper-label">Số điện thoại:</span>
                        <span className="leave-paper-input">{request.phoneNumber || '................'}</span>
                        <span style={{ marginLeft: '15px', minWidth: '80px' }}>Địa chỉ:</span>
                        <span className="leave-paper-input">{request.address || '................'}</span>
                    </div>

                    <div className="leave-paper-row" style={{ marginTop: '20px' }}>
                        <span className="leave-paper-label">Lý do hoán đổi ca:</span>
                        <div className="leave-paper-input" style={{ minHeight: '60px' }}>{request.reason}</div>
                    </div>

                    <div className="mt-8 border border-gray-300">
                        <table className="w-full text-center border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-300">
                                    <th className="p-2 border-r border-gray-300">Nội dung</th>
                                    <th className="p-2 border-r border-gray-300">Bên A (Người làm đơn)</th>
                                    <th className="p-2">Bên B (Người đồng ý)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="border-b border-gray-300">
                                    <td className="p-2 border-r border-gray-300 font-bold">Họ và tên</td>
                                    <td className="p-2 border-r border-gray-300">{request.employeeA?.fullName}</td>
                                    <td className="p-2">{request.employeeB?.fullName}</td>
                                </tr>
                                <tr className="border-b border-gray-300">
                                    <td className="p-2 border-r border-gray-300 font-bold">Hiệu lực</td>
                                    <td className="p-2" colSpan="2">
                                        Từ ngày {new Date(request.startDate).toLocaleDateString('vi-VN')} đến ngày {new Date(request.endDate).toLocaleDateString('vi-VN')}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="leave-paper-row" style={{ marginTop: '20px', fontStyle: 'italic', textAlign: 'center', width: '100%', display: 'block' }}>
                        "Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng và thực hiện đúng ca làm việc đã đổi."
                    </div>
                </div>

                <div className="leave-paper-signatures" style={{ gridTemplateColumns: 'repeat(3, 1fr)', fontSize: '0.8rem' }}>
                    <div className="sig-box">
                        <div className="sig-title">NGƯỜI LÀM ĐƠN (Bên A)</div>
                        <div style={{ fontStyle: 'italic' }}>(Ký và ghi rõ họ tên)</div>
                        <div className="sig-canvas-wrap" style={{ border: 'none' }}>
                            {request.signatureA ? (
                                <img src={request.signatureA.replace(/_/g, '/').replace(/-/g, '+')} alt="Sig A" className="sig-image" />
                            ) : <span>(Chưa ký)</span>}
                        </div>
                        <div style={{ fontWeight: 'bold' }}>{request.employeeA?.fullName}</div>
                    </div>

                    <div className="sig-box">
                        <div className="sig-title">ĐỐI TÁC ĐỔI CA (Bên B)</div>
                        <div style={{ fontStyle: 'italic' }}>(Ký xác nhận)</div>
                        <div className="sig-canvas-wrap" style={{ border: isPartner ? '1px dashed #ccc' : 'none' }}>
                            {request.signatureB ? (
                                <img src={request.signatureB} alt="Sig B" className="sig-image" />
                            ) : isPartner ? (
                                <>
                                    <SignatureCanvas 
                                        ref={approverSigCanvas}
                                        penColor="blue"
                                        canvasProps={{ width: 200, height: 100, className: 'sigCanvas' }}
                                    />
                                    <button type="button" onClick={handleClearApproverSig} style={{ fontSize: '10px', marginTop: '5px' }}>Xóa</button>
                                </>
                            ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>— Chờ ký —</span>
                            )}
                        </div>
                        <div style={{ fontWeight: 'bold' }}>{request.employeeB?.fullName}</div>
                    </div>

                    <div className="sig-box">
                        <div className="sig-title">TRƯỞNG BỘ PHẬN</div>
                        <div style={{ fontStyle: 'italic' }}>(Phê duyệt)</div>
                        <div className="sig-canvas-wrap" style={{ border: isManager ? '1px dashed #ccc' : 'none' }}>
                            {request.signatureManager ? (
                                <img src={request.signatureManager} alt="Sig Mgr" className="sig-image" />
                            ) : isManager ? (
                                <>
                                    <SignatureCanvas 
                                        ref={approverSigCanvas}
                                        penColor="blue"
                                        canvasProps={{ width: 200, height: 100, className: 'sigCanvas' }}
                                    />
                                    <button type="button" onClick={handleClearApproverSig} style={{ fontSize: '10px', marginTop: '5px' }}>Xóa</button>
                                </>
                            ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>— Chờ duyệt —</span>
                            )}
                        </div>
                        <div style={{ fontWeight: 'bold' }}>{request.manager?.fullName || request.employeeA?.department?.manager?.fullName || '....................'}</div>
                    </div>
                </div>

                {request.rejectReason && (
                    <div className="leave-paper-row warning-row" style={{ marginTop: '30px' }}>
                        <strong>Lý do từ chối:</strong> {request.rejectReason}
                    </div>
                )}

                {canAction && (
                    <div className="leave-paper-footer no-print">
                        <button className="paper-btn paper-btn-danger" onClick={() => setShowRejectForm(true)}>
                            <X size={18} /> Từ chối
                        </button>
                        <button className="paper-btn paper-btn-primary" onClick={() => processAction(true)} disabled={submitting}>
                            <Check size={18} /> {submitting ? 'Đang xử lý...' : 'Duyệt & Ký tên'}
                        </button>
                    </div>
                )}

                {showRejectForm && (
                    <div className="mt-8 p-6 bg-red-50 border border-red-200 rounded no-print">
                        <p className="font-bold text-xs uppercase mb-3">Vui lòng nhập lý do từ chối:</p>
                        <textarea 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="leave-paper-textarea"
                            placeholder="Nhập lý do tại đây..."
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setShowRejectForm(false)} className="paper-btn paper-btn-secondary">Hủy</button>
                            <button 
                                onClick={() => processAction(false)}
                                disabled={submitting || !rejectReason.trim()}
                                className="paper-btn paper-btn-danger"
                            >
                                Xác nhận từ chối
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShiftSwapRequestDetail;
