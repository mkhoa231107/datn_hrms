import React, { useState, useEffect } from 'react';
import { api, positionService, departmentService } from '../../api';
import { toast } from 'react-hot-toast';
import { Settings, Percent, Wallet, Landmark, Save, RefreshCw, LayoutDashboard, DollarSign, Users, Search, Filter, Building2, Calendar, Shield } from 'lucide-react';
import TabFilter from '../ui/TabFilter';

const fmt = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

export default function PayrollSettings({ onBack }) {
    const [activeTab, setActiveTab] = useState('overview');

    // Overview
    const [settings, setSettings] = useState({
        socialInsuranceRate: 8.0, healthInsuranceRate: 1.5, unemploymentInsuranceRate: 1.0,
        personalDeductionAmount: 11000000, dependentDeductionAmount: 4400000,
        commonBaseSalary: 1800000, regionBaseSalary: 4680000
    });
    const [saving, setSaving] = useState(false);

    // Positions
    const [positions, setPositions] = useState([]);

    // Employees
    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [searchEmp, setSearchEmp] = useState('');
    const [filterDept, setFilterDept] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = () => {
        api.get('/Payroll/settings').then(r => { const d = r.data?.data || r.data; if (d) setSettings(d); }).catch(() => {});
        positionService.getAll().then(d => setPositions(d || [])).catch(() => {});
        api.get('/Payroll/employee-profiles').then(r => setEmployees(r.data?.data || [])).catch(() => {});
        departmentService.getAll().then(d => setDepartments((d.data || d || []).filter(x => x.isActive))).catch(() => {});
    };

    const handleSaveOverview = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try { await api.post('/Payroll/settings', settings); toast.success('Đã cập nhật cấu hình!'); }
        catch { toast.error('Lỗi khi lưu cấu hình'); } finally { setSaving(false); }
    };

    const handleSavePosition = async (pos) => {
        try {
            await positionService.updateCoefficient(pos.id, pos.defaultCoefficient);
            await positionService.updateAllowances(pos.id, pos.defaultMealAllowance || 0, pos.defaultPhoneAllowance || 0, pos.defaultPetrolAllowance || 0, pos.defaultHousingAllowance || 0);
            toast.success(`Đã lưu cấu hình chức vụ: ${pos.positionName}`);
            positionService.getAll().then(d => setPositions(d || []));
        } catch { toast.error('Lỗi khi lưu'); }
    };

    const handlePosChange = (id, field, value) =>
        setPositions(positions.map(p => p.id === id ? { ...p, [field]: value } : p));

    const handleSaveEmpCoef = async (emp) => {
        try {
            await positionService.updateEmployeePayrollOverrides(
                emp.employeeId, 
                parseFloat(emp._coefOverride ?? emp.coefficient ?? 0),
                emp._mealOverride !== undefined ? (emp._mealOverride ? parseFloat(emp._mealOverride) : null) : emp.mealAllowance,
                emp._phoneOverride !== undefined ? (emp._phoneOverride ? parseFloat(emp._phoneOverride) : null) : emp.phoneAllowance,
                emp._petrolOverride !== undefined ? (emp._petrolOverride ? parseFloat(emp._petrolOverride) : null) : emp.petrolAllowance,
                emp._housingOverride !== undefined ? (emp._housingOverride ? parseFloat(emp._housingOverride) : null) : emp.housingAllowance
            );
            toast.success(`Đã lưu cấu hình cho ${emp.fullName}`);
            api.get('/Payroll/employee-profiles').then(r => setEmployees(r.data?.data || []));
        } catch { toast.error('Lỗi khi lưu cấu hình nhân viên'); }
    };

    const handleEmpChange = (id, field, value) => {
        setEmployees(employees.map(e => {
            if (e.employeeId !== id) return e;
            const fieldMap = {
                'coef': '_coefOverride',
                'meal': '_mealOverride',
                'phone': '_phoneOverride',
                'petrol': '_petrolOverride',
                'housing': '_housingOverride'
            };
            return { ...e, [fieldMap[field]]: value };
        }));
    };

    const filteredEmps = employees.filter(e => {
        const q = searchEmp.toLowerCase();
        const matchSearch = (e.fullName || '').toLowerCase().includes(q) || (e.employeeCode || '').toLowerCase().includes(q);
        const matchDept = filterDept ? e.departmentId === parseInt(filterDept) : true;
        return matchSearch && matchDept;
    });

    const tabs = [
        { id: 'overview', label: 'Tham số tổng quan', icon: LayoutDashboard },
        { id: 'position', label: 'Theo chức vụ', icon: Building2 },
        { id: 'employee', label: 'Theo nhân viên', icon: Users },
    ];

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Settings className="text-violet-600" size={28} />
                        Cấu hình Lương & Thuế
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Thiết lập các tham số tài chính, bảo hiểm và phụ cấp hệ thống</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">Cập nhật lần cuối: Hôm nay</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="btn btn-ghost shadow-sm">
                        <RefreshCw size={16} /> Làm mới
                    </button>
                    {onBack && <button onClick={onBack} className="btn btn-ghost font-black shadow-sm">ĐÓNG</button>}
                </div>
            </div>

            {/* Standard Tabs Layout */}
            <TabFilter 
                tabs={tabs.map(tab => ({
                    id: tab.id,
                    label: tab.label.toUpperCase(),
                    icon: tab.icon
                }))}
                activeTabId={activeTab}
                onTabChange={setActiveTab}
                className="mb-8"
            />

            <div className="animate-fade-in">
                {/* ── Tab: Tham số tổng quan ── */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            {/* Bảo hiểm section */}
                            <div className="card !p-8 border-slate-200/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Percent size={120} />
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Percent size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800">Tỷ lệ đóng bảo hiểm</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mức khấu trừ vào lương người lao động</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {[
                                        { label: 'BH Xã hội (%)', key: 'socialInsuranceRate', color: 'indigo' },
                                        { label: 'BH Y tế (%)', key: 'healthInsuranceRate', color: 'blue' },
                                        { label: 'BH Thất nghiệp (%)', key: 'unemploymentInsuranceRate', color: 'emerald' },
                                    ].map(f => (
                                        <div key={f.key} className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                                            <div className="relative">
                                                <input 
                                                    type="number" step="0.1" 
                                                    value={settings[f.key]}
                                                    onChange={e => setSettings({ ...settings, [f.key]: parseFloat(e.target.value) })}
                                                    className="input !py-3 !text-lg font-black text-slate-700 bg-slate-50/50 border-slate-200"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Thuế TNCN section */}
                            <div className="card !p-8 border-slate-200/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Wallet size={120} />
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Wallet size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800">Giảm trừ Thuế TNCN</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Định mức giảm trừ gia cảnh quy định bởi Nhà nước</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {[
                                        { label: 'Giảm trừ bản thân (VND)', key: 'personalDeductionAmount', note: 'Mặc định: 11,000,000đ' },
                                        { label: 'Người phụ thuộc (VND)', key: 'dependentDeductionAmount', note: 'Mặc định: 4,400,000đ' },
                                    ].map(f => (
                                        <div key={f.key} className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{f.label}</label>
                                            <input 
                                                type="number" 
                                                value={settings[f.key]}
                                                onChange={e => setSettings({ ...settings, [f.key]: parseInt(e.target.value) })}
                                                className="input !py-3 !text-lg font-black text-slate-700 bg-slate-50/50 border-slate-200"
                                            />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">{f.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Lương tham chiếu section */}
                            <div className="card !p-8 border-slate-200/60 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Landmark size={120} />
                                </div>
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                                        <Landmark size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-slate-800">Mức lương tham chiếu</h2>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dùng để tính mức trần bảo hiểm và thang lương</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lương cơ sở (VND)</label>
                                        <input 
                                            type="number" value={settings.commonBaseSalary}
                                            onChange={e => setSettings({ ...settings, commonBaseSalary: parseInt(e.target.value) })}
                                            className="input !py-3 !text-lg font-black text-slate-700 bg-slate-50/50 border-slate-200"
                                        />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">Dùng để chặn trần BHXH, BHYT (x20 lần)</p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Lương tối thiểu vùng (VND)</label>
                                        <select
                                            value={(() => {
                                                const wages = { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 };
                                                return Object.entries(wages).find(([, v]) => v === settings.regionBaseSalary)?.[0] ?? '1';
                                            })()}
                                            onChange={e => {
                                                const wages = { 1: 5310000, 2: 4730000, 3: 4140000, 4: 3700000 };
                                                setSettings({ ...settings, regionBaseSalary: wages[e.target.value] });
                                            }}
                                            className="input !py-3 !text-lg font-black text-slate-700 bg-slate-50/50 border-slate-200 cursor-pointer"
                                        >
                                            <option value="1">Vùng I — 5,310,000 đ</option>
                                            <option value="2">Vùng II — 4,730,000 đ</option>
                                            <option value="3">Vùng III — 4,140,000 đ</option>
                                            <option value="4">Vùng IV — 3,700,000 đ</option>
                                        </select>
                                        {(() => {
                                            const info = {
                                                5310000: { region: 'I', areas: 'Hà Nội, TP.HCM, Bình Dương, Đồng Nai...', cap: '106,200,000' },
                                                4730000: { region: 'II', areas: 'Hải Phòng, Đà Nẵng, Cần Thơ, Bà Rịa...', cap: '94,600,000' },
                                                4140000: { region: 'III', areas: 'Các tỉnh thành còn lại (thị xã, TP tỉnh)', cap: '82,800,000' },
                                                3700000: { region: 'IV', areas: 'Khu vực nông thôn còn lại', cap: '74,000,000' },
                                            }[settings.regionBaseSalary];
                                            return info ? (
                                                <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 mt-1">
                                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Vùng {info.region} · Nghị định 2026</p>
                                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{info.areas}</p>
                                                    <p className="text-[10px] font-bold text-rose-500 mt-0.5">Trần đóng BH tối đa: {info.cap} đ (×20)</p>
                                                </div>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Actions */}
                        <div className="space-y-6">
                            <div className="card !p-8 bg-violet-50 border-violet-100 shadow-xl shadow-violet-100/50">
                                <h3 className="text-xl font-black mb-4 text-violet-900">Lưu cấu hình</h3>
                                <p className="text-violet-600 text-sm font-semibold mb-8 leading-relaxed opacity-80">
                                    Mọi thay đổi tham số sẽ được áp dụng trực tiếp cho các kỳ tính lương tiếp theo. Dữ liệu lương đã chốt trong quá khứ sẽ không bị ảnh hưởng.
                                </p>
                                <button 
                                    onClick={handleSaveOverview}
                                    disabled={saving}
                                    className="w-full py-4 bg-violet-600 text-white font-black rounded-2xl hover:bg-violet-700 transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                    CẬP NHẬT THAM SỐ
                                </button>
                            </div>
                            
                            <div className="card !p-6 bg-slate-50 border-slate-200/60 shadow-sm">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Quy tắc nghiệp vụ</h4>
                                <div className="space-y-4">
                                    {[
                                        { text: 'BHXH chặn trần ở mức 20 lần lương cơ sở.', icon: Shield },
                                        { text: 'BHTN chặn trần ở mức 20 lần lương tối thiểu vùng.', icon: Shield },
                                        { text: 'Giảm trừ gia cảnh áp dụng theo hồ sơ người phụ thuộc đã duyệt.', icon: Users },
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-3 items-start">
                                            <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                                <item.icon size={12} className="text-slate-400" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 leading-tight">{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab: Theo chức vụ ── */}
                {activeTab === 'position' && (
                    <div className="space-y-6">
                        <div className="card !p-6 bg-slate-50 border-slate-200/60 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-violet-600 shadow-sm">
                                <Building2 size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-800">Cấu hình định mức theo Chức vụ</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Thiết lập hệ số và phụ cấp mặc định cho từng vị trí công tác</p>
                            </div>
                        </div>

                        <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">CHỨC VỤ</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">HỆ SỐ</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">ĂN CA (VNĐ)</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">ĐIỆN THOẠI</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">XĂNG XE</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">NHÀ Ở</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">LƯU</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {positions.map(pos => (
                                            <tr key={pos.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="font-black text-slate-700">{pos.positionName}</div>
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">TOÀN CÔNG TY</div>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input 
                                                        type="number" step="0.1" 
                                                        value={pos.defaultCoefficient || 1}
                                                        onChange={e => handlePosChange(pos.id, 'defaultCoefficient', parseFloat(e.target.value))}
                                                        className="input !py-2 !text-center !font-black !text-violet-600 bg-violet-50/50 border-violet-100"
                                                    />
                                                </td>
                                                {['defaultMealAllowance','defaultPhoneAllowance','defaultPetrolAllowance','defaultHousingAllowance'].map(field => (
                                                    <td key={field} className="px-4 py-4">
                                                        <input 
                                                            type="number" 
                                                            value={pos[field] || 0}
                                                            onChange={e => handlePosChange(pos.id, field, parseFloat(e.target.value))}
                                                            className="input !py-2 !text-right !font-bold text-slate-700"
                                                        />
                                                    </td>
                                                ))}
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => handleSavePosition(pos)}
                                                        className="btn btn-ghost !p-2 shadow-sm text-slate-400 hover:text-emerald-600 border border-slate-200"
                                                    >
                                                        <Save size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab: Theo nhân viên ── */}
                {activeTab === 'employee' && (
                    <div className="space-y-6">
                        <div className="card !p-6 bg-slate-50 border-slate-200/60 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600 shadow-sm">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">Cấu hình riêng theo Nhân sự</h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-0.5">Ưu tiên áp dụng các giá trị ghi đè cho từng cá nhân cụ thể</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-80">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Tìm theo tên hoặc mã nhân sự..."
                                        value={searchEmp} 
                                        onChange={e => setSearchEmp(e.target.value)}
                                        className="input !pl-11 !py-2.5 bg-white border-slate-200"
                                    />
                                </div>
                                <select 
                                    className="input !py-2.5 bg-white border-slate-200 w-48 font-bold text-sm"
                                    value={filterDept} 
                                    onChange={e => setFilterDept(e.target.value)}
                                >
                                    <option value="">Tất cả phòng ban</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">NHÂN VIÊN</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">HỆ SỐ</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">ĂN CA</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">ĐIỆN THOẠI</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">XĂNG XE</th>
                                            <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-36">NHÀ Ở</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">LƯU</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredEmps.map((emp) => {
                                            const hasOverrideCoef = (emp._coefOverride !== undefined ? parseFloat(emp._coefOverride) : emp.coefficient) > 0;
                                            const displayCoef = emp._coefOverride !== undefined ? emp._coefOverride : (emp.coefficient || '');
                                            
                                            const displayMeal = emp._mealOverride !== undefined ? emp._mealOverride : (emp.mealAllowance ?? '');
                                            const displayPhone = emp._phoneOverride !== undefined ? emp._phoneOverride : (emp.phoneAllowance ?? '');
                                            const displayPetrol = emp._petrolOverride !== undefined ? emp._petrolOverride : (emp.petrolAllowance ?? '');
                                            const displayHousing = emp._housingOverride !== undefined ? emp._housingOverride : (emp.housingAllowance ?? '');
                                            
                                            return (
                                                <tr key={emp.employeeId} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-white border border-slate-100 transition-colors">
                                                                {emp.fullName.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-slate-700">{emp.fullName}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.employeeCode} · {emp.positionName}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        <input 
                                                            type="number" step="0.1" min="0" value={displayCoef}
                                                            placeholder={emp.positionCoefficient?.toString() || "1"}
                                                            onChange={e => handleEmpChange(emp.employeeId, 'coef', e.target.value)}
                                                            className={`input !py-2 !text-center !font-black shadow-sm ${
                                                                hasOverrideCoef
                                                                    ? 'bg-violet-50 text-violet-600 border-violet-200'
                                                                    : 'bg-white border-slate-200 text-slate-500'
                                                            }`} 
                                                        />
                                                    </td>
                                                    {[
                                                        { field: 'meal', val: displayMeal, override: emp.mealAllowance !== null || emp._mealOverride !== undefined },
                                                        { field: 'phone', val: displayPhone, override: emp.phoneAllowance !== null || emp._phoneOverride !== undefined },
                                                        { field: 'petrol', val: displayPetrol, override: emp.petrolAllowance !== null || emp._petrolOverride !== undefined },
                                                        { field: 'housing', val: displayHousing, override: emp.housingAllowance !== null || emp._housingOverride !== undefined }
                                                    ].map(item => (
                                                        <td key={item.field} className="px-4 py-4">
                                                            <input 
                                                                type="number" min="0" value={item.val}
                                                                placeholder="Mặc định"
                                                                onChange={e => handleEmpChange(emp.employeeId, item.field, e.target.value)}
                                                                className={`input !py-2 !text-right !font-bold shadow-sm ${
                                                                    item.override ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white border-slate-200 text-slate-500'
                                                                }`} 
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            onClick={() => handleSaveEmpCoef(emp)}
                                                            className="btn btn-ghost !p-2 shadow-sm text-slate-400 hover:text-emerald-600 border border-slate-200"
                                                        >
                                                            <Save size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
