import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, CheckCircle2, HelpCircle, X } from 'lucide-react';

/**
 * ConfirmDialog — Thay thế window.confirm() với giao diện đẹp, chuyên nghiệp.
 *
 * Props:
 *   open       — boolean: hiển thị hay không
 *   title      — string: tiêu đề modal
 *   message    — string | ReactNode: nội dung
 *   variant    — 'danger' | 'warning' | 'success' | 'info'  (default: 'warning')
 *   confirmLabel — string (default: 'Xác nhận')
 *   cancelLabel  — string (default: 'Hủy')
 *   loading    — boolean: nút xác nhận đang loading
 *   onConfirm  — function
 *   onCancel   — function
 */
export default function ConfirmDialog({
    open,
    title,
    message,
    variant = 'warning',
    confirmLabel = 'Xác nhận',
    cancelLabel = 'Hủy',
    loading = false,
    onConfirm,
    onCancel,
}) {
    if (!open) return null;

    const variants = {
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            confirmCls: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmCls: 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-400',
        },
        success: {
            icon: CheckCircle2,
            iconBg: 'bg-emerald-100',
            iconColor: 'text-emerald-600',
            confirmCls: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500',
        },
        info: {
            icon: HelpCircle,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            confirmCls: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        },
    };

    const v = variants[variant] || variants.warning;
    const Icon = v.icon;

    return createPortal(
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
            style={{ animation: 'confirmFadeIn 0.15s ease-out' }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={!loading ? onCancel : undefined}
            />

            {/* Dialog */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-5"
                style={{ animation: 'confirmSlideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
                {/* Close button */}
                <button
                    onClick={!loading ? onCancel : undefined}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Icon + Title */}
                <div className="flex flex-col items-center text-center gap-3 pt-2">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${v.iconBg}`}>
                        <Icon size={28} className={v.iconColor} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-800">{title}</h3>
                        {message && (
                            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2 ${v.confirmCls}`}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                </svg>
                                Đang xử lý...
                            </>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes confirmFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes confirmSlideUp {
                    from { opacity: 0; transform: translateY(16px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
}
