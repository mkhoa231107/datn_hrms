import React, { useState, useEffect } from 'react';
import '../employee/EmployeeFlat.css';
import { schedulingService, api } from '../../api';
import { Calendar } from 'lucide-react';

export default function MySchedule({ user, onBack }) {
    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [scheduleData, setScheduleData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const isBeforeToday = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return targetDate < today;
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const pResult = await schedulingService.getPeriods();
            let availablePeriods = pResult;

            try {
                const contractRes = await api.get('/contracts');
                if (contractRes.data?.length > 0) {
                    const sortedContracts = [...contractRes.data].sort((a, b) => b.id - a.id);
                    const contract = sortedContracts[0];
                    
                    if (contract && contract.startDate) {
                        const contractType = contract.contractType;
                        const contractTypeId = contract.contractTypeId;
                        const startDate = new Date(contract.startDate);
                        const currentYear = new Date().getFullYear();

                        const isIndefinite = contractTypeId === 3 || contractType === 'Không xác định thời hạn' || contractType === 'Indefinite';
                        const isProbation = contractTypeId === 1 || contractType === 'Thử việc' || contractType === 'Probation';

                        if (isIndefinite) {
                            const baseYear = 2026;
                            const cycleStartYear = baseYear + 3 * Math.floor((currentYear - baseYear) / 3);
                            const validYears = [cycleStartYear, cycleStartYear + 1, cycleStartYear + 2];

                            availablePeriods = availablePeriods.filter(p => {
                                const year = new Date(p.startDate).getFullYear();
                                return validYears.includes(year);
                            });
                        } else if (isProbation) {
                            const probationEnd = new Date(startDate);
                            probationEnd.setMonth(probationEnd.getMonth() + 3);

                            availablePeriods = availablePeriods.filter(p => {
                                const pStart = new Date(p.startDate);
                                if (pStart.getFullYear() !== currentYear) return false;
                                const pMonth = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
                                const startMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
                                const endMonth = new Date(probationEnd.getFullYear(), probationEnd.getMonth(), 1);
                                return pMonth >= startMonth && pMonth <= endMonth;
                            });
                        } else {
                            const durationYears = contract.endDate
                                ? (new Date(contract.endDate).getFullYear() - startDate.getFullYear() + 1)
                                : 1;
                            const validYears = Array.from({ length: durationYears }, (_, i) => startDate.getFullYear() + i);

                            availablePeriods = availablePeriods.filter(p => {
                                const year = new Date(p.startDate).getFullYear();
                                return validYears.includes(year);
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi khi tải hợp đồng cho lịch ca:", err);
            }

            setPeriods(availablePeriods);

            if (availablePeriods.length > 0) {
                const activePeriods = availablePeriods.filter(p => !isBeforeToday(p.endDate));
                const defaultPeriod = activePeriods.length > 0 ? activePeriods[0] : availablePeriods[0];
                setSelectedPeriod(defaultPeriod.id);
                setSelectedYear(new Date(defaultPeriod.startDate).getFullYear());
            }
        } catch (error) {
            console.error("Error fetching periods:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInitialData(); }, []);

    const loadSchedule = async () => {
        if (!selectedPeriod) return;
        setLoading(true);
        try {
            const data = await schedulingService.getPersonalSchedule(selectedPeriod);
            setScheduleData(data);
        } catch (error) {
            console.error("Error loading schedule:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPeriod) loadSchedule();
    }, [selectedPeriod]);

    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        const today = new Date();
        return d.getDate() === today.getDate() &&
            d.getMonth() === today.getMonth() &&
            d.getFullYear() === today.getFullYear();
    };

    const years = [...new Set(periods.map(p => new Date(p.startDate).getFullYear()))].sort((a, b) => a - b);

    if (loading && !scheduleData) return (
        <div className="ef-wrap" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <strong>Đang tải biểu mẫu lịch ca...</strong>
        </div>
    );

    return (
        <div className="ef-wrap">


            {/* ── Stats Summary Row ── */}
            {scheduleData && (
                <div className="ef-table-wrap" style={{ marginBottom: '15px' }}>
                    <table className="ef-table no-top-border">
                        <tbody>
                            <tr>
                                <th style={{ width: '15%', backgroundColor: '#f4f4f4' }}>Mã Nhân viên</th>
                                <td>{scheduleData.employeeCode}</td>
                                <th style={{ width: '15%', backgroundColor: '#f4f4f4' }}>Tên Nhân viên</th>
                                <td style={{ fontWeight: 'bold' }}>{scheduleData.fullName}</td>
                            </tr>
                            <tr>
                                <th style={{ backgroundColor: '#f4f4f4' }}>Bộ phận</th>
                                <td>{scheduleData.departmentName}</td>
                                <th style={{ backgroundColor: '#f4f4f4' }}>Vị trí</th>
                                <td>{scheduleData.positionName}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <div className="ef-toolbar" style={{ justifyContent: 'space-between' }}>
                <div className="ef-toolbar-title">
                    <Calendar size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '13px', textTransform: 'uppercase' }}>Lịch Ca Cá Nhân</strong>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <select className="ef-select" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} style={{ minWidth: '100px' }}>
                        {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
                    </select>
                    <select className="ef-select" value={selectedPeriod || ''} onChange={(e) => setSelectedPeriod(Number(e.target.value))} style={{ minWidth: '200px' }}>
                        {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).map(p => (
                            <option key={p.id} value={p.id}>{p.periodName}</option>
                        ))}
                        {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).length === 0 && (
                            <option value="">(Không có dữ liệu kỳ)</option>
                        )}
                    </select>
                </div>
            </div>

            {scheduleData && scheduleData.schedules.length > 0 ? (
                <>
                    <div className="ef-table-wrap" style={{ marginBottom: '0' }}>
                        <table className="ef-table no-top-border" style={{ tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    {['CHỦ NHẬT', 'THỨ 2', 'THỨ 3', 'THỨ 4', 'THỨ 5', 'THỨ 6', 'THỨ 7'].map(day => (
                                        <th key={day} className="c">{day}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const cells = [];
                                    const paddingLen = new Date(scheduleData.schedules[0].date).getDay();
                                    for (let i = 0; i < paddingLen; i++) {
                                        cells.push(<td key={`pad-${i}`} style={{ backgroundColor: '#fafafa', height: '100px' }}></td>);
                                    }

                                    scheduleData.schedules.forEach((day, idx) => {
                                        const isTodayDate = isToday(day.date);
                                        const shiftCode = day.shiftCode || 'OFF';
                                        
                                        cells.push(
                                            <td key={idx} style={{ height: '100px', verticalAlign: 'top', backgroundColor: isTodayDate ? '#fff8e1' : '#fff', position: 'relative' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '10px', color: isTodayDate ? '#1a56db' : '#333' }}>
                                                    {new Date(day.date).getDate()}
                                                </div>
                                                <div className="c">
                                                    <strong style={{ 
                                                        display: 'inline-block',
                                                        border: shiftCode === 'OFF' ? '1px dashed #ccc' : '1px solid #999', 
                                                        padding: '4px 8px', 
                                                        backgroundColor: shiftCode === 'OFF' ? '#fafafa' : shiftCode === 'C3' ? '#333' : '#f0fdf4',
                                                        color: shiftCode === 'OFF' ? '#888' : shiftCode === 'C3' ? '#fff' : '#15803d',
                                                        fontSize: '11px',
                                                        width: '70%'
                                                    }}>
                                                        {shiftCode}
                                                    </strong>
                                                </div>
                                            </td>
                                        );
                                    });
                                    
                                    const padEnd = (7 - (cells.length % 7)) % 7;
                                    for (let i = 0; i < padEnd; i++) {
                                        cells.push(<td key={`pad-end-${i}`} style={{ backgroundColor: '#fafafa', height: '100px' }}></td>);
                                    }

                                    const rows = [];
                                    for (let i = 0; i < cells.length; i += 7) {
                                        rows.push(<tr key={`row-${i}`}>{cells.slice(i, i + 7)}</tr>);
                                    }
                                    return rows;
                                })()}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{ padding: '12px 15px', backgroundColor: '#fafafa', border: '1px solid #ccc', borderTop: 'none', fontSize: '12px', color: '#555' }}>
                        <strong>GHI CHÚ CA:</strong> HC (Hành chính), C1 (Ca 1), C2 (Ca 2), C3 (Ca 3), OFF (Ngày Nghỉ)
                    </div>
                </>
            ) : (
                <div className="ef-empty">
                    <strong>Chưa có lịch ca</strong>
                    <p style={{ color: '#555', marginTop: '5px' }}>Không tìm thấy dữ liệu phân ca cho kỳ chọn.</p>
                </div>
            )}
        </div>
    );
}
