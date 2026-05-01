import React, { useState, useEffect } from 'react';
import { schedulingService } from '../../api';
import { Calendar, Info, Clock, MapPin, RefreshCw, AlertCircle, Sun, Sunset, Moon, Coffee } from 'lucide-react';

// ── Normalize shift codes from DB (S1/D1→C1, S2/D2→C2, S3/D3→C3, HC→HC, etc.)
const normalizeShiftCode = (raw) => {
    if (!raw) return 'OFF';
    const map = {
        // Legacy codes from old seeders
        S1: 'C1', C1_old: 'C2', D1: 'C3',
        // Numeric mappings
        '1': 'C1', '2': 'C2', '3': 'C3',
        // String mappings
        'Ca 1': 'C1', 'Ca 2': 'C2', 'Ca 3': 'C3',
        'Ca Sáng': 'C1', 'Ca Chiều': 'C2', 'Ca Đêm': 'C3',
    };
    return map[raw] ?? raw;
};

const SHIFT_META = {
    HC:  { label: 'Hành chính',   sub: '8:00 - 17:00',  icon: Coffee, cls: 'bg-violet-100 text-violet-700 border-violet-200',  dot: 'bg-violet-500' },
    C1:  { label: 'Ca 1 (Sáng)',  sub: '6:00 - 14:00',  icon: Sun,    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
    C2:  { label: 'Ca 2 (Chiều)', sub: '14:00 - 22:00', icon: Sunset, cls: 'bg-amber-100 text-amber-700 border-amber-200',      dot: 'bg-amber-500' },
    C3:  { label: 'Ca 3 (Đêm)',   sub: '22:00 - 06:00', icon: Moon,   cls: 'bg-slate-800 text-white border-slate-700',          dot: 'bg-slate-700' },
    OFF: { label: 'Ngày nghỉ',    sub: '',               icon: null,   cls: 'bg-rose-50 text-rose-400 border-rose-100 border-dashed', dot: 'bg-rose-300' },
};

const getMeta = (code) => SHIFT_META[code] ?? {
    label: code,
    sub: '',
    icon: null,
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
};

export default function MySchedule({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDay, setSelectedDay] = useState(null);

    const isBeforeToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()) < today;
    };

    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const pResult = await schedulingService.getPeriods();
            setPeriods(pResult);
            if (pResult.length > 0) {
                const active = pResult.filter(p => !isBeforeToday(p.endDate));
                const def = active.length > 0 ? active[0] : pResult[0];
                setSelectedPeriod(def.id);
                setSelectedYear(new Date(def.startDate).getFullYear());
            }
        } catch (e) {
            console.error('Error fetching periods:', e);
        } finally {
            setLoading(false);
        }
    };

    const loadSchedule = async () => {
        if (!selectedPeriod) return;
        setLoading(true);
        try {
            const data = await schedulingService.getPersonalSchedule(selectedPeriod);
            setScheduleData(data);
            if (data.schedules?.length > 0) {
                const today = data.schedules.find(s => isToday(s.date));
                setSelectedDay(today || data.schedules[0]);
            }
        } catch (e) {
            console.error('Error loading schedule:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { if (selectedPeriod) loadSchedule(); }, [selectedPeriod]);

    const years = [...new Set(periods.map(p => new Date(p.startDate).getFullYear()))].sort((a, b) => a - b);

    // ── Compute stats from scheduleData
    const stats = React.useMemo(() => {
        if (!scheduleData?.schedules) return null;
        const counts = { HC: 0, C1: 0, C2: 0, C3: 0, OFF: 0 };
        scheduleData.schedules.forEach(s => {
            const code = normalizeShiftCode(s.shiftCode);
            if (code in counts) counts[code]++;
            // other codes count as work days too
        });
        const totalWork = counts.HC + counts.C1 + counts.C2 + counts.C3;
        return { ...counts, totalWork };
    }, [scheduleData]);

    if (loading && !scheduleData) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw size={40} className="text-violet-500 animate-spin" />
            <p className="text-slate-400 font-bold text-sm">Đang tải lịch trình của bạn...</p>
        </div>
    );

    const selectedCode = selectedDay ? normalizeShiftCode(selectedDay.shiftCode) : null;
    const selectedMeta = selectedCode ? getMeta(selectedCode) : null;

    return (
        <div className="flex flex-col gap-6 animate-fade-up">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-100">
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Lịch trình làm việc</h3>
                        {scheduleData && (
                            <p className="text-xs text-slate-400 font-medium">
                                {scheduleData.fullName} &middot; {scheduleData.departmentName} &middot; {scheduleData.positionName}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        className="input !py-1.5 !text-xs font-bold w-28"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <select
                        className="input !py-1.5 !text-xs font-bold w-44"
                        value={selectedPeriod || ''}
                        onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    >
                        {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).map(p => (
                            <option key={p.id} value={p.id}>{p.periodName}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ── Statistics KPI Row ── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { code: 'C1', label: 'Ca 1 (Sáng)',  icon: Sun,    val: stats.C1,       bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
                        { code: 'C2', label: 'Ca 2 (Chiều)', icon: Sunset, val: stats.C2,       bg: 'bg-amber-50',   text: 'text-amber-600',   iconBg: 'bg-amber-100' },
                        { code: 'C3', label: 'Ca 3 (Đêm)',   icon: Moon,   val: stats.C3,       bg: 'bg-slate-50',   text: 'text-slate-700',   iconBg: 'bg-slate-200' },
                        { code: 'HC', label: 'Hành chính',   icon: Coffee, val: stats.HC,       bg: 'bg-violet-50',  text: 'text-violet-600',  iconBg: 'bg-violet-100' },
                        { code: 'OFF',label: 'Ngày nghỉ',    icon: null,   val: stats.OFF,      bg: 'bg-rose-50',    text: 'text-rose-500',    iconBg: 'bg-rose-100' },
                    ].map(item => {
                        const Icon = item.icon;
                        return (
                            <div key={item.code} className={`${item.bg} rounded-2xl p-4 flex items-center gap-3 border border-white shadow-sm`}>
                                {Icon && (
                                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.text} flex items-center justify-center flex-shrink-0`}>
                                        <Icon size={16} />
                                    </div>
                                )}
                                {!Icon && (
                                    <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-400 flex items-center justify-center flex-shrink-0 text-[10px] font-black">OFF</div>
                                )}
                                <div>
                                    <p className={`text-2xl font-black ${item.text} leading-none`}>{item.val}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{item.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Calendar + Side Panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Calendar Grid */}
                <div className="lg:col-span-8 card !p-0 overflow-hidden">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                            <div key={day} className="py-3 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar cells */}
                    <div className="grid grid-cols-7 bg-slate-50/20">
                        {scheduleData && (() => {
                            const cells = [];
                            const paddingLen = new Date(scheduleData.schedules[0].date).getDay();
                            for (let i = 0; i < paddingLen; i++) {
                                cells.push(<div key={`pad-${i}`} className="h-24 border-r border-b border-slate-50 last:border-r-0" />);
                            }

                            scheduleData.schedules.forEach((day, idx) => {
                                const isTodayDate = isToday(day.date);
                                const isSelected = selectedDay?.date === day.date;
                                const normCode = normalizeShiftCode(day.shiftCode);
                                const meta = getMeta(normCode);

                                cells.push(
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedDay(day)}
                                        className={`h-24 border-r border-b border-slate-100 last:border-r-0 p-2 transition-all cursor-pointer group relative ${isTodayDate ? 'bg-violet-50/40' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-violet-500 z-10' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-xs font-bold ${isTodayDate ? 'text-violet-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {new Date(day.date).getDate()}
                                            </span>
                                            {isTodayDate && <div className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                                        </div>
                                        <div className="flex flex-col items-center justify-center mt-1">
                                            {normCode !== 'OFF' ? (
                                                <div className={`px-2 py-1 rounded-md border text-[10px] font-black w-full text-center transition-transform group-hover:scale-105 ${meta.cls}`}>
                                                    {normCode}
                                                </div>
                                            ) : (
                                                <div className="text-[9px] font-bold text-rose-300 uppercase tracking-wide mt-1">nghỉ</div>
                                            )}
                                            {day.isOvertime && (
                                                <div className="px-1 py-0.5 mt-1 rounded bg-rose-500 text-white text-[8px] font-black uppercase">OT</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });

                            const remaining = (7 - (cells.length % 7)) % 7;
                            for (let i = 0; i < remaining; i++) {
                                cells.push(<div key={`pad-end-${i}`} className="h-24 border-r border-b border-slate-50 last:border-r-0" />);
                            }
                            return cells;
                        })()}
                    </div>
                </div>

                {/* Info Side Panel */}
                <div className="lg:col-span-4 flex flex-col gap-4">

                    {/* Day detail card */}
                    {selectedDay ? (
                        <div className="card bg-indigo-600 text-white shadow-xl border-none">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-5 flex items-center gap-2">
                                <Info size={14} />
                                Chi tiết ngày {new Date(selectedDay.date).getDate()} Th{new Date(selectedDay.date).getMonth() + 1}
                            </h4>

                            <div className="flex items-center gap-4 mb-5">
                                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border-2 border-white/20 ${selectedCode === 'OFF' ? 'bg-white/10' : 'bg-white/20 backdrop-blur-md'}`}>
                                    <span className="text-[9px] uppercase text-indigo-200 leading-none mb-0.5">CA</span>
                                    <span className="text-xl leading-none">{selectedCode}</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-bold leading-tight">
                                        {selectedMeta?.label || selectedCode}
                                    </h3>
                                    <p className="text-xs text-indigo-200 font-medium mt-0.5">
                                        {selectedDay.shiftName || selectedMeta?.sub || 'Không có lịch trình'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-3">
                                    <Clock size={16} className="text-indigo-300 flex-shrink-0" />
                                    <div>
                                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">Thời gian</span>
                                        <span className="text-sm font-bold">
                                            {selectedDay.startTime
                                                ? `${selectedDay.startTime.substring(0, 5)} – ${selectedDay.endTime?.substring(0, 5)}`
                                                : (selectedMeta?.sub || '--:--')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin size={16} className="text-indigo-300 flex-shrink-0" />
                                    <div>
                                        <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider block">Địa điểm</span>
                                        <span className="text-sm font-bold">{scheduleData?.departmentName || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card bg-slate-50 border-dashed border-2 flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                            <AlertCircle size={28} className="opacity-20" />
                            <p className="text-sm font-bold">Chọn một ngày để xem chi tiết</p>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="card">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Chú thích mã ca</h4>
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { code: 'HC', label: 'Hành chính', cls: 'bg-violet-100 text-violet-700' },
                                { code: 'C1', label: 'Ca 1 – Sáng', cls: 'bg-emerald-100 text-emerald-700' },
                                { code: 'C2', label: 'Ca 2 – Chiều', cls: 'bg-amber-100 text-amber-700' },
                                { code: 'C3', label: 'Ca 3 – Đêm',  cls: 'bg-slate-800 text-white' },
                            ].map(item => (
                                <div key={item.code} className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${item.cls}`}>
                                        {item.code}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600 leading-tight">{item.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-dashed border-rose-200 flex items-center justify-center text-[9px] font-black text-rose-400 flex-shrink-0">OFF</div>
                            <span className="text-[11px] font-bold text-slate-400">Ngày nghỉ / Chủ nhật</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
