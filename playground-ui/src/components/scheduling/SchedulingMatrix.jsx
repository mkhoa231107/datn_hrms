﻿import React, { useState, useEffect } from 'react';
import {
    Calendar, Save, Plus, Copy, Lock, Unlock, Download, Upload, Search, Users, Clock, Filter, X, Check,
    ChevronLeft, ChevronRight, Zap, RefreshCw, FileDown, Layers, Info, LayoutGrid, List
} from 'lucide-react';
import { schedulingService, departmentService } from '../../api';
import { toast } from 'react-hot-toast';

export default function SchedulingMatrix({ user, onBack }) {
    const roles = user?.roles || [];
    const isSupervisor = roles.some(r => ['TeamLeader', 'DepartmentHead', 'Admin'].includes(r));

    const [periods, setPeriods] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [shifts, setShifts] = useState([]);
    const [matrixData, setMatrixData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const currentRealYear = new Date().getFullYear();
    const permanentBlockStart = 2026 + Math.floor((currentRealYear - 2026) / 3) * 3;
    const availableYears = [permanentBlockStart, permanentBlockStart + 1, permanentBlockStart + 2];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [pResult, dResult, sResult] = await Promise.all([
                    schedulingService.getPeriods(),
                    departmentService.getAll(),
                    schedulingService.getShifts()
                ]);
                setPeriods(pResult);
                setDepartments(dResult);
                setShifts(sResult);

                const activePeriods = pResult.filter(p => {
                    const end = new Date(p.endDate);
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    return end >= now;
                });

                if (activePeriods.length > 0) {
                    setSelectedPeriod(activePeriods[0].id);
                    setSelectedYear(new Date(activePeriods[0].startDate).getFullYear());
                } else if (pResult.length > 0) {
                    setSelectedPeriod(pResult[0].id);
                }
            } catch (error) {
                console.error("Error fetching scheduling data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedPeriod) loadMatrix();
    }, [selectedPeriod, selectedDept, selectedYear]);

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const data = await schedulingService.getMatrix(selectedPeriod, isSupervisor ? (user.departmentId || null) : selectedDept);
            setMatrixData(data);
        } catch (error) {
            console.error("Error loading matrix:", error);
        } finally {
            setLoading(false);
        }
    };

    const getDayName = (dateStr) => {
        const date = new Date(dateStr);
        const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return dayNames[date.getDay()];
    };

    const isWeekend = (dateStr) => {
        const day = new Date(dateStr).getDay();
        return day === 0 || day === 6;
    };

    const exportToCSV = () => {
        if (matrixData.length === 0) return;
        const daysArr = matrixData[0].schedules.map(s => new Date(s.date).getDate());
        const header = ["MÃ£ NV", "Há» tÃªn", "PhÃ²ng ban", ...daysArr].join(",");
        const rows = matrixData.map(row => {
            const shiftsStr = row.schedules.map(s => s.shiftCode || "OFF").join(",");
            return `${row.employeeCode},${row.fullName},${row.departmentName},${shiftsStr}`;
        });
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [header, ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Lich_Ca_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getShiftBadge = (code) => {
        if (!code || code === 'OFF') return null;
        const colors = {
            'C1': 'bg-blue-100 text-blue-700 border-blue-200',
            'C2': 'bg-amber-100 text-amber-700 border-amber-200',
            'C3': 'bg-purple-100 text-purple-700 border-purple-200',
            'HC': 'bg-emerald-100 text-emerald-700 border-emerald-200',
            'AL': 'bg-rose-100 text-rose-700 border-rose-200'
        };
        const color = colors[code] || 'bg-slate-100 text-slate-700 border-slate-200';
        return <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${color}`}>{code}</span>;
    };

    const filteredRows = matrixData.filter(row => 
        row.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        row.employeeCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const daysList = matrixData.length > 0 ? (matrixData[0].schedules || []).map(s => s.date) : [];

    const stats = {
        totalEmployees: filteredRows.length,
        scheduledDays: filteredRows.reduce((acc, row) => acc + row.schedules.filter(s => s.shiftId).length, 0),
        coverage: 100
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* KPI Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card flex items-center gap-4 border-l-4 border-l-violet-500">
                    <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NhÃ¢n sá»± quáº£n lÃ½</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.totalEmployees}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-blue-500">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ca lÃ m viá»‡c thÃ¡ng</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats.scheduledDays}</h3>
                    </div>
                </div>
                <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tá»· lá»‡ bao phá»§</p>
                        <h3 className="text-2xl font-black text-slate-800">100%</h3>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="MÃ£ NV, tÃªn nhÃ¢n viÃªn..."
                            className="input !pl-10 w-64 !text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <select className="input !py-2 !text-xs font-bold w-32" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
                            {availableYears.map(y => <option key={y} value={y}>NÄƒm {y}</option>)}
                        </select>
                        <select className="input !py-2 !text-xs font-bold w-48" value={selectedPeriod || ''} onChange={e => setSelectedPeriod(Number(e.target.value))}>
                            {periods.filter(p => new Date(p.startDate).getFullYear() === selectedYear).map(p => (
                                <option key={p.id} value={p.id}>{p.periodName}</option>
                            ))}
                        </select>
                    </div>
                    {!isSupervisor && (
                        <select className="input !py-2 !text-xs font-bold w-48" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                            <option value="">-- Táº¥t cáº£ bá»™ pháº­n --</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                        </select>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={loadMatrix} className="btn btn-ghost border-slate-200 text-slate-600 hover:bg-white !p-2">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {roles.includes('Admin') && (
                        <button 
                            onClick={async () => {
                                if (!window.confirm("CÃ i Ä‘áº·t láº¡i toÃ n bá»™ lá»‹ch lÃ m viá»‡c theo quy chuáº©n xoay ca (PRD) vÃ  giá» hÃ nh chÃ­nh (Office)?")) return;
                                setLoading(true);
                                try {
                                    await schedulingService.globalAutoSchedule({ year: selectedYear, overwrite: true });
                                    toast.success("ÄÃ£ hoÃ n táº¥t thiáº¿t láº­p há»‡ thá»‘ng");
                                    loadMatrix();
                                } catch (err) {
                                    toast.error("Lá»—i thiáº¿t láº­p há»‡ thá»‘ng");
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            className="btn btn-ghost border-rose-200 text-rose-600 hover:bg-rose-50 !py-2 text-xs"
                        >
                            <Zap size={14} /> Global Setup
                        </button>
                    )}
                    <button onClick={exportToCSV} className="btn btn-primary !py-2 !px-4 text-xs">
                        <FileDown size={14} /> Export Matrix
                    </button>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="card !p-0 overflow-hidden border-2 border-slate-100 h-[600px] flex flex-col">
                <div className="overflow-auto relative flex-grow">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-30">
                            <tr className="bg-slate-100/90 backdrop-blur-md">
                                <th className="sticky left-0 z-40 bg-slate-200 px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-r border-slate-300 min-w-[240px]">NhÃ¢n viÃªn</th>
                                {daysList.map((date, idx) => (
                                    <th key={idx} className={`px-2 py-3 text-center border-b border-slate-200 min-w-[50px] ${isWeekend(date) ? 'bg-slate-200/50' : ''}`}>
                                        <div className="text-[10px] font-bold text-slate-400">{getDayName(date)}</div>
                                        <div className={`text-xs font-black ${isWeekend(date) ? 'text-rose-500' : 'text-slate-700'}`}>{new Date(date).getDate()}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 15 }).map((_, i) => (
                                    <tr key={i}><td colSpan={daysList.length + 1} className="px-6 py-4"><div className="h-10 skeleton w-full" /></td></tr>
                                ))
                            ) : filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={daysList.length + 1} className="px-6 py-32 text-center bg-white">
                                        <LayoutGrid size={48} className="mx-auto text-slate-100 mb-4" />
                                        <p className="text-slate-400 font-bold">KhÃ´ng tÃ¬m tháº¥y dá»¯ liá»‡u nhÃ¢n sá»±</p>
                                    </td>
                                </tr>
                            ) : filteredRows.map((row, idx) => (
                                <tr key={idx} className="group hover:bg-slate-50/80 transition-colors">
                                    <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50 px-6 py-3 border-r border-slate-100 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-700 whitespace-nowrap">{row.fullName}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{row.positionName}</span>
                                        </div>
                                    </td>
                                    {row.schedules.map((s, sIdx) => (
                                        <td key={sIdx} className={`px-1 py-2 text-center border-r border-slate-50 last:border-r-0 ${isWeekend(s.date) ? 'bg-slate-50/30' : ''}`}>
                                            <div className="flex justify-center">
                                                {getShiftBadge(s.shiftCode)}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <Info size={14} /> ChÃº giáº£i:
                    </div>
                    {shifts.map(s => (
                        <div key={s.id} className="flex items-center gap-2">
                            {getShiftBadge(s.shiftCode)}
                            <span className="text-[10px] font-bold text-slate-600">{s.startTime} - {s.endTime}</span>
                        </div>
                    ))}
                    <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg border border-slate-200 bg-white" />
                        <span className="text-[10px] font-bold text-slate-600">OFF (Nghá»‰)</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
