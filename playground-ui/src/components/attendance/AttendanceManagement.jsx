import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Clock, Calendar, CheckCircle, XCircle, AlertCircle, RefreshCw, Users, Activity, FileDown, ChevronLeft, ChevronRight, Building2, Filter, FileText, AlertTriangle } from 'lucide-react';
import { api, departmentService } from '../../api';
import TabFilter from '../ui/TabFilter';
import { toast } from 'react-hot-toast';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Safely defined at the top for hoisting
function Loader({ className = "animate-spin", size = 24 }) {
    return <Activity className={className} size={size} />;
}

export default function AttendanceManagement({ user }) {
    const [employees, setEmployees] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDept, setSelectedDept] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;
    const { isMobile } = useBreakpoint();

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedDate) fetchDailyAttendance();
    }, [selectedDate, selectedDept]);

    const fetchInitialData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [deptRes, empRes] = await Promise.all([
                api.get('/departments').catch(e => ({ data: [] })),
                api.get('/employees').catch(e => ({ data: [] }))
            ]);
            setDepartments(deptRes.data || []);
            
            // Filter out self and handle nested data if needed
            const allEmps = empRes.data?.data || empRes.data || [];
            const filteredEmps = allEmps.filter(e => e.employeeCode !== user?.employeeCode);
            setEmployees(filteredEmps);

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
            const deptId = selectedDept === 'all' ? 0 : selectedDept;
            const res = await api.get(`/attendance/department/${deptId}/date/${selectedDate}`);
            // Backend returns { success: true, data: [...] }, so we need res.data.data
            const records = res.data?.data ?? res.data ?? [];
            setAttendance(Array.isArray(records) ? records : []);
        } catch (err) {
            console.error('Error fetching daily attendance:', err);
            setAttendance([]);
        }
    };

    const getAllDescendantIds = (deptId, allDepts) => {
        if (!deptId || deptId === 'all') return [];
        let ids = [deptId.toString()];
        const children = allDepts.filter(d => d.parentDepartmentId && d.parentDepartmentId.toString() === deptId.toString());
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, allDepts)];
        });
        return ids;
    };

    const filteredEmployees = useMemo(() => {
        const safeEmployees = Array.isArray(employees) ? employees : [];
        const safeDepts = Array.isArray(departments) ? departments : [];

        // Get all allowed department IDs (including sub-departments)
        const allowedDeptIds = selectedDept === 'all' 
            ? [] 
            : getAllDescendantIds(selectedDept, safeDepts);

        return safeEmployees.filter(emp => {
            if (!emp) return false;
            
            const matchesDept = selectedDept === 'all' || 
                (emp.departmentId && allowedDeptIds.includes(emp.departmentId.toString()));
            
            const name = (emp.fullName || '').toLowerCase();
            const code = (emp.employeeCode || '').toLowerCase();
            const query = (searchQuery || '').toLowerCase();
            
            const matchesSearch = !query || name.includes(query) || code.includes(query);
            return matchesDept && matchesSearch;
        });
    }, [employees, selectedDept, searchQuery, departments]);
    
    const visibleEmployees = useMemo(() => {
        return filteredEmployees.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    }, [filteredEmployees, page]);

    const totalPages = Math.ceil(filteredEmployees.length / PER_PAGE);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [selectedDept, searchQuery]);

    const stats = useMemo(() => {
        const safeEmployees = Array.isArray(filteredEmployees) ? filteredEmployees : [];
        const safeAttendance = Array.isArray(attendance) ? attendance : [];
        
        const total = safeEmployees.length;
        const clockedInCount = safeEmployees.filter(emp => 
            safeAttendance.some(rec => rec?.employeeId === emp?.id)
        ).length;
        const percent = total > 0 ? Math.round((clockedInCount / total) * 100) : 0;

        return { total, clockedInCount, percent };
    }, [filteredEmployees, attendance]);

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

    const exportDailyExcel = async () => {
        try {
            const deptId = selectedDept === 'all' ? 0 : selectedDept;
            const res = await attendanceService.exportDailyExcel(deptId, selectedDate);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `ChamCongNgay_${selectedDate}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Xuất file Excel thành công');
        } catch (err) {
            console.error('Error exporting daily attendance:', err);
            toast.error('Lỗi khi xuất file Excel');
        }
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
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Activity className="text-violet-600" size={28} />
                        Quản lý chấm công hàng ngày
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Theo dõi dữ liệu vào ra thực tế</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">Cập nhật thời gian thực</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={exportDailyExcel}
                        className="btn btn-ghost !py-2.5 !px-4 shadow-sm border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <FileDown size={18} /> Xuất Excel
                    </button>
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                        <Calendar size={16} className="text-slate-400 mr-2" />
                        <input 
                            type="date" 
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                        />
                    </div>
                    <button 
                        onClick={fetchInitialData}
                        className="btn btn-ghost !p-2.5 shadow-sm"
                        title="Làm mới"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Standard KPI Cards */}
            <div className={isMobile ? 'kpi-scroll mb-8' : 'grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'}>
                <div className="card !p-6 flex items-center gap-5 border-l-4 border-l-violet-500">
                    <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng nhân viên</p>
                        <h2 className="text-3xl font-black text-slate-800 stat-value">{stats.total}</h2>
                    </div>
                </div>

                <div className="card !p-6 flex items-center gap-5 border-l-4 border-l-emerald-500">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đã chấm công</p>
                        <h2 className="text-3xl font-black text-emerald-600 stat-value">
                            {stats.clockedInCount}
                        </h2>
                    </div>
                </div>

                <div className="card !p-6 flex items-center gap-5 border-l-4 border-l-amber-500">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <Activity size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỷ lệ hiện diện</p>
                            <span className="text-lg font-black text-amber-600">{stats.percent}%</span>
                        </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-amber-500 transition-all duration-1000" 
                                style={{ width: `${stats.percent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Department Tabs */}
            <TabFilter 
                tabs={[
                    { id: 'all', label: 'TẤT CẢ' },
                    { id: 'kd', label: 'PHÒNG KINH DOANH' },
                    { id: 'mkt', label: 'PHÒNG MARKETING' },
                    { id: 'sx', label: 'PHÒNG SẢN XUẤT' },
                ]}
                activeTabId={(() => {
                    if (selectedDept === 'all') return 'all';
                    const dept = departments.find(d => d.id.toString() === selectedDept);
                    if (!dept) return 'all';
                    const name = dept.departmentName?.toLowerCase() || '';
                    if (name.includes('kinh doanh')) return 'kd';
                    if (name.includes('marketing')) return 'mkt';
                    if (name.includes('sản xuất')) return 'sx';
                    return 'all';
                })()}
                onTabChange={(id) => {
                    if (id === 'all') setSelectedDept('all');
                    else {
                        const match = { kd: 'Kinh doanh', mkt: 'Marketing', sx: 'Sản xuất' }[id];
                        const dept = departments.find(d => d.departmentName?.toLowerCase().includes(match.toLowerCase()) && !d.parentDepartmentId);
                        if (dept) setSelectedDept(dept.id.toString());
                        else setSelectedDept('all');
                    }
                    setPage(1);
                }}
                className="mb-8"
            />

            {/* Standard Filter Bar */}
            <div className="card !p-4 bg-slate-50/50 border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo tên hoặc mã nhân viên..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input !pl-11 !py-2.5 bg-white border-slate-200 focus:bg-white font-bold"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 w-full md:w-auto">
                        <Filter size={16} className="text-slate-400" />
                        <select 
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-transparent text-sm font-bold outline-none cursor-pointer text-slate-700 min-w-[180px]"
                        >
                            <option value="all">Tất cả bộ phận</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id.toString()}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                <div className="table-mobile-scroll">
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
                            ) : visibleEmployees.map((emp, idx) => {
                                const status = getEmployeeStatus(emp.id);
                                const times = getTimes(emp.id);
                                const globalIdx = (page - 1) * PER_PAGE + idx + 1;
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-sm text-slate-400 group-hover:text-slate-600 transition-colors">{globalIdx}</td>
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

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {visibleEmployees.length} trên {filteredEmployees.length} nhân sự
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages || 1}</span>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 text-[10px] text-slate-400 text-center font-medium">
                Dữ liệu được cập nhật dựa trên thời gian thực từ trạm quét mã vạch.
            </div>
        </div>
    );
}
