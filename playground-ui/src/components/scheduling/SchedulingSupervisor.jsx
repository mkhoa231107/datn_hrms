import React, { useState } from 'react';
import { Calendar, Users, ChevronLeft, ChevronRight, CheckCircle2, Clock, MapPin, Search, Filter } from 'lucide-react';

export default function SchedulingSupervisor({ user }) {
    const [currentWeek, setCurrentWeek] = useState(new Date());

    // Mock data for Team Leader view
    const TEAM_NAME = "Tổ Phát triển 1";
    const SHIFTS = [
        { id: 'HC', name: 'Hành chính', time: '08:00 - 17:00', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
        { id: 'CA1', name: 'Ca sáng', time: '06:00 - 14:00', color: 'bg-sky-100 text-sky-700 border-sky-200' },
        { id: 'CA2', name: 'Ca chiều', time: '14:00 - 22:00', color: 'bg-amber-100 text-amber-700 border-amber-200' },
        { id: 'OFF', name: 'Nghỉ', time: 'OFF', color: 'bg-slate-100 text-slate-500 border-slate-200' }
    ];

    const MOCK_TEAM = [
        { id: 1, name: 'Nguyễn Văn A', code: 'EMP001', role: 'Developer', schedule: ['HC', 'HC', 'HC', 'HC', 'HC', 'OFF', 'OFF'] },
        { id: 2, name: 'Trần Thị B', code: 'EMP002', role: 'Tester', schedule: ['CA1', 'CA1', 'CA2', 'CA2', 'HC', 'OFF', 'OFF'] },
        { id: 3, name: 'Lê Văn C', code: 'EMP003', role: 'Developer', schedule: ['CA2', 'CA2', 'CA1', 'CA1', 'HC', 'OFF', 'OFF'] },
        { id: 4, name: 'Phạm Thị D', code: 'EMP004', role: 'Designer', schedule: ['HC', 'HC', 'HC', 'HC', 'HC', 'OFF', 'OFF'] },
    ];

    const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
    const dates = [12, 13, 14, 15, 16, 17, 18];

    return (
        <div className="flex flex-col h-full bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-100">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>

                    <p className="text-slate-500 text-sm mt-1 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Đang quản lý: <span className="font-semibold text-slate-700">{TEAM_NAME}</span>
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                        <button className="p-2 hover:bg-slate-50 rounded-md transition-colors"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                        <div className="px-4 py-2 font-medium text-slate-700 text-sm flex items-center">
                            Tháng 08 / 2026
                        </div>
                        <button className="p-2 hover:bg-slate-50 rounded-md transition-colors"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                    </div>
                    <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-all flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Lưu thay đổi
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm nhân viên..."
                            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                        <Filter className="w-4 h-4" />
                        Lọc ca
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {SHIFTS.map(shift => (
                        <div key={shift.id} className="flex items-center gap-2 text-sm">
                            <span className={`w-3 h-3 rounded-full border ${shift.color}`}></span>
                            <span className="text-slate-600 font-medium">{shift.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Matrix Table */}
            <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold w-64 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                                    Nhân viên ({MOCK_TEAM.length})
                                </th>
                                {daysOfWeek.map((day, i) => (
                                    <th key={i} className="p-4 font-semibold text-center border-r border-slate-200 last:border-0 min-w-[120px]">
                                        <div className="flex flex-col items-center">
                                            <span className="text-slate-400 mb-1">{day}</span>
                                            <span className={`text-lg ${i >= 5 ? 'text-rose-500' : 'text-slate-800'}`}>{dates[i]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MOCK_TEAM.map((emp) => (
                                <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="p-4 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-r border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                                {emp.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-slate-800 text-sm whitespace-nowrap">{emp.name}</div>
                                                <div className="text-xs text-slate-500">{emp.code} • {emp.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    {emp.schedule.map((shiftId, i) => {
                                        const shift = SHIFTS.find(s => s.id === shiftId);
                                        return (
                                            <td key={i} className="p-2 text-center border-r border-slate-100 last:border-0">
                                                <div className={`w-full py-2 px-1 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-sm ${shift.color}`}>
                                                    <span className="font-bold text-sm">{shift.id}</span>
                                                    {shift.id !== 'OFF' && <span className="text-[10px] opacity-80 mt-0.5">{shift.time}</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
