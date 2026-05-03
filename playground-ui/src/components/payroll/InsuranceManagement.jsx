import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { Search, ShieldCheck, Save, Loader2, Filter, User, RefreshCw, Building2, Users, CheckCircle2, Shield, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import TabFilter from '../ui/TabFilter';

export default function InsuranceManagement({ user, onBack }) {
    const [employees, setEmployees] = React.useState([]);
    const [allDepartments, setAllDepartments] = React.useState([]);
    const [mainDepartments, setMainDepartments] = React.useState([]);
    const [subDepartments, setSubDepartments] = React.useState([]);
    const [selectedMainId, setSelectedMainId] = React.useState(0);
    const [activeTabId, setActiveTabId] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(null); 
    const [searchQuery, setSearchQuery] = React.useState('');
    const [page, setPage] = React.useState(1);
    const PER_PAGE = 10;

    React.useEffect(() => {
        fetchDepartments();
    }, []);

    React.useEffect(() => {
        if (allDepartments.length > 0) {
            // Use loose equality for ID comparison
            const subs = allDepartments.filter(d => d.parentDepartmentId == selectedMainId).slice(0, 8);
            setSubDepartments(subs);
            if (subs.length > 0) {
                setActiveTabId(subs[0].id);
            } else if (selectedMainId) {
                setActiveTabId(selectedMainId);
            }
        }
    }, [selectedMainId, allDepartments]);

    React.useEffect(() => {
        if (activeTabId) {
            fetchInsuranceData(activeTabId);
        }
    }, [activeTabId]);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const res = await api.get('/Departments');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setAllDepartments(data);
            
            // Main departments are those with no parent or parent is 0
            const mains = data.filter(d => !d.parentDepartmentId || d.parentDepartmentId == 0);
            setMainDepartments(mains);
            
            if (mains.length > 0) {
                const firstId = mains[0].id;
                setSelectedMainId(firstId);
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            toast.error('Lỗi tải danh sách phòng ban');
        } finally {
            setLoading(false);
        }
    };

    const fetchInsuranceData = async (deptId) => {
        setLoading(true);
        try {
            const response = await api.get(`/Insurance/department/${deptId}`);
            // Explicitly check for successful response format
            const list = response.data?.data || response.data || [];
            setEmployees(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Error fetching insurance data:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (empId, data) => {
        setSaving(empId);
        try {
            await api.post(`/Insurance/employee/${empId}`, data);
            toast.success('Cập nhật thành công!');
            setEmployees(prev => prev.map(e => e.employeeId === empId ? { ...e, ...data } : e));
        } catch (error) {
            toast.error('Lỗi khi lưu dữ liệu');
        } finally {
            setSaving(null);
        }
    };

    const toggleField = (emp, field) => {
        const newData = {
            isSocialEnabled: emp.isSocialEnabled,
            isHealthEnabled: emp.isHealthEnabled,
            isUnemploymentEnabled: emp.isUnemploymentEnabled,
            isHealthcareEnabled: emp.isHealthcareEnabled,
            healthcareAmount: emp.healthcareAmount,
            isLifeInsuranceEnabled: emp.isLifeInsuranceEnabled,
            lifeInsuranceAmount: emp.lifeInsuranceAmount,
            additionalInsuranceAmount: emp.additionalInsuranceAmount,
            note: emp.note
        };
        newData[field] = !emp[field];
        handleUpdate(emp.employeeId, newData);
    };

    const handleAmountChange = (empId, val) => {
        setEmployees(prev => prev.map(e => e.employeeId === empId ? { ...e, additionalInsuranceAmount: parseFloat(val) || 0 } : e));
    };

    const filteredEmployees = React.useMemo(() => {
        const safeEmps = Array.isArray(employees) ? employees : [];
        return safeEmps.filter(e => 
            (e.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (e.employeeCode || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [employees, searchQuery]);

    const visibleEmployees = React.useMemo(() => {
        return filteredEmployees.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    }, [filteredEmployees, page]);

    const totalPages = Math.ceil(filteredEmployees.length / PER_PAGE);

    // Reset page when filters change
    React.useEffect(() => {
        setPage(1);
    }, [activeTabId, selectedMainId, searchQuery]);

    const stats = React.useMemo(() => {
        const safeEmps = Array.isArray(employees) ? employees : [];
        return {
            total: safeEmps.length,
            enrolled: safeEmps.filter(e => e.isSocialEnabled).length,
            healthcare: safeEmps.filter(e => e.isHealthcareEnabled).length,
            life: safeEmps.filter(e => e.isLifeInsuranceEnabled).length
        };
    }, [employees]);


    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ShieldCheck className="text-violet-600" size={28} />
                        Cấu hình Bảo hiểm Nhân viên
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Thiết lập các loại bảo hiểm bắt buộc và tự nguyện</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">Tự động áp dụng khi tính lương</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => fetchInsuranceData(activeTabId)} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} /> Làm mới
                    </button>
                    {onBack && <button onClick={onBack} className="btn btn-ghost font-bold shadow-sm">ĐÓNG</button>}
                </div>
            </div>

            {/* Standard Filter Bar */}
            <div className="card !p-4 bg-slate-50/50 border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Phòng ban chính</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200">
                        <Building2 size={16} className="text-slate-400" />
                        <select 
                            value={selectedMainId}
                            onChange={(e) => setSelectedMainId(parseInt(e.target.value))}
                            className="bg-transparent text-sm font-bold outline-none cursor-pointer text-slate-700 min-w-[200px]"
                        >
                            {mainDepartments.map(d => (
                                <option key={d.id} value={d.id}>{d.departmentName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col gap-1 flex-1 w-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tìm kiếm nhân sự</label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Tìm theo tên hoặc mã nhân viên..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input !pl-11 !py-2.5 bg-white border-slate-200"
                        />
                    </div>
                </div>

                <div className="hidden md:flex flex-col gap-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Hiển thị</label>
                    <div className="text-sm font-black text-slate-700 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
                        <h3 className="text-xl font-black text-slate-800">{stats.total}</h3> <span className="text-slate-400 font-medium">Nhân sự</span>
                    </div>
                </div>
            </div>

            {/* Sub-Department Tabs */}
            <TabFilter 
                tabs={subDepartments.length > 0 ? subDepartments.map(sub => ({
                    id: sub.id,
                    label: sub.departmentName.toUpperCase()
                })) : []}
                activeTabId={activeTabId}
                onTabChange={setActiveTabId}
                className="mb-6"
            />
            {subDepartments.length === 0 && (
                <div className="px-6 py-2 text-xs text-slate-400 italic mb-6">Không có bộ phận nhỏ trực thuộc</div>
            )}

            {/* Standard KPI Cards Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Tổng nhân sự', value: stats.total, icon: Users, color: 'violet' },
                    { label: 'Đã đóng BHXH', value: stats.enrolled, icon: Shield, color: 'emerald' },
                    { label: 'PVI Sức khỏe', value: stats.healthcare, icon: CheckCircle2, color: 'blue' },
                    { label: 'Bảo hiểm nhân thọ', value: stats.life, icon: ShieldCheck, color: 'amber' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`card !p-4 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm`}>
                        <div className={`w-10 h-10 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                            <Icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                            <h3 className="text-xl font-black text-slate-800 stat-value">{value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table */}
            <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[250px]">NHÂN VIÊN / BỘ PHẬN</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BHXH (8%)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BHYT (1.5%)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">BHTN (1%)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">PVI SỨC KHỎE</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">NHÂN THỌ</th>
                                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">GHI CHÚ / KHÁC</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">LƯU</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-20 text-center text-slate-400 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="animate-spin text-violet-500" size={32} />
                                            <span>Đang tải dữ liệu bảo hiểm...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        Không tìm thấy dữ liệu nhân viên phù hợp.
                                    </td>
                                </tr>
                            ) : visibleEmployees.map(e => (
                                <tr key={e.employeeId} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                {e.employeeName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-slate-700 truncate">{e.employeeName}</span>
                                                    {e.status === 2 && (
                                                        <span className="badge badge-success !text-[8px] !px-1.5 shrink-0">Chính thức</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                                                    <span>{e.employeeCode}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                                    <span className="truncate">{e.departmentName || 'Chưa gán'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-30"
                                            checked={e.isSocialEnabled} 
                                            onChange={() => toggleField(e, 'isSocialEnabled')} 
                                            disabled={e.status === 2}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-30"
                                            checked={e.isHealthEnabled} 
                                            onChange={() => toggleField(e, 'isHealthEnabled')} 
                                            disabled={e.status === 2}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer disabled:opacity-30"
                                            checked={e.isUnemploymentEnabled} 
                                            onChange={() => toggleField(e, 'isUnemploymentEnabled')} 
                                            disabled={e.status === 2}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                checked={e.isHealthcareEnabled} 
                                                onChange={() => toggleField(e, 'isHealthcareEnabled')} 
                                            />
                                            {e.isHealthcareEnabled && (
                                                <input 
                                                    type="number" 
                                                    value={e.healthcareAmount} 
                                                    className="input !py-1 !px-2 !text-[10px] w-20 text-right font-bold"
                                                    onChange={(ev) => setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, healthcareAmount: parseFloat(ev.target.value) || 0 } : item))}
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <input 
                                                type="checkbox" 
                                                className="w-5 h-5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                                checked={e.isLifeInsuranceEnabled} 
                                                onChange={() => toggleField(e, 'isLifeInsuranceEnabled')} 
                                            />
                                            {e.isLifeInsuranceEnabled && (
                                                <input 
                                                    type="number" 
                                                    value={e.lifeInsuranceAmount} 
                                                    className="input !py-1 !px-2 !text-[10px] w-20 text-right font-bold"
                                                    onChange={(ev) => setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, lifeInsuranceAmount: parseFloat(ev.target.value) || 0 } : item))}
                                                />
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            <input 
                                                type="number"
                                                placeholder="Khác (VND)"
                                                value={e.additionalInsuranceAmount}
                                                onChange={(ev) => handleAmountChange(e.employeeId, ev.target.value)}
                                                className="input !py-1 !px-2 !text-[10px] w-full text-right font-bold bg-slate-50"
                                            />
                                            <input 
                                                type="text"
                                                value={e.note || ''}
                                                placeholder="Ghi chú..."
                                                className="input !py-1 !px-2 !text-[10px] w-full"
                                                onChange={(ev) => {
                                                    const val = ev.target.value;
                                                    setEmployees(prev => prev.map(item => item.employeeId === e.employeeId ? { ...item, note: val } : item));
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => handleUpdate(e.employeeId, {
                                                isSocialEnabled: e.isSocialEnabled,
                                                isHealthEnabled: e.isHealthEnabled,
                                                isUnemploymentEnabled: e.isUnemploymentEnabled,
                                                isHealthcareEnabled: e.isHealthcareEnabled,
                                                healthcareAmount: e.healthcareAmount,
                                                isLifeInsuranceEnabled: e.isLifeInsuranceEnabled,
                                                lifeInsuranceAmount: e.lifeInsuranceAmount,
                                                additionalInsuranceAmount: e.additionalInsuranceAmount,
                                                note: e.note
                                            })}
                                            disabled={saving === e.employeeId}
                                            className={`btn !p-2 shadow-sm ${saving === e.employeeId ? 'btn-ghost' : 'btn-primary'}`}
                                        >
                                            {saving === e.employeeId ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
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
            
            <div className="mt-4 card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3">
                <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 leading-tight">
                    Hệ thống tự động áp dụng cấu hình bảo hiểm này khi tính lương kỳ tiếp theo. Đối với nhân viên chính thức, các mục BHXH/BHYT/BHTN là bắt buộc theo quy định pháp luật.
                </span>
            </div>
        </div>
    );
}

