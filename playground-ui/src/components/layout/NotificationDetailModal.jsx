import React from 'react';
import { X, Clock, Calendar, Bell, AlertCircle, CheckCircle, XCircle, DollarSign, FileText } from 'lucide-react';

export default function NotificationDetailModal({ notification, onClose }) {
    if (!notification) return null;

    const getIcon = (type, title) => {
        const iconClass = "w-6 h-6";
        if (type === 'Overtime') return <Clock className={`${iconClass} text-blue-500`} />;
        if (type === 'Payslip') return <DollarSign className={`${iconClass} text-violet-500`} />;
        if (type === 'Leave') {
            if (title.includes('DUYỆT')) return <CheckCircle className={`${iconClass} text-emerald-500`} />;
            if (title.includes('TỪ CHỐI')) return <XCircle className={`${iconClass} text-rose-500`} />;
            return <FileText className={`${iconClass} text-amber-500`} />;
        }
        if (type === 'Adjustment') {
            if (title.includes('DUYỆT')) return <CheckCircle className={`${iconClass} text-emerald-500`} />;
            if (title.includes('TỪ CHỐI')) return <XCircle className={`${iconClass} text-rose-500`} />;
            return <AlertCircle className={`${iconClass} text-indigo-500`} />;
        }
        return <Bell className={`${iconClass} text-secondary`} />;
    };

    const getIconBg = (type, title) => {
        if (type === 'Overtime') return 'bg-blue-500/10';
        if (type === 'Payslip') return 'bg-violet-500/10';
        if (type === 'Leave') {
            if (title.includes('DUYỆT')) return 'bg-emerald-500/10';
            if (title.includes('TỪ CHỐI')) return 'bg-rose-500/10';
            return 'bg-amber-500/10';
        }
        if (type === 'Adjustment') {
            if (title.includes('DUYỆT')) return 'bg-emerald-500/10';
            if (title.includes('TỪ CHỐI')) return 'bg-rose-500/10';
            return 'bg-indigo-500/10';
        }
        return 'bg-secondary/10';
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-center items-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-surface w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-400">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-elevated/30">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center border border-border ${getIconBg(notification.type, notification.title)}`}>
                            {getIcon(notification.type, notification.title)}
                        </div>
                        <div>
                            <h3 className="font-bold text-primary text-lg leading-tight">Chi tiết thông báo</h3>
                            <p className="text-secondary text-xs mt-1 uppercase tracking-wider font-semibold opacity-70">Hệ thống nhân sự</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-secondary/10 rounded-full transition-all text-secondary hover:text-primary active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-primary mb-5 leading-snug">
                        {notification.title}
                    </h2>
                    
                    <div className="p-5 bg-elevated/40 border border-border rounded-xl mb-8 relative group overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-accent opacity-50" />
                        <p className="text-primary/90 leading-relaxed text-[14px] whitespace-pre-wrap font-medium">
                            {notification.message}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-secondary/5 rounded-lg border border-border/50">
                            <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                <Calendar size={14} />
                            </div>
                            <div>
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Thời gian gửi</p>
                                <p className="text-sm font-semibold text-primary">{new Date(notification.createdAt).toLocaleString('vi-VN')}</p>
                            </div>
                        </div>
                        
                        {notification.status === 'Read' && (
                            <div className="flex items-center gap-3 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircle size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Đã xem lúc</p>
                                    <p className="text-sm font-semibold text-primary">{new Date(notification.readAt).toLocaleString('vi-VN')}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-elevated/20 border-t border-border flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="btn btn-ghost !px-6"
                    >
                        Đóng lại
                    </button>
                    {notification.type === 'ShiftSwap' && (
                        <button 
                            onClick={() => {
                                // For development/demo purposes
                                toast.success("Đang chuyển đến chi tiết đổi ca...");
                                onClose();
                            }}
                            className="btn btn-primary !px-6 shadow-lg shadow-accent/20"
                        >
                            Xem chi tiết đơn
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
