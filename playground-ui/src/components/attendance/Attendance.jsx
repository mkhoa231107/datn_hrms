import React, { useState, useEffect, useRef, useCallback } from 'react';
import attendanceService from '../../services/attendanceService';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import api from '../../api';
import './Attendance.css';
import { Camera, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   FACE MODAL (logic unchanged — uses Tailwind overlay)
───────────────────────────────────────────────────────────── */
const FaceModal = ({ actionType, currentEmployeeId, onSuccess, onCancel }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const timerRef = useRef(null);
    const [status, setStatus] = useState('loading');
    const [text, setText] = useState('Đang khởi động...');
    const [faces, setFaces] = useState([]);
    const { loadModels, startWebcam, stopWebcam, detectAndDraw, detectDescriptor, verifyFace } = useFaceRecognition();
    const cleanup = useCallback(() => { clearInterval(timerRef.current); stopWebcam(); }, [stopWebcam]);

    useEffect(() => {
        let dead = false;
        (async () => {
            try {
                await loadModels();
                const r = await api.get('/employees/face-descriptors');
                if (dead) return;
                setFaces(r.data || []);
                await startWebcam(videoRef);
                setStatus('ready');
                setText('Nhìn thẳng vào camera rồi nhấn Xác nhận');
                timerRef.current = setInterval(() => detectAndDraw(videoRef, canvasRef), 150);
            } catch (e) {
                if (!dead) { setStatus('error'); setText('Lỗi camera: ' + e.message); }
            }
        })();
        return () => { dead = true; cleanup(); };
    }, []);

    const verify = async () => {
        setStatus('detecting'); setText('Đang nhận diện...');
        try {
            const desc = await detectDescriptor(videoRef);
            if (!desc) {
                setStatus('error'); setText('Không tìm thấy khuôn mặt');
                setTimeout(() => { setStatus('ready'); setText('Nhìn thẳng vào camera rồi nhấn Xác nhận'); }, 2000);
                return;
            }
            const mine = faces.find(f => String(f.employeeId) === String(currentEmployeeId));
            if (!mine?.descriptor) {
                setStatus('error'); setText('Chưa đăng ký khuôn mặt — liên hệ nhân sự');
                setTimeout(() => { setStatus('ready'); setText('Nhìn thẳng vào camera rồi nhấn Xác nhận'); }, 3000);
                return;
            }
            if (verifyFace(desc, mine.descriptor, 0.45)) {
                setStatus('matched'); setText('Xác minh thành công!');
                cleanup(); setTimeout(onSuccess, 700);
            } else {
                setStatus('error'); setText('Khuôn mặt không khớp');
                setTimeout(() => { setStatus('ready'); setText('Nhìn thẳng vào camera rồi nhấn Xác nhận'); }, 2500);
            }
        } catch (e) { setStatus('error'); setText(e.message); }
    };

    const isIn = actionType === 'CheckIn';
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl text-white ${isIn ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                            <Camera className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{isIn ? 'Xác Nhận Vào Ca' : 'Xác Nhận Ra Ca'}</h3>
                            <p className="text-xs text-slate-500">AI Face Recognition</p>
                        </div>
                    </div>
                    <button onClick={() => { cleanup(); onCancel(); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="relative w-full aspect-square bg-slate-900 overflow-hidden">
                    <video ref={videoRef} muted playsInline className={`w-full h-full object-cover transition-opacity duration-500 ${status === 'loading' ? 'opacity-0' : 'opacity-100'}`} />
                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-3">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                            <p className="text-sm font-medium animate-pulse">Đang khởi tạo Camera AI...</p>
                        </div>
                    )}
                    <div className="absolute bottom-4 left-4 right-4">
                        <div className={`p-3 rounded-xl backdrop-blur-md border text-sm font-bold flex items-center justify-center gap-2 ${
                            status === 'error'   ? 'bg-rose-500/90 border-rose-400 text-white' :
                            status === 'matched' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                            'bg-slate-900/70 border-slate-700 text-white'
                        }`}>
                            {status === 'error'     && <AlertCircle className="w-4 h-4" />}
                            {status === 'matched'   && <CheckCircle2 className="w-4 h-4" />}
                            {status === 'detecting' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {text}
                        </div>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                    <button onClick={() => { cleanup(); onCancel(); }}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-100">
                        Hủy
                    </button>
                    <button onClick={verify} disabled={status !== 'ready'}
                        className={`flex-[2] py-3 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${isIn ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                        {status === 'detecting' ? 'Đang Quét AI...' : 'Xác Nhận Khuôn Mặt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function getStatusInfo(ci, co, shiftStart, shiftEnd) {
    if (!ci) return { label: 'Chưa vào ca',    cls: 'st-na', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    if (!co) return { label: 'Quên check-out', cls: 'st-miss', isLate: false, isEarly: false, lateMin: 0, earlyMin: 0 };
    
    const dCi = new Date(ci);
    const dCo = new Date(co);

    // Tạo mốc so sánh chính xác dựa trên ngày của check-in
    const baseStart = new Date(dCi);
    const [hS, mS] = (shiftStart || "08:00:00").split(':').map(Number);
    baseStart.setHours(hS, mS, 0, 0);

    const baseEnd = new Date(dCi);
    const [hE, mE] = (shiftEnd || "17:00:00").split(':').map(Number);
    baseEnd.setHours(hE, mE, 0, 0);
    
    // Xử lý ca xuyên đêm
    if (baseEnd <= baseStart) baseEnd.setDate(baseEnd.getDate() + 1);

    // Grace Period: 30p trước / 15p sau
    const graceStart = new Date(baseStart); graceStart.setMinutes(graceStart.getMinutes() - 30);
    const graceEnd   = new Date(baseEnd);   graceEnd.setMinutes(graceEnd.getMinutes() + 15);

    // Logic Late/Early
    const isLate  = dCi > baseStart;
    const isEarly = dCo < baseEnd;

    const lateMin  = isLate  ? Math.floor((dCi - baseStart) / 60000) : 0;
    const earlyMin = isEarly ? Math.floor((baseEnd - dCo) / 60000) : 0;
    
    let label = 'Đúng giờ';
    let cls = 'st-ok';
    
    if (isLate && isEarly) {
        label = 'Trễ & Sớm';
        cls = 'st-late';
    } else if (isLate) {
        label = `Muộn ${lateMin}p`;
        cls = 'st-late';
    } else if (isEarly) {
        label = `Sớm ${earlyMin}p`;
        cls = 'st-early';
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

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function Attendance() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [activeTab,     setActiveTab]     = useState('chamcong');   // 'chamcong' | 'lichsu'
    const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
    const [chipFilter,    setChipFilter]    = useState('all');         // chip filter
    const [subtabFilter,  setSubtabFilter]  = useState('all');         // history sub-tabs
    const [history,       setHistory]       = useState([]);
    const [todayRecords,  setTodayRecords]  = useState([]);
    const [modal,         setModal]         = useState(null);
    const [user,          setUser]          = useState(null);
    const [clock,         setClock]         = useState(new Date());
    const [loading,       setLoading]       = useState(false);
    const [flash,         setFlash]         = useState(null);
    const [page,          setPage]          = useState(1);
    const [overtime,      setOvertime]      = useState([]); // { date, startTime, endTime, status }

    useEffect(() => {
        api.get('/auth/me').then(r => setUser(r.data)).catch(() => {});
        loadToday();
        const t = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => { loadHistory(selectedMonth); }, [selectedMonth]);

    // Sync chip & subtab
    const handleSubtab = (val) => { setSubtabFilter(val); setChipFilter(val); setPage(1); };
    const handleChip   = (val) => { setChipFilter(val); setSubtabFilter(val); setPage(1); };

    const loadToday = async () => {
        const d = new Date().toISOString().split('T')[0];
        try {
            const r = await attendanceService.getMyRecords(d, d);
            if (r.success) setTodayRecords(r.data);
        } catch {}
    };

    const loadHistory = async (m) => {
        try {
            const [yr, mo] = m.split('-').map(Number);
            const from = `${yr}-${String(mo).padStart(2,'0')}-01`;
            const last = new Date(yr, mo, 0).getDate();
            const to   = `${yr}-${String(mo).padStart(2,'0')}-${last}`;
            
            const r = await attendanceService.getMyRecords(from, to);
            if (r?.success) setHistory(r.data); else setHistory([]);

            // Fetch OT for the month
            const otR = await attendanceService.getMyOvertime();
            if (otR?.success) {
                const filteredOt = otR.data.filter(it => {
                    const d = new Date(it.date);
                    return d.getFullYear() === yr && (d.getMonth() + 1) === mo;
                });
                setOvertime(filteredOt);
            } else {
                setOvertime([]);
            }
        } catch { setHistory([]); setOvertime([]); }
    };

    const onVerified = async (type) => {
        setModal(null); setLoading(true); setFlash(null);
        try {
            const r = type === 'CheckIn'
                ? await attendanceService.checkIn()
                : await attendanceService.checkOut();
            if (r.success) {
                setFlash({ ok: true, text: type === 'CheckIn' ? '✓ Vào ca thành công!' : '✓ Ra ca thành công!' });
                loadToday(); loadHistory(selectedMonth);
                setTimeout(() => setFlash(null), 5000);
            } else {
                setFlash({ ok: false, text: r.message || 'Thao tác thất bại' });
            }
        } catch {
            setFlash({ ok: false, text: 'Lỗi hệ thống' });
        } finally { setLoading(false); }
    };

    const ciRec = todayRecords.find(r => r.type === 'CheckIn');
    const coRec = todayRecords.find(r => r.type === 'CheckOut');
    const isCheckedIn  = !!ciRec;
    const isCheckedOut = !!coRec;

    /* Group history into per-day rows */
    const grouped = history.reduce((acc, r) => {
        const d = (r.date || '').split('T')[0];
        if (!acc[d]) acc[d] = { checkIns: [], checkOuts: [] };
        if (r.type === 'CheckIn') acc[d].checkIns.push(r);
        if (r.type === 'CheckOut') acc[d].checkOuts.push(r);
        return acc;
    }, {});

    let maxCi = 1;
    let maxCo = 1;

    let allRows = Object.entries(grouped)
        .sort(([a],[b]) => b.localeCompare(a))
        .map(([date, rec]) => {
            // Sort ascending for chronological order
            rec.checkIns.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
            rec.checkOuts.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));

            maxCi = Math.max(maxCi, rec.checkIns.length);
            maxCo = Math.max(maxCo, rec.checkOuts.length);

            const ci = rec.checkIns[0];
            const co = rec.checkOuts[rec.checkOuts.length - 1];

            // Lấy giờ ca thực tế từ bản ghi
            const sStart = ci?.shiftStartTime || co?.shiftStartTime || "08:00:00";
            const sEnd   = ci?.shiftEndTime   || co?.shiftEndTime   || "17:00:00";

            let snappedCiTime = null;
            let snappedCoTime = null;

            if (ci) {
                const ciDate = new Date(ci.timestamp);
                const shiftStartDt = new Date(ciDate);
                const [h, m] = sStart.split(':').map(Number);
                shiftStartDt.setHours(h, m, 0, 0);

                const graceStart = new Date(shiftStartDt);
                graceStart.setMinutes(graceStart.getMinutes() - 30);

                // Snap nếu nằm trong grace period
                snappedCiTime = (ciDate >= graceStart && ciDate <= shiftStartDt) ? shiftStartDt : ciDate;
            }

            if (co) {
                const coDate = new Date(co.timestamp);
                const shiftEndDt = new Date(ci ? new Date(ci.timestamp) : coDate);
                const [h, m] = sEnd.split(':').map(Number);
                shiftEndDt.setHours(h, m, 0, 0);
                
                // Xử lý ca xuyên đêm cho snapping
                const sDt = new Date(shiftEndDt); 
                const [hS, mS] = sStart.split(':').map(Number);
                sDt.setHours(hS, mS, 0, 0);
                if (shiftEndDt <= sDt) shiftEndDt.setDate(shiftEndDt.getDate() + 1);

                const graceEnd = new Date(shiftEndDt);
                graceEnd.setMinutes(graceEnd.getMinutes() + 15);

                // Snap nếu nằm trong grace period
                snappedCoTime = (coDate >= shiftEndDt && coDate <= graceEnd) ? shiftEndDt : coDate;
            }

            return {
                date, rec, snappedCiTime, snappedCoTime, ci, co,
                st: getStatusInfo(snappedCiTime, snappedCoTime, sStart, sEnd)
            };
        });

    // Apply combined filter (chip = subtab)
    // Apply combined filter (chip = subtab)
    let filteredRows = [...allRows];
    if (chipFilter === 'late')   filteredRows = filteredRows.filter(r => r.st.cls === 'st-late');
    if (chipFilter === 'early')  filteredRows = filteredRows.filter(r => r.st.cls === 'st-early');
    if (chipFilter === 'miss')   filteredRows = filteredRows.filter(r => r.ci && !r.co);

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
    const safePage   = Math.min(page, totalPages);
    const pageRows   = filteredRows.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

    // Counts
    const okCnt    = allRows.filter(r => r.st.cls === 'st-ok').length;
    const lateCnt  = allRows.filter(r => r.st.cls === 'st-late').length;
    const earlyCnt = allRows.filter(r => r.st.cls === 'st-early').length;
    const missCnt  = allRows.filter(r => r.ci && !r.co).length;

    // Tổng hợp thực tế (Aggregate)
    const totalAdjustedDays = allRows.reduce((acc, r) => {
        const d = (r.ci && r.co) ? Math.max(0, 1.0 - (r.st.isLate ? 0.5 : 0) - (r.st.isEarly ? 0.5 : 0)) : 0;
        return acc + d;
    }, 0);
    const totalAdjustedHours = allRows.reduce((acc, r) => {
        const h = (r.ci && r.co) ? Math.max(0, 8.0 - (r.st.isLate ? 4.0 : 0) - (r.st.isEarly ? 4.0 : 0)) : 0;
        return acc + h;
    }, 0);

    const totalOtHours = overtime
        .filter(ot => ot.status === 'Approved')
        .reduce((acc, ot) => {
            const start = new Date(`1970-01-01T${ot.startTime}`);
            const end = new Date(`1970-01-01T${ot.endTime}`);
            return acc + (end - start) / 3600000;
        }, 0);

    return (
        <div className="att-wrap">

            {/* Flash / Loading */}
            {loading && <div className="att-loading">⏳ Đang xử lý...</div>}
            {flash && !loading && (
                <div className={`att-flash ${flash.ok ? 'ok' : 'err'}`}>{flash.text}</div>
            )}

            {/* ══ TAB BAR ══ */}
            <div className="att-tab-bar">
                <div
                    id="att-tab-chamcong"
                    className={`att-tab${activeTab === 'chamcong' ? ' att-tab-on' : ''}`}
                    onClick={() => setActiveTab('chamcong')}
                >
                    Chấm công
                </div>
                <div
                    id="att-tab-lichsu"
                    className={`att-tab${activeTab === 'lichsu' ? ' att-tab-on' : ''}`}
                    onClick={() => { setActiveTab('lichsu'); loadHistory(selectedMonth); }}
                >
                    Lịch sử
                </div>
            </div>

            {/* ══════════════ CHẤM CÔNG TAB ══════════════ */}
            {activeTab === 'chamcong' && (
                <>
                    <div className="att-today-panel">
                        <div className="att-section-title">Thông tin chấm công hôm nay</div>

                        <table className="att-info-table">
                            <tbody>
                                <tr>
                                    <th>Ngày</th>
                                    <td>
                                        <strong>
                                            {clock.toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'numeric', year:'numeric' })}
                                        </strong>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Giờ hệ thống</th>
                                    <td>
                                        <span className="att-clock-val">
                                            {clock.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Giờ vào ca</th>
                                    <td>
                                        {fmtTime(ciRec?.timestamp)
                                            ? <strong>{fmtTime(ciRec.timestamp)}</strong>
                                            : <span className="att-time-na">--:--</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Giờ ra ca</th>
                                    <td>
                                        {fmtTime(coRec?.timestamp)
                                            ? <strong>{fmtTime(coRec.timestamp)}</strong>
                                            : <span className="att-time-na">--:--</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Trạng thái</th>
                                    <td>
                                        {isCheckedOut
                                            ? <span className="st-ok">✓ Đủ công</span>
                                            : isCheckedIn
                                                ? <span className="st-wip">Đang làm việc</span>
                                                : <span className="att-time-na">Chưa vào ca</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <th>Ca làm việc</th>
                                    <td>
                                        {ciRec?.shiftName || coRec?.shiftName || 'Hành chính'} &nbsp;
                                        ({(ciRec?.shiftStartTime || coRec?.shiftStartTime || '08:00:00').substring(0,5)} – {(ciRec?.shiftEndTime || coRec?.shiftEndTime || '17:00:00').substring(0,5)})
                                    </td>
                                </tr>
                                {(ciRec?.otStartTime || coRec?.otStartTime) && (
                                    <>
                                        <tr>
                                            <th style={{ color: '#059669' }}>Tăng ca (Đã duyệt)</th>
                                            <td style={{ color: '#059669', fontWeight: 'bold' }}>
                                                {(ciRec?.otStartTime || coRec?.otStartTime).substring(0,5)} – {(ciRec?.otEndTime || coRec?.otEndTime).substring(0,5)}
                                                &nbsp; (+{(ciRec?.otEndTime && ciRec?.otStartTime ? 
                                                    (new Date(`1970-01-01T${ciRec.otEndTime}`) - new Date(`1970-01-01T${ciRec.otStartTime}`))/3600000 : 
                                                    (new Date(`1970-01-01T${coRec.otEndTime}`) - new Date(`1970-01-01T${coRec.otStartTime}`))/3600000).toFixed(1)}h)
                                            </td>
                                        </tr>
                                        <tr>
                                            <th>Giờ về dự kiến</th>
                                            <td style={{ color: '#2563eb', fontWeight: 'bold' }}>
                                                {(ciRec?.otEndTime || coRec?.otEndTime).substring(0,5)}
                                                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>
                                                    * OT tính làm tròn sàn mỗi 0.5h thực tế.
                                                </div>
                                            </td>
                                        </tr>
                                    </>
                                )}
                            </tbody>
                        </table>

                        <div className="att-action-row">
                            <button
                                id="att-btn-checkin"
                                className={`att-btn-in${isCheckedIn ? ' done' : ''}`}
                                onClick={() => setModal('CheckIn')}
                                disabled={isCheckedIn || loading}
                            >
                                ✓ {isCheckedIn ? 'Đã vào ca' : 'Vào Ca (Check In)'}
                            </button>
                            <button
                                id="att-btn-checkout"
                                className="att-btn-out"
                                onClick={() => setModal('CheckOut')}
                                disabled={!isCheckedIn || isCheckedOut || loading}
                            >
                                + {isCheckedOut ? 'Đã ra ca' : 'Ra Ca (Check Out)'}
                            </button>
                        </div>
                    </div>

                    {/* Monthly summary */}
                    <div style={{ paddingTop: 14 }}>
                        <div className="att-section-title">
                            Tổng hợp tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}
                        </div>
                        <div className="att-month-stats">
                            <div className="att-ms-item">
                                <span className="att-ms-num ok">{okCnt}</span>
                                <span className="att-ms-label">Đúng giờ</span>
                            </div>
                            <div className="att-ms-item">
                                <span className="att-ms-num late">{lateCnt}</span>
                                <span className="att-ms-label">Đi muộn</span>
                            </div>
                            <div className="att-ms-item">
                                <span className="att-ms-num early">{earlyCnt}</span>
                                <span className="att-ms-label">Về sớm</span>
                            </div>
                            <div className="att-ms-item">
                                <span className="att-ms-num blue">{totalAdjustedDays.toFixed(1)}</span>
                                <span className="att-ms-label">Tổng công</span>
                            </div>
                            <div className="att-ms-item">
                                <span className="att-ms-num orange">{totalOtHours.toFixed(1)}h</span>
                                <span className="att-ms-label">Tăng ca (OT)</span>
                            </div>
                            <div className="att-ms-item">
                                <span className="att-ms-num">{allRows.length}</span>
                                <span className="att-ms-label">Tổng ngày</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ══════════════ LỊCH SỬ TAB ══════════════ */}
            {activeTab === 'lichsu' && (
                <>
                    {/* Filter row */}
                    <div className="att-hist-filter">
                        <span className="att-filter-label">Tháng/Năm:</span>
                        <select
                            id="att-month-select"
                            className="att-filter-select"
                            value={selectedMonth}
                            onChange={e => { setSelectedMonth(e.target.value); setPage(1); }}
                        >
                            {getMonthOptions().map(o => (
                                <option key={o.val} value={o.val}>{o.label}</option>
                            ))}
                        </select>

                        <div className="att-chip-bar">
                            {[
                                { id:'all',   label:'Tất cả' },
                                { id:'late',  label:'Đi muộn' },
                                { id:'early', label:'Về sớm' },
                                { id:'miss',  label:'Quên check-out' },
                            ].map(c => (
                                <div
                                    key={c.id}
                                    className={`att-chip${chipFilter === c.id ? ' att-chip-on' : ''}`}
                                    onClick={() => handleChip(c.id)}
                                >
                                    {c.label}
                                </div>
                            ))}
                        </div>

                        {/* Summary Block */}
                        <div className="att-sum-bar">
                            <div className="att-sum-item">
                                <span className="att-sum-lbl">Tổng ngày công:</span>
                                <span className="att-sum-val">{totalAdjustedDays.toFixed(1)}</span>
                            </div>
                            <div className="att-sum-item">
                                <span className="att-sum-lbl">Tổng giờ làm:</span>
                                <span className="att-sum-val">{totalAdjustedHours.toFixed(1)}h</span>
                            </div>
                        </div>
                    </div>

                    {/* History sub-tabs */}
                    <div className="att-subtabs">
                        {[
                            { id:'all',   label:'Tất cả',       cnt: allRows.length },
                            { id:'late',  label:'Đi muộn',      cnt: lateCnt },
                            { id:'early', label:'Về sớm',       cnt: earlyCnt },
                            { id:'miss',  label:'Quên check-out', cnt: missCnt },
                        ].map(t => (
                            <div
                                key={t.id}
                                className={`att-subtab${subtabFilter === t.id ? ' att-subtab-on' : ''}`}
                                onClick={() => handleSubtab(t.id)}
                            >
                                {t.label} ({t.cnt})
                            </div>
                        ))}
                    </div>

                    {/* Data table */}
                    <div className="att-table-wrap">
                        <table className="att-table">
                            <thead>
                                <tr>
                                    <th className="c" style={{ width: 44 }} rowSpan={2}>STT</th>
                                    <th style={{ width: 120 }} rowSpan={2}>Ngày</th>
                                    <th className="c bg-slate-50 border-b border-slate-200" colSpan={maxCi + 1}>Giờ Vào (Check-In)</th>
                                    <th className="c bg-slate-50 border-b border-slate-200 border-l" colSpan={maxCo + 1}>Giờ Ra (Check-Out)</th>
                                    <th className="c" style={{ width: 80 }} rowSpan={2}>Số Giờ Làm</th>
                                    <th className="c" style={{ width: 80 }} rowSpan={2}>Số Công</th>
                                    <th style={{ width: 145 }} rowSpan={2}>Trạng Thái</th>
                                    <th rowSpan={2}>Ghi chú</th>
                                </tr>
                                <tr>
                                    {Array.from({length: maxCi}).map((_, i) => (
                                        <th key={`ci-${i}`} className="c bg-slate-50/50 text-[11px] text-slate-500 font-medium">Lần {i+1}</th>
                                    ))}
                                    <th className="c bg-blue-50 text-blue-700 font-semibold border-x border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">Giờ Chốt</th>
                                    
                                    {Array.from({length: maxCo}).map((_, i) => (
                                        <th key={`co-${i}`} className="c bg-slate-50/50 text-[11px] text-slate-500 font-medium border-l">Lần {i+1}</th>
                                    ))}
                                    <th className="c bg-orange-50 text-orange-700 font-semibold border-x border-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">Giờ Chốt</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7 + maxCi + maxCo} className="att-empty">
                                            Không có dữ liệu trong tháng này.
                                        </td>
                                    </tr>
                                ) : pageRows.map(({ date, rec, st, snappedCiTime, snappedCoTime, ci, co }, idx) => {
                                    const dObj    = new Date(date);
                                    const dayName = VN_DAYS[dObj.getDay()];
                                    const isWE    = dObj.getDay() === 0; // Only Sunday is a day off
                                    const isToday = dObj.toDateString() === new Date().toDateString();
                                    const inT     = fmtTime(snappedCiTime);
                                    const outT    = fmtTime(snappedCoTime);
                                    
                                    const totalH  = (ci && co)
                                        ? Math.max(0, 8.0 - (st.isLate ? 4.0 : 0) - (st.isEarly ? 4.0 : 0)).toFixed(1)
                                        : null;
                                    const note = (ci?.note || co?.note);
                                    const chipCls = isToday ? 'att-day-chip today'
                                        : isWE  ? 'att-day-chip weekend'
                                        : 'att-day-chip';

                                    return (
                                        <tr
                                            key={date}
                                            style={isToday ? { background: '#eff6ff' } : {}}
                                        >
                                            <td className="c" style={{ color: '#888' }}>
                                                {(safePage-1)*ROWS_PER_PAGE + idx + 1}
                                            </td>
                                            <td>
                                                <span className={chipCls}>{dayName}</span>
                                                {dObj.getDate()}/{dObj.getMonth()+1}/{dObj.getFullYear()}
                                            </td>
                                            {/* Giờ vào thực tế */}
                                            {Array.from({length: maxCi}).map((_, i) => (
                                                <td key={`ci-val-${i}`} className="c text-slate-500 text-sm">
                                                    {rec.checkIns[i] ? fmtTime(rec.checkIns[i].timestamp) : <span className="att-tn">--:--</span>}
                                                </td>
                                            ))}
                                            {/* Giờ vào Chốt */}
                                            <td className="c bg-blue-50/30 font-bold text-blue-900 border-x border-blue-50/50 dark:bg-blue-900/10 dark:text-blue-300 dark:border-blue-800/30">
                                                {inT ? (
                                                    <div className="flex flex-col items-center leading-tight">
                                                        <span>{inT}</span>
                                                        {st.isLate && <span className="text-[11px] text-red-500 font-normal mt-0.5">(trễ {st.lateMin}p)</span>}
                                                    </div>
                                                ) : <span className="att-tn">--:--</span>}
                                            </td>

                                            {/* Giờ ra thực tế */}
                                            {Array.from({length: maxCo}).map((_, i) => (
                                                <td key={`co-val-${i}`} className="c text-slate-500 text-sm border-l border-slate-100">
                                                    {rec.checkOuts[i] ? fmtTime(rec.checkOuts[i].timestamp) : <span className="att-tn">--:--</span>}
                                                </td>
                                            ))}
                                            {/* Giờ ra Chốt */}
                                            <td className="c bg-orange-50/30 font-bold text-orange-900 border-x border-orange-50/50 dark:bg-orange-900/10 dark:text-orange-300 dark:border-orange-800/30">
                                                {outT ? (
                                                    <div className="flex flex-col items-center leading-tight">
                                                        <span>{outT}</span>
                                                        {st.isEarly && <span className="text-[11px] text-red-500 font-normal mt-0.5">(sớm {st.earlyMin}p)</span>}
                                                    </div>
                                                ) : <span className="att-tn">--:--</span>}
                                            </td>

                                            <td className="c">
                                                {totalH
                                                    ? <strong>{totalH}</strong>
                                                    : <span className="att-tn">--</span>}
                                            </td>
                                            <td className="c">
                                                {totalH !== null
                                                    ? <strong className="text-emerald-600">{Math.max(0, 1.0 - (st.isLate ? 0.5 : 0) - (st.isEarly ? 0.5 : 0)).toFixed(1)}</strong>
                                                    : <span className="att-tn">--</span>}
                                            </td>
                                            <td className={st.cls}>{st.label}</td>
                                            <td>
                                                {note
                                                    ? note
                                                    : <span className="att-ne">--</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="att-pag-row">
                        <div>
                            Tổng số bản ghi: <strong>{filteredRows.length}</strong>
                        </div>
                        <div className="att-pag-right">
                            <span className="att-pag-range">
                                {filteredRows.length === 0
                                    ? '0 bản ghi'
                                    : `${(safePage-1)*ROWS_PER_PAGE+1}–${Math.min(safePage*ROWS_PER_PAGE, filteredRows.length)} bản ghi`}
                            </span>
                            <div className="att-pag-nums">
                                <button
                                    id="att-pg-prev"
                                    className="att-pgbtn"
                                    onClick={() => setPage(p => Math.max(1, p-1))}
                                    disabled={safePage === 1}
                                >
                                    ‹
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
                                    <button
                                        key={p}
                                        id={`att-pg-${p}`}
                                        className={`att-pgbtn${safePage === p ? ' att-pgbtn-on' : ''}`}
                                        onClick={() => setPage(p)}
                                    >
                                        {p}
                                    </button>
                                ))}
                                <button
                                    id="att-pg-next"
                                    className="att-pgbtn"
                                    onClick={() => setPage(p => Math.min(totalPages, p+1))}
                                    disabled={safePage === totalPages}
                                >
                                    ›
                                </button>
                            </div>
                            <select
                                className="att-per-page"
                                defaultValue={10}
                            >
                                <option value={10}>10 / trang</option>
                                <option value={20}>20 / trang</option>
                                <option value={50}>50 / trang</option>
                            </select>
                        </div>
                    </div>
                </>
            )}

            {/* Face recognition modal */}
            {modal && user && (
                <FaceModal
                    actionType={modal}
                    currentEmployeeId={user.employeeId}
                    onSuccess={() => onVerified(modal)}
                    onCancel={() => setModal(null)}
                />
            )}
        </div>
    );
}
