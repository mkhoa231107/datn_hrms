import { useState, useEffect } from 'react';
import { X, Send, User, Calendar, FileText, MapPin, DollarSign, Briefcase, Users, Search, Check } from 'lucide-react';
import { api, employeeService } from '../../api';
import toast from 'react-hot-toast';

export default function BulkContractForm({ onClose, onSuccess }) {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
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
    const fetchEmployees = async () => {
      try {
        const data = await employeeService.getAllEmployees();
        setEmployees(data || []);
      } catch (error) {
        toast.error('Không thể tải danh sách nhân viên');
      }
    };
    fetchEmployees();
  }, []);

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev => 
      prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
    );
  };

  const filteredEmployees = employees.filter(emp => 
    emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      toast.error('Vui lòng chọn ít nhất một nhân viên');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        employeeIds: selectedEmployees,
        contractTypeId: parseInt(formData.contractTypeId),
        basicSalary: parseFloat(formData.basicSalary),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        jobDescription: formData.jobDescription,
        workLocation: formData.workLocation,
        signedBy: formData.signedBy,
        notes: formData.notes
      };

      await api.post('/contracts/bulk-create', payload);
      toast.success(`Đã tạo thành công ${selectedEmployees.length} hợp đồng!`);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi tạo hợp đồng hàng loạt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded shadow-2xl w-full max-w-5xl h-[650px] overflow-hidden flex flex-col animate-in zoom-in duration-200 border border-slate-200">
        {/* Header toolbar */}
        <div className="ef-toolbar" style={{ justifyContent: 'space-between', padding: '0 20px', minHeight: '60px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div className="ef-toolbar-title" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>THAO TÁC HÀNG LOẠT</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} className="text-indigo-600" />
                TẠO HỢP ĐỒNG MỚI
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-md transition-colors border border-slate-100">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#f1f5f9]">
          {/* Left Side: Employee Selection */}
          <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Danh sách nhân sự</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Đã chọn: {selectedEmployees.length}</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Mã NV, tên nhân viên..."
                  className="ef-input"
                  style={{ width: '100%', paddingLeft: '32px', background: '#fff' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                type="button"
                onClick={() => setSelectedEmployees([])}
                className="w-full mt-3 text-[11px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-tight"
              >
                Bỏ chọn tất cả nhân viên
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id}
                  onClick={() => toggleEmployee(emp.id)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-l-4 ${
                    selectedEmployees.includes(emp.id) 
                    ? 'bg-indigo-50/50 border-indigo-600' 
                    : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${
                    selectedEmployees.includes(emp.id) ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'
                  }`}>
                    {selectedEmployees.includes(emp.id) && <Check size={12} className="text-white" />}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-slate-700 uppercase leading-none mb-1">{emp.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{emp.employeeCode} • {emp.departmentName}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Shared Form Detail */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto space-y-8 bg-white p-6 border border-slate-200 rounded-sm shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Briefcase size={14} className="text-slate-400" /> Loại hợp đồng (*)
                  </label>
                  <select
                    required
                    className="ef-input"
                    style={{ width: '100%', padding: '8px 12px' }}
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

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={14} className="text-slate-400" /> Lương cơ bản (*)
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="Nhập mức lương..."
                    className="ef-input"
                    style={{ width: '100%', fontWeight: 'bold' }}
                    value={formData.basicSalary}
                    onChange={e => setFormData({...formData, basicSalary: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> Ngày bắt đầu (*)
                  </label>
                  <input
                    required
                    type="date"
                    className="ef-input"
                    style={{ width: '100%' }}
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400" /> Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    className="ef-input"
                    style={{ width: '100%' }}
                    value={formData.endDate}
                    onChange={e => setFormData({...formData, endDate: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <MapPin size={14} className="text-slate-400" /> Địa điểm làm việc
                  </label>
                  <input
                    required
                    type="text"
                    className="ef-input"
                    style={{ width: '100%' }}
                    value={formData.workLocation}
                    onChange={e => setFormData({...formData, workLocation: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" /> Mô tả công việc chung
                  </label>
                  <textarea
                    rows="2"
                    className="ef-input"
                    style={{ width: '100%', height: 'auto', padding: '10px' }}
                    value={formData.jobDescription}
                    onChange={e => setFormData({...formData, jobDescription: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Người đại diện công ty ký</label>
                  <input
                    required
                    type="text"
                    className="ef-input"
                    style={{ width: '100%' }}
                    value={formData.signedBy}
                    onChange={e => setFormData({...formData, signedBy: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer toolbar */}
        <div className="ef-toolbar" style={{ justifyContent: 'flex-end', gap: '10px', padding: '0 20px', minHeight: '60px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
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
            disabled={loading || selectedEmployees.length === 0}
            onClick={handleSubmit}
            className="ef-btn"
            style={{ 
              padding: '8px 30px', 
              background: '#4f46e5', 
              color: '#fff', 
              border: 'none',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Send size={16} />
            TẠO & CHUYỂN KÝ ({selectedEmployees.length})
          </button>
        </div>
      </div>
    </div>
  );
}
