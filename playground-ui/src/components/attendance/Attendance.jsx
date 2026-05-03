import React, { useState, useEffect } from 'react';
import attendanceService from '../../services/attendanceService';
import api from '../../api';
import { 
    Calendar, Clock, AlertCircle, CheckCircle2, 
    ChevronLeft, ChevronRight, Filter, Download, 
    Info, Timer, Search, RefreshCw, LogIn, LogOut,
    CalendarDays, UserCheck
} from 'lucide-react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

function fmtDuration(minutes) {
    if (!minutes || minutes <= 0) return "";
    if (minutes < 60) return `${minutes}p`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

function getStatusInfo(ci, co, shiftStart, shiftEnd) {
    if (!ci) return { label: 'Chưa vào ca', cls: 'bg-rose-50 text-rose-600', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    if (!co) return { label: 'Quên check-out', cls: 'bg-amber-50 text-amber-600', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    
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
    let cls = 'bg-emerald-50 text-emerald-600';
    
    if (isLate && isEarly) {
        label = `Trễ & Sớm`;
        cls = 'bg-rose-50 text-rose-600';
    } else if (isLate) {
        label = `Muộn ${fmtDuration(lateMin)}`;
        cls = 'bg-rose-50 text-rose-600';
    } else if (isEarly) {
        label = `Về sớm ${fmtDuration(earlyMin)}`;
        cls = 'bg-amber-50 text-amber-600';
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

    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [history, setHistory] = useState([]);
    const [user, setUser] = useState(null);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
    }, []);

    useEffect(() => { loadHistory(selectedMonth); }, [selectedMonth]);

    const loadHistory = async (m) => {
        setLoading(true);
        try {
            const [yr, mo] = m.split('-').map(Number);
            const from = `${yr}-${String(mo).padStart(2,'0')}-01`;
            const last = new Date(yr, mo, 0).getDate();
            const to   = `${yr}-${String(mo).padStart(2,'0')}-${last}`;
            
            const r = await attendanceService.getMyRecords(from, to);
            if (r?.success) setHistory(r.data || []); else setHistory([]);
        } catch { 
            setHistory([]); 
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
    const earlyDays = allRows.filter(r => r.st.isEarly).length;
    const totalHours = allRows.reduce((acc, r) => {
        if (r.ci && r.co) {
            const h = (new Date(r.co.timestamp) - new Date(r.ci.timestamp)) / 3600000;
            return acc + Math.min(8, h);
        }
        return acc;
    }, 0);

    return (
        <div className="p-6 animate-fade-up" style={{ padding: 'inherit' }}>
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Clock className="text-violet-600" size={28} />
                        Lịch sử chấm công
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Xem chi tiết giờ vào, giờ ra và trạng thái đi làm</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm uppercase font-bold tracking-wider">Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select
                            className="input !py-2 !pl-9 !pr-4 text-xs font-bold appearance-none bg-white cursor-pointer w-48 shadow-sm"
                            value={selectedMonth}
                            onChange={e => { setSelectedMonth(e.target.value); setPage(1); }}
                        >
                            {getMonthOptions().map(o => (
                                <option key={o.val} value={o.val}>{o.label}</option>
                            ))}
                        </select>
                    </div>
                    <button onClick={() => loadHistory(selectedMonth)} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    <button className="btn btn-ghost shadow-sm">
                        <Download size={16} />
                    </button>
                </div>
            </div>

            {/* ── KPI Cards: carousel on mobile, grid on desktop ── */}
            <div className={isMobile ? 'kpi-scroll mb-6' : 'grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'}>
                {[
                    { label: 'Tổng giờ công', value: `${totalHours.toFixed(1)}h`, icon: Timer, color: 'violet', desc: 'Số giờ làm thực tế' },
                    { label: 'Đi muộn', value: `${lateDays} buổi`, icon: AlertCircle, color: 'rose', desc: 'Check-in sau giờ quy định' },
                    { label: 'Về sớm', value: `${earlyDays} buổi`, icon: LogOut, color: 'amber', desc: 'Check-out trước giờ quy định' },
                    { label: 'Ngày công', value: `${allRows.filter(r => r.ci || r.co).length} ngày`, icon: UserCheck, color: 'emerald', desc: 'Số ngày có chấm công' },
                ].map(({ label, value, icon: Icon, color, desc }) => (
                    <div key={label} className={`card !p-4 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm`}>
                        <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                            <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                            <h3 className="text-lg font-black text-slate-800 truncate">{value}</h3>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Attendance Records: cards on mobile, table on tablet+ ── */}
            {isMobile ? (
                // ── Mobile: Card List ──
                <div className="mobile-card-list">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="mcl-item">
                                <div className="h-4 skeleton w-3/4 rounded" />
                                <div className="h-3 skeleton w-1/2 rounded" />
                            </div>
                        ))
                    ) : allRows.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Info size={36} style={{ color: 'var(--border-strong)', margin: '0 auto 8px' }} />
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>Không có dữ liệu trong tháng này</p>
                        </div>
                    ) : allRows.map((row) => {
                        const dObj = new Date(row.date);
                        const isWeekend = dObj.getDay() === 0;
                        const isToday = dObj.toDateString() === new Date().toDateString();
                        return (
                            <div key={row.date} className="mcl-item" style={{
                                borderLeft: isToday ? '3px solid var(--accent)' : isWeekend ? '3px solid #f43f5e' : '1px solid var(--border)',
                            }}>
                                <div className="mcl-row">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '8px',
                                            background: isWeekend ? '#fff1f2' : 'var(--bg-elevated)',
                                            color: isWeekend ? '#f43f5e' : 'var(--text-secondary)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '11px', fontWeight: 800, flexShrink: 0,
                                        }}>
                                            <span>{VN_DAYS[dObj.getDay()]}</span>
                                            <span style={{ fontSize: '13px' }}>{dObj.getDate()}</span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 700 }}>{dObj.toLocaleDateString('vi-VN')}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{row.ci?.shiftName || 'Hành chính'}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${row.st.cls}`}>
                                        {row.st.label}
                                    </span>
                                </div>
                                <div className="mcl-row" style={{ paddingTop: '6px', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <LogIn size={12} style={{ color: '#10b981' }} />
                                        <span className="mcl-label">Vào:</span>
                                        <span className="mcl-value" style={{ color: '#10b981' }}>{row.ci ? fmtTime(row.ci.timestamp) : '--:--'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <LogOut size={12} style={{ color: '#f59e0b' }} />
                                        <span className="mcl-label">Ra:</span>
                                        <span className="mcl-value" style={{ color: '#f59e0b' }}>{row.co ? fmtTime(row.co.timestamp) : '--:--'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Mobile pagination */}
                    {allRows.length > ROWS_PER_PAGE && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                            <button disabled={page===1} onClick={()=>setPage(p=>p-1)}
                                style={{ minWidth: '44px', minHeight: '44px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>Trang {page}/{totalPages}</span>
                            <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}
                                style={{ minWidth: '44px', minHeight: '44px', borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                // ── Desktop / Tablet: Table ──
                <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                    <div className="table-mobile-scroll">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Ngày</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ca làm việc</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Giờ vào</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Giờ ra</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}><td colSpan={6} className="px-6 py-6"><div className="h-4 skeleton w-full rounded" /></td></tr>
                                    ))
                                ) : pageRows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Info size={40} className="text-slate-200" />
                                            <p className="text-slate-400 font-bold text-sm">Không có dữ liệu trong tháng này</p>
                                        </div>
                                    </td></tr>
                                ) : pageRows.map((row) => {
                                    const dObj = new Date(row.date);
                                    const isWeekend = dObj.getDay() === 0;
                                    const isToday = dObj.toDateString() === new Date().toDateString();
                                    return (
                                        <tr key={row.date} className={`hover:bg-slate-50/50 transition-colors ${isToday ? 'bg-violet-50/30' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-xs ${isWeekend ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span>{VN_DAYS[dObj.getDay()]}</span>
                                                        <span className="text-[10px] opacity-70">{dObj.getDate()}</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-slate-700">{dObj.toLocaleDateString('vi-VN')}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-slate-600">{row.ci?.shiftName || row.co?.shiftName || 'Hành chính'}</span>
                                                <p className="text-[10px] text-slate-400 font-medium">8:00 - 17:00</p>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {row.ci ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black text-slate-700">{fmtTime(row.ci.timestamp)}</span>
                                                        <div className="flex items-center gap-1 text-[8px] font-bold text-emerald-500 uppercase"><LogIn size={8} /> In</div>
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">--:--</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {row.co ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-sm font-black text-slate-700">{fmtTime(row.co.timestamp)}</span>
                                                        <div className="flex items-center gap-1 text-[8px] font-bold text-amber-500 uppercase"><LogOut size={8} /> Out</div>
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">--:--</span>}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${row.st.cls}`}>{row.st.label}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-xs text-slate-400 italic font-medium">{row.ci?.note || row.co?.note || '---'}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <p className="text-xs font-medium text-slate-400">Hiển thị {pageRows.length} trên {allRows.length} ngày</p>
                        <div className="flex items-center gap-2">
                            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={16} /></button>
                            <div className="flex items-center gap-1">
                                {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(p=>(
                                    <button key={p} onClick={()=>setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page===p?'bg-violet-600 text-white shadow-lg shadow-violet-200':'text-slate-400 hover:bg-white'}`}>{p}</button>
                                ))}
                            </div>
                            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Note */}
            <div className="mt-6 card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
                    <Info size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 leading-tight">
                    Dữ liệu chấm công được đồng bộ từ máy chấm công vân tay và nhận diện khuôn mặt. Nếu có sai sót về giờ giấc hoặc thiếu công, vui lòng liên hệ <strong>Trưởng phòng</strong> hoặc gửi đơn <strong>Điều chỉnh công</strong> trước ngày cuối cùng của tháng.
                </span>
            </div>
        </div>
    );
}
