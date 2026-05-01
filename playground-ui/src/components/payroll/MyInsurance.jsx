import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import {
    Shield, Heart, Umbrella, Briefcase, RefreshCw,
    CheckCircle, XCircle, AlertTriangle, Info, Save,
    ChevronDown, ChevronUp
} from 'lucide-react';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

const MANDATORY = [
    {
        key: 'isSocialEnabled',
        label: 'Bảo hiểm Xã hội',
        rate: '8%',
        icon: Shield,
        color: 'indigo',
        desc: 'Hưu trí, tử tuất, tai nạn lao động — bắt buộc theo pháp luật',
    },
    {
        key: 'isHealthEnabled',
        label: 'Bảo hiểm Y tế',
        rate: '1.5%',
        icon: Heart,
        color: 'rose',
        desc: 'Chi phí khám chữa bệnh tại các cơ sở y tế trong mạng lưới',
    },
    {
        key: 'isUnemploymentEnabled',
        label: 'Bảo hiểm Thất nghiệp',
        rate: '1%',
        icon: Umbrella,
        color: 'amber',
        desc: 'Hỗ trợ thu nhập khi mất việc làm không có lỗi của NLĐ',
    },
];

const VOLUNTARY = [
    {
        enableKey: 'isHealthcareEnabled',
        amountKey: 'healthcareAmount',
        label: 'Gói Chăm Sóc Sức Khỏe Toàn Diện',
        icon: Heart,
        color: 'emerald',
        desc: 'Chi trả khi khám chữa bệnh tại bệnh viện tư, quốc tế chất lượng cao. Không giới hạn số lần.',
    },
    {
        enableKey: 'isLifeInsuranceEnabled',
        amountKey: 'lifeInsuranceAmount',
        label: 'Quỹ Bảo Hiểm Nhân Thọ',
        icon: Briefcase,
        color: 'violet',
        desc: 'Kênh đầu tư ủy thác đóng phí dài hạn qua doanh nghiệp, bảo vệ trước rủi ro tài chính.',
    },
];

