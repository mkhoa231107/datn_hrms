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
    XCircle
} from 'lucide-react';

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
        return <Bell className="w-5 h-5 text-slate-600" />;
    };

    const getIconBg = (type, title) => {
        if (type === 'Overtime') return 'bg-blue-50';
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
                className="absolute right-0 mt-2 w-[400px] bg-white rounded-none border border-[#ccc] shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right text-[#333]"
                style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
            >
                {/* Header */}
                <div className="px-4 py-2 border-b border-[#ccc] flex items-center justify-between bg-[#f4f4f4]">
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-[#1a56db]" />
                        <h3 className="font-bold text-[13px] text-[#333] uppercase">Thông báo</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {notifications.some(n => n.status === 'Unread') && (
                            <button 
                                onClick={handleMarkAllAsRead}
                                className="text-[11px] font-bold text-[#1a56db] hover:underline px-2 py-1 transition-colors uppercase"
                            >
                                Đọc tất cả
                            </button>
                        )}
                        <button onClick={onClose} className="p-1 hover:bg-[#ddd] border border-transparent hover:border-[#bbb] transition-colors">
                            <X className="w-4 h-4 text-[#666]" />
                        </button>
                    </div>
                </div>

                {/* List */}
                <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-10 text-center bg-white">
                            <div className="w-5 h-5 border-2 border-[#1a56db] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-[11px] text-[#999] font-bold uppercase tracking-widest">Đang tải...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-12 text-center bg-white">
                            <div className="w-12 h-12 bg-[#f4f4f4] border border-[#eee] rounded-none flex items-center justify-center mx-auto mb-4">
                                <Bell className="w-6 h-6 text-[#ccc]" />
                            </div>
                            <p className="text-[13px] font-bold text-[#aaa] uppercase tracking-widest">Không có thông báo mới</p>
                        </div>
                    ) : (
                        <div className="bg-white">
                            {notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    className={`p-4 border-b border-[#eee] last:border-0 transition-colors group cursor-pointer ${
                                        notif.status === 'Unread' ? 'bg-[#f0f7ff] hover:bg-[#e6effc]' : 'hover:bg-[#f5f5f5]'
                                    }`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div className="flex gap-4 relative">
                                        {notif.status === 'Unread' && (
                                            <div className="absolute -left-4 top-1 w-1 h-3 bg-[#1a56db]" />
                                        )}
                                        <div className={`w-10 h-10 border border-[#eee] flex items-center justify-center shrink-0 ${getIconBg(notif.type, notif.title)}`}>
                                            {getIcon(notif.type, notif.title)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-0.5">
                                                <p className={`text-[13px] ${notif.status === 'Unread' ? 'font-bold text-[#1a56db]' : 'text-[#333]'} truncate`}>
                                                    {notif.title}
                                                </p>
                                                <span className="text-[10px] text-[#999] font-bold uppercase whitespace-nowrap ml-2">
                                                    {getTimeAgo(notif.createdAt)}
                                                </span>
                                            </div>
                                            <p className={`text-[12px] leading-relaxed line-clamp-1 ${notif.status === 'Unread' ? 'text-[#555]' : 'text-[#888]'}`}>
                                                {notif.message}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] font-bold uppercase border px-2 py-0.5 ${
                                                    notif.type === 'Overtime' ? 'bg-[#f0f7ff] text-[#1a56db] border-[#1a56db]/30' : 
                                                    notif.type === 'Leave' ? 'bg-[#fef9c3] text-[#a16207] border-[#a16207]/30' : 
                                                    'bg-[#f5f3ff] text-[#4f46e5] border-[#4f46e5]/30'
                                                }`}>
                                                    {notif.type === 'Overtime' ? 'Tăng ca' : notif.type === 'Leave' ? 'Nghỉ phép' : 'Điều chỉnh'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2.5 bg-[#f9f9f9] border-t border-[#ccc] text-center">
                    <button className="text-[11px] font-bold text-[#666] hover:text-[#1a56db] uppercase tracking-widest transition-all">
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
