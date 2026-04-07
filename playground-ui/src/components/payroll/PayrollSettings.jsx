import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import { Settings, Percent, Wallet, Landmark, Save, RefreshCcw } from 'lucide-react';


export default function PayrollSettings({ onBack }) {
    const [settings, setSettings] = useState({
        socialInsuranceRate: 8.0,
        healthInsuranceRate: 1.5,
        unemploymentInsuranceRate: 1.0,
        personalDeductionAmount: 11000000,
        dependentDeductionAmount: 4400000,
        commonBaseSalary: 1800000,
        regionBaseSalary: 4680000
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const response = await api.get('/Payroll/settings');
            const data = response.data.data || response.data;
            if (data) setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            toast.error('Không thể tải cấu hình lương');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/Payroll/settings', settings);
            toast.success('Đã cập nhật cấu hình lương mới!');
            fetchSettings();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Lỗi khi lưu cấu hình');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="ef-wrap animate-in fade-in duration-500">
            <div className="ef-toolbar" style={{ borderBottom: 'none' }}>
                <div className="ef-toolbar-title">
                    <Settings size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Cấu hình tham số lương</strong>
                </div>
                {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
            </div>

            <div style={{ padding: '0 15px 15px' }}>
                <p className="text-slate-500 text-sm">Thiết lập các tỷ lệ đóng bảo hiểm và định mức thuế TNCN theo luật định</p>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Insurance Rates */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                <Percent className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-700">Tỷ lệ đóng bảo hiểm (Người lao động)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">BH Xã hội (%)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={settings.socialInsuranceRate}
                                    onChange={(e) => setSettings({...settings, socialInsuranceRate: parseFloat(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">BH Y tế (%)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={settings.healthInsuranceRate}
                                    onChange={(e) => setSettings({...settings, healthInsuranceRate: parseFloat(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">BH Thất nghiệp (%)</label>
                                <input 
                                    type="number" step="0.1"
                                    value={settings.unemploymentInsuranceRate}
                                    onChange={(e) => setSettings({...settings, unemploymentInsuranceRate: parseFloat(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Tax Deductions */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-700">Giảm trừ Thuế TNCN</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Giảm trừ bản thân (VND)</label>
                                <input 
                                    type="number"
                                    value={settings.personalDeductionAmount}
                                    onChange={(e) => setSettings({...settings, personalDeductionAmount: parseInt(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                                />
                                <p className="mt-1 text-[10px] text-slate-400 italic">Mặc định: 11,000,000đ</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Người phụ thuộc (VND)</label>
                                <input 
                                    type="number"
                                    value={settings.dependentDeductionAmount}
                                    onChange={(e) => setSettings({...settings, dependentDeductionAmount: parseInt(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700"
                                />
                                <p className="mt-1 text-[10px] text-slate-400 italic">Mặc định: 4,400,000đ</p>
                            </div>
                        </div>
                    </div>

                    {/* Base Salaries */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                <Landmark className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-700">Mức lương tham chiếu (Chặn trần bảo hiểm)</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lương cơ sở (VND)</label>
                                <input 
                                    type="number"
                                    value={settings.commonBaseSalary}
                                    onChange={(e) => setSettings({...settings, commonBaseSalary: parseInt(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-700"
                                />
                                <p className="mt-1 text-[10px] text-slate-400 italic">Dùng để chặn trần BHXH, BHYT (x20 lần)</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lương tối thiểu vùng (VND)</label>
                                <input 
                                    type="number"
                                    value={settings.regionBaseSalary}
                                    onChange={(e) => setSettings({...settings, regionBaseSalary: parseInt(e.target.value)})}
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-700"
                                />
                                <p className="mt-1 text-[10px] text-slate-400 italic">Vùng 1 (Hà Nội, TP.HCM): 4,680,000đ (dùng cho BHTN)</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl shadow-xl text-white">
                        <h3 className="font-bold text-lg mb-4">Lưu cấu hình</h3>
                        <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
                            Mọi thay đổi sẽ được áp dụng cho các bảng lương tính toán từ thời điểm lưu trở đi. Các bảng lương cũ đã chốt sẽ không bị ảnh hưởng.
                        </p>
                        <button 
                            type="submit"
                            disabled={saving}
                            className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            Cập nhật ngay
                        </button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Ghi chú quan trọng</h4>
                        <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4">
                            <li>BHXH chặn trần ở mức 20 lần lương cơ sở.</li>
                            <li>BHTN chặn trần ở mức 20 lần lương tối thiểu vùng.</li>
                            <li>Giảm trừ gia cảnh áp dụng cho từng nhân viên dựa trên hồ sơ người phụ thuộc.</li>
                        </ul>
                    </div>
                </div>
            </form>
        </div>
    );
}
