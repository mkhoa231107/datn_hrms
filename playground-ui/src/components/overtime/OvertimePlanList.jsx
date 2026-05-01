import React, { useState, useEffect, useMemo } from 'react';
import { overtimeService, departmentService } from '../../api';
import { 
    Plus, Calendar, Clock, CheckCircle2, AlertCircle, 
    TrendingUp, Filter, Send, LayoutGrid, List, 
    ChevronRight, Info, Search, MoreVertical, Trash2, 
    Briefcase, Sparkles, Target, Zap
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function OvertimePlanList({ user }) {
    const [plans, setPlans] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [newPlan, setNewPlan] = useState({
        departmentId: user?.departmentId || '',
        month: new Date().getMonth() === 11 ? 1 : new Date().getMonth() + 2,
        year: new Date().getMonth() === 11 ? new Date().getFullYear() + 1 : new Date().getFullYear(),
        totalBudgetHours: 0,
        description: ''
    });

    useEffect(() => {
        fetchPlans();
        fetchDepartments();
    }, []);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const res = await overtimeService.getPlans({
                departmentId: user?.roles?.includes('Admin') ? null : user?.departmentId
            });
            const dataArray = (res && res.data && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            setPlans(dataArray);
        } catch (error) {
            toast.error("Không thể tải danh sách kế hoạch");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const res = await departmentService.getAll();
            setDepartments(res || []);
        } catch (error) {
            console.error("Error fetching departments:", error);
        }
    };

    const handlePublish = async (id) => {
        try {
            await overtimeService.publishPlan(id);
            toast.success("Đã công bố ngân sách thành công");
            fetchPlans();
        } catch (error) {
            toast.error("Lỗi khi công bố kế hoạch");
        }
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        try {
            if (!newPlan.departmentId) return toast.error("Vui lòng chọn bộ phận");
            if (newPlan.totalBudgetHours <= 0) return toast.error("Ngân sách phải lớn hơn 0");
            if (!newPlan.description) return toast.error("Vui lòng nhập diễn giải");

            await overtimeService.createPlan(newPlan);
            toast.success("Thiết lập kế hoạch thành công");
            setShowCreateModal(false);
            fetchPlans();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi tạo kế hoạch");
        }
    };

    const filteredPlans = useMemo(() => {
        return plans.filter(p => 
            p.departmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [plans, searchTerm]);

    const stats = useMemo(() => {
        const approved = plans.filter(p => p.status === 'Approved');
        const draft = plans.filter(p => p.status === 'Draft');
        const totalHours = approved.reduce((acc, p) => acc + p.totalBudgetHours, 0);
        return { approved: approved.length, draft: draft.length, totalHours };
    }, [plans]);

    const currentYear = new Date().getFullYear();

    return (
        <div className="flex flex-col gap-8 animate-fade-up max-w-[1400px] mx-auto pb-20">
            {/* ── Dashboard Stats ── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card !rounded-[8px] group hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[8px] bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:scale-110">
                            <Target size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng ngân sách</p>
                            <p className="text-xl font-black text-slate-800 tabular-nums">{stats.totalHours}h</p>
                        </div>
                    </div>
                </div>
                <div className="card !rounded-[8px] group hover:border-emerald-100 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Đã công bố</p>
                            <p className="text-xl font-black text-slate-800 tabular-nums">{stats.approved}</p>
                        </div>
                    </div>
                </div>
                <div className="card !rounded-[8px] group hover:border-amber-100 transition-all">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Bản nháp</p>
                            <p className="text-xl font-black text-slate-800 tabular-nums">{stats.draft}</p>
                        </div>
                    </div>
                </div>
                <div className="card !rounded-[8px] bg-indigo-600 border-none relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-20 transition-transform group-hover:scale-125">
                        <Sparkles size={48} className="text-white" />
                    </div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-[8px] bg-white/20 text-white flex items-center justify-center">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">Phòng ban</p>
                            <p className="text-xl font-black text-white tabular-nums">{departments.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Header ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase leading-none mb-2">
                        Quản lý <span className="text-indigo-600">Ngân sách OT</span>
                    </h1>
                    <p className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Info size={14} className="text-indigo-500" />
                        Thiết lập hạn mức làm thêm giờ cho các đơn vị trực thuộc
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group w-full md:w-64">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Tìm kế hoạch..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input !pl-10 !bg-white"
                        />
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn btn-primary !px-6 shadow-xl shadow-indigo-100 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Lập kế hoạch mới
                    </button>
                </div>
            </div>

            {/* ── Main List ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(3).fill(0).map((_, i) => (
                        <div key={i} className="card !h-[260px] animate-pulse" />
                    ))
                ) : filteredPlans.length > 0 ? (
                    filteredPlans.map(plan => (
                        <div key={plan.id} className="card group !p-0 overflow-hidden flex flex-col hover:border-indigo-200 transition-all">
                            {/* Card Header */}
                            <div className="p-6 pb-4 flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-[8px] bg-slate-900 text-white flex items-center justify-center shadow-lg">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800 leading-none">Tháng {plan.month}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{plan.year}</p>
                                    </div>
                                </div>
                                <div className={`badge ${plan.status === 'Approved' ? 'badge-success' : 'badge-ghost'} !text-[9px]`}>
                                    {plan.status === 'Approved' ? 'Đã công bố' : 'Bản nháp'}
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="px-6 flex-1">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <p className="text-xs font-black text-slate-600 uppercase tracking-wide">{plan.departmentName}</p>
                                </div>
                                
                                <div className="bg-slate-50/50 p-4 rounded-[8px] border border-slate-100 mb-6 relative group/desc">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                        <Info size={10} /> Diễn giải
                                    </p>
                                    <p className="text-xs font-bold text-slate-500 leading-relaxed italic line-clamp-2 transition-all group-hover/desc:line-clamp-none">
                                        "{plan.description || 'Không có ghi chú chi tiết'}"
                                    </p>
                                </div>
                            </div>

                            {/* Card Footer */}
                            <div className="p-6 pt-0 mt-auto">
                                <div className="flex items-center justify-between p-4 bg-white rounded-[8px] border border-slate-100 shadow-sm">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Ngân sách</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-slate-800 tabular-nums leading-none">{plan.totalBudgetHours}</span>
                                            <span className="text-[10px] font-black text-slate-400 italic">giờ</span>
                                        </div>
                                    </div>

                                    {plan.status === 'Draft' ? (
                                        (user?.roles?.includes('DepartmentManager') || user?.roles?.includes('Admin')) && (
                                            <button 
                                                onClick={() => handlePublish(plan.id)}
                                                className="w-10 h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-indigo-100 group/btn"
                                            >
                                                <Send size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                            </button>
                                        )
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                            <CheckCircle2 size={18} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Accent Line */}
                            <div className="h-1 w-full bg-slate-50">
                                <div className={`h-full transition-all duration-1000 ${plan.status === 'Approved' ? 'bg-emerald-500 w-full' : 'bg-amber-400 w-1/3'}`} />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full card !border-dashed !bg-transparent !p-20 text-center opacity-50 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                            <List size={32} className="text-slate-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Chưa có kế hoạch nào</h3>
                            <p className="text-sm font-bold text-slate-400">Bắt đầu thiết lập ngân sách cho các đơn vị trực thuộc</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Modern Create Modal ── */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white rounded-[8px] w-full max-w-lg overflow-hidden shadow-2xl animate-zoom-in relative">
                        <div className="p-8 pb-0 flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-[8px] bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 leading-none mb-1">Lập kế hoạch mới</h3>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ngân sách làm thêm giờ</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreatePlan} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chu kỳ tháng</label>
                                    <select 
                                        value={newPlan.month}
                                        onChange={e => setNewPlan({...newPlan, month: parseInt(e.target.value)})}
                                        className="input !bg-slate-50 border-none font-black"
                                    >
                                        {[...Array(12)].map((_, i) => (
                                            <option key={i+1} value={i+1}>Tháng {i+1}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Năm</label>
                                    <select 
                                        value={newPlan.year}
                                        onChange={e => setNewPlan({...newPlan, year: parseInt(e.target.value)})}
                                        className="input !bg-slate-50 border-none font-black"
                                    >
                                        <option value={currentYear}>{currentYear}</option>
                                        <option value={currentYear + 1}>{currentYear + 1}</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bộ phận đích</label>
                                <select 
                                    value={newPlan.departmentId || ""}
                                    onChange={e => setNewPlan({...newPlan, departmentId: e.target.value === "" ? "" : parseInt(e.target.value)})}
                                    className="input !bg-slate-50 border-none font-black"
                                    disabled={!user?.roles?.includes('Admin') && !user?.roles?.includes('DepartmentManager')}
                                >
                                    <option value="">-- Chọn bộ phận --</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.departmentName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lý do tăng ca</label>
                                <textarea 
                                    value={newPlan.description}
                                    onChange={e => setNewPlan({...newPlan, description: e.target.value})}
                                    className="input !bg-slate-50 border-none font-bold min-h-[100px] resize-none py-3"
                                    placeholder="Diễn giải lý do tăng ca..."
                                />
                            </div>

                            <div className="bg-indigo-50 p-6 rounded-[8px] border border-indigo-100 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                    <Clock size={64} className="text-indigo-600" />
                                </div>
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block relative z-10">Ngân sách đề nghị (Giờ)</label>
                                <div className="flex items-center gap-3 relative z-10">
                                    <input 
                                        type="number"
                                        value={newPlan.totalBudgetHours}
                                        onChange={e => setNewPlan({...newPlan, totalBudgetHours: parseFloat(e.target.value)})}
                                        className="bg-transparent border-none p-0 text-5xl font-black text-indigo-700 outline-none w-full placeholder:text-indigo-200"
                                        placeholder="0"
                                    />
                                    <span className="text-xl font-black text-indigo-300 italic uppercase">Hours</span>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 btn btn-ghost"
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] btn btn-primary shadow-xl shadow-indigo-100"
                                >
                                    Tạo bản nháp
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}


