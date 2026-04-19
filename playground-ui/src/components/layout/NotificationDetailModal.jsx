import React from 'react';
import { X, Clock, Calendar, Info, Bell, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export default function NotificationDetailModal({ notification, onClose }) {
    if (!notification) return null;

    const getIcon = (type, title) => {
        if (type === 'Overtime') return <Clock className="w-6 h-6 text-blue-600" />;
        if (type === 'Leave') {
            if (title.includes('DUYỆT')) return <CheckCircle className="w-6 h-6 text-green-600" />;
            if (title.includes('TỪ CHỐI')) return <XCircle className="w-6 h-6 text-red-600" />;
            return <Bell className="w-6 h-6 text-amber-600" />;
        }
        if (type === 'Adjustment') {
            if (title.includes('DUYỆT')) return <CheckCircle className="w-6 h-6 text-green-600" />;
            if (title.includes('TỪ CHỐI')) return <XCircle className="w-6 h-6 text-red-600" />;
            return <AlertCircle className="w-6 h-6 text-indigo-600" />;
        }
        return <Bell className="w-6 h-6 text-slate-600" />;
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

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-[50px] bg-black/50 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-lg rounded-none border border-[#999] shadow-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="px-4 py-2 border-b border-[#ccc] flex items-center justify-between bg-[#f4f4f4]">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center border border-[#eee] ${getIconBg(notification.type, notification.title)}`}>
                            {getIcon(notification.type, notification.title)}
                        </div>
                        <div>
                            <h3 className="font-bold text-[#333] text-[13px] leading-tight">Chi tiết thông báo</h3>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-[#ddd] border border-transparent hover:border-[#bbb] transition-colors text-[#666]"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <h2 className="text-[15px] font-bold text-[#333] mb-4">
                        {notification.title}
                    </h2>
                    
                    <div className="p-4 bg-[#f8f9fa] border border-[#e0e0e0] mb-6">
                        <p className="text-[#333] leading-relaxed text-[13px] whitespace-pre-wrap font-sans">
                            {notification.message}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-[11px] text-[#888] font-bold uppercase tracking-widest">
                            <Calendar className="w-3.5 h-3.5" />
                            Gửi vào: <span className="text-[#555]">{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        {notification.status === 'Read' && (
                            <div className="flex items-center gap-2 text-[11px] text-[#15803d] font-bold uppercase tracking-widest">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Đã xem: <span className="text-[#555]">{new Date(notification.readAt).toLocaleString('vi-VN')}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-[#fafafa] border-t border-[#eee] flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-1.5 bg-[#f8f9fa] border border-[#ccc] text-[#333] font-bold text-[12px] uppercase tracking-widest hover:bg-[#e2e6ea] transition-all active:scale-95"
                    >
                        Đóng
                    </button>
                    {notification.type === 'ShiftSwap' && (
                        <button 
                            onClick={() => {
                                // We'll need a way to navigate to the swap detail
                                // For now, we can use a custom event or a prop-based approach
                                window.location.href = `/requests/swap/${notification.relatedId}`;
                                onClose();
                            }}
                            className="px-4 py-1.5 bg-[#1a56db] text-white font-bold text-[12px] uppercase tracking-widest hover:bg-[#1e429f] transition-all active:scale-95 shadow-sm"
                        >
                            Xem chi tiết đơn
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
