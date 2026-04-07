import React from 'react';
import { ChevronLeft } from 'lucide-react';

/**
 * BackButton - Nút Quay lại tái sử dụng với hiệu ứng animation premium
 *
 * Props:
 *   onClick  - hàm xử lý khi nhấn nút
 *   label    - nhãn nút (mặc định: "Quay lại")
 *   className - class Tailwind bổ sung (tuỳ chọn)
 */
export default function BackButton({ onClick, label = 'Quay lại', className = '' }) {
    return (
        <button
            onClick={onClick}
            className={`
                group flex items-center gap-1
                text-violet-600 font-semibold text-sm
                px-2 py-1 -ml-3
                rounded-lg
                hover:text-violet-700 hover:bg-violet-50
                active:bg-violet-100 active:-translate-x-2 active:shadow-[inset_2px_0_6px_rgba(109,40,217,0.12)]
                transition-all duration-200 ease-out
                w-fit select-none
                ${className}
            `.replace(/\s+/g, ' ').trim()}
        >
            <ChevronLeft
                size={18}
                strokeWidth={2.5}
                className="transition-transform duration-200 group-hover:-translate-x-1 group-active:-translate-x-2"
            />
            <span>{label}</span>
        </button>
    );
}
