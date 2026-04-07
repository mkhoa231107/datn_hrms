import { useState, useEffect } from 'react';
import { X, Save, Send, Eye, Users, Plus, Trash2, FileUp, Search } from 'lucide-react';
import { api, employeeService, departmentService } from '../../api';
import toast from 'react-hot-toast';

export default function BatchContractEditor({ batchId, onClose, onSuccess }) {
  const [batch, setBatch] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showEmployeeSelect, setShowEmployeeSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [selectedSubDeptId, setSelectedSubDeptId] = useState(null);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

  useEffect(() => {
    fetchBatchDetails();
    fetchEmployees();
    fetchDepartments();
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      const response = await api.get(`/contracts/batches/${batchId}`);
      setBatch(response.data);
      setContracts(response.data.contracts || []);
    } catch (error) {
      toast.error('Không thể tải thông tin đợt');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await employeeService.getAllEmployees();
      setEmployees(data || []);
    } catch (error) {
      toast.error('Lỗi tải danh sách nhân viên');
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await departmentService.getAll();
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const addEmployeesToBatch = () => {
    const newContractsToAdd = [];
    const alreadyInBatchNames = [];

    selectedIds.forEach(id => {
      const emp = employees.find(e => e.id === id);
      if (emp) {
        // Safe check for both employeeId and employeeID
        if (contracts.some(c => (c.employeeId || c.employeeID || c.EmployeeId) === emp.id)) {
          alreadyInBatchNames.push(emp.fullName);
        } else {
          newContractsToAdd.push({
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeCode: emp.employeeCode,
            departmentName: emp.departmentName,
            contractTypeId: 1,
            basicSalary: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: null,
            jobDescription: '',
            workLocation: 'Văn phòng chính',
            notes: ''
          });
        }
      }
    });

    if (alreadyInBatchNames.length > 0) {
      toast.error(`Nhân viên đã có trong đợt: ${alreadyInBatchNames.join(', ')}`);
    }

    if (newContractsToAdd.length > 0) {
      setContracts([...contracts, ...newContractsToAdd]);
      toast.success(`Đã thêm ${newContractsToAdd.length} nhân viên vào danh sách`);
    }

    setShowEmployeeSelect(false);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchCode = emp.employeeCode.toLowerCase().includes(searchCode.toLowerCase());
    const matchName = emp.fullName.toLowerCase().includes(searchName.toLowerCase());
    const matchDept = selectedSubDeptId ? emp.departmentId === selectedSubDeptId : true;
    return matchCode && matchName && matchDept;
  });

  const parentDepartments = departments.filter(d => d.parentDepartmentId === null);
  const subDepartments = selectedParentId 
    ? departments.filter(d => d.parentDepartmentId === selectedParentId)
    : [];

  const removeContract = (empId) => {
    setContracts(contracts.filter(c => c.employeeId !== empId));
  };

  const updateContract = (index, field, value) => {
    const updated = [...contracts];
    updated[index][field] = value;
    setContracts(updated);
  };

  const handleSave = async (isSubmit = false) => {
    setSaving(true);
    try {
      // Logic sync to backend
      const payload = contracts.map(c => ({
        employeeId: c.employeeId || c.employeeID || c.EmployeeId,
        contractTypeId: parseInt(c.contractTypeId),
        basicSalary: parseFloat(c.basicSalary || 0),
        startDate: (c.startDate || new Date().toISOString()).split('T')[0],
        endDate: c.endDate ? c.endDate.split('T')[0] : null,
        jobDescription: c.jobDescription || '',
        workLocation: c.workLocation || '',
        notes: c.notes || '',
        attachmentUrl: c.attachmentUrl || null
      }));

      console.log('Final Payload to Send:', payload);

      await api.put(`/contracts/batches/${batchId}/contracts`, payload);

      if (isSubmit) {
        await api.post(`/contracts/batches/${batchId}/submit`);
        toast.success('Đã lưu và chuyển ký thành công!');
        onSuccess();
      } else {
        toast.success('Đã lưu nháp đợt hợp đồng!');
        fetchBatchDetails(); // Refresh
      }
    } catch (error) {
      console.error('Save error details:', error.response?.data);
      
      let detail = error.response?.data?.message || error.response?.data?.detail;
      
      // Handle ASP.NET Core Validation Errors
      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const firstKey = Object.keys(validationErrors)[0];
        const firstError = validationErrors[firstKey][0];
        detail = `${firstKey}: ${firstError}`;
      }
      
      toast.error(detail || 'Lỗi khi lưu dữ liệu. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[60] flex flex-col animate-in fade-in duration-200">
      {/* Header Toolbar */}
      <div className="ef-toolbar" style={{ justifyContent: 'space-between', padding: '0 20px', minHeight: '60px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-md transition-colors border border-slate-200">
            <X size={18} className="text-slate-600" />
          </button>
          <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
          <div className="ef-toolbar-title" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ĐANG THIẾT LẬP</div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={16} style={{ color: '#4f46e5' }} />
              ĐỢT HỢP ĐỒNG: <span style={{ color: '#4f46e5' }}>{batch?.batchName}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setShowEmployeeSelect(true)} 
            className="ef-btn"
            style={{ background: '#10b981', color: '#fff', border: 'none' }}
          >
            <Plus size={16} style={{ marginRight: '6px' }} /> CHỌN NHÂN VIÊN
          </button>
          <button className="ef-btn">
            <FileUp size={14} style={{ marginRight: '6px' }} /> NẠP EXCEL
          </button>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="flex-1 overflow-auto p-4 bg-[#f1f5f9]">
        <div className="ef-table-wrap" style={{ background: '#fff', borderRadius: '4px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table className="ef-table no-top-border" style={{ minWidth: '1600px' }}>
            <thead>
              <tr>
                <th className="c" style={{ width: '50px' }}>STT</th>
                <th style={{ width: '120px' }}>MÃ NV</th>
                <th style={{ width: '200px' }}>HỌ TÊN</th>
                <th style={{ width: '180px' }}>BỘ PHẬN</th>
                <th style={{ width: '250px' }}>LOẠI HỢP ĐỒNG (*)</th>
                <th style={{ width: '150px' }}>SỐ HĐ</th>
                <th className="c" style={{ width: '160px' }}>NGÀY BẮT ĐẦU (*)</th>
                <th className="c" style={{ width: '160px' }}>NGÀY KẾT THÚC</th>
                <th className="c" style={{ width: '180px' }}>LƯƠNG CƠ BẢN (*)</th>
                <th className="c" style={{ width: '80px' }}>XÓA</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <Users size={64} className="mb-4 text-slate-300" />
                      <div className="text-sm font-medium text-slate-500">Chưa có nhân sự nào trong danh sách chỉnh sửa đợt.</div>
                      <button 
                        onClick={() => setShowEmployeeSelect(true)}
                        className="mt-4 text-indigo-600 font-bold hover:underline"
                      >
                        BẤM VÀO ĐÂY ĐỂ CHỌN NHÂN VIÊN
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                contracts.map((c, idx) => (
                  <tr key={`contract-${c.employeeId || idx}`}>
                    <td className="c text-slate-400 font-medium">{idx + 1}</td>
                    <td style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.employeeCode}</td>
                    <td style={{ fontWeight: '600' }}>{c.employeeName}</td>
                    <td style={{ fontSize: '12px', color: '#64748b' }}>{c.departmentName}</td>
                    <td>
                      <select 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        value={c.contractTypeId}
                        onChange={(e) => updateContract(idx, 'contractTypeId', parseInt(e.target.value))}
                      >
                        <option value={1}>Hợp đồng thử việc</option>
                        <option value={2}>Hợp đồng xác định thời hạn</option>
                        <option value={3}>Hợp đồng không xác định thời hạn</option>
                        <option value={4}>Hợp đồng thời vụ</option>
                      </select>
                    </td>
                    <td>
                      <input 
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none text-slate-500 italic"
                        value={c.contractNumber || ''}
                        readOnly
                        placeholder="Hệ thống tự tạo"
                      />
                    </td>
                    <td className="c">
                      <input 
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-indigo-500 transition-all"
                        value={c.startDate?.split('T')[0] || ''}
                        onChange={(e) => updateContract(idx, 'startDate', e.target.value)}
                      />
                    </td>
                    <td className="c">
                      <input 
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-indigo-500 transition-all"
                        value={c.endDate?.split('T')[0] || ''}
                        onChange={(e) => updateContract(idx, 'endDate', e.target.value)}
                      />
                    </td>
                    <td className="c">
                      <input 
                        type="number"
                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-[13px] outline-none focus:border-indigo-500 font-bold text-indigo-600 text-right pr-4"
                        value={c.basicSalary}
                        onChange={(e) => updateContract(idx, 'basicSalary', e.target.value)}
                      />
                    </td>
                    <td className="c">
                      <button 
                        onClick={() => removeContract(c.employeeId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Actions Toolbar */}
      <div className="ef-toolbar" style={{ justifyContent: 'flex-end', gap: '10px', padding: '0 20px', minHeight: '64px', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.03)' }}>
        <button onClick={onClose} className="ef-btn" style={{ padding: '8px 24px', fontWeight: 'bold' }}>ĐÓNG LẠI</button>
        <div style={{ height: '24px', width: '1px', background: '#e2e8f0', margin: '0 5px' }} />
        <button 
          onClick={() => handleSave(false)} 
          disabled={saving} 
          className="ef-btn"
          style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <Save size={16} /> LƯU BẢN NHÁP
        </button>
        <button className="ef-btn" style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
          <Eye size={16} /> XEM TRƯỚC HĐ
        </button>
        <button 
          onClick={() => handleSave(true)} 
          disabled={saving || contracts.length === 0} 
          className="ef-btn"
          style={{ 
            padding: '8px 28px', 
            background: '#4f46e5', 
            color: '#fff', 
            border: 'none',
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Send size={16} /> HOÀN TẤT & CHUYỂN KÝ
        </button>
      </div>

      {/* Employee Selector Modal Overlay */}
      {showEmployeeSelect && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-[680px] flex flex-col overflow-hidden animate-in zoom-in duration-200 border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 uppercase tracking-tight text-[13px]">BẢNG CHỌN NHÂN SỰ VÀO ĐỢT HỢP ĐỒNG</h3>
              <button 
                onClick={() => { setShowEmployeeSelect(false); setSelectedIds([]); }}
                className="p-1.5 hover:bg-slate-200/50 rounded-md transition-colors border border-transparent hover:border-slate-300"
              >
                <X size={18} className="text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar Filters */}
              <div className="w-64 border-r border-slate-100 bg-[#f8fafc] flex flex-col p-5 space-y-7">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">1. KHỐI PHÒNG BAN</div>
                  <div className="space-y-1.5 overflow-auto max-h-[220px] custom-scrollbar">
                    {parentDepartments.map(dept => (
                      <button
                        key={dept.id}
                        onClick={() => { setSelectedParentId(dept.id); setSelectedSubDeptId(null); }}
                        className={`w-full text-left px-3 py-2.5 rounded text-[12px] font-bold transition-all ${
                          selectedParentId === dept.id 
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                          : 'text-slate-600 hover:bg-white hover:text-indigo-600'
                        }`}
                      >
                        {dept.departmentName.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">2. BỘ PHẬN TRỰC THUỘC</div>
                  <div className="space-y-1.5 overflow-auto max-h-[220px] custom-scrollbar">
                    {!selectedParentId ? (
                      <div className="text-[11px] text-slate-400 italic p-3 bg-slate-100/50 rounded border border-dashed border-slate-200">Vui lòng chọn khối</div>
                    ) : subDepartments.length === 0 ? (
                      <div className="text-[11px] text-slate-400 italic p-3">Không có bộ phận con</div>
                    ) : (
                      subDepartments.map(dept => (
                        <button
                          key={dept.id}
                          onClick={() => setSelectedSubDeptId(dept.id)}
                          className={`w-full text-left px-3 py-2.5 rounded text-[12px] font-bold transition-all ${
                            selectedSubDeptId === dept.id 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' 
                            : 'text-slate-600 hover:bg-white hover:text-emerald-600'
                          }`}
                        >
                          {dept.departmentName.toUpperCase()}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Listing Area */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-3 bg-slate-50/50">
                  <div className="flex-1 relative">
                    <input 
                      type="text" 
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      placeholder="Tìm theo tên nhân viên..."
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded text-sm outline-none focus:border-indigo-600 transition-all font-medium"
                    />
                    <Search size={14} className="text-slate-400 absolute left-3 top-3" />
                  </div>
                  <input 
                    type="text" 
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Mã NV..."
                    className="w-28 px-3 py-2 bg-white border border-slate-300 rounded text-sm outline-none focus:border-indigo-600 transition-all font-mono font-bold"
                  />
                </div>

                <div className="flex-1 overflow-auto">
                  {!selectedSubDeptId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10 text-center opacity-50">
                      <Users size={48} className="mb-4 text-slate-200" />
                      <p className="text-[11px] uppercase font-bold tracking-widest text-slate-500">Hãy chọn bộ phận để lọc danh sách nhân sự</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                          <th className="p-4 w-12 text-center">
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 transition-all cursor-pointer"
                              onChange={(e) => {
                                if (e.target.checked) setSelectedIds(filteredEmployees.map(emp => emp.id));
                                else setSelectedIds([]);
                              }}
                              checked={selectedIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                            />
                          </th>
                          <th className="p-4">THÔNG TIN CHI TIẾT NHÂN SỰ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => (
                          <tr 
                            key={emp.id}
                            className={`hover:bg-indigo-50/20 cursor-pointer transition-colors ${selectedIds.includes(emp.id) ? 'bg-indigo-50/40' : ''}`}
                            onClick={() => toggleSelect(emp.id)}
                          >
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                checked={selectedIds.includes(emp.id)}
                                onChange={() => toggleSelect(emp.id)}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-slate-700 uppercase tracking-tight">{emp.fullName}</span>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold mt-0.5">
                                  <span className="text-indigo-600">{emp.employeeCode}</span>
                                  <span className="opacity-30">•</span>
                                  <span className="text-slate-400">{emp.positionName || 'Chưa cập nhật vị trí'}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Toolbar */}
            <div className="px-8 py-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white px-4 py-2 rounded border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">Đã chọn</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-bold text-indigo-600 text-xl leading-none">{selectedIds.length}</span>
                    <span className="text-[12px] font-bold text-slate-500 uppercase">nhân sự</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowEmployeeSelect(false); setSelectedIds([]); }}
                  className="ef-btn"
                  style={{ padding: '10px 30px', fontWeight: 'bold' }}
                >
                  HỦY BỎ
                </button>
                <button 
                  onClick={addEmployeesToBatch}
                  disabled={selectedIds.length === 0}
                  className="ef-btn"
                  style={{ 
                    padding: '10px 40px', 
                    background: '#4f46e5', 
                    color: '#fff', 
                    border: 'none',
                    fontWeight: 'bold',
                    letterSpacing: '0.02em',
                    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
                  }}
                >
                  ÁP DỤNG VÀO DANH SÁCH ĐỢT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
