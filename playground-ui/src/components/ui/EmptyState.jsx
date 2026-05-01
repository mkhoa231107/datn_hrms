import React from 'react';
import { Inbox, FileText, Users, Calendar, Search, AlertCircle, RefreshCw } from 'lucide-react';

const ICON_MAP = {
    default: Inbox,
    document: FileText,
    users: Users,
    calendar: Calendar,
    search: Search,
    error: AlertCircle,
};

/**
 * EmptyState — Component hiển thị trạng thái rỗng dùng chung.
 *
 * Props:
 *   icon       — keyof ICON_MAP | ReactNode (default: 'default')
 *   title      — string
 *   description — string
 *   action     — { label: string, onClick: fn }
 *   compact    — boolean: thu nhỏ kích thước (dùng trong bảng)
 */
export default function EmptyState({
    icon = 'default',
    title = 'Không có dữ liệu',
    description,
    action,
    compact = false,
}) {
    const Icon = typeof icon === 'string' ? (ICON_MAP[icon] || ICON_MAP.default) : null;
    const CustomIcon = typeof icon !== 'string' ? icon : null;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-10 gap-3' : 'py-20 gap-4'}`}>
            {/* Icon */}
            <div className={`rounded-2xl bg-slate-50 flex items-center justify-center ${compact ? 'w-12 h-12' : 'w-16 h-16'}`}>
                {Icon && <Icon size={compact ? 22 : 30} className="text-slate-300" />}
                {CustomIcon && <CustomIcon size={compact ? 22 : 30} className="text-slate-300" />}
            </div>

            {/* Text */}
            <div className="max-w-xs">
                <p className={`font-bold text-slate-500 ${compact ? 'text-sm' : 'text-base'}`}>
                    {title}
                </p>
                {description && (
                    <p className={`text-slate-400 mt-1 ${compact ? 'text-xs' : 'text-sm'}`}>
                        {description}
                    </p>
                )}
            </div>

            {/* Action */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors shadow-sm"
                >
                    {action.icon && <action.icon size={15} />}
                    {action.label}
                </button>
            )}
        </div>
    );
}
