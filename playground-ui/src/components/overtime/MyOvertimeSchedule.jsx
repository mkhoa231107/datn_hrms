import React, { useState, useEffect } from 'react';
import { overtimeService } from '../../api';
import { Calendar as CalendarIcon, Clock, Info, CheckCircle, ChevronLeft, ChevronRight, Zap, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyOvertimeSchedule({ user }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    fetchMySchedule();
  }, [month, year]);

  const fetchMySchedule = async () => {
    try {
      setLoading(true);
      const fromDate = new Date(year, month - 1, 1).toISOString();
      const toDate = new Date(year, month, 0).toISOString();
      const res = await overtimeService.getMySchedule(fromDate, toDate);
      const dataArray = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      setAssignments(dataArray);
    } catch (error) {
      toast.error("Không thể tải lịch tăng ca");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id) => {
    try {
      await overtimeService.confirmAssignment(id);
      toast.success("Đã xác nhận thành công");
      setSelectedAssignment(null);
      fetchMySchedule();
    } catch (error) {
      toast.error("Lỗi khi xác nhận");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 rounded-[5px] flex items-center justify-center shadow-xl shadow-slate-200">
            <Zap className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-1 uppercase italic underline decoration-amber-400 decoration-8">Cá nhân Tăng ca</h1>
            <p className="text-slate-500 font-medium text-sm italic">Lịch làm thêm giờ và xác nhận thông tin của bạn.</p>
          </div>
        </div>

        <div className="flex items-center bg-white rounded-[5px] px-4 py-2 border border-slate-100 shadow-sm">
          <button 
            onClick={() => setMonth(m => m === 1 ? 12 : m - 1)}
            className="p-2 hover:bg-slate-50 rounded-[5px] transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex flex-col items-center min-w-[140px] px-4 border-x border-slate-50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Chu kỳ</span>
            <span className="text-sm font-black text-slate-800 tracking-tighter tabular-nums">Tháng {month} / {year}</span>
          </div>
          <button 
            onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
            className="p-2 hover:bg-slate-50 rounded-[5px] transition-all active:scale-90"
          >
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Summary Stats Overlay */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 rounded-[5px] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-100">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-8">
            <div className="space-y-4">
               <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-[5px] border border-white/10">
                 <Target className="w-4 h-4 text-amber-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest leading-none">Tổng hạn mức OT tháng</span>
               </div>
               <div className="flex items-baseline gap-3">
                 <span className="text-6xl font-black tabular-nums tracking-tighter">
                   {assignments.reduce((sum, a) => sum + (a.assignedMaxHours || 0), 0)}
                 </span>
                 <span className="text-2xl font-black text-slate-400 tracking-tight italic">giờ</span>
               </div>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <div className="flex-1 md:min-w-[140px] bg-white/5 backdrop-blur-md rounded-[5px] p-6 border border-white/10 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Số ngày OT</p>
                <p className="text-3xl font-black text-amber-400 tabular-nums">{assignments.length}</p>
              </div>
              <div className="flex-1 md:min-w-[140px] bg-white/10 backdrop-blur-md rounded-[5px] p-6 border border-white/20 text-center shadow-inner">
                <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest mb-2">Xác nhận</p>
                <div className="flex justify-center items-center gap-2">
                   <p className="text-3xl font-black text-emerald-400 tabular-nums">{assignments.filter(a => a.isConfirmed).length}</p>
                   <span className="text-xl font-black text-white/20">/</span>
                   <p className="text-xl font-black text-white/40 tabular-nums">{assignments.length}</p>
                </div>
              </div>
            </div>
          </div>
          {/* Glow effect */}
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-indigo-500/20 rounded-[5px] blur-[100px]" />
        </div>

        <div className="bg-amber-400 rounded-[5px] p-8 text-amber-950 flex flex-col justify-between shadow-xl shadow-amber-100">
          <div className="space-y-2">
            <Info className="w-8 h-8 mb-4 border-2 border-amber-900/10 rounded-[5px] p-1" />
            <h3 className="text-lg font-black tracking-tight leading-tight italic underline">Nguyên tắc Min( Thực tế, Chỉ định)</h3>
            <p className="text-xs font-bold leading-relaxed opacity-80 uppercase tracking-tighter">
              Dữ liệu OT cuối cùng là mức thấp nhất giữa "Số giờ làm thực tế" và "Hạn mức được giao". Hãy check-out đúng giờ phân bổ.
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-amber-900/10 text-[10px] font-black uppercase tracking-widest opacity-60">
            HRMS Automated Capping System
          </div>
        </div>
      </div>

      {/* Calendar Grid View */}
      <div className="bg-white rounded-[5px] p-10 border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="flex items-center justify-between mb-10">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-400 rounded-[5px] flex items-center justify-center">
                 <CalendarIcon className="w-6 h-6 text-amber-950" />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic underline decoration-amber-400 decoration-4">Lịch Tăng ca Tháng {month}</h2>
           </div>
           <div className="hidden md:flex gap-6">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-slate-900 rounded-[5px]" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Có lịch OT</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-emerald-500 rounded-[5px] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đã xác nhận</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-7 gap-4">
          {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
            <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pb-4">
              {d}
            </div>
          ))}
          
          {(() => {
            const firstDay = new Date(year, month - 1, 1).getDay();
            const daysInMonth = new Date(year, month, 0).getDate();
            const cells = [];
            
            // Empty cells before first day
            for (let i = 0; i < firstDay; i++) {
              cells.push(<div key={`empty-${i}`} className="h-24" />);
            }
            
            // Day cells
            for (let d = 1; d <= daysInMonth; d++) {
              const currentDate = new Date(year, month - 1, d);
              const dateStr = currentDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
              const ot = assignments.find(a => new Date(a.date).toLocaleDateString('en-CA') === dateStr);
              
              cells.push(
                <div 
                  key={d} 
                  onClick={() => ot && setSelectedAssignment(ot)}
                  className={`h-24 rounded-[5px] p-3 border transition-all relative group overflow-hidden cursor-pointer ${
                    ot 
                      ? ot.isConfirmed 
                        ? 'bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-50 -translate-y-1'
                        : 'bg-slate-900 border-slate-900 shadow-lg shadow-slate-200 -translate-y-1 hover:bg-slate-800'
                      : 'bg-white border-slate-50 hover:border-slate-200'
                  }`}
                >
                  <span className={`text-sm font-black ${ot ? 'text-white/40' : 'text-slate-300 group-hover:text-slate-900'}`}>{d}</span>
                  {ot && (
                    <div className="mt-2 text-center relative z-10">
                      <p className="text-xl font-black text-amber-400 leading-none">{ot.assignedMaxHours}h</p>
                      {ot.isConfirmed && <p className="text-[7px] font-black text-white/60 tracking-[0.2em] uppercase mt-1">Confirmed</p>}
                    </div>
                  )}
                  {ot && (
                    <div className="absolute -right-2 -bottom-2 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Zap className="w-12 h-12 text-white" />
                    </div>
                  )}
                </div>
              );
            }
            return cells;
          })()}
        </div>
      </div>

      {/* Daily Schedule List (Mobile/Vertical Detail) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-[5px] p-6 border border-slate-100 animate-pulse h-32" />
          ))
        ) : assignments.length > 0 ? (
          assignments.map((a, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedAssignment(a)}
              className="group relative bg-white rounded-[5px] p-7 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-500 cursor-pointer"
            >
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 rounded-[5px] flex flex-col items-center justify-center shadow-inner transition-all duration-500 ${
                   a.isConfirmed ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-900 group-hover:bg-slate-900 group-hover:text-white'
                }`}>
                  <span className="text-[10px] font-black uppercase mb-1 opacity-50">
                    {new Date(a.date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                  </span>
                  <span className="text-2xl font-black leading-none tabular-nums">
                    {new Date(a.date).getDate()}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Hạn mức OT</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{a.assignedMaxHours}</span>
                    <span className="text-sm font-black text-slate-400 italic">giờ</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-50 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Cấp bởi</p>
                  <p className="text-xs font-bold text-slate-500">{a.assignedBy}</p>
                </div>
                <div className={`w-8 h-8 rounded-[5px] flex items-center justify-center transition-colors ${
                  a.isConfirmed ? 'bg-emerald-50' : 'bg-slate-50 group-hover:bg-amber-50'
                }`}>
                  {a.isConfirmed ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Info className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-24 flex flex-col items-center justify-center bg-white rounded-[5px] border-2 border-dashed border-slate-100 shadow-inner">
             <div className="w-24 h-24 bg-slate-50 rounded-[5px] flex items-center justify-center mb-8 text-slate-200">
               <CalendarIcon className="w-12 h-12" />
             </div>
             <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2 uppercase">Trống lịch Tăng ca</h3>
             <p className="text-slate-400 font-medium text-center max-w-sm uppercase text-[10px] tracking-widest">Hệ thống chưa ghi nhận đề cử làm thêm nào cho bạn trong tháng này.</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[5px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="p-10 pb-6 text-center">
                 <div className={`w-20 h-20 rounded-[5px] flex items-center justify-center mx-auto mb-6 shadow-xl ${
                    selectedAssignment.isConfirmed ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-amber-950'
                 }`}>
                    <CalendarIcon className="w-10 h-10" />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2 uppercase italic">Chi tiết Công việc</h3>
                 <p className="text-slate-500 font-bold text-sm tracking-widest italic uppercase">
                    Thứ {new Date(selectedAssignment.date).toLocaleDateString('vi-VN', { weekday: 'long' })}, Ngày {new Date(selectedAssignment.date).getDate()} Tháng {new Date(selectedAssignment.date).getMonth() + 1}
                 </p>
              </div>

              <div className="px-10 space-y-6">
                 <div className="bg-slate-50 p-6 rounded-[5px] border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Thông tin phân bổ</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Hạn mức giờ</p>
                          <p className="text-2xl font-black text-slate-900 tabular-nums">{selectedAssignment.assignedMaxHours}<span className="text-sm font-black italic ml-1">h</span></p>
                       </div>
                       <div>
                          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Người giao</p>
                          <p className="text-sm font-black text-slate-700">{selectedAssignment.assignedBy}</p>
                       </div>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 bg-amber-50/50 p-4 rounded-[5px] border border-amber-100">
                    <Info className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-[10px] font-bold text-amber-800 leading-tight italic">
                       Hãy tuân thủ khung giờ check-out để hệ thống ghi nhận đúng số giờ OT được giao.
                    </p>
                 </div>
              </div>

              <div className="p-10 flex gap-4 mt-2">
                 <button 
                   onClick={() => setSelectedAssignment(null)}
                   className="flex-1 px-4 py-5 rounded-[5px] font-black text-slate-400 hover:text-slate-600 transition-colors uppercase text-[10px] tracking-[0.2em]"
                 >
                    Đóng
                 </button>
                 {!selectedAssignment.isConfirmed && (
                    <button 
                      onClick={() => handleConfirm(selectedAssignment.id)}
                      className="flex-[2] bg-slate-900 hover:bg-black text-white px-4 py-5 rounded-[5px] font-black shadow-2xl transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em]"
                    >
                       Tôi đã nắm rõ
                    </button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Footer Support */}
      <div className="flex items-center justify-center py-4">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-1 h-1 bg-slate-200 rounded-[5px]" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Xác thực bởi Hệ thống Quản trị HRMS</p>
          <div className="w-1 h-1 bg-slate-200 rounded-[5px]" />
        </div>
      </div>
    </div>
  );
}
