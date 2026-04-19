import React, { useState, useEffect } from 'react';
import { overtimeService } from '../../api';
import { Save, Calendar as CalendarIcon, Users, ChevronLeft, ChevronRight, Info, Search, TrendingUp, CheckCircle, Clock, Lock, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OvertimeGrid({ user }) {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentDate = new Date().getDate();

  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [selectedDay, setSelectedDay] = useState(currentDate);

  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch plans when period changes
  useEffect(() => {
    fetchPlans();
  }, [month, year]);

  // Fetch grid data when plan/period changes
  useEffect(() => {
    if (selectedPlanId || user?.departmentId) {
      fetchGrid();
    }
  }, [selectedPlanId, month, year]);

  // Make sure selectedDay doesn't exceed days in the current month
  useEffect(() => {
    const daysInCurrentMonth = new Date(year, month, 0).getDate();
    if (selectedDay > daysInCurrentMonth) {
      setSelectedDay(daysInCurrentMonth);
    }
  }, [month, year, selectedDay]);

  const fetchPlans = async () => {
    try {
      const res = await overtimeService.getPlans({
        departmentId: user?.departmentId,
        month,
        year
      });
      const dataArray = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      const approvedPlans = dataArray.filter(p => p.status === 'Approved');
      setPlans(approvedPlans);
      if (approvedPlans.length > 0) {
        setSelectedPlanId(approvedPlans[0].id.toString());
      } else {
        setSelectedPlanId('');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchGrid = async () => {
    try {
      setLoading(true);
      const deptId = user?.departmentId || (plans.find(p => p.id === parseInt(selectedPlanId))?.departmentId);
      if (!deptId) return;
      const res = await overtimeService.getAssignmentGrid(deptId, month, year);
      setGridData(res?.data || res || null);
    } catch (error) {
      toast.error("Không thể tải danh sách nhân sự");
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalAssignedInGrid = gridData?.rows.reduce((sum, row) => 
    sum + row.dailyValues.reduce((s, v) => s + v, 0), 0
  ) || 0;

  const selectedPlan = plans.find(p => p.id === parseInt(selectedPlanId));
  const budgetLimit = selectedPlan?.totalBudgetHours || 0;
  const isOverBudget = totalAssignedInGrid > budgetLimit;
  const dayIdx = selectedDay - 1;

  // Handlers
  const handleCellChange = (empId, value) => {
    const newVal = parseFloat(value);
    if (isNaN(newVal)) return;
    
    setGridData(prev => ({
      ...prev,
      rows: prev.rows.map(row => 
        row.employeeId === empId 
          ? { ...row, dailyValues: row.dailyValues.map((v, i) => i === dayIdx ? newVal : v) }
          : row
      )
    }));
  };

  const handleApplyToAllForDay = (hours) => {
    if (!gridData) return;
    setGridData(prev => ({
      ...prev,
      rows: prev.rows.map(row => ({
        ...row,
        dailyValues: row.dailyValues.map((v, i) => i === dayIdx ? hours : v)
      }))
    }));
    toast.success(`Đã gán ${hours}h cho toàn bộ nhân sự trong ngày ${selectedDay}/${month}`);
  };

  const handleSave = async () => {
    if (!selectedPlanId) {
      toast.error("Vui lòng chọn ngân sách được Bộ phận giao!");
      return;
    }
    if (isOverBudget) {
      toast.error("Cảnh báo: Bạn đã phân bổ vượt quá quỹ thời gian cho phép!");
      return;
    }

    try {
      setSaving(true);
      const assignments = [];
      const startDate = new Date(year, month - 1, 1);
      
      gridData.rows.forEach(row => {
        const val = row.dailyValues[dayIdx];
        if (val !== undefined && val !== null) {
            const date = new Date(startDate);
            date.setDate(selectedDay);
            assignments.push({
              employeeId: row.employeeId,
              date: date.toISOString(),
              hours: val
            });
        }
      });

      await overtimeService.bulkAssign({
        planId: parseInt(selectedPlanId),
        assignments
      });
      toast.success(`Lưu phân bổ OT cho ngày ${selectedDay}/${month}/${year} thành công!`);
      // Re-fetch to ensure sync with DB
      fetchGrid();
    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  // Get current row display data
  const filteredRows = gridData?.rows.filter(row => 
    row.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Quick select tokens
  const OT_TOKENS = [0, 0.5, 1.0, 1.5, 2.0];

  // Validation: 1-3 days in advance Rule
  const checkIsDateLocked = (d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(year, month - 1, d);
    dayDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days. Note: 1000 * 3600 * 24 = 86,400,000 ms per day.
    const diffTime = dayDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / 86400000);
    
    // Rule: Must be at least 2 days in the future relative to today.
    // If today is 17th:
    // 17th: diffDays = 0 -> Locked
    // 18th: diffDays = 1 -> Locked
    // 19th: diffDays = 2 -> Unlocked
    return diffDays < 2;
  };
  const isCurrentDayLocked = checkIsDateLocked(selectedDay);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
      {/* Top Bar - Identity */}
      <div className="bg-slate-900 rounded-[5px] p-8 text-white shadow-xl flex flex-col lg:flex-row justify-between lg:items-center gap-6 relative overflow-hidden">
        {/* Decor */}
        <div className="absolute right-0 top-0 -mt-16 -mr-16 text-white/5 pointer-events-none">
           <Clock className="w-64 h-64" />
        </div>

        <div className="flex items-center gap-5 z-10">
          <div className="w-14 h-14 bg-white/10 rounded-[5px] flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10 shrink-0">
            <Users className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase italic underline decoration-amber-400 decoration-4">Đề Cử Tăng Ca</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">Phân bổ chỉ tiêu giờ làm thêm cho các nhân sự trong tổ.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 z-10">
          {/* Period Selector */}
          <div className="flex items-center bg-white/10 rounded-[5px] p-1.5 border border-white/10 shadow-inner">
            <button 
              onClick={() => setMonth(m => m === 1 ? 12 : m - 1)}
              className="p-2 hover:bg-white/20 rounded-[5px] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <div className="px-4 text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-none mb-1">Chu kỳ tháng</p>
              <p className="font-black tracking-tighter leading-none text-white">{month} / {year}</p>
            </div>
            <button 
              onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
              className="p-2 hover:bg-white/20 rounded-[5px] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Plan Selector */}
          <div className="bg-white/10 rounded-[5px] border border-white/10 p-1.5 px-4 shadow-inner flex items-center min-w-[200px]">
             <select 
              value={selectedPlanId}
              onChange={e => setSelectedPlanId(e.target.value)}
              className="w-full bg-transparent border-none text-sm font-black text-white focus:ring-0 outline-none cursor-pointer placeholder-white/50"
            >
              <option value="" className="text-slate-800">-- Ngân sách khả dụng --</option>
              {plans.map(p => (
                <option key={p.id} value={p.id} className="text-slate-800 font-bold">
                  Quỹ: {p.totalBudgetHours}h (Tháng {p.month})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Calendar & Budget Tracker */}
        <div className="lg:col-span-1 space-y-6">
           {/* Budget Card */}
           <div className="bg-white rounded-[5px] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
             <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-xl ${
               isOverBudget ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-indigo-600 text-white shadow-indigo-200'
             }`}>
               <TrendingUp className="w-8 h-8" />
             </div>
             
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Toàn Tỷ Trọng (Tháng)</h3>
             <div className="flex items-baseline justify-center gap-1 mb-4">
                <span className={`text-4xl font-black tracking-tighter ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>{totalAssignedInGrid}</span>
                <span className="text-lg font-bold text-slate-400">/ {budgetLimit}</span>
             </div>
             
             <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                <div 
                  className={`h-full transition-all duration-1000 ${isOverBudget ? 'bg-rose-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min((totalAssignedInGrid / (budgetLimit || 1)) * 100, 100)}%` }}
                />
             </div>
             {isOverBudget && <p className="text-xs text-rose-500 font-bold mt-3 uppercase">Vượt ngưỡng chi tiêu!</p>}
           </div>

           {/* Date Picker Ribbon */}
           <div className="bg-white rounded-[5px] p-5 shadow-sm border border-slate-100">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
               <CalendarIcon className="w-4 h-4" />
               Chọn ngày điền OT
             </h3>
             <div className="grid grid-cols-7 gap-1.5">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                  <div key={d} className="text-center text-[9px] font-bold text-slate-400 py-1">{d}</div>
                ))}
                {/* Blank days spacing */}
                {Array(new Date(year, month - 1, 1).getDay()).fill(null).map((_, i) => <div key={`blank-${i}`} />)}
                {daysArray.map(day => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square flex items-center justify-center text-xs font-bold rounded-[5px] transition-all hover:scale-105 active:scale-95 ${
                      selectedDay === day 
                        ? 'bg-amber-400 text-slate-900 shadow-md shadow-amber-200' 
                        : 'bg-slate-50 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
             </div>
           </div>
        </div>

        {/* Right Column: Personel List for Selected Day */}
        <div className="lg:col-span-3 bg-white rounded-[5px] shadow-sm border border-slate-100 flex flex-col h-[700px]">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
             <div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  Danh sách OT: 
                  <span className={`px-3 py-1.5 rounded-[5px] shadow-inner text-lg border ${
                     isCurrentDayLocked ? 'text-rose-600 bg-rose-50 border-rose-100' : 'text-indigo-600 bg-indigo-50 border-indigo-100'
                  }`}>
                    Ngày {selectedDay.toString().padStart(2, '0')}/{month.toString().padStart(2, '0')}
                  </span>
                  {isCurrentDayLocked && (
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-1 rounded-[3px] font-black uppercase tracking-widest flex items-center gap-1 shadow-sm">
                      <Lock className="w-3 h-3" /> Bị khóa
                    </span>
                  )}
               </h2>
               <p className="text-[11px] font-bold text-slate-500 mt-2 flex items-center gap-1.5">
                  {isCurrentDayLocked 
                    ? <span className="text-rose-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Chỉ có thể phân bổ tăng ca trước từ 2 ngày trở lên!</span> 
                    : <><Info className="w-3.5 h-3.5 text-amber-500" /> Chọn các mốc giờ có sẵn (Tối đa: 2h, Tối thiểu: 0.5h)</>
                  }
               </p>
             </div>
             
             <div className="flex items-center gap-3 w-full md:w-auto">
               <div className="relative flex-1 md:w-64">
                 <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                 <input 
                   type="text" 
                   placeholder="Tìm nhân viên..."
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="pl-9 pr-4 py-2.5 w-full bg-white border border-slate-200 rounded-[5px] text-sm font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                 />
               </div>
               <button
                  onClick={handleSave}
                  disabled={saving || !selectedPlanId || isCurrentDayLocked}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-[5px] font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shrink-0 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"/> : <Save className="w-4 h-4" />}
                  Lưu ngày {selectedDay}
                </button>
             </div>
           </div>

           {/* Quick Set All Banner */}
           <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-center justify-between shrink-0">
             <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Áp dụng mốc giờ cho toàn tổ:</span>
             <div className="flex items-center gap-2">
                {[0, 0.5, 1.0, 1.5, 2.0].map(h => (
                  <button 
                    key={h}
                    onClick={() => handleApplyToAllForDay(h)}
                    disabled={isCurrentDayLocked}
                    className={`w-10 h-8 text-[11px] font-black rounded transition-all shadow-sm ${
                      isCurrentDayLocked 
                        ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-60'
                        : 'text-amber-900 bg-amber-200 hover:bg-amber-400 border border-amber-300 active:scale-95'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
             </div>
           </div>

           {/* List of Emp Cards */}
           <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-200">
             {loading ? (
               Array(4).fill(0).map((_, i) => (
                 <div key={i} className="h-20 bg-slate-50 border border-slate-100 rounded-[5px] animate-pulse" />
               ))
             ) : selectedPlanId === '' ? (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                 <CalendarIcon className="w-16 h-16 text-slate-300 mb-4" />
                 <h3 className="text-xl font-black text-slate-500">Chưa chọn Kế hoạch OT</h3>
                 <p className="text-sm text-slate-400">Vui lòng chọn ngân sách từ Trưởng phòng ở góc trên cùng.</p>
               </div>
             ) : filteredRows.length > 0 ? (
                filteredRows.map(row => {
                  const currentHours = row.dailyValues[dayIdx] || 0;
                  return (
                    <div 
                      key={row.employeeId} 
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-[5px] border transition-all duration-300 ${
                        currentHours > 0 
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {/* Emp Info */}
                      <div className="flex items-center gap-4 mb-4 sm:mb-0">
                        <div className={`w-12 h-12 rounded-[5px] flex items-center justify-center text-lg font-black shadow-inner shrink-0 ${
                          currentHours > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {row.employeeName.split(' ').pop()?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg tracking-tight mb-0.5">{row.employeeName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest tabular-nums flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            Đã nhận tháng này: <span className="text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded">{(row.dailyValues.reduce((s, v) => s + v, 0))}h</span>
                          </p>
                        </div>
                      </div>

                      {/* Hour Tokens (0, 0.5, 1, 1.5, 2) */}
                      <div className="flex flex-wrap items-center gap-2">
                        {OT_TOKENS.map(token => {
                          const isSelected = currentHours === token;
                          return (
                            <button
                              key={token}
                              disabled={isCurrentDayLocked}
                              onClick={() => handleCellChange(row.employeeId, token)}
                              className={`
                                relative px-4 py-2 text-xs font-black rounded-[4px] border overflow-hidden transition-all duration-300 active:scale-95
                                ${isCurrentDayLocked ? 'opacity-50 cursor-not-allowed border-slate-200 text-slate-400 bg-slate-50' : 
                                  isSelected 
                                    ? (token === 0 
                                        ? 'bg-slate-200 text-slate-700 border-slate-300 shadow-inner' 
                                        : 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-200')
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                }
                              `}
                            >
                              {isSelected && token > 0 ? (
                                <div className="flex items-center gap-1.5 z-10 relative">
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  <span>{token}h</span>
                                </div>
                              ) : (
                                <span className="z-10 relative">{token === 0 ? 'Off' : `${token}h`}</span>
                              )}
                              
                              {/* Selection overlay animation */}
                              {isSelected && !isCurrentDayLocked && <div className="absolute inset-0 bg-white/10" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                 <Users className="w-16 h-16 text-slate-300 mb-4" />
                 <h3 className="text-xl font-black text-slate-500">Không tìm thấy nhân viên</h3>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