export default function MyInsurance({ user, onBack }) {
    const [insurance, setInsurance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showVoluntary, setShowVoluntary] = useState(true);

    useEffect(() => { fetchMyInsurance(); }, []);

    const fetchMyInsurance = async () => {
        setLoading(true);
        try {
            const empId = user?.employeeId || 0;
            const r = await api.get(`/Insurance/employee/${empId}`);
            setInsurance(r.data.data);
        } catch {
            toast.error('Không thể tải thông tin bảo hiểm');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/Insurance/my', {
                healthcareAmount: insurance.healthcareAmount,
                isHealthcareEnabled: insurance.isHealthcareEnabled,
                lifeInsuranceAmount: insurance.lifeInsuranceAmount,
                isLifeInsuranceEnabled: insurance.isLifeInsuranceEnabled,
                additionalInsuranceAmount: insurance.additionalInsuranceAmount,
                note: insurance.note,
                isSocialEnabled: insurance.isSocialEnabled,
                isHealthEnabled: insurance.isHealthEnabled,
                isUnemploymentEnabled: insurance.isUnemploymentEnabled,
            });
            toast.success('Đăng ký bảo hiểm tự nguyện thành công!');
        } catch {
            toast.error('Lỗi khi lưu thông tin');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <RefreshCw size={40} className="text-emerald-500 animate-spin" />
            <p className="text-slate-400 font-bold text-sm">Đang tải thông tin phúc lợi bảo hiểm...</p>
        </div>
    );

    if (!insurance) return (
        <div className="flex flex-col items-center justify-center py-32 gap-6 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                <AlertTriangle size={40} />
            </div>
            <div className="space-y-2">
                <h4 className="text-lg font-bold text-slate-800">Chưa Có Hồ Sơ Bảo Hiểm</h4>
                <p className="text-sm text-slate-400 max-w-sm font-medium">
                    Hệ thống chưa ghi nhận thông tin đóng bảo hiểm của bạn. Vui lòng liên hệ bộ phận nhân sự C&B.
                </p>
            </div>
        </div>
    );

    const totalVoluntary = (insurance.isHealthcareEnabled ? (insurance.healthcareAmount || 0) : 0)
        + (insurance.isLifeInsuranceEnabled ? (insurance.lifeInsuranceAmount || 0) : 0)
        + (insurance.additionalInsuranceAmount || 0);

    return (
        <div className="flex flex-col gap-6 animate-fade-up max-w-4xl mx-auto pb-10">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-100">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Phúc lợi Bảo hiểm</h3>
                        <p className="text-xs text-slate-400 font-medium">Tổng quan quyền lợi bảo hiểm bắt buộc và tự nguyện</p>
                    </div>
                </div>
                {onBack && (
                    <button onClick={onBack}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        Quay lại
                    </button>
                )}
            </div>

            {/* ── Mandatory Insurance ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Bảo hiểm Bắt buộc</h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Theo quy định pháp luật Việt Nam — Không thể thay đổi</p>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-black rounded-full uppercase tracking-wider">3 loại</span>
                </div>
                <div className="divide-y divide-slate-50">
                    {MANDATORY.map((item) => {
                        const active = insurance[item.key];
                        const Icon = item.icon;
                        const colorMap = { indigo: 'bg-indigo-50 text-indigo-600', rose: 'bg-rose-50 text-rose-600', amber: 'bg-amber-50 text-amber-600' };
                        return (
                            <div key={item.key} className="flex items-center gap-4 px-6 py-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[item.color]}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-slate-700">{item.label}</p>
                                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{item.rate} lương</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    {active ? (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-black rounded-full">
                                            <CheckCircle size={12} /> THAM GIA
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 text-[11px] font-black rounded-full">
                                            <XCircle size={12} /> CHƯA KÍCH HOẠT
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Voluntary Insurance ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <button
                    onClick={() => setShowVoluntary(!showVoluntary)}
                    className="w-full px-6 py-4 border-b border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="text-left">
                        <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">Gói Phúc lợi Tự nguyện</h4>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Đăng ký thêm các gói quyền lợi bổ sung</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {totalVoluntary > 0 && (
                            <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                                {fmt(totalVoluntary)}/tháng
                            </span>
                        )}
                        {showVoluntary ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                </button>

                {showVoluntary && (
                    <div className="divide-y divide-slate-50">
                        {VOLUNTARY.map((item) => {
                            const Icon = item.icon;
                            const enabled = insurance[item.enableKey];
                            const colorMap = {
                                emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'focus:ring-emerald-400 border-emerald-300 bg-emerald-50 text-emerald-700' },
                                violet: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'focus:ring-violet-400 border-violet-300 bg-violet-50 text-violet-700' },
                            };
                            const c = colorMap[item.color];
                            return (
                                <div key={item.enableKey} className={`px-6 py-5 transition-colors ${enabled ? 'bg-slate-50/50' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.bg} ${c.text}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <p className="text-sm font-bold text-slate-700">{item.label}</p>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={insurance[item.enableKey]}
                                                        onChange={() => setInsurance({ ...insurance, [item.enableKey]: !insurance[item.enableKey] })}
                                                    />
                                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                                </label>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-medium mb-3">{item.desc}</p>
                                            {enabled && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Mức đóng/tháng (VND):</span>
                                                    <input
                                                        type="number"
                                                        value={insurance[item.amountKey] || 0}
                                                        onChange={(e) => setInsurance({ ...insurance, [item.amountKey]: parseFloat(e.target.value) || 0 })}
                                                        className={`w-48 px-3 py-1.5 border rounded-xl text-sm font-bold text-right focus:outline-none focus:ring-2 shadow-sm ${c.ring}`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Additional / Note row */}
                        <div className="px-6 py-5">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                                    <Info size={18} />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 mb-1">Khoản thu bổ sung</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap">Số tiền (VND):</span>
                                            <input
                                                type="number"
                                                value={insurance.additionalInsuranceAmount || 0}
                                                onChange={(e) => setInsurance({ ...insurance, additionalInsuranceAmount: parseFloat(e.target.value) || 0 })}
                                                className="w-48 px-3 py-1.5 border border-slate-200 rounded-xl text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white shadow-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 mb-1">Ghi chú / Yêu cầu tư vấn</p>
                                        <textarea
                                            rows={2}
                                            value={insurance.note || ''}
                                            onChange={(e) => setInsurance({ ...insurance, note: e.target.value })}
                                            placeholder="Nhập ghi chú hoặc yêu cầu tư vấn gói bảo hiểm phù hợp với nhu cầu của bạn..."
                                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Notice + Save ── */}
            <div className="flex items-center gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                    <Info size={20} />
                </div>
                <p className="text-xs text-amber-700 font-medium flex-1 leading-relaxed">
                    <strong>Lưu ý:</strong> Mọi khoản chi phí bảo hiểm tự nguyện sẽ được xử lý tự động và đối trừ trực tiếp vào tổng thu nhập trước thuế hàng tháng (Gross). Có hiệu lực từ kỳ lương kế tiếp.
                </p>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-60 flex-shrink-0"
                >
                    {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Đang lưu...' : 'Xác nhận đăng ký'}
                </button>
            </div>
        </div>
    );
}
