import React, { useState, useEffect, useMemo } from 'react';
import { overtimeService } from '../../api';
import { 
    Save, Calendar as CalendarIcon, Users, ChevronLeft, 
    ChevronRight, Info, Search, TrendingUp, CheckCircle2, 
    Clock, Lock, AlertCircle, Zap, ShieldCheck, 
    Filter, ArrowUpRight, UserPlus, History
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OvertimeGrid({ user, onBack }) {
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

    useEffect(() => { fetchPlans(); }, [month, year]);

    useEffect(() => {
        if (selectedPlanId || user?.departmentId) {
            fetchGrid();
        }
    }, [selectedPlanId, month, year]);

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

    const totalAssignedInGrid = useMemo(() => {
        return gridData?.rows.reduce((sum, row) => 
            sum + row.dailyValues.reduce((s, v) => s + v, 0), 0
        ) || 0;
    }, [gridData]);

    const selectedPlan = useMemo(() => plans.find(p => p.id === parseInt(selectedPlanId)), [plans, selectedPlanId]);
    const budgetLimit = selectedPlan?.totalBudgetHours || 0;
    const isOverBudget = totalAssignedInGrid > budgetLimit;
    const dayIdx = selectedDay - 1;

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
        toast.success(`Đã gán ${hours}h cho toàn bộ nhân sự ngày ${selectedDay}/${month}`);
    };

    const handleSave = async () => {
        if (!selectedPlanId) {
            toast.error("Vui lòng chọn ngân sách được giao!");
            return;
        }
        if (isOverBudget) {
            toast.error("Vượt quá quỹ thời gian cho phép!");
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
            toast.success(`Lưu phân bổ OT ngày ${selectedDay}/${month} thành công!`);
            fetchGrid();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi lưu dữ liệu.");
        } finally {
            setSaving(false);
        }
    };

    const filteredRows = useMemo(() => {
        return gridData?.rows.filter(row => 
            row.employeeName.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [];
    }, [gridData, searchTerm]);

    const daysInMonth = new Date(year, month, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const OT_TOKENS = [0, 0.5, 1.0, 1.5, 2.0];

    const checkIsDateLocked = (d) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayDate = new Date(year, month - 1, d);
        dayDate.setHours(0, 0, 0, 0);
        const diffTime = dayDate.getTime() - today.getTime();
        const diffDays = Math.floor(diffTime / 86400000);
        return diffDays < 2;
    };
    const isCurrentDayLocked = checkIsDateLocked(selectedDay);

    const getInitials = (name) => {
        const parts = name.split(' ');
        return (parts[0][0] + (parts.length > 1 ? parts[parts.length-1][0] : '')).toUpperCase();
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up max-w-[1400px] mx-auto pb-20">
            {/* ── Premium Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[8px] bg-indigo-600 text-white flex items-center justify-center shadow-lg relative overflow-hidden group">
                        <Users size={28} className="relative z-10 transition-transform group-hover:scale-110" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none mb-1.5">
                            Đề cử <span className="text-indigo-600">Làm thêm giờ</span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="badge badge-accent">Phân bổ chỉ tiêu</span>
                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                <ShieldCheck size={12} className="text-indigo-500" />
                                Quản lý trực tiếp
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-[8px] shadow-sm border border-slate-100">
                    <div className="flex items-center gap-1 border-r border-slate-100 pr-3">
                        <button 
                            onClick={() => setMonth(m => m === 1 ? 12 : m - 1)}
                            className="p-2 hover:bg-slate-50 rounded-[6px] transition-colors text-slate-400 hover:text-indigo-600"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="px-3 text-center min-w-[100px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Chu kỳ</p>
                            <p className="text-sm font-black text-slate-700">{month} / {year}</p>
                        </div>
                        <button 
                            onClick={() => setMonth(m => m === 12 ? 1 : m + 1)}
                            className="p-2 hover:bg-slate-50 rounded-[6px] transition-colors text-slate-400 hover:text-indigo-600"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    <div className="px-3">
                        <select 
                            value={selectedPlanId}
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="bg-transparent border-none text-xs font-black text-slate-600 focus:ring-0 outline-none cursor-pointer"
                        >
                            <option value="">-- Chọn ngân sách --</option>
                            {plans.map(p => (
                                <option key={p.id} value={p.id}>
                                    Quỹ: {p.totalBudgetHours}h (Tháng {p.month})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                {/* ── Left Side: Stats & Calendar ── */}
                <div className="xl:col-span-3 space-y-6 sticky top-6">
                    {/* Budget Visualizer */}
                    <div className="card !p-6 !rounded-[8px] flex flex-col items-center text-center relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 p-3 opacity-10 transition-transform group-hover:scale-125 ${isOverBudget ? 'text-rose-600' : 'text-indigo-600'}`}>
                            <TrendingUp size={64} />
                        </div>
                        
                        <div className={`w-14 h-14 rounded-[8px] flex items-center justify-center mb-4 shadow-lg ${
                            isOverBudget ? 'bg-rose-500 text-white' : 'bg-indigo-600 text-white'
                        }`}>
                            <Zap size={24} />
                        </div>

                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Tỷ trọng tháng</h4>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className={`text-4xl font-black tabular-nums tracking-tighter ${isOverBudget ? 'text-rose-600' : 'text-slate-800'}`}>
                                {totalAssignedInGrid}
                            </span>
                            <span className="text-lg font-bold text-slate-400">/ {budgetLimit}h</span>
                        </div>

                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                            <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min((totalAssignedInGrid / (budgetLimit || 1)) * 100, 100)}%` }}
                            />
                        </div>
                        
                        {isOverBudget ? (
                            <p className="text-[10px] text-rose-500 font-black mt-3 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                                <AlertCircle size={12} /> Cảnh báo: Vượt hạn mức!
                            </p>
                        ) : (
                            <p className="text-[10px] text-emerald-500 font-black mt-3 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 size={12} /> Trong ngưỡng an toàn
                            </p>
                        )}
                    </div>

                    {/* Modern Date Picker */}
                    <div className="card !p-5 !rounded-[8px]">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                                <CalendarIcon size={14} />
                                Lịch công tác
                            </h3>
                            <div className="text-[10px] font-bold text-slate-400">Tháng {month}</div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1">
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => (
                                <div key={d} className="text-center text-[9px] font-black text-slate-300 py-2">{d}</div>
                            ))}
                            {Array(new Date(year, month - 1, 1).getDay()).fill(null).map((_, i) => <div key={`blank-${i}`} />)}
                            {daysArray.map(day => {
                                const isLocked = checkIsDateLocked(day);
                                const isSelected = selectedDay === day;
                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`aspect-square flex items-center justify-center text-xs font-bold rounded-[8px] transition-all relative ${
                                            isSelected 
                                                ? 'bg-indigo-600 text-white shadow-lg z-10 scale-110' 
                                                : isLocked
                                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed opacity-50'
                                                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                                        }`}
                                    >
                                        {day}
                                        {isSelected && <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ── Right Side: Main Table & Control ── */}
                <div className="xl:col-span-9 flex flex-col gap-6">
                    <div className="card !p-0 !rounded-[8px] overflow-hidden">
                        {/* Interactive Header */}
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-[8px] flex items-center justify-center border shadow-sm ${
                                    isCurrentDayLocked ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-slate-200 text-indigo-600'
                                }`}>
                                    <CalendarIcon size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 leading-none">
                                        Ngày {selectedDay.toString().padStart(2, '0')}/{month.toString().padStart(2, '0')}
                                        {isCurrentDayLocked && (
                                            <span className="badge badge-danger !text-[9px]">Bị khóa</span>
                                        )}
                                    </h2>
                                    <p className="text-[11px] font-bold text-slate-400 mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                                        {isCurrentDayLocked 
                                            ? <><Lock size={12} className="text-rose-500" /> Đã quá hạn sửa đổi (Quy tắc 48h)</>
                                            : <><Info size={12} className="text-indigo-500" /> Phân bổ OT trước ít nhất 2 ngày</>
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="relative group min-w-[240px]">
                                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm tên nhân sự..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="input !pl-10 !py-2.5 !bg-white focus:!bg-white"
                                    />
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !selectedPlanId || isCurrentDayLocked}
                                    className="btn btn-primary !py-2.5 !px-6 shadow-xl shadow-indigo-100"
                                >
                                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                                    Lưu ngay
                                </button>
                            </div>
                        </div>

                        {/* Batch Action Bar */}
                        <div className="px-6 py-3 bg-indigo-600 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="text-amber-300" />
                                <span className="text-[10px] font-black uppercase tracking-[0.15em]">Gán nhanh cho toàn tổ:</span>
                            </div>
                            <div className="flex gap-1.5">
                                {[0, 0.5, 1.0, 1.5, 2.0].map(h => (
                                    <button 
                                        key={h}
                                        onClick={() => handleApplyToAllForDay(h)}
                                        disabled={isCurrentDayLocked}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-[4px] text-[10px] font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        {h}h
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Employee Rows */}
                        <div className="max-h-[600px] overflow-y-auto no-scrollbar">
                            {loading ? (
                                <div className="p-20 text-center flex flex-col items-center gap-4">
                                    <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                    <p className="text-sm font-bold text-slate-400">Đang đồng bộ dữ liệu...</p>
                                </div>
                            ) : !selectedPlanId ? (
                                <div className="p-24 text-center flex flex-col items-center gap-3 opacity-30">
                                    <Users size={64} />
                                    <p className="text-lg font-black text-slate-700">Vui lòng chọn ngân sách ngân sách</p>
                                </div>
                            ) : filteredRows.length > 0 ? (
                                <div className="divide-y divide-slate-50">
                                    {filteredRows.map(row => {
                                        const currentHours = row.dailyValues[dayIdx] || 0;
                                        return (
                                            <div 
                                                key={row.employeeId} 
                                                className={`flex flex-col sm:flex-row items-center justify-between p-5 transition-all group ${
                                                    currentHours > 0 ? 'bg-indigo-50/40' : 'hover:bg-slate-50/50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-4 mb-4 sm:mb-0">
                                                    <div className={`w-11 h-11 rounded-[8px] flex items-center justify-center text-xs font-black shadow-sm transition-transform group-hover:scale-105 ${
                                                        currentHours > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                                                    }`}>
                                                        {getInitials(row.employeeName)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black text-slate-800 leading-none mb-1.5 flex items-center gap-2">
                                                            {row.employeeName}
                                                            {currentHours > 0 && <CheckCircle2 size={12} className="text-indigo-500" />}
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wide">
                                                            <History size={10} />
                                                            Tích lũy tháng: <span className="text-indigo-600 bg-white px-1.5 py-0.5 rounded border border-indigo-100">{row.dailyValues.reduce((s, v) => s + v, 0)}h</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 bg-white p-1 rounded-[8px] shadow-sm border border-slate-100">
                                                    {OT_TOKENS.map(token => {
                                                        const isSelected = currentHours === token;
                                                        return (
                                                            <button
                                                                key={token}
                                                                disabled={isCurrentDayLocked}
                                                                onClick={() => handleCellChange(row.employeeId, token)}
                                                                className={`
                                                                    min-w-[44px] h-9 text-[10px] font-black rounded-[6px] transition-all relative overflow-hidden
                                                                    ${isSelected 
                                                                        ? 'bg-indigo-600 text-white shadow-lg z-10' 
                                                                        : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                                                                    }
                                                                    ${isCurrentDayLocked ? 'opacity-30 cursor-not-allowed' : ''}
                                                                `}
                                                            >
                                                                {token === 0 ? 'OFF' : `${token}h`}
                                                                {isSelected && (
                                                                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-400" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-20 text-center opacity-30">Không có dữ liệu nhân sự</div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Legend */}
                    <div className="flex items-center gap-6 p-4 bg-white/50 rounded-[8px] border border-dashed border-slate-200">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <Zap size={14} className="text-amber-500" /> Quy tắc hệ thống:
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Đã gán OT</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Khóa 48h</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Trong ngân sách</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


