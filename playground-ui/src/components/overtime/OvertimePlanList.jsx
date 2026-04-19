import React, { useState, useEffect } from 'react';
import { overtimeService, departmentService } from '../../api';
import { Plus, Calendar, Clock, CheckCircle, AlertCircle, TrendingUp, Filter, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OvertimePlanList({ user }) {
  const [plans, setPlans] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    departmentId: user?.departmentId || '',
    month: new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2,
    year: new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
    totalBudgetHours: 0,
    description: ''
  });

  useEffect(() => {
    fetchPlans();
    fetchDepartments();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await overtimeService.getPlans({
        departmentId: user?.roles?.includes('Admin') ? null : user?.departmentId
      });
      // Extract data array from wrapped response { success: true, data: [...] }
      const dataArray = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      setPlans(dataArray);
    } catch (error) {
      toast.error("Không thể tải danh sách kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res || []);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const handlePublish = async (id) => {
    try {
      await overtimeService.publishPlan(id);
      toast.success("Đã gửi kế hoạch xuống bộ phận thành công");
      fetchPlans();
    } catch (error) {
      toast.error("Lỗi khi gửi kế hoạch");
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      if (!newPlan.departmentId) {
        toast.error("Vui lòng chọn bộ phận nhận ngân sách");
        return;
      }
      if (newPlan.totalBudgetHours <= 0) {
        toast.error("Ngân sách giờ phải lớn hơn 0");
        return;
      }
      if (!newPlan.description) {
        toast.error("Vui lòng nhập lý do tăng ca");
        return;
      }
      await overtimeService.createPlan(newPlan);
      toast.success("Đã thiết lập kế hoạch OT thành công");
      setShowCreateModal(false);
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi tạo kế hoạch");
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Upper Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[5px] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-50 rounded-[5px] flex items-center justify-center text-indigo-600">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hiệu suất OT</p>
            <p className="text-2xl font-black text-slate-800">92%</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[5px] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 rounded-[5px] flex items-center justify-center text-emerald-600">
            <CheckCircle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đã xuất bản</p>
            <p className="text-2xl font-black text-slate-800">{plans.filter(p => p.status === 'Approved').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[5px] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-amber-50 rounded-[5px] flex items-center justify-center text-amber-600">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bản nháp</p>
            <p className="text-2xl font-black text-slate-800">{plans.filter(p => p.status === 'Draft').length}</p>
          </div>
        </div>
      </div>

      {/* Header & Action */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 uppercase italic underline decoration-indigo-500 decoration-4">Quản lý Ngân sách OT</h1>
          <p className="text-slate-500 font-medium max-w-lg italic">Giao chỉ tiêu và lý do tăng ca xuống các bộ phận trực thuộc.</p>
        </div>
        {(user?.roles?.includes('DepartmentManager') || user?.roles?.includes('Admin')) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-[5px] font-bold shadow-xl shadow-slate-200 transition-all active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            Lập Kế hoạch Mới
          </button>
        )}
      </div>

      {/* Main List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[5px] p-8 border border-slate-100 shadow-sm animate-pulse h-64" />
          ))
        ) : plans.length > 0 ? (
          plans.map(plan => (
            <div key={plan.id} className="group relative bg-white rounded-[5px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-slate-900 text-white p-3 rounded-[5px] shadow-lg shadow-slate-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border ${
                  plan.status === 'Approved' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}>
                  {plan.status === 'Approved' ? 'Đã công bố' : 'Bản nháp'}
                </div>
              </div>
              
              <div className="space-y-1 mb-6">
                <h3 className="font-black text-slate-900 text-2xl tracking-tight">
                  Tháng {plan.month} <span className="text-slate-300 font-light">/</span> {plan.year}
                </h3>
                <p className="text-xs text-slate-400 font-black uppercase tracking-widest">{plan.departmentName}</p>
              </div>

              <div className="mb-8 p-4 bg-slate-50/50 rounded-[5px] border border-slate-100 relative">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lý do tăng ca</p>
                 <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2 italic">"{plan.description || 'Không có lý do chi tiết'}"</p>
              </div>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none">Tổng ngân sách</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{plan.totalBudgetHours}</span>
                    <span className="text-xs font-black text-slate-400 italic">giờ</span>
                  </div>
                </div>

                {plan.status === 'Draft' ? (
                  (user?.roles?.includes('DepartmentManager') || user?.roles?.includes('Admin')) ? (
                    <button 
                      onClick={() => handlePublish(plan.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-[5px] shadow-lg shadow-indigo-100 transition-all active:scale-90"
                      title="Gửi xuống Bộ phận"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center" title="Chờ Trưởng phòng duyệt">
                      <Clock className="w-5 h-5 text-slate-400" />
                    </div>
                  )
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center" title="Đã công bố">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                )}
              </div>

              {/* Decorative progress line */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-50 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${plan.status === 'Approved' ? 'bg-emerald-500 w-full' : 'bg-amber-400 w-1/3'}`} />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center bg-white rounded-[5px] border-2 border-dashed border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
              <Filter className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">Chưa có kế hoạch OT</h3>
            <p className="text-slate-500 font-medium mb-8">
              {(user?.roles?.includes('DepartmentManager') || user?.roles?.includes('Admin'))
                ? 'Hãy bắt đầu thiết lập ngân sách cho bộ phận của bạn.'
                : 'Trưởng phòng chưa thiết lập ngân sách tăng ca.'}
            </p>
            {(user?.roles?.includes('DepartmentManager') || user?.roles?.includes('Admin')) && (
              <button
                 onClick={() => setShowCreateModal(true)}
                 className="bg-slate-900 text-white px-8 py-3 rounded-[5px] font-bold shadow-lg"
              >
                Tạo ngay
              </button>
            )}
          </div>
        )}
      </div>

      {/* Advanced Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[5px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="p-10 pb-4">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-[5px] flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Lập kế hoạch OT</h3>
              </div>
              <p className="text-slate-500 font-medium text-sm">Thiết lập ngân sách và lý do triển khai tăng ca tháng.</p>
            </div>
            
            <form onSubmit={handleCreatePlan} className="p-10 pt-4 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chu kỳ tháng</label>
                  <select 
                    value={newPlan.month}
                    onChange={e => setNewPlan({...newPlan, month: parseInt(e.target.value)})}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[5px] px-5 py-3.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i+1} value={i+1}>Tháng {i+1}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Năm tài khóa</label>
                  <select 
                    value={newPlan.year}
                    onChange={e => setNewPlan({...newPlan, year: parseInt(e.target.value)})}
                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-[5px] px-5 py-3.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                  >
                    <option value={currentYear}>{currentYear} Period</option>
                    <option value={currentYear + 1}>{currentYear + 1} Period</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bộ phận nhận ngân sách</label>
                <select 
                  value={newPlan.departmentId || ""}
                  onChange={e => {
                    const val = e.target.value;
                    setNewPlan({...newPlan, departmentId: val === "" ? "" : parseInt(val)});
                  }}
                  className="w-full bg-slate-50 border-2 border-slate-50 rounded-[5px] px-5 py-3.5 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                  disabled={!user?.roles?.includes('Admin') && !user?.roles?.includes('DepartmentManager')}
                >
                  <option value="">-- Chọn Bộ phận --</option>
                  {(user?.roles?.includes('Admin') 
                    ? departments 
                    : departments.filter(d => 
                        d.id === user?.departmentId || 
                        d.parentDepartmentId === user?.departmentId ||
                        (d.parentDepartmentId && d.parentDepartmentId === departments.find(x => x.id === user?.departmentId)?.parentDepartmentId)
                      )
                  ).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lý do tăng ca (Diễn giải)</label>
                 <textarea 
                   value={newPlan.description}
                   onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                   className="w-full bg-slate-50 border-2 border-slate-50 rounded-[5px] px-5 py-3.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all h-24 resize-none"
                   placeholder="Nhập lý do tăng ca (Ví dụ: Chạy tiến độ đơn hàng May mặc tháng 5)..."
                 />
              </div>

              <div className="space-y-1.5 bg-emerald-50/50 p-5 rounded-[5px] border border-emerald-100">
                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Ngân sách dự kiến (Giờ)</label>
                <div className="flex items-center gap-4">
                   <input 
                    type="number"
                    step="1"
                    min="0"
                    value={newPlan.totalBudgetHours}
                    onChange={e => setNewPlan({...newPlan, totalBudgetHours: parseFloat(e.target.value)})}
                    className="flex-1 bg-transparent border-none p-0 text-4xl font-black text-emerald-700 placeholder:text-emerald-200 outline-none"
                    placeholder="000"
                  />
                  <span className="text-xl font-black text-emerald-200 uppercase italic">Hours</span>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-4 rounded-[5px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-[0.2em]"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="flex-[2] bg-slate-900 hover:bg-black text-white px-4 py-4 rounded-[5px] font-black shadow-2xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em]"
                >
                  Thiết lập bản nháp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

