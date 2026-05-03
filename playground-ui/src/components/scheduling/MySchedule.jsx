import React, { useState, useEffect } from 'react';
import { schedulingService } from '../../api';
import { 
    Calendar, Info, Clock, MapPin, RefreshCw, AlertCircle, 
    Sun, Sunset, Moon, Coffee, Download, ChevronLeft, 
    ChevronRight, CalendarDays, CalendarCheck
} from 'lucide-react';

const normalizeShiftCode = (raw) => {
    if (!raw) return 'OFF';
    const map = {
        S1: 'C1', C1_old: 'C2', D1: 'C3',
        '1': 'C1', '2': 'C2', '3': 'C3',
        'Ca 1': 'C1', 'Ca 2': 'C2', 'Ca 3': 'C3',
        'Ca Sáng': 'C1', 'Ca Chiều': 'C2', 'Ca Đêm': 'C3',
    };
    return map[raw] ?? raw;
};

const SHIFT_META = {
    HC:  { label: 'Hành chính',   sub: '8:00 - 17:00',  icon: Coffee, cls: 'bg-violet-100 text-violet-700 border-violet-200',  dot: 'bg-violet-500', color: 'violet' },
    C1:  { label: 'Ca 1 (Sáng)',  sub: '6:00 - 14:00',  icon: Sun,    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', color: 'emerald' },
    C2:  { label: 'Ca 2 (Chiều)', sub: '14:00 - 22:00', icon: Sunset, cls: 'bg-amber-100 text-amber-700 border-amber-200',      dot: 'bg-amber-500',   color: 'amber' },
    C3:  { label: 'Ca 3 (Đêm)',   sub: '22:00 - 06:00', icon: Moon,   cls: 'bg-slate-800 text-white border-slate-700',          dot: 'bg-slate-700',   color: 'slate' },
    OFF: { label: 'Ngày nghỉ',    sub: '',               icon: null,   cls: 'bg-rose-50 text-rose-400 border-rose-100 border-dashed', dot: 'bg-rose-300', color: 'rose' },
};

const getMeta = (code) => SHIFT_META[code] ?? {
    label: code, sub: '', icon: null,
    cls: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400', color: 'slate'
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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
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
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchInitialData(); }, []);
    useEffect(() => { if (selectedPeriod) loadSchedule(); }, [selectedPeriod]);

    const years = [...new Set(periods.map(p => new Date(p.startDate).getFullYear()))].sort((a, b) => a - b);

    const stats = React.useMemo(() => {
        if (!scheduleData?.schedules) return null;
        const counts = { HC: 0, C1: 0, C2: 0, C3: 0, OFF: 0 };
        scheduleData.schedules.forEach(s => {
            const code = normalizeShiftCode(s.shiftCode);
            if (code in counts) counts[code]++;
        });
        const totalWork = counts.HC + counts.C1 + counts.C2 + counts.C3;
        return { ...counts, totalWork };
    }, [scheduleData]);

    const selectedCode = selectedDay ? normalizeShiftCode(selectedDay.shiftCode) : null;
    const selectedMeta = selectedCode ? getMeta(selectedCode) : null;

    return (
        <div className="p-6 animate-fade-up">
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <CalendarCheck className="text-violet-600" size={28} />
                        Lịch công tác cá nhân
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Theo dõi lịch trình làm việc và phân ca hàng tháng</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm uppercase font-bold tracking-wider">Hệ thống phân ca</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        className="input !py-2 !text-xs font-bold w-32 shadow-sm appearance-none bg-white cursor-pointer"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                    >
                        {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <select
                        className="input !py-2 !text-xs font-bold w-56 shadow-sm appearance-none bg-white cursor-pointer"
                        value={selectedPeriod || ''}
                        onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                    >
                        {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).map(p => (
                            <option key={p.id} value={p.id}>{p.periodName}</option>
                        ))}
                    </select>
                    <button onClick={loadSchedule} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    <button className="btn btn-ghost shadow-sm">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* ── KPI Cards for Shift Stats ── */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    {[
                        { code: 'C1', label: 'Ca 1 (Sáng)',  icon: Sun,    val: stats.C1, color: 'emerald' },
                        { code: 'C2', label: 'Ca 2 (Chiều)', icon: Sunset, val: stats.C2, color: 'amber' },
                        { code: 'C3', label: 'Ca 3 (Đêm)',   icon: Moon,   val: stats.C3, color: 'slate' },
                        { code: 'HC', label: 'Hành chính',   icon: Coffee, val: stats.HC, color: 'violet' },
                        { code: 'OFF',label: 'Ngày nghỉ',    icon: CalendarDays, val: stats.OFF, color: 'rose' },
                    ].map(item => (
                        <div key={item.code} className={`card !p-4 flex items-center gap-3 border-l-4 border-l-${item.color}-500 shadow-sm`}>
                            <div className={`w-9 h-9 rounded-xl bg-${item.color}-50 text-${item.color}-600 flex items-center justify-center shrink-0`}>
                                <item.icon size={16} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{item.label}</p>
                                <p className="text-xl font-black text-slate-800 leading-none">{item.val}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── Calendar Grid ── */}
                <div className="lg:col-span-8 card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                    <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                            <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {scheduleData && (() => {
                            const cells = [];
                            const firstDay = new Date(scheduleData.schedules[0].date);
                            const paddingLen = firstDay.getDay();
                            for (let i = 0; i < paddingLen; i++) {
                                cells.push(<div key={`pad-${i}`} className="h-28 border-r border-b border-slate-50 last:border-r-0 bg-slate-50/20" />);
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
                                        className={`h-28 border-r border-b border-slate-100 last:border-r-0 p-3 transition-all cursor-pointer group relative ${isTodayDate ? 'bg-indigo-50/30' : 'bg-white'} ${isSelected ? 'ring-2 ring-inset ring-indigo-500 z-10' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-xs font-black ${isTodayDate ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                                {new Date(day.date).getDate()}
                                            </span>
                                            {isTodayDate && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200" />}
                                        </div>
                                        <div className="flex flex-col items-center gap-1.5">
                                            {normCode !== 'OFF' ? (
                                                <div className={`px-2 py-1 rounded-lg border text-[10px] font-black w-full text-center shadow-sm transition-transform group-hover:scale-105 ${meta.cls}`}>
                                                    {normCode}
                                                </div>
                                            ) : (
                                                <div className="text-[9px] font-black text-rose-300 uppercase tracking-widest mt-2 border border-rose-100 border-dashed px-2 py-0.5 rounded">NGHỈ</div>
                                            )}
                                            {day.otHours > 0 && (
                                                <div className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black uppercase shadow-sm">
                                                    +{day.otHours}H OT
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            });

                            const remaining = (7 - (cells.length % 7)) % 7;
                            for (let i = 0; i < remaining; i++) {
                                cells.push(<div key={`pad-end-${i}`} className="h-28 border-r border-b border-slate-50 last:border-r-0 bg-slate-50/20" />);
                            }
                            return cells;
                        })()}
                    </div>
                </div>

                {/* ── Side Detail Panel ── */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {selectedDay ? (
                        <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-lg bg-white">
                            <div className="p-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                                    <Info size={14} className="text-indigo-500" />
                                    Chi tiết ngày {new Date(selectedDay.date).toLocaleDateString('vi-VN')}
                                </h4>

                                <div className="flex items-center gap-5 mb-8">
                                    <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-black border-2 ${selectedMeta?.cls || 'bg-slate-100 text-slate-600 border-slate-200'} shadow-sm`}>
                                        <span className="text-[9px] uppercase opacity-70 leading-none mb-1 font-bold">MÃ CA</span>
                                        <span className="text-2xl leading-none">{selectedCode}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black text-slate-800 leading-tight truncate">
                                            {selectedMeta?.label || selectedCode}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-bold mt-1">
                                            {selectedDay.shiftName || selectedMeta?.sub || 'Hệ thống tự động'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100">
                                            <Clock size={18} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thời gian ca</p>
                                            <p className="text-sm font-black text-slate-700">
                                                {selectedDay.startTime
                                                    ? `${selectedDay.startTime.substring(0, 5)} – ${selectedDay.endTime?.substring(0, 5)}`
                                                    : (selectedMeta?.sub || '--:--')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 border border-slate-100">
                                            <MapPin size={18} className="text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Bộ phận / Vị trí</p>
                                            <p className="text-sm font-black text-slate-700 truncate">{scheduleData?.departmentName || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 text-center border-t border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-2">
                                    <CalendarDays size={12} /> Lịch trình chính thức
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="card bg-slate-50 border-dashed border-2 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                            <AlertCircle size={32} className="opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest">Chọn một ngày để xem</p>
                        </div>
                    )}

                    <div className="card !p-5 border-slate-200/60 shadow-sm bg-slate-50/50">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Chú thích các mã ca</h4>
                        <div className="space-y-3">
                            {[
                                { code: 'HC', label: 'Hành chính (8:00 - 17:00)', color: 'violet' },
                                { code: 'C1', label: 'Ca Sáng (6:00 - 14:00)', color: 'emerald' },
                                { code: 'C2', label: 'Ca Chiều (14:00 - 22:00)', color: 'amber' },
                                { code: 'C3', label: 'Ca Đêm (22:00 - 6:00)', color: 'slate' },
                            ].map(item => (
                                <div key={item.code} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${SHIFT_META[item.code].cls}`}>
                                        {item.code}
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-600">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
