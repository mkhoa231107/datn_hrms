import React, { useState, useEffect } from 'react';
import attendanceService from '../../services/attendanceService';
import api from '../../api';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Filter, Download, Info, Timer } from 'lucide-react';

function fmtDuration(minutes) {
    if (!minutes || minutes <= 0) return "";
    if (minutes < 60) return `${minutes}p`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

function getStatusInfo(ci, co, shiftStart, shiftEnd) {
    if (!ci) return { label: 'Chưa vào ca', cls: 'badge-danger', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    if (!co) return { label: 'Quên check-out', cls: 'badge-warning', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    
    const dCi = new Date(ci);
    const dCo = new Date(co);

    const baseStart = new Date(dCi);
    const [hS, mS] = (shiftStart || "08:00:00").split(':').map(Number);
    baseStart.setHours(hS, mS, 0, 0);

    const baseEnd = new Date(dCi);
    const [hE, mE] = (shiftEnd || "17:00:00").split(':').map(Number);
    baseEnd.setHours(hE, mE, 0, 0);
    
    if (baseEnd <= baseStart) baseEnd.setDate(baseEnd.getDate() + 1);

    const isLate  = dCi > baseStart;
    const isEarly = dCo < baseEnd;

    const lateMin  = isLate  ? Math.floor((dCi - baseStart) / 60000) : 0;
    const earlyMin = isEarly ? Math.floor((baseEnd - dCo) / 60000) : 0;
    
    let label = 'Đúng giờ';
    let cls = 'badge-success';
    
    if (isLate && isEarly) {
        label = `Trễ & Sớm`;
        cls = 'badge-danger';
    } else if (isLate) {
        label = `Muộn ${fmtDuration(lateMin)}`;
        cls = 'badge-danger';
    } else if (isEarly) {
        label = `Về sớm ${fmtDuration(earlyMin)}`;
        cls = 'badge-warning';
    }
    
    return { label, cls, isLate, isEarly, lateMin, earlyMin };
}

function getMonthOptions() {
    const opts = [], now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        opts.push({
            val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
            label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`
        });
    }
    return opts;
}

function fmtTime(ts) {
    if (!ts) return null;
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

const VN_DAYS = ['CN','T2','T3','T4','T5','T6','T7'];
const ROWS_PER_PAGE = 10;

export default function Attendance() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [activeTab, setActiveTab] = useState('summary');
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [history, setHistory] = useState([]);
    const [todayRecords, setTodayRecords] = useState([]);
    const [user, setUser] = useState(null);
    const [clock, setClock] = useState(new Date());
    const [page, setPage] = useState(1);
    const [overtime, setOvertime] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
        loadToday();
        const t = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => { loadHistory(selectedMonth); }, [selectedMonth]);

    const loadToday = async () => {
        const d = new Date().toISOString().split('T')[0];
        try {
            const r = await attendanceService.getMyRecords(d, d);
            if (r.success) setTodayRecords(r.data);
        } catch {}
    };

    const loadHistory = async (m) => {
        setLoading(true);
        try {
            const [yr, mo] = m.split('-').map(Number);
            const from = `${yr}-${String(mo).padStart(2,'0')}-01`;
            const last = new Date(yr, mo, 0).getDate();
            const to   = `${yr}-${String(mo).padStart(2,'0')}-${last}`;
            
            const r = await attendanceService.getMyRecords(from, to);
            if (r?.success) setHistory(r.data || []); else setHistory([]);

            const otR = await attendanceService.getMyOvertime();
            if (otR?.success) {
                const filteredOt = (otR.data || []).filter(it => {
                    const d = new Date(it.date);
                    return d.getFullYear() === yr && (d.getMonth() + 1) === mo;
                });
                setOvertime(filteredOt);
            } else {
                setOvertime([]);
            }
        } catch { 
            setHistory([]); 
            setOvertime([]); 
        } finally {
            setLoading(false);
        }
    };

    const grouped = history.reduce((acc, r) => {
        const d = (r.date || '').split('T')[0];
        if (!acc[d]) acc[d] = { checkIns: [], checkOuts: [] };
        if (r.type === 'CheckIn') acc[d].checkIns.push(r);
        if (r.type === 'CheckOut') acc[d].checkOuts.push(r);
        return acc;
    }, {});

    const allRows = Object.entries(grouped)
        .sort(([a],[b]) => b.localeCompare(a))
        .map(([date, rec]) => {
            rec.checkIns.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
            rec.checkOuts.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

            const ci = rec.checkIns[0];
            const co = rec.checkOuts[rec.checkOuts.length - 1];

            const sStart = ci?.shiftStartTime || co?.shiftStartTime || "08:00:00";
            const sEnd   = ci?.shiftEndTime   || co?.shiftEndTime   || "17:00:00";

            return {
                date, rec, ci, co,
                st: getStatusInfo(ci?.timestamp, co?.timestamp, sStart, sEnd)
            };
        });

    const totalPages = Math.max(1, Math.ceil(allRows.length / ROWS_PER_PAGE));
    const pageRows = allRows.slice((page-1)*ROWS_PER_PAGE, page*ROWS_PER_PAGE);

    // KPI Calculations
    const lateDays = allRows.filter(r => r.st.isLate).length;
    const absentDays = allRows.filter(r => !r.ci && !r.co).length; // Simplified
    const totalHours = allRows.reduce((acc, r) => {
        if (r.ci && r.co) {
            const h = (new Date(r.co.timestamp) - new Date(r.ci.timestamp)) / 3600000;
            return acc + Math.min(8, h);
        }
        return acc;
    }, 0);

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card flex items-center gap-4 bg-indigo-50">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                        <Timer size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Tổng giờ tháng này</p>
                        <h3 className="text-2xl font-extrabold text-indigo-900">{totalHours.toFixed(1)}h</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 bg-amber-50">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-100">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Số ngày đi trễ</p>
                        <h3 className="text-2xl font-extrabold text-amber-900">{lateDays} ngày</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 bg-rose-50">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-100">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Số ngày vắng</p>
                        <h3 className="text-2xl font-extrabold text-rose-900">{absentDays} ngày</h3>
                    </div>
                </div>
            </div>

            {/* History Table Card */}
            <div className="card !p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Lịch sử chấm công</h3>
                        <p className="text-xs text-slate-400 font-medium">Chi tiết giờ vào/ra và trạng thái đi làm</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <select
                                className="input !py-1.5 !pl-9 !pr-4 text-xs font-bold appearance-none bg-white cursor-pointer"
                                value={selectedMonth}
                                onChange={e => { setSelectedMonth(e.target.value); setPage(1); }}
                            >
                                {getMonthOptions().map(o => (
                                    <option key={o.val} value={o.val}>{o.label}</option>
                                ))}
                            </select>
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <button className="btn btn-ghost !p-2" title="Tải xuống">
                            <Download size={16} />
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày</th>
                                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ca làm việc</th>
                                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Giờ vào</th>
                                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Giờ ra</th>
                                <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Trạng thái</th>
                                <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={6} className="px-6 py-4">
                                            <div className="h-4 skeleton w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : pageRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info size={40} className="text-slate-200" />
                                            <p className="text-slate-400 font-medium text-sm">Không có dữ liệu trong tháng này</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : pageRows.map((row, idx) => {
                                const dObj = new Date(row.date);
                                const isWeekend = dObj.getDay() === 0;
                                const isToday = dObj.toDateString() === new Date().toDateString();
                                
                                return (
                                    <tr key={row.date} className={`hover:bg-slate-50/80 transition-colors ${isToday ? 'bg-indigo-50/30' : ''}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${isWeekend ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                                                    <span>{VN_DAYS[dObj.getDay()]}</span>
                                                    <span className="text-[10px] opacity-70">{dObj.getDate()}</span>
                                                </div>
                                                <div className="text-sm font-semibold text-slate-700">
                                                    {dObj.toLocaleDateString('vi-VN')}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                            {row.ci?.shiftName || row.co?.shiftName || 'Hành chính'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.ci ? (
                                                <span className="text-sm font-bold text-slate-700">{fmtTime(row.ci.timestamp)}</span>
                                            ) : (
                                                <span className="text-slate-300">--:--</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {row.co ? (
                                                <span className="text-sm font-bold text-slate-700">{fmtTime(row.co.timestamp)}</span>
                                            ) : (
                                                <span className="text-slate-300">--:--</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`badge ${row.st.cls} text-[10px]`}>
                                                {row.st.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-slate-400 italic">
                                            {row.ci?.note || row.co?.note || '---'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {pageRows.length} trên {allRows.length} kết quả
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setPage(p)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === p ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <button 
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
