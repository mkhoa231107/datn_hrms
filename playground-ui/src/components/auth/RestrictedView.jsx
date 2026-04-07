import React from 'react';
import { Lock, FileSignature } from 'lucide-react';

export default function RestrictedView({ title, description, onGoToContract }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6 text-center animate-in fade-in zoom-in duration-300">
      <div className="relative">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-pulse">
          <Lock className="w-12 h-12" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border-4 border-amber-50 rounded-full flex items-center justify-center text-amber-500 shadow-sm">
          <FileSignature className="w-5 h-5" />
        </div>
      </div>
      
      <div className="max-w-md space-y-2">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          Tính năng bị khóa
        </h2>
        <p className="text-slate-500 font-medium px-4">
          {description || "Bạn cần hoàn tất ký kết hợp đồng lao động để có thể truy cập nội dung này."}
        </p>
      </div>

      <button 
        onClick={onGoToContract}
        className="group relative inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-200"
      >
        <span>Đi đến ký hợp đồng</span>
        <FileSignature className="w-4 h-4 group-hover:rotate-12 transition-transform" />
      </button>
      
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest pt-4">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
        Bảo mật hệ thống HRMS Net
        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}
