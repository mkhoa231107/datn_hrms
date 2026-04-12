import React, { useState, useEffect, useMemo } from 'react';
import api from '../../api';
import { Search, Filter, Activity, Users, CheckCircle, Clock, RefreshCw, FileText, AlertTriangle } from 'lucide-react';

// Safely defined at the top for hoisting
function Loader({ className = "animate-spin", size = 24 }) {
    return <Activity className={className} size={size} />;
}

export default function AttendanceManagement() {
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDate) fetchDailyAttendance();
    }, [selectedDate]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [deptRes, empRes] = await Promise.all([
                api.get('/departments').catch(e => ({ data: [] })),
                api.get('/employees/managed-users').catch(e => ({ data: [] }))
            ]);
            setDepartments(deptRes.data || []);
            setEmployees(empRes.data || []);
            await fetchDailyAttendance();
        } catch (err) {
            console.error('Error fetching management data:', err);
            setError('Không thể kết nối đến hệ thống. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const fetchDailyAttendance = async () => {
        try {
            const res = await api.get(`/attendance/department/0/date/${selectedDate}`);
            // Backend returns { success: true, data: [...] }, so we need res.data.data
            const records = res.data?.data ?? res.data ?? [];
            setAttendance(Array.isArray(records) ? records : []);
        } catch (err) {
            console.error('Error fetching daily attendance:', err);
            setAttendance([]);
        }
    };

    const stats = useMemo(() => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const safeAttendance = Array.isArray(attendance) ? attendance : [];
        
        const total = safeEmployees.length;
        const clockedInCount = safeEmployees.filter(emp => 
            safeAttendance.some(rec => rec?.employeeId === emp?.id)
        ).length;
        const percent = total > 0 ? Math.round((clockedInCount / total) * 100) : 0;

        return { total, clockedInCount, percent };
    }, [employees, attendance]);

    const filteredEmployees = useMemo(() => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        return safeEmployees.filter(emp => {
            if (!emp) return false;
            const matchesDept = selectedDept === 'all' || emp.departmentId === parseInt(selectedDept);
            
            const name = (emp.fullName || '').toLowerCase();
            const code = (emp.employeeCode || '').toLowerCase();
            const query = (searchQuery || '').toLowerCase();
            
            const matchesSearch = !query || name.includes(query) || code.includes(query);
            return matchesDept && matchesSearch;
        });
    }, [employees, selectedDept, searchQuery]);

    const getEmployeeStatus = (empId) => {
        const safeAttendance = Array.isArray(attendance) ? attendance : [];
        const records = safeAttendance.filter(r => r?.employeeId === empId);
        if (records.length === 0) return { label: 'Chưa chấm công', cls: 'text-slate-400 bg-slate-50' };
        
        const hasIn = records.some(r => r?.type === 'CheckIn');
        const hasOut = records.some(r => r?.type === 'CheckOut');

        if (hasIn && hasOut) return { label: 'Đã hoàn thành', cls: 'text-emerald-600 bg-emerald-50' };
        if (hasIn) return { label: 'Đang làm việc', cls: 'text-blue-600 bg-blue-50' };
        return { label: 'Thiếu dữ liệu', cls: 'text-amber-600 bg-amber-50' };
    };

    const getTimes = (empId) => {
        const safeAttendance = Array.isArray(attendance) ? attendance : [];
        const records = safeAttendance.filter(r => r?.employeeId === empId);
        const cin = records.find(r => r?.type === 'CheckIn')?.timestamp;
        const cout = records.find(r => r?.type === 'CheckOut')?.timestamp;
        
        const fmt = (ts) => ts ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
        return { in: fmt(cin), out: fmt(cout) };
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center gap-4 bg-white rounded-3xl m-6 border border-slate-100 shadow-sm">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center">
                    <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Lỗi Hệ Thống</h3>
                <p className="text-slate-500 max-w-sm">{error}</p>
                <button onClick={fetchInitialData} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <RefreshCw size={18} /> Thử lại
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-[1200px] mx-auto animate-fade-in">
            {/* Header section */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Activity className="text-indigo-600" />
                        Quản lý chấm công hàng ngày
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Theo dõi thời gian ra vào của toàn bộ nhân viên.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                    <button 
                        onClick={fetchInitialData}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all shadow-sm"
                        title="Làm mới"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng nhân viên</p>
                        <h2 className="text-3xl font-black text-slate-800">{stats.total}</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã chấm công</p>
                        <h2 className="text-3xl font-black text-emerald-600">
                            {stats.clockedInCount} <span className="text-sm font-normal text-slate-400">người</span>
                        </h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <Activity size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tỷ lệ hiện diện</p>
                            <span className="text-lg font-black text-amber-600">{stats.percent}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-amber-500 transition-all duration-1000" 
                                style={{ width: `${stats.percent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo tên hoặc mã nhân viên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-transparent">
                        <Filter size={16} className="text-slate-400" />
                        <select 
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-transparent text-sm font-medium outline-none focus:ring-0 border-none cursor-pointer text-slate-700 min-w-[150px]"
                        >
                            <option value="all">Tất cả bộ phận</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">STT</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nhân viên</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phòng ban</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Giờ vào</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">Giờ ra</th>
                                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader className="w-8 h-8 animate-spin text-indigo-500" />
                                            <span className="text-sm text-slate-400 font-medium">Đang tải dữ liệu chấm công...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText className="w-12 h-12 text-slate-200" />
                                            <span className="text-sm text-slate-400 font-medium">Không tìm thấy dữ liệu phù hợp.</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.map((emp, idx) => {
                                const status = getEmployeeStatus(emp.id);
                                const times = getTimes(emp.id);
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-400 group-hover:text-slate-600 transition-colors">{idx + 1}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{emp.fullName || 'N/A'}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">{emp.employeeCode || '...'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-500 font-medium">{emp.departmentName || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-indigo-600">
                                                <Clock size={14} />
                                                {times.in}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 text-sm font-bold text-slate-600">
                                                <Clock size={14} />
                                                {times.out}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status.cls}`}>
                                                {status.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-4 text-[10px] text-slate-400 text-center font-medium">
                Dữ liệu được cập nhật dựa trên thời gian thực từ trạm quét mã vạch.
            </div>
        </div>
    );
}
