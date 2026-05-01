import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, User, Calendar, Info, Phone, MapPin, Signature } from 'lucide-react';
import shiftSwapService from '../../services/shiftSwapService';
import SignatureModal from '../contracts/SignatureModal';
import api from '../../api';

const ShiftSwapRequestModal = ({ isOpen, onClose, onRefresh }) => {
    const [submitting, setSubmitting] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [colleagues, setColleagues] = useState([]);
    const [myProfile, setMyProfile] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [currentAssignedShiftId, setCurrentAssignedShiftId] = useState(null);
    
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
            // Assuming the API returns a schedule object or null
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
            // Get my profile for dept info and default phone/address
            const profile = await api.get('/employees/my-profile').then(res => res.data);
            setMyProfile(profile);
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            setFormData(prev => ({
                ...prev,
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: tomorrow.toISOString().split('T')[0],
                phoneNumber: profile.phone || '',
                address: profile.address || '',
                signatureA: profile.signature || ''
            }));

            const deptId = profile.departmentId;
            const empList = await api.get(`/employees?departmentId=${deptId}`).then(res => res.data);
            const shiftList = await api.get('/workshifts').then(res => res.data);
            // Chỉ lấy 4 ca chuẩn: HC, Ca 1 (C1), Ca 2 (C2), Ca 3 (C3)
            const standardCodes = ['HC', 'C1', 'C2', 'C3'];
            const filteredShifts = shiftList.filter(s => standardCodes.includes(s.shiftCode));
            setShifts(filteredShifts);

            // Lọc theo tổ bộ phận (dựa trên tiền tố EmployeeCode, ví dụ HR-REC) và loại bỏ trưởng bộ phận (-MGR)
            const myCodePrefix = profile.employeeCode ? profile.employeeCode.substring(0, profile.employeeCode.lastIndexOf('-')) : '';
            
            const filteredList = empList.filter(e => {
                if (e.id === profile.id) return false; // Không chọn chính mình
                
                if (!e.employeeCode || !profile.employeeCode) return e.departmentId === profile.departmentId;

                // Loại bỏ trưởng bộ phận
                if (e.employeeCode.toUpperCase().endsWith('-MGR')) return false;

                // Kiểm tra cùng thuộc 1 tổ (ví dụ HR-REC với HR-REC)
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.partnerId || !formData.targetShiftId || !formData.startDate || !formData.endDate || !formData.reason) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc, bao gồm cả Ca đổi sang.");
            return;
        }

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            toast.error('Ngày bắt đầu không thể lớn hơn ngày kết thúc');
            return;
        }

        if (!formData.signatureA) {
            toast.error("Vui lòng ký tên điện tử trước khi gửi.");
            return;
        }

        setSubmitting(true);
        try {
            await shiftSwapService.createRequest(formData);
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto pt-20">
            <div className="bg-white w-full max-w-4xl shadow-2xl relative my-auto" style={{ minHeight: '80vh' }}>
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <X size={24} />
                </button>

                {/* Paper Content */}
                <div className="p-8 md:p-12 font-sans text-sm text-gray-800 leading-relaxed">
                    {/* Header */}
                    <div className="text-center mb-8 border-b-2 border-double border-gray-300 pb-4">
                        <h4 className="font-bold text-base uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</h4>
                        <p className="font-medium">Độc lập - Tự do - Hạnh phúc</p>
                        <div className="w-32 h-0.5 bg-black mx-auto mt-1"></div>
                    </div>

                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-center uppercase tracking-widest mb-2">Đơn xin hoán đổi ca làm việc (2 chiều)</h1>
                        <p className="text-center font-medium">Kính gửi: Ban Giám Đốc và Phòng Hành chính – Nhân sự</p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        {/* Section 1: Requester Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 border border-gray-200">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <User size={16} className="text-blue-700" />
                                    <span className="font-bold uppercase w-32">Người làm đơn:</span>
                                    <span className="font-medium underline">{myProfile?.fullName}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Info size={16} className="text-blue-700" />
                                    <span className="font-bold uppercase w-32">Mã nhân viên:</span>
                                    <span className="font-medium">{myProfile?.employeeCode}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={16} className="text-blue-700" />
                                    <span className="font-bold uppercase w-32">Số điện thoại:</span>
                                    <input 
                                        type="text" 
                                        name="phoneNumber" 
                                        value={formData.phoneNumber} 
                                        onChange={handleInputChange} 
                                        className="border-b border-gray-400 bg-transparent focus:border-blue-700 outline-none flex-1"
                                    />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-blue-700" />
                                    <span className="font-bold uppercase w-32">Địa chỉ:</span>
                                    <input 
                                        type="text" 
                                        name="address" 
                                        value={formData.address} 
                                        onChange={handleInputChange} 
                                        className="border-b border-gray-400 bg-transparent focus:border-blue-700 outline-none flex-1"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Swap Details */}
                        <div className="mb-8">
                            <h3 className="font-bold uppercase border-b border-gray-300 pb-1 mb-4 flex items-center gap-2">
                                <Calendar size={18} className="text-blue-700" />
                                Nội dung hoán đổi
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Time span */}
                                <div className="border border-gray-300 p-4 bg-orange-50/50">
                                    <p className="font-bold text-orange-800 mb-3 border-b border-orange-200 pb-1">THỜI GIAN HOÁN ĐỔI</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Từ ngày:</label>
                                            <input 
                                                type="date" 
                                                name="startDate" 
                                                value={formData.startDate} 
                                                onChange={handleInputChange} 
                                                className="w-full border border-gray-300 p-2 focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Đến ngày:</label>
                                            <input 
                                                type="date" 
                                                name="endDate" 
                                                value={formData.endDate} 
                                                onChange={handleInputChange} 
                                                className="w-full border border-gray-300 p-2 focus:ring-1 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-xs font-bold uppercase text-gray-600 mb-1">CHỌN CA MUỐN ĐỔI SANG BÊN A LÀ:</label>
                                        <select 
                                            name="targetShiftId" 
                                            value={formData.targetShiftId} 
                                            onChange={handleInputChange} 
                                            className="w-full border border-orange-300 p-2 focus:ring-1 focus:ring-orange-500 font-sans font-bold text-orange-800"
                                            required
                                        >
                                            <option value="">-- Chọn ca đổi --</option>
                                            {shifts.map(s => (
                                                <option 
                                                    key={s.id} 
                                                    value={s.id} 
                                                    disabled={s.id === currentAssignedShiftId}
                                                    className={s.id === currentAssignedShiftId ? 'text-gray-400 italic' : ''}
                                                >
                                                    {s.shiftName} ({s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)})
                                                    {s.id === currentAssignedShiftId ? ' - (Ca hiện tại của Bạn)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-4 italic text-justify">
                                        * Hệ thống sẽ đổi lịch làm việc của Bạn thành Ca đã chọn ở trên. Còn Đối tác (Bên B) sẽ chịu trách nhiệm làm Ca hiện tại của Bạn.
                                    </p>
                                </div>

                                {/* Partner Select */}
                                <div className="border border-gray-300 p-4 bg-green-50">
                                    <p className="font-bold text-green-800 mb-3 border-b border-green-200 pb-1">BÊN B (ĐỐI TÁC TRÁO LỊCH)</p>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Chọn đồng nghiệp cùng phòng ban:</label>
                                            <select 
                                                name="partnerId" 
                                                value={formData.partnerId} 
                                                onChange={handleInputChange} 
                                                className="w-full border border-gray-300 p-2 focus:ring-1 focus:ring-green-500 font-sans"
                                                required
                                            >
                                                <option value="">-- Chọn đồng nghiệp --</option>
                                                {colleagues.map(c => <option key={c.id} value={c.id}>{c.fullName} ({c.employeeCode})</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Reason & Commitment */}
                        <div className="mb-8">
                            <label className="block font-bold uppercase mb-2">Lý do điều chỉnh:</label>
                            <textarea 
                                name="reason" 
                                value={formData.reason} 
                                onChange={handleInputChange} 
                                className="w-full border border-gray-300 p-3 italic bg-yellow-50 min-h-[80px]"
                                placeholder="Nhập lý do chi tiết tại đây..."
                                required
                            />
                            <p className="mt-4 text-xs italic text-gray-600 text-center">
                                "Tôi xin hứa sẽ cập nhật đầy đủ nội dung công tác trong thời gian vắng và thực hiện đúng ca làm việc đã đổi."
                            </p>
                        </div>

                        {/* Section 4: Signature Blocks */}
                        <div className="grid grid-cols-4 gap-4 mt-12 border-t pt-8 text-center text-[11px]">
                            <div className="flex flex-col items-center">
                                <p className="font-bold mb-8 h-12">Người làm đơn<br/>(Bên A)</p>
                                <div className="w-full h-24 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-2 overflow-hidden">
                                    {formData.signatureA && formData.signatureA !== 'MOCK_SIGNATURE_PROMPT' ? (
                                        <img src={formData.signatureA} alt="Signature A" className="max-h-full" />
                                    ) : (
                                        <button 
                                            type="button"
                                            onClick={() => setShowSignatureModal(true)}
                                            className="text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                            <Signature size={14} /> Ký tên
                                        </button>
                                    )}
                                </div>
                                <p className="font-bold">{myProfile?.fullName || '............................'}</p>
                            </div>
                            
                            <div className="flex flex-col items-center opacity-50">
                                <p className="font-bold mb-8 h-12">Người đồng ý đổi<br/>(Bên B)</p>
                                <div className="w-full h-24 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-2">
                                    <span className="text-gray-400">Chờ xác nhận</span>
                                </div>
                                <p className="font-bold">{selectedPartner?.fullName || '............................'}</p>
                            </div>

                            <div className="flex flex-col items-center opacity-50">
                                <p className="font-bold mb-8 h-12">Trưởng bộ phận<br/>xác nhận</p>
                                <div className="w-full h-24 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-2">
                                    <span className="text-gray-400">Chờ duyệt</span>
                                </div>
                                <p className="font-bold">............................</p>
                            </div>

                            <div className="flex flex-col items-center opacity-50">
                                <p className="font-bold mb-8 h-12">Xác nhận của<br/>phòng Nhân sự</p>
                                <div className="w-full h-24 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 mb-2">
                                    <span className="text-gray-400">Chờ xác nhận</span>
                                </div>
                                <p className="font-bold">............................</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-12 flex justify-end gap-3 no-print">
                            <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 font-bold uppercase text-xs">Hủy bỏ</button>
                            <button 
                                type="submit" 
                                disabled={submitting}
                                className="px-8 py-2 bg-blue-700 text-white hover:bg-blue-800 font-bold uppercase text-xs shadow-lg flex items-center gap-2"
                            >
                                {submitting ? 'Đang xử lý...' : 'Gửi đơn phê duyệt'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showSignatureModal && (
                <SignatureModal 
                    onClose={() => setShowSignatureModal(false)}
                    onConfirm={(signature) => {
                        setFormData(prev => ({ ...prev, signatureA: signature }));
                        setShowSignatureModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default ShiftSwapRequestModal;
