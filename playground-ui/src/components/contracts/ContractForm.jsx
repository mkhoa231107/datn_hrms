import { useState, useEffect } from 'react';
import { X, Save, Send, User, Calendar, FileText, MapPin, DollarSign, Briefcase, PlusCircle } from 'lucide-react';
import { api, employeeService } from '../../api';
import toast from 'react-hot-toast';

export default function ContractForm({ onClose, onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    contractNumber: '',
    contractTypeId: '1',
    startDate: '',
    endDate: '',
    basicSalary: '',
    jobDescription: '',
    workLocation: 'Văn phòng chính',
    signedBy: 'Giám đốc Nhân sự',
    notes: ''
  });

  useEffect(() => {
    // Fetch employees for dropdown
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAllEmployees();
        setEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error('Không thể tải danh sách nhân viên');
      }
    };
    fetchEmployees();
  }, []);

  const handleSubmit = async (e, submitForApproval = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeId: parseInt(formData.employeeId),
        contractTypeId: parseInt(formData.contractTypeId),
        basicSalary: parseFloat(formData.basicSalary)
      };

      const response = await api.post('/contracts', payload);
      const contractId = response.data.id;

      if (submitForApproval) {
        await api.post(`/contracts/${contractId}/submit`);
        toast.success('Hợp đồng đã được tạo và gửi cho nhân viên ký!');
      } else {
        toast.success('Đã lưu nháp hợp đồng thành công!');
      }

      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" />
              SOẠN THẢO HỢP ĐỒNG MỚI
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Cung cấp thông tin chi tiết để tạo bản thảo hợp đồng</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200/50 rounded-md transition-colors border border-transparent hover:border-slate-300">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form Body */}
        <form className="flex-1 overflow-y-auto p-8" id="contract-form" onSubmit={(e) => handleSubmit(e, false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {/* Employee Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <User size={14} className="text-slate-400" /> NHÂN VIÊN
              </label>
              <select
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.employeeId}
                onChange={e => setFormData({...formData, employeeId: e.target.value})}
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.fullName} ({emp.employeeCode})</option>
                ))}
              </select>
            </div>

            {/* Contract Number */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <FileText size={14} className="text-slate-400" /> SỐ HỢP ĐỒNG
              </label>
              <input
                required
                type="text"
                placeholder="VD: HDLD/2024/001"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.contractNumber}
                onChange={e => setFormData({...formData, contractNumber: e.target.value})}
              />
            </div>

            {/* Contract Type */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" /> LOẠI HỢP ĐỒNG
              </label>
              <select
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.contractTypeId}
                onChange={e => setFormData({...formData, contractTypeId: e.target.value})}
              >
                <option value="1">Hợp đồng thử việc</option>
                <option value="2">Hợp đồng xác định thời hạn</option>
                <option value="3">Hợp đồng không xác định thời hạn</option>
                <option value="4">Hợp đồng thời vụ</option>
                <option value="5">Hợp đồng bán thời gian</option>
              </select>
            </div>

            {/* Salary */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <DollarSign size={14} className="text-slate-400" /> LƯƠNG CƠ BẢN (VND)
              </label>
              <input
                required
                type="number"
                placeholder="VD: 15000000"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm font-bold text-indigo-600"
                value={formData.basicSalary}
                onChange={e => setFormData({...formData, basicSalary: e.target.value})}
              />
            </div>

            {/* Dates */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" /> NGÀY BẮT ĐẦU
              </label>
              <input
                required
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" /> NGÀY KẾT THÚC
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.endDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>

            {/* Work Location */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> ĐỊA ĐIỂM LÀM VIỆC
              </label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.workLocation}
                onChange={e => setFormData({...formData, workLocation: e.target.value})}
              />
            </div>

            {/* Job Description */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" /> MÔ TẢ CÔNG VIỆC
              </label>
              <textarea
                rows="3"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.jobDescription}
                onChange={e => setFormData({...formData, jobDescription: e.target.value})}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 sticky bottom-0">
          <button
            type="button"
            onClick={onClose}
            className="ef-btn"
            style={{ padding: '8px 24px' }}
          >
            HỦY BỎ
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e, false)}
            className="ef-btn"
            style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={14} /> LƯU NHÁP
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => handleSubmit(e, true)}
            className="ef-btn"
            style={{ 
              padding: '8px 24px', 
              background: '#4f46e5', 
              color: '#fff', 
              border: 'none',
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px' 
            }}
          >
            <Send size={14} /> GỬI KÝ TÊN NGAY
          </button>
        </div>
      </div>
    </div>
  );
}
