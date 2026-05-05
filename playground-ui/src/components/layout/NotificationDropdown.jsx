import React, { useState, useEffect, useRef } from 'react';
import notificationService from '../../services/notificationService';
import NotificationDetailModal from './NotificationDetailModal';
import { 
    Clock, 
    Calendar, 
    Bell, 
    AlertCircle, 
    CheckCircle2,
    ChevronRight,
    X,
    Info,
    FileText,
    CheckCircle,
    XCircle,
    DollarSign
} from 'lucide-react';
import { useSignalR } from '../../hooks/useSignalR';

export default function NotificationDropdown({ user, onClose }) {
    const [notifications, setNotifications] = useState([]);

    const [loading, setLoading] = useState(true);
    const [selectedNotif, setSelectedNotif] = useState(null);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();

        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 🔔 Lắng nghe real-time từ SignalR
    useSignalR({
        onNotification: (newNotif) => {
            // Thêm thông báo mới lên đầu danh sách
            setNotifications(prev => {
                // Tránh duplicate nếu fetch API và signalR về cùng lúc
                if (prev.some(n => n.id === newNotif.id)) return prev;
                return [newNotif, ...prev];
            });
        }
    });

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const res = await notificationService.getMyNotifications();
            if (res.success) {
                setNotifications(res.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await notificationService.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'Read', readAt: new Date().toISOString() } : n));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, status: 'Read', readAt: new Date().toISOString() })));
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    const handleNotificationClick = (notif) => {
        setSelectedNotif(notif);
        if (notif.status === 'Unread') {
            handleMarkAsRead(notif.id);
        }
    };

    const getIcon = (type, title) => {
        if (type === 'Overtime') return <Clock className="w-5 h-5 text-blue-600" />;
        if (type === 'Payslip') return <DollarSign className="w-5 h-5 text-violet-600" />;
        if (type === 'Leave') {
            if (title.includes('DUYỆT')) return <CheckCircle className="w-5 h-5 text-green-600" />;
            if (title.includes('TỪ CHỐI')) return <XCircle className="w-5 h-5 text-red-600" />;
            return <FileText className="w-5 h-5 text-amber-600" />;
        }
        if (type === 'Adjustment') {
            if (title.includes('DUYỆT')) return <CheckCircle className="w-5 h-5 text-green-600" />;
            if (title.includes('TỪ CHỐI')) return <XCircle className="w-5 h-5 text-red-600" />;
            return <AlertCircle className="w-5 h-5 text-indigo-600" />;
        }
        if (type === 'ShiftSwap') return <Calendar className="w-5 h-5 text-purple-600" />;
        return <Bell className="w-5 h-5 text-slate-600" />;
    };

    const getIconBg = (type, title) => {
        if (type === 'Overtime') return 'bg-blue-50';
        if (type === 'Payslip') return 'bg-violet-50';
        if (type === 'Leave') {
            if (title.includes('DUYỆT')) return 'bg-green-50';
            if (title.includes('TỪ CHỐI')) return 'bg-red-50';
            return 'bg-amber-50';
        }
        if (type === 'Adjustment') {
            if (title.includes('DUYỆT')) return 'bg-green-50';
            if (title.includes('TỪ CHỐI')) return 'bg-red-50';
            return 'bg-indigo-50';
        }
        if (type === 'ShiftSwap') return 'bg-purple-50';
        return 'bg-slate-50';
    };

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Vừa xong';
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d`;
        
        return date.toLocaleDateString('vi-VN');
    };

    return (
        <>
            <div 
                ref={dropdownRef}
                className="absolute right-[-60px] sm:right-0 mt-2 w-[calc(100vw-24px)] xs:w-[360px] sm:w-[400px] bg-surface rounded-lg border border-border shadow-2xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right text-primary"
            >
                {/* Header */}
                <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-elevated/50">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-accent" />
                        <h3 className="font-bold text-[13px] text-primary uppercase">Thông báo</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.some(n => n.status === 'Unread') && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-bold text-accent hover:underline px-2 py-1 transition-colors uppercase"
                            >
                                Đọc tất cả
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 hover:bg-accent/10 rounded transition-colors">
                            <X className="w-4 h-4 text-secondary" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center bg-surface">
                            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-[11px] text-secondary font-bold uppercase tracking-widest">Đang tải...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center bg-surface">
                            <div className="w-12 h-12 bg-elevated border border-border rounded-lg flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-6 h-6 text-secondary opacity-30" />
                            </div>
                            <p className="text-[13px] font-bold text-secondary uppercase tracking-widest">Không có thông báo mới</p>
                        </div>
                    ) : (
                        <div className="bg-surface">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={`relative p-5 border-b border-border/40 last:border-0 transition-all duration-300 group cursor-pointer ${
                                        notif.status === 'Unread' 
                                        ? 'bg-accent/[0.03] hover:bg-accent/[0.06]' 
                                        : 'hover:bg-elevated/60'
                                    }`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex gap-5 relative z-10">
                                        {/* Status Indicator */}
                                        {notif.status === 'Unread' && (
                                            <div className="absolute -left-5 top-0 w-1 h-full bg-accent shadow-[0_0_10px_rgba(167,139,250,0.5)]" />
                                        )}
                                        
                                        {/* Icon Container */}
                                        <div className={`w-11 h-11 rounded-2xl border border-border/50 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-300 ${getIconBg(notif.type, notif.title)}`}>
                                            {getIcon(notif.type, notif.title)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-1">
                                                <p className={`text-[14px] leading-snug ${notif.status === 'Unread' ? 'font-bold text-primary' : 'text-primary/90'} truncate group-hover:text-accent transition-colors`}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[10px] text-secondary font-bold uppercase tracking-tighter whitespace-nowrap ml-3 opacity-60">
                                                    {getTimeAgo(notif.createdAt)}
                                                </span>
                                            </div>
                                            
                                            <p className={`text-[12.5px] leading-relaxed line-clamp-2 mb-3 ${notif.status === 'Unread' ? 'text-primary/70' : 'text-secondary/80'}`}>
                                                {notif.message}
                                            </p>
                                            
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border tracking-widest ${
                                                    notif.type === 'Overtime' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                                                    notif.type === 'Leave' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                                                    notif.type === 'ShiftSwap' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' :
                                                    notif.type === 'Payslip' ? 'bg-violet-500/10 text-violet-500 border-violet-500/20' :
                                                    'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                                                }`}>
                                                    {notif.type === 'Overtime' ? 'Tăng ca' :
                                                     notif.type === 'Leave' ? 'Nghỉ phép' :
                                                     notif.type === 'ShiftSwap' ? 'Đổi ca' :
                                                     notif.type === 'Payslip' ? 'Phiếu lương' :
                                                     'Điều chỉnh'}
                                                </span>
                                                {notif.status === 'Unread' && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Decorative arrow on hover */}
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-0 top-1/2 -translate-y-1/2 text-accent">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-elevated/50 border-t border-border text-center">
                    <button className="text-[11px] font-bold text-secondary hover:text-accent uppercase tracking-widest transition-all">
                        Tất cả thông báo
                    </button>
                </div>
            </div>

            {/* Notification Detail Modal */}
            {selectedNotif && (
                <NotificationDetailModal 
                    notification={selectedNotif} 
                    onClose={() => setSelectedNotif(null)} 
                />
            )}
        </>
    );
}
