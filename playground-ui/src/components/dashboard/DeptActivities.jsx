import React, { useState, useEffect, useMemo } from 'react';
import { auditLogService } from '../../api';
import {
    Activity, Clock, Info,
    RefreshCw, Search, Filter,
    ArrowRight, Calendar, Umbrella,
    CheckCircle2, XCircle, Edit,
    User as UserIcon, Shield, Layers,
    ChevronRight, Eye, Globe, Zap,
    MoreHorizontal, Hash, Terminal, ChevronLeft
} from 'lucide-react';
import TabFilter from '../ui/TabFilter';

export default function DeptActivities({ user, onBack }) {
    const roles = user?.roles || [];
    const isTeamLeader = roles.includes('TeamLeader');
    const label = isTeamLeader ? 'Tổ' : (roles.includes('DepartmentHead') || roles.includes('DepartmentManager') ? 'Phòng ban' : 'Đơn vị');

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [activeDeptTab, setActiveDeptTab] = useState('All');
    const [selectedLog, setSelectedLog] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [page, setPage] = useState(1);
    const PER_PAGE = 15;

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await auditLogService.getDepartmentActivities();
            // Lọc bỏ thao tác của chính mình và Lọc Spam (De-duplication)
            const seen = new Set();
            const othersLogs = [];
            
            data.forEach(l => {
                if (l.userId === user?.id) return;
                
                // Key để nhận diện spam: cùng User, cùng Hành động, cùng Giây
                const timeKey = new Date(l.createdAt).toISOString().split('.')[0]; // Lấy đến giây
                const spamKey = `${l.userId}-${l.action}-${timeKey}`;
                
                if (!seen.has(spamKey)) {
                    seen.add(spamKey);
                    
                    let processedLog = { ...l };
                    const name = l.userFullName || '';
                    if (name.includes('Lê Thị Thảo')) processedLog.userDepartmentName = 'Tổ Lương Thưởng';
                    
                    othersLogs.push(processedLog);
                }
            });
            
            setLogs(othersLogs);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionLabel = (action, entityType) => {
        if (action.includes('approve')) return `Phê duyệt ${entityType}`;
        if (action.includes('reject')) return `Từ chối ${entityType}`;
        const method = action.split(' ')[0];
        if (method === 'POST') return `Tạo mới ${entityType}`;
        if (method === 'PUT') return `Cập nhật ${entityType}`;
        if (method === 'DELETE') return `Xóa ${entityType}`;
        if (method === 'PATCH') return `Sửa ${entityType}`;
        return action;
    };

    const getMethodMeta = (action) => {
        if (action.includes('approve')) return { label: 'Duyệt', cls: 'badge-success', icon: CheckCircle2 };
        if (action.includes('reject')) return { label: 'Từ chối', cls: 'badge-danger', icon: XCircle };
        const method = action.split(' ')[0];
        if (method === 'POST') return { label: 'Tạo mới', cls: 'bg-blue-50 text-blue-600 border-blue-100', icon: Zap };
        if (method === 'PUT') return { label: 'Cập nhật', cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: Edit };
        if (method === 'DELETE') return { label: 'Xóa', cls: 'badge-danger', icon: XCircle };
        return { label: method, cls: 'badge-accent', icon: Activity };
    };

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesTab = activeDeptTab === 'All' || log.userDepartmentName?.toLowerCase().includes(activeDeptTab.toLowerCase());
            const matchesSearch =
                log.userFullName?.toLowerCase().includes(search.toLowerCase()) ||
                log.action.toLowerCase().includes(search.toLowerCase()) ||
                log.entityType.toLowerCase().includes(search.toLowerCase());
            const matchesFilter = filter === 'All' || log.entityType === filter;
            return matchesTab && matchesSearch && matchesFilter;
        });
    }, [logs, activeDeptTab, search, filter]);

    const totalPages = Math.ceil(filteredLogs.length / PER_PAGE);
    const visibleLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const stats = useMemo(() => {
        const today = new Date().toLocaleDateString();
        return {
            total: logs.length,
            today: logs.filter(l => new Date(l.createdAt).toLocaleDateString() === today).length,
            entities: new Set(logs.map(l => l.entityType)).size,
            activeDept: [...new Set(logs.map(l => l.userDepartmentName))].length
        };
    }, [logs]);

    const entityTypes = ['All', ...new Set(logs.map(l => l.entityType))];
    const deptTabs = ['All', ...new Set(logs.map(l => l.userDepartmentName).filter(Boolean))];

    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.split(' ');
        if (parts.length < 2) return name.substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    };

    const handleOpenDetail = (log) => {
        setSelectedLog(log);
        setShowModal(true);
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[8px] bg-indigo-600 text-white flex items-center justify-center shadow-lg relative overflow-hidden">
                        <Activity size={24} className="relative z-10" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nhật ký hoạt động</h3>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 animate-pulse">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                LIVE
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 font-medium tracking-wide">
                            {label} &middot; Giám sát toàn bộ thay đổi hệ thống
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchLogs} 
                        disabled={loading}
                        className="btn btn-ghost !py-2 hover:!bg-white"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Làm mới
                    </button>
                    {onBack && (
                        <button onClick={onBack} className="btn btn-primary !py-2 px-5">
                            Quay lại
                        </button>
                    )}
                </div>
            </div>

            {/* ── Summary Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Tổng hoạt động', val: stats.total, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Thao tác hôm nay', val: stats.today, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Phòng ban quản lý', val: stats.activeDept, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Loại thực thể', val: stats.entities, icon: Layers, color: 'text-rose-600', bg: 'bg-rose-50' },
                ].map((s, i) => (
                    <div key={i} className="card !p-4 !rounded-[8px] flex items-center gap-4 group">
                        <div className={`w-12 h-12 rounded-[8px] ${s.bg} ${s.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                            <p className="text-xl font-black text-slate-700 leading-none">{s.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Filter & Tabs Container ── */}
            <div className="card !p-0 !rounded-[8px] overflow-hidden border-none shadow-xl shadow-indigo-100/20">
                {/* Tabs Bar - Show for Admin or DepartmentManager (Trưởng phòng) */}
                {(roles.includes('Admin') || roles.includes('DepartmentManager')) && (
                    <TabFilter 
                        tabs={deptTabs.map(deptName => ({
                            id: deptName,
                            label: (deptName === 'All' ? 'TẤT CẢ ĐƠN VỊ' : deptName.toUpperCase())
                        }))}
                        activeTabId={activeDeptTab}
                        onTabChange={(id) => {
                            setActiveDeptTab(id);
                            setPage(1);
                        }}
                        className="mb-0 border-b border-slate-100"
                    />
                )}

                {/* Filters Bar */}
                <div className="p-4 flex flex-col md:flex-row md:items-center gap-4 bg-white/50 backdrop-blur-md">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm người thực hiện, hành động hoặc mã bản ghi..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="input !pl-11 !py-2.5 !bg-slate-50/50 border-transparent hover:border-slate-200 focus:!bg-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                            <Filter size={14} className="text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Đối tượng:</span>
                            <select
                                value={filter}
                                onChange={(e) => {
                                    setFilter(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-transparent border-none text-xs font-bold text-slate-600 outline-none cursor-pointer min-w-[120px]"
                            >
                                {entityTypes.map(type => (
                                    <option key={type} value={type}>{type === 'All' ? 'Tất cả' : type}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4 text-left">Người thực hiện</th>
                                <th className="px-6 py-4 text-left">Thời gian</th>
                                <th className="px-6 py-4 text-left">Nội dung hành động</th>
                                <th className="px-6 py-4 text-left">Thực thể</th>
                                <th className="px-6 py-4 text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                                            <p className="text-sm text-slate-400 font-medium">Đang tải nhật ký...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <Activity size={48} />
                                            <p className="text-sm font-bold">Không tìm thấy hoạt động nào</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : visibleLogs.map((log) => {
                                const meta = getMethodMeta(log.action);
                                const ActionIcon = meta.icon;
                                return (
                                    <tr 
                                        key={log.id} 
                                        onClick={() => handleOpenDetail(log)}
                                        className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-black border border-white shadow-sm">
                                                    {getInitials(log.userFullName)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-700">{log.userFullName}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Shield size={10} />
                                                        {log.userRoleName || 'NHÂN VIÊN'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-600">
                                                {new Date(log.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="text-xs font-semibold text-slate-700">
                                                    {getActionLabel(log.action, log.entityType)}
                                                </div>
                                                {log.entityId && (
                                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 w-fit">
                                                        #{log.entityId}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-slate-400">{log.entityType}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold flex items-center gap-1.5 ${meta.cls}`}>
                                                    <ActionIcon size={10} />
                                                    {meta.label}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 text-slate-300 flex items-center justify-center hover:text-indigo-600 hover:border-indigo-100 hover:shadow-sm transition-all group-hover:bg-white">
                                                <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {visibleLogs.length} trên {filteredLogs.length} hoạt động
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2 min-w-[100px] text-center">
                            Trang {page} / {totalPages || 1}
                        </span>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Slide-over Detail Modal ── */}
            {selectedLog && (
                <div 
                    className={`fixed inset-0 z-[1000] flex justify-end transition-opacity duration-300 ${
                        showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    }`}
                >
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setShowModal(false)}
                    />
                    
                    {/* Content Container */}
                    <div 
                        className={`relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                            showModal ? 'translate-x-0' : 'translate-x-full'
                        }`}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[8px] bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold text-slate-800">Chi tiết hoạt động</h4>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">LOG ID: #{selectedLog.id}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)}
                                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <XCircle size={18} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Performer Info */}
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Người thực hiện</h5>
                                <div className="flex items-center gap-4 p-4 rounded-[8px] bg-slate-50 border border-slate-100">
                                    <div className="w-12 h-12 rounded-full bg-white text-indigo-600 flex items-center justify-center text-lg font-black shadow-sm">
                                        {getInitials(selectedLog.userFullName)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700">{selectedLog.userFullName}</div>
                                        <div className="text-xs font-medium text-slate-400">{selectedLog.userDepartmentName || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Activity Summary */}
                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin chung</h5>
                                <div className="grid grid-cols-1 gap-3">
                                    {[
                                        { label: 'Thời gian', val: new Date(selectedLog.createdAt).toLocaleString('vi-VN'), icon: Clock },
                                        { label: 'Hành động', val: selectedLog.action, icon: Terminal },
                                        { label: 'Thực thể', val: `${selectedLog.entityType} ${selectedLog.entityId ? '#' + selectedLog.entityId : ''}`, icon: Hash },
                                        { label: 'Địa chỉ IP', val: selectedLog.ipAddress || 'Internal System', icon: Globe },
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-[8px] border border-slate-50 bg-white shadow-sm">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <item.icon size={14} />
                                                {item.label}
                                            </div>
                                            <div className="text-xs font-bold text-slate-600">{item.val}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Payload Data */}
                            {selectedLog.newValue && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dữ liệu Payload (JSON)</h5>
                                        <button className="text-[10px] font-bold text-indigo-600 hover:underline">Sao chép</button>
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Terminal size={12} className="text-slate-400" />
                                        </div>
                                        <pre className="p-4 rounded-[8px] bg-slate-900 text-slate-300 text-[11px] leading-relaxed overflow-x-auto font-mono custom-scrollbar">
                                            {(() => {
                                                try { return JSON.stringify(JSON.parse(selectedLog.newValue), null, 2); }
                                                catch { return selectedLog.newValue; }
                                            })()}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="btn btn-primary w-full shadow-lg shadow-indigo-100"
                            >
                                Đóng chi tiết
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

