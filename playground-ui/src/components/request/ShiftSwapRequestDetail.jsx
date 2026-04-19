import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Check, X, ArrowLeft, Signature } from 'lucide-react';
import shiftSwapService from '../../services/shiftSwapService';
import SignatureModal from '../contracts/SignatureModal';
import api from '../../api';

const ShiftSwapRequestDetail = ({ requestId, onBack, user }) => {
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { type, approved }
    const [myProfile, setMyProfile] = useState(null);

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

    const handleAction = async (actionType, approved) => {
        if (approved) {
            setPendingAction({ type: actionType, approved: true });
            setShowSignatureModal(true);
            return;
        }

        // Rejection flow
        processAction(actionType, false, null);
    };

    const processAction = async (actionType, approved, signature) => {
        setSubmitting(true);
        try {
            if (actionType === 'partner') {
                await shiftSwapService.respondAsPartner(requestId, { accepted: approved, signatureB: signature });
            } else if (actionType === 'manager') {
                await shiftSwapService.approveByManager(requestId, { approved, signatureManager: signature, rejectReason });
            } else if (actionType === 'hr') {
                await shiftSwapService.confirmByHR(requestId, { confirmed: approved, signatureHR: signature, rejectReason });
            }
            
            toast.success(approved ? "Đã duyệt thành công!" : "Đã từ chối đơn.");
            fetchRequest();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi xử lý.");
        } finally {
            setSubmitting(false);
            setShowRejectForm(false);
            setShowSignatureModal(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Đang tải...</div>;
    if (!request) return <div className="p-10 text-center text-red-500">Không tìm thấy dữ liệu.</div>;

    // Các định danh của người dùng hiện tại
    const myEmpId = myProfile?.id || user?.employeeId || user?.EmployeeId;
    const myCode = myProfile?.employeeCode || user?.employeeCode;
    const myName = myProfile?.fullName || user?.fullName;

    // Đối tác B (Người đồng ý)
    const isPartner = (
        (myEmpId && request.employeeBId && parseInt(myEmpId) === parseInt(request.employeeBId)) ||
        (myCode && request.employeeB?.employeeCode && myCode.trim() === request.employeeB.employeeCode.trim()) ||
        (myName && request.employeeB?.fullName && myName.trim().toLowerCase() === request.employeeB.fullName.trim().toLowerCase())
    ) && (request.status === 'PendingPartner');
                      
    // Quản lý (Trưởng bộ phận)
    const isManager = (
        (myEmpId && request.employeeA?.department?.managerId && parseInt(myEmpId) === parseInt(request.employeeA.department.managerId)) ||
        (myEmpId && request.managerId && parseInt(myEmpId) === parseInt(request.managerId)) ||
        (myCode && request.employeeA?.department?.manager?.employeeCode && myCode.trim() === request.employeeA.department.manager.employeeCode.trim())
    ) && (request.status === 'PendingManager');
                      
    const myDeptId = myProfile?.departmentId;
    const isHR = (
        user?.roles?.includes('HR') || 
        user?.roles?.includes('Admin') || 
        user?.roles?.includes('CnbSpecialist') || 
        [3, 6, 7].includes(myDeptId)
    ) && request.status === 'PendingHR';

    const canAction = isPartner || isManager || isHR;

    const getStatusLabel = (status) => {
        switch(status) {
            case 'PendingPartner': return 'Chờ đối tác xác nhận';
            case 'PendingManager': return 'Chờ quản lý duyệt';
            case 'PendingHR': return 'Chờ nhân sự xác nhận';
            case 'Approved': return 'Đã hoàn tất';
            case 'Rejected': return 'Đã từ chối';
            case 'Cancelled': return 'Đã hủy';
            default: return status;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen p-4 md:p-8">
            <div className="max-w-4xl mx-auto mb-4 flex justify-between items-center">
                <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-black font-bold uppercase text-xs">
                    <ArrowLeft size={16} /> Quay lại
                </button>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPdf} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 text-xs font-bold uppercase hover:bg-gray-50 shadow-sm">
                        <Download size={14} /> Tải PDF
                    </button>
                </div>
            </div>

            <div className="bg-white shadow-xl relative overflow-hidden">
                {/* Status Badge Overlay */}
                <div className={`absolute top-12 right-[-40px] rotate-45 px-12 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-md z-10
                    ${request.status === 'Approved' ? 'bg-green-600' : request.status === 'Rejected' ? 'bg-red-600' : 'bg-blue-600'}`}>
                    {getStatusLabel(request.status)}
                </div>

                {/* Info Banner */}
                {!canAction && request.status !== 'Approved' && request.status !== 'Rejected' && (
                    <div className="bg-blue-50 border-b border-blue-100 p-4 flex items-center gap-3 text-blue-700">
                        <Signature size={20} className="animate-pulse" />
                        <div>
                            <p className="font-bold text-xs uppercase">Thông báo hệ thống</p>
                            <p className="text-[11px] italic">
                                {request.status === 'PendingPartner' ? `Đang chờ ${request.employeeB?.fullName} (Bên B) ký xác nhận.` : 
                                 request.status === 'PendingManager' ? `Đang chờ Trưởng bộ phận phê duyệt.` : 
                                 `Đang chờ phòng Nhân sự xác nhận.`}
                                {" "}Vui lòng đăng nhập đúng tài khoản để thực hiện ký tên.
                            </p>
                        </div>
                    </div>
                )}

                <div className="p-10 md:p-16 font-sans text-[14px] leading-relaxed text-gray-800">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h4 className="font-bold uppercase mb-1">Cộng hòa xã hội chủ nghĩa Việt Nam</h4>
                        <p className="font-medium">Độc lập - Tự do - Hạnh phúc</p>
                        <div className="w-24 h-0.5 bg-black mx-auto mt-1"></div>
                        <h1 className="text-2xl font-bold mt-10 uppercase">Đơn xin hoán đổi ca làm việc</h1>
                    </div>

                    <div className="space-y-4 mb-8">
                        <p><strong>Kính gửi:</strong> Ban Giám Đốc và Phòng Hành chính – Nhân sự</p>
                        <p>Tôi tên là: <strong>{request.employeeA?.fullName}</strong>, mã nhân viên: <strong>{request.employeeA?.employeeCode}</strong></p>
                        <p>Thuộc bộ phận: <strong>{request.employeeA?.department?.departmentName}</strong></p>
                        <p>Số điện thoại: {request.phoneNumber || '................'} | Địa chỉ: {request.address || '................'}</p>
                        
                        <p className="mt-6">Lý do hoán đổi ca: {request.reason}</p>
                        
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
                                    <tr className="border-b border-gray-300 bg-orange-50/20">
                                        <td className="p-2 border-r border-gray-300 font-bold text-orange-800">Hiệu lực tráo lịch</td>
                                        <td className="p-2 font-bold text-orange-700" colSpan="2">
                                            Từ ngày {new Date(request.startDate).toLocaleDateString('vi-VN')} đến ngày {new Date(request.endDate).toLocaleDateString('vi-VN')}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 text-left italic text-gray-500 text-[11px]" colSpan="3">
                                            * Hệ thống sẽ hoán đổi toàn bộ ca làm việc thực tế được xếp của 2 bên trong khoảng thời gian này.
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-8 italic text-center">"Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng và thực hiện đúng ca làm việc đã đổi."</p>
                    </div>

                    {/* Signatures Area */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 text-center text-[11px]">
                        <div>
                            <p className="font-bold mb-10 h-8">Người làm đơn</p>
                            <div className="h-16 flex items-center justify-center mb-1">
                                {request.signatureA && <img src={request.signatureA.replace(/_/g, '/').replace(/-/g, '+')} alt="Sig A" className="max-h-full" />}
                            </div>
                            <p className="font-bold underline uppercase">{request.employeeA?.fullName}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-10 h-8">Người đồng ý đổi</p>
                            <div className="h-16 flex items-center justify-center mb-1 text-gray-400 border border-dashed border-gray-200 rounded bg-gray-50/50">
                                {request.signatureB ? (
                                    <img src={request.signatureB} alt="Sig B" className="max-h-full" />
                                ) : isPartner ? (
                                    <button 
                                        onClick={() => handleAction('partner', true)}
                                        className="text-blue-600 hover:underline flex items-center gap-1 font-bold italic text-[11px]"
                                    >
                                        <Signature size={14} /> Ký tên tại đây
                                    </button>
                                ) : (
                                    <em className="text-[10px]">Chờ xác nhận</em>
                                )}
                            </div>
                            <p className="font-bold underline uppercase">{request.employeeB?.fullName}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-10 h-8">Trưởng bộ phận</p>
                            <div className="h-16 flex items-center justify-center mb-1 text-gray-400 border border-dashed border-gray-200 rounded bg-gray-50/50">
                                {request.signatureManager ? (
                                    <img src={request.signatureManager} alt="Sig Mgr" className="max-h-full" />
                                ) : isManager ? (
                                    <button 
                                        onClick={() => handleAction('manager', true)}
                                        className="text-blue-600 hover:underline flex items-center gap-1 font-bold italic text-[11px]"
                                    >
                                        <Signature size={14} /> Ký duyệt
                                    </button>
                                ) : (
                                    <em className="text-[10px]">Chờ duyệt</em>
                                )}
                            </div>
                            <p className="font-bold underline uppercase">{request.manager?.fullName || '....................'}</p>
                        </div>
                        <div>
                            <p className="font-bold mb-10 h-8">C&B xác nhận</p>
                            <div className="h-16 flex items-center justify-center mb-1 text-gray-400 border border-dashed border-gray-200 rounded bg-gray-50/50">
                                {request.signatureHR ? (
                                    <img src={request.signatureHR} alt="Sig HR" className="max-h-full" />
                                ) : isHR ? (
                                    <button 
                                        onClick={() => handleAction('hr', true)}
                                        className="text-blue-600 hover:underline flex items-center gap-1 font-bold italic text-[11px]"
                                    >
                                        <Signature size={14} /> Xác nhận
                                    </button>
                                ) : (
                                    <em className="text-[10px]">Chờ xác nhận</em>
                                )}
                            </div>
                            <p className="font-bold underline uppercase">{request.hr?.fullName || '....................'}</p>
                        </div>
                    </div>
                </div>

                {/* Footer Reject Reason if any */}
                {request.rejectReason && (
                    <div className="bg-red-50 p-6 border-t border-red-200">
                        <p className="text-red-700 font-bold uppercase text-[10px] mb-1">Lý do từ chối:</p>
                        <p className="text-red-600 italic text-sm">{request.rejectReason}</p>
                    </div>
                )}

                {/* Approval Actions */}
                {canAction && !showRejectForm && (
                    <div className="p-10 bg-blue-50 border-t-4 border-blue-500 flex justify-center gap-6 shadow-inner">
                        <button 
                            onClick={() => setShowRejectForm(true)}
                            className="bg-white border-2 border-red-500 text-red-600 px-12 py-3 font-bold uppercase text-sm hover:bg-red-50 flex items-center gap-2 rounded shadow-sm transition-all"
                        >
                            <X size={20} /> Từ chối đơn
                        </button>
                        <button 
                            onClick={() => handleAction(isPartner ? 'partner' : (isManager ? 'manager' : 'hr'), true)}
                            disabled={submitting}
                            className="bg-blue-600 text-white px-16 py-3 font-bold uppercase text-sm hover:bg-blue-700 flex items-center gap-2 rounded shadow-lg transition-all transform hover:scale-105 active:scale-95"
                        >
                            <Check size={20} /> {submitting ? 'Đang xử lý...' : (isPartner ? 'XÁC NHẬN ĐỒNG Ý & KÝ TÊN' : 'PHÊ DUYỆT ĐƠN NÀY')}
                        </button>
                    </div>
                )}

                {showRejectForm && (
                    <div className="p-8 bg-gray-50 border-t border-gray-200 animate-in slide-in-from-bottom-2 duration-300">
                        <p className="font-bold text-xs uppercase mb-3">Vui lòng nhập lý do từ chối:</p>
                        <textarea 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full border border-gray-300 p-3 text-sm min-h-[100px] mb-4 outline-none focus:border-red-500"
                            placeholder="Lý do không phù hợp chuyên môn / điều kiện làm việc..."
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowRejectForm(false)} className="text-xs font-bold uppercase text-gray-500 px-4">Hủy</button>
                            <button 
                                onClick={() => handleAction(isPartner ? 'partner' : (isManager ? 'manager' : 'hr'), false)}
                                disabled={submitting || !rejectReason.trim()}
                                className="bg-red-600 text-white px-8 py-2 font-bold uppercase text-xs hover:bg-red-700 disabled:opacity-50"
                            >
                                Xác nhận từ chối đơn
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showSignatureModal && (
                <SignatureModal 
                    onClose={() => setShowSignatureModal(false)}
                    onConfirm={(signature) => {
                        processAction(pendingAction.type, pendingAction.approved, signature);
                    }}
                />
            )}
        </div>
    );
};

export default ShiftSwapRequestDetail;
