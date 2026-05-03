import React, { useState, useEffect } from 'react';
import { 
    RefreshCw, Calendar, Signature, ArrowRightLeft, 
    CheckCircle2, Clock, XCircle, Search, 
    ChevronRight, Plus, Filter, Info, User,
    FileSignature, AlertCircle, CalendarCheck
} from 'lucide-react';
import shiftSwapService from '../../services/shiftSwapService';
import ShiftSwapRequestModal from './ShiftSwapRequestModal';
import ShiftSwapRequestDetail from './ShiftSwapRequestDetail';
import toast from 'react-hot-toast';
import TabFilter from '../ui/TabFilter';
import EmptyState from '../ui/EmptyState';

export default function ShiftChangeRequest({ user, onBack }) {
    const [loading, setLoading] = useState(true);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [viewingSwapId, setViewingSwapId] = useState(null);
    const [swapRequests, setSwapRequests] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const swaps = await shiftSwapService.getMyRequests();
            setSwapRequests(swaps);
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu hoán đổi ca');
        } finally {
            setLoading(false);
        }
    };

    const stats = {
        total: swapRequests.length,
        pending: swapRequests.filter(r => ['PendingPartner', 'PendingManager'].includes(r.status)).length,
        approved: swapRequests.filter(r => r.status === 'Approved').length
    };

    const myEmpId = user?.employeeId ?? user?.EmployeeId;

    const filteredRequests = swapRequests.filter(r => {
        const matchesSearch = r.employeeA?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             r.employeeB?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             r.id.toString().includes(searchTerm);
        
        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'pending') return matchesSearch && ['PendingPartner', 'PendingManager'].includes(r.status);
        if (activeTab === 'history') return matchesSearch && ['Approved', 'Rejected', 'Cancelled'].includes(r.status);
        return matchesSearch;
    });

    if (viewingSwapId) {
        return (
            <ShiftSwapRequestDetail 
                requestId={viewingSwapId} 
                onBack={() => { setViewingSwapId(null); fetchData(); }} 
                user={user}
            />
        );
    }

    const tabs = [
        { id: 'all', label: 'TẤT CẢ ĐƠN' },
        { id: 'pending', label: 'ĐANG XỬ LÝ', count: stats.pending },
        { id: 'history', label: 'LỊCH SỬ ĐƠN' }
    ];

    return (
        <div className="p-6 animate-fade-up">
            {/* ── Module Header (CNB_HR pattern) ── */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <ArrowRightLeft className="text-violet-600" size={28} />
                        Hoán đổi ca làm việc
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Quản lý các yêu cầu đổi ca và hoán đổi lịch làm việc</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm uppercase font-bold tracking-wider">Tự nguyện</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} />
                    </button>
                    <button 
                        onClick={() => setIsSwapModalOpen(true)}
                        className="btn btn-primary flex items-center gap-2 shadow-lg shadow-violet-200"
                    >
                        <Plus size={18} /> Tạo đơn đổi ca
                    </button>
                </div>
            </div>

            {/* ── KPI Cards (CNB_HR pattern) ── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Tổng số đơn', value: stats.total, icon: FileSignature, color: 'indigo', desc: 'Tất cả yêu cầu đã tạo' },
                    { label: 'Đang xử lý', value: stats.pending, icon: Clock, color: 'amber', desc: 'Chờ đối tác hoặc quản lý duyệt' },
                    { label: 'Đã hoàn thành', value: stats.approved, icon: CheckCircle2, color: 'emerald', desc: 'Hoán đổi thành công' },
                ].map(({ label, value, icon: Icon, color, desc }) => (
                    <div key={label} className={`card !p-4 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm relative overflow-hidden group`}>
                        <div className={`w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                            <Icon size={24} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                            <h3 className="text-2xl font-black text-slate-800">{value}</h3>
                            <p className="text-[10px] text-slate-400 font-medium truncate">{desc}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter Toolbar ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <TabFilter 
                    tabs={tabs}
                    activeTabId={activeTab}
                    onTabChange={setActiveTab}
                    className="mb-0"
                />
                <div className="relative w-full lg:w-72">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text"
                        placeholder="Tìm kiếm mã đơn, tên NV..."
                        className="input !pl-10 !py-2 w-full text-sm shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Requests Grid ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="card h-48 skeleton bg-slate-50/50 border-none" />
                    ))
                ) : filteredRequests.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState 
                            icon="document"
                            title="Không tìm thấy yêu cầu"
                            description={searchTerm ? "Thử tìm kiếm với từ khóa khác." : "Bạn chưa có yêu cầu đổi ca nào."}
                        />
                    </div>
                ) : (
                    filteredRequests.map(swap => {
                        const isMyTurn = myEmpId && parseInt(myEmpId) === parseInt(swap.employeeBId)
                                       && (swap.status === 'PendingPartner' || swap.status === 0);
                        
                        return (
                            <div 
                                key={swap.id} 
                                onClick={() => setViewingSwapId(swap.id)}
                                className={`card group p-0 overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl border-2 shadow-sm
                                    ${isMyTurn ? 'border-amber-400 bg-amber-50/10' : 'border-transparent hover:border-violet-200'}`}
                            >
                                {/* Card Header */}
                                <div className="px-4 py-3 bg-slate-50/50 flex justify-between items-center border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${swap.status === 'Approved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đơn #{swap.id}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border
                                        ${swap.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                          swap.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-100' : 
                                          swap.status === 'Cancelled' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                        {swap.status === 'PendingPartner' ? 'Chờ đối tác' : 
                                         swap.status === 'PendingManager' ? 'Chờ quản lý' : 
                                         swap.status === 'Approved' ? 'Thành công' : 
                                         swap.status === 'Rejected' ? 'Từ chối' : 
                                         swap.status === 'Cancelled' ? 'Đã hủy' : swap.status}
                                    </span>
                                </div>

                                <div className="p-5 space-y-4">
                                    {isMyTurn && (
                                        <div className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-white border border-amber-200 px-3 py-2 rounded-xl shadow-sm">
                                            <Signature size={14} />
                                            CẦN BẠN XÁC NHẬN (BÊN B)
                                        </div>
                                    )}

                                    {/* Swap Visualization */}
                                    <div className="flex items-center justify-between relative py-2">
                                        <div className="flex flex-col items-center gap-1.5 flex-1">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-600 border-2 border-white shadow-sm overflow-hidden">
                                                {swap.employeeA?.fullName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-800 truncate max-w-[80px]">{swap.employeeA?.fullName?.split(' ').pop()}</p>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bên A</span>
                                        </div>

                                        <div className="flex-shrink-0 px-2 flex flex-col items-center relative z-10">
                                            <div className="w-9 h-9 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center group-hover:rotate-180 transition-transform duration-500 shadow-sm border border-violet-100">
                                                <ArrowRightLeft size={16} />
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-1.5 flex-1">
                                            <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center font-black text-[10px] text-indigo-600 border-2 border-white shadow-sm overflow-hidden">
                                                {swap.employeeB?.fullName?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-800 truncate max-w-[80px]">{swap.employeeB?.fullName?.split(' ').pop()}</p>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bên B</span>
                                        </div>
                                    </div>

                                    {/* Date & Reason Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                                            <CalendarCheck size={14} className="text-violet-500" />
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian hoán đổi</p>
                                                <p className="text-xs font-black text-slate-700">
                                                    {new Date(swap.startDate).toLocaleDateString('vi-VN')} - {new Date(swap.endDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50/50 rounded-lg group-hover:bg-white transition-colors">
                                            <Info size={12} className="text-slate-300" />
                                            <span className="text-[10px] text-slate-400 font-medium line-clamp-1 italic">{swap.reason || 'Không có lý do chi tiết'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                            <Clock size={10} /> {new Date(swap.createdAt).toLocaleDateString('vi-VN')}
                                        </span>
                                        <div className="text-[10px] font-black text-indigo-600 group-hover:translate-x-1 transition-transform">
                                            CHI TIẾT <ChevronRight size={12} className="inline" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* ── Info Note (CNB_HR pattern) ── */}
            <div className="mt-8 card !p-4 bg-slate-50/50 border-slate-200/60 flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
                    <AlertCircle size={18} />
                </div>
                <span className="text-[11px] font-bold text-slate-500 leading-tight">
                    Việc hoán đổi ca làm việc là thỏa thuận tự nguyện giữa hai nhân viên. Đơn chỉ có hiệu lực sau khi <strong>cả hai bên xác nhận</strong> và được <strong>Quản lý trực tiếp</strong> phê duyệt trên hệ thống. Lịch làm việc mới sẽ tự động cập nhật sau khi đơn được duyệt thành công.
                </span>
            </div>
            
            <ShiftSwapRequestModal 
                isOpen={isSwapModalOpen} 
                onClose={() => setIsSwapModalOpen(false)} 
                onRefresh={fetchData} 
            />
        </div>
    );
}
