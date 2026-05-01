import { useState, useEffect } from 'react';
import { X, Save, Send, User, Calendar, FileText, MapPin, DollarSign, Briefcase, PlusCircle } from 'lucide-react';
import { api, employeeService, departmentService, positionService } from '../../api';
import toast from 'react-hot-toast';

export default function ContractForm({ onClose, onSuccess, contract }) {
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [allPositions, setAllPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [salaryHint, setSalaryHint] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    contractNumber: '',
    contractTypeId: '1',
    startDate: '',
    endDate: '',
    basicSalary: '',
    jobDescription: '',
    signedBy: 'Giám đốc Nhân sự',
    workLocation: 'Văn phòng chính',
    notes: '',
    shiftId: '',
    departmentId: '',
    positionId: ''
  });

  useEffect(() => {
    // Fetch initial data
    const fetchData = async () => {
      try {
        const [empData, shiftData, deptData, posData] = await Promise.all([
          employeeService.getAllEmployees(),
          api.get('/workshifts'),
          departmentService.getAll(),
          positionService.getAll()
        ]);
        setEmployees(empData || []);
        const standardCodes = ['HC', 'C1', 'C2', 'C3'];
        const filteredShifts = (shiftData.data || []).filter(s => standardCodes.includes(s.shiftCode));
        setShifts(filteredShifts);
        setDepartments(deptData || []);
        setAllPositions(posData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Không thể tải một số dữ liệu cần thiết');
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (contract) {
      setFormData({
        employeeId: contract.employeeId?.toString() || '',
        contractNumber: contract.contractNumber || '',
        contractTypeId: contract.contractTypeId?.toString() || '1',
        startDate: contract.startDate?.split('T')[0] || '',
        endDate: contract.endDate?.split('T')[0] || '',
        basicSalary: contract.basicSalary?.toString() || '',
        jobDescription: contract.jobDescription || '',
        signedBy: contract.signedBy || 'Giám đốc Nhân sự',
        workLocation: contract.workLocation || 'Văn phòng chính',
        notes: contract.notes || '',
        shiftId: contract.shiftId?.toString() || '',
        departmentId: contract.targetDepartmentId?.toString() || '',
        positionId: contract.targetPositionId?.toString() || ''
      });
    }
  }, [contract]);

  const handlePositionChange = (posId) => {
    const selectedPos = allPositions.find(p => p.id.toString() === posId);
    if (selectedPos) {
      let tempSalaryHint = '';
      if (selectedPos.baseSalaryMin || selectedPos.baseSalaryMax) {
        tempSalaryHint = `Lương cấu hình: ${selectedPos.baseSalaryMin ? selectedPos.baseSalaryMin.toLocaleString() : 0} - ${selectedPos.baseSalaryMax ? selectedPos.baseSalaryMax.toLocaleString() : 'Không giới hạn'} VNĐ`;
      }
      setSalaryHint(tempSalaryHint);

      setFormData(prev => ({
        ...prev,
        positionId: posId,
        basicSalary: selectedPos.baseSalaryMin ? selectedPos.baseSalaryMin.toString() : prev.basicSalary,
        shiftId: selectedPos.defaultShiftId ? selectedPos.defaultShiftId.toString() : prev.shiftId
      }));
    } else {
      setSalaryHint('');
      setFormData(prev => ({ ...prev, positionId: posId }));
    }
  };

  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    const selectedEmp = employees.find(emp => emp.id.toString() === empId);

    if (selectedEmp) {
      setFormData(prev => ({
        ...prev,
        employeeId: empId,
        departmentId: selectedEmp.departmentId ? selectedEmp.departmentId.toString() : '',
        positionId: selectedEmp.positionId ? selectedEmp.positionId.toString() : ''
      }));

      // If they already have a position, trigger the salary/shift auto-fill logic
      if (selectedEmp.positionId) {
        handlePositionChange(selectedEmp.positionId.toString());
      }
    } else {
      setSalaryHint('');
      setFormData(prev => ({ ...prev, employeeId: empId, departmentId: '', positionId: '' }));
    }
  };

  const handleSubmit = async (e, submitForApproval = false) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        employeeId: parseInt(formData.employeeId),
        contractTypeId: parseInt(formData.contractTypeId),
        basicSalary: parseFloat(formData.basicSalary),
        shiftId: formData.shiftId ? parseInt(formData.shiftId) : null,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        positionId: formData.positionId ? parseInt(formData.positionId) : null,
        endDate: formData.endDate || null,
        signedDate: formData.signedDate || null
      };

      if (contract?.id) {
        // Edit mode
        await api.put(`/contracts/${contract.id}`, payload);
        toast.success('Cập nhật hợp đồng thành công!');
      } else {
        // Create mode
        const response = await api.post('/contracts', payload);
        const contractId = response.data.id;

        if (submitForApproval) {
          await api.post(`/contracts/${contractId}/submit`);
          toast.success('Hợp đồng đã được tạo và gửi cho nhân viên ký!');
        } else {
          toast.success('Đã lưu nháp hợp đồng thành công!');
        }
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
              {contract ? 'CHỈNH SỬA THÔNG TIN HỢP ĐỒNG' : 'SOẠN THẢO HỢP ĐỒNG MỚI'}
            </h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
              {contract ? 'Cập nhật lại các điều khoản và thông tin hợp đồng' : 'Cung cấp thông tin chi tiết để tạo bản thảo hợp đồng'}
            </p>
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
                onChange={handleEmployeeChange}
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

            {/* Department Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" /> PHÒNG BAN / BỘ PHẬN
              </label>
              <select
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.departmentId}
                onChange={e => {
                    const deptId = e.target.value;
                    setFormData({...formData, departmentId: deptId, positionId: ''});
                    setSalaryHint('');
                }}
              >
                <option value="">-- Chọn phòng ban --</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.departmentName}</option>
                ))}
              </select>
            </div>

            {/* Position Selection */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Briefcase size={14} className="text-slate-400" /> VỊ TRÍ / CHỨC VỤ
              </label>
              <select
                required
                disabled={!formData.departmentId}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm disabled:bg-slate-50 disabled:text-slate-400"
                value={formData.positionId}
                onChange={e => handlePositionChange(e.target.value)}
              >
                <option value="">-- Chọn chức vụ --</option>
                {allPositions
                  .filter(p => !formData.departmentId || p.departmentId.toString() === formData.departmentId)
                  .map(pos => (
                    <option key={pos.id} value={pos.id}>{pos.positionName}</option>
                  ))}
              </select>
            </div>

            {/* Default Shift */}
            <div className="space-y-1.5">
              <label className="text-[13px] font-bold text-slate-600 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" /> CA LÀM VIỆC CỐ ĐỊNH
              </label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none transition-all text-sm"
                value={formData.shiftId}
                onChange={e => setFormData({...formData, shiftId: e.target.value})}
              >
                <option value="">-- Mặc định theo phòng ban / Không gán --</option>
                {shifts.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.shiftName} ({s.startTime.substring(0,5)} - {s.endTime.substring(0,5)})
                  </option>
                ))}
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
              {salaryHint && (
                <p className="text-xs text-orange-600 font-medium italic mt-1">{salaryHint}</p>
              )}
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
