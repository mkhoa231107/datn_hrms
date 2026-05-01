import React, { useState, useEffect } from 'react';
import { api, positionService, departmentService } from '../../api';
import { toast } from 'react-hot-toast';
import { Settings, Percent, Wallet, Landmark, Save, RefreshCcw, LayoutDashboard, DollarSign, Users, Search, Filter, Building2 } from 'lucide-react';

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
        api.get('/Payroll/settings').then(r => { const d = r.data?.data || r.data; if (d) setSettings(d); }).catch(() => {});
        positionService.getAll().then(d => setPositions(d || [])).catch(() => {});
        api.get('/Payroll/employee-profiles').then(r => setEmployees(r.data?.data || [])).catch(() => {});
        departmentService.getAll().then(d => setDepartments((d.data || d || []).filter(x => x.isActive))).catch(() => {});
    }, []);

    const handleSaveOverview = async (e) => {
        e.preventDefault(); setSaving(true);
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
        const matchSearch = e.fullName?.toLowerCase().includes(q) || e.employeeCode?.toLowerCase().includes(q);
        const matchDept = filterDept ? e.departmentId === parseInt(filterDept) : true;
        return matchSearch && matchDept;
    });

    const tabs = [
        { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'position', label: 'Cấu hình theo chức vụ', icon: Building2 },
        { id: 'employee', label: 'Cấu hình theo nhân viên', icon: Users },
    ];

    return (
        <div className="ef-wrap animate-in fade-in duration-500 bg-slate-50 min-h-full pb-20">
            <div className="ef-toolbar" style={{ borderBottom: 'none' }}>
                <div className="ef-toolbar-title">
                    <Settings size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Cấu hình lương</strong>
                </div>
                {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
            </div>

            {/* Tabs */}
            <div className="px-6 border-b border-slate-200 bg-white">
                <div className="flex space-x-6">
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 py-4 border-b-2 font-semibold text-sm transition-colors ${
                                activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}>
                            <tab.icon size={16} />{tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-6">
                {/* ── Tổng quan ── */}
                {activeTab === 'overview' && (
                    <form onSubmit={handleSaveOverview} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Percent className="w-5 h-5" /></div>
                                    <h2 className="text-lg font-bold text-slate-700">Tỷ lệ đóng bảo hiểm (Người lao động)</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {[
                                        { label: 'BH Xã hội (%)', key: 'socialInsuranceRate' },
                                        { label: 'BH Y tế (%)', key: 'healthInsuranceRate' },
                                        { label: 'BH Thất nghiệp (%)', key: 'unemploymentInsuranceRate' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{f.label}</label>
                                            <input type="number" step="0.1" value={settings[f.key]}
                                                onChange={e => setSettings({ ...settings, [f.key]: parseFloat(e.target.value) })}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet className="w-5 h-5" /></div>
                                    <h2 className="text-lg font-bold text-slate-700">Giảm trừ Thuế TNCN</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[
                                        { label: 'Giảm trừ bản thân (VND)', key: 'personalDeductionAmount', note: 'Mặc định: 11,000,000đ' },
                                        { label: 'Người phụ thuộc (VND)', key: 'dependentDeductionAmount', note: 'Mặc định: 4,400,000đ' },
                                    ].map(f => (
                                        <div key={f.key}>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">{f.label}</label>
                                            <input type="number" value={settings[f.key]}
                                                onChange={e => setSettings({ ...settings, [f.key]: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-slate-700" />
                                            <p className="mt-1 text-[10px] text-slate-400 italic">{f.note}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Landmark className="w-5 h-5" /></div>
                                    <h2 className="text-lg font-bold text-slate-700">Mức lương tham chiếu</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lương cơ sở (VND)</label>
                                        <input type="number" value={settings.commonBaseSalary}
                                            onChange={e => setSettings({ ...settings, commonBaseSalary: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-700" />
                                        <p className="mt-1 text-[10px] text-slate-400 italic">Dùng để chặn trần BHXH, BHYT (x20 lần)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Lương tối thiểu vùng (VND)</label>
                                        <input type="number" value={settings.regionBaseSalary}
                                            onChange={e => setSettings({ ...settings, regionBaseSalary: parseInt(e.target.value) })}
                                            className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 font-bold text-slate-700" />
                                        <p className="mt-1 text-[10px] text-slate-400 italic">Vùng 1 (Hà Nội, TP.HCM): 4,680,000đ</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-indigo-700 p-8 rounded-3xl shadow-xl text-white">
                                <h3 className="font-bold text-lg mb-4">Lưu cấu hình tham số</h3>
                                <p className="text-indigo-100 text-sm mb-8 leading-relaxed">
                                    Mọi thay đổi được áp dụng cho bảng lương từ thời điểm lưu trở đi. Bảng lương cũ đã chốt không bị ảnh hưởng.
                                </p>
                                <button type="submit" disabled={saving}
                                    className="w-full py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:bg-indigo-50 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                                    {saving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    Cập nhật ngay
                                </button>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Ghi chú</h4>
                                <ul className="text-xs text-slate-400 space-y-3 list-disc pl-4">
                                    <li>BHXH chặn trần ở mức 20 lần lương cơ sở.</li>
                                    <li>BHTN chặn trần ở mức 20 lần lương tối thiểu vùng.</li>
                                    <li>Giảm trừ gia cảnh áp dụng theo hồ sơ người phụ thuộc.</li>
                                </ul>
                            </div>
                        </div>
                    </form>
                )}

                {/* ── Cấu hình theo chức vụ (gộp hệ số + phụ cấp) ── */}
                {activeTab === 'position' && (
                    <div className="animate-fade-in">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Cấu hình theo Chức vụ</h2>
                            <p className="text-sm text-slate-500">Hệ số và phụ cấp mặc định áp dụng cho toàn bộ nhân viên thuộc chức vụ này. Có thể ghi đè riêng cho từng nhân viên ở tab bên.</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase">Chức vụ</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center w-28">Hệ số</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Ăn ca</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Điện thoại</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Xăng xe</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Nhà ở</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center w-20">Lưu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map(pos => (
                                        <tr key={pos.id} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-700">{pos.positionName}</div>
                                                <div className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">TOÀN CÔNG TY</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input type="number" step="0.1" value={pos.defaultCoefficient || 1}
                                                    onChange={e => handlePosChange(pos.id, 'defaultCoefficient', parseFloat(e.target.value))}
                                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-center font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm" />
                                            </td>
                                            {['defaultMealAllowance','defaultPhoneAllowance','defaultPetrolAllowance','defaultHousingAllowance'].map(field => (
                                                <td key={field} className="py-3 px-4">
                                                    <input type="number" value={pos[field] || 0}
                                                        onChange={e => handlePosChange(pos.id, field, parseFloat(e.target.value))}
                                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-right font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm" />
                                                </td>
                                            ))}
                                            <td className="py-3 px-4 text-center">
                                                <button onClick={() => handleSavePosition(pos)}
                                                    className="p-2.5 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-sm transition-all"
                                                    title="Lưu tất cả">
                                                    <Save size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {positions.length === 0 && (
                                        <tr><td colSpan="7" className="py-8 text-center text-slate-400 text-sm">Chưa có dữ liệu chức vụ</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Cấu hình theo nhân viên ── */}
                {activeTab === 'employee' && (
                    <div className="animate-fade-in">
                        <div className="mb-4">
                            <h2 className="text-lg font-bold text-slate-800">Cấu hình theo Nhân viên</h2>
                            <p className="text-sm text-slate-500">
                                Mặc định hệ số lấy từ chức vụ. Nếu nhân viên có hệ số riêng (khác 0), hệ thống sẽ ưu tiên dùng giá trị đó khi tính lương.
                                <span className="ml-2 inline-block px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs font-semibold">Xanh = đang dùng hệ số riêng</span>
                            </p>
                        </div>
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1 relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input type="text" placeholder="Tìm tên hoặc mã nhân viên..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm shadow-sm"
                                    value={searchEmp} onChange={e => setSearchEmp(e.target.value)} />
                            </div>
                            <div className="w-60 relative">
                                <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 appearance-none bg-white text-sm shadow-sm"
                                    value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                                    <option value="">Tất cả phòng ban</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.departmentName}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50">
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase w-16 text-center">STT</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase w-48">Nhân viên</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center w-28">Hệ số</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Ăn ca</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Điện thoại</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Xăng xe</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-right w-32">Nhà ở</th>
                                        <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase text-center w-20">Lưu</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEmps.map((emp, idx) => {
                                        const hasOverrideCoef = (emp._coefOverride !== undefined ? parseFloat(emp._coefOverride) : emp.coefficient) > 0;
                                        const displayCoef = emp._coefOverride !== undefined ? emp._coefOverride : (emp.coefficient || '');
                                        
                                        const displayMeal = emp._mealOverride !== undefined ? emp._mealOverride : (emp.mealAllowance ?? '');
                                        const displayPhone = emp._phoneOverride !== undefined ? emp._phoneOverride : (emp.phoneAllowance ?? '');
                                        const displayPetrol = emp._petrolOverride !== undefined ? emp._petrolOverride : (emp.petrolAllowance ?? '');
                                        const displayHousing = emp._housingOverride !== undefined ? emp._housingOverride : (emp.housingAllowance ?? '');
                                        
                                        const hasOverrideMeal = (emp._mealOverride !== undefined ? parseFloat(emp._mealOverride) : emp.mealAllowance) !== null;

                                        return (
                                            <tr key={emp.employeeId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="py-3 px-4 text-center text-slate-400 text-sm">{idx + 1}</td>
                                                <td className="py-3 px-4">
                                                    <div className="font-bold text-slate-800 text-sm">{emp.fullName}</div>
                                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{emp.employeeCode} · {emp.positionName}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input type="number" step="0.1" min="0" value={displayCoef}
                                                        placeholder={emp.positionCoefficient?.toString() || "1"}
                                                        onChange={e => handleEmpChange(emp.employeeId, 'coef', e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-center font-bold focus:outline-none focus:ring-2 shadow-sm ${
                                                            hasOverrideCoef
                                                                ? 'border-indigo-300 text-indigo-600 bg-indigo-50 focus:ring-indigo-400'
                                                                : 'border-slate-200 text-slate-500 bg-white focus:ring-slate-300'
                                                        }`} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input type="number" min="0" value={displayMeal}
                                                        placeholder="Mặc định"
                                                        onChange={e => handleEmpChange(emp.employeeId, 'meal', e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-right font-semibold focus:outline-none focus:ring-2 shadow-sm ${
                                                            emp.mealAllowance !== null || emp._mealOverride !== undefined ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400' : 'border-slate-200 text-slate-500 bg-white focus:ring-slate-300'
                                                        }`} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input type="number" min="0" value={displayPhone}
                                                        placeholder="Mặc định"
                                                        onChange={e => handleEmpChange(emp.employeeId, 'phone', e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-right font-semibold focus:outline-none focus:ring-2 shadow-sm ${
                                                            emp.phoneAllowance !== null || emp._phoneOverride !== undefined ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400' : 'border-slate-200 text-slate-500 bg-white focus:ring-slate-300'
                                                        }`} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input type="number" min="0" value={displayPetrol}
                                                        placeholder="Mặc định"
                                                        onChange={e => handleEmpChange(emp.employeeId, 'petrol', e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-right font-semibold focus:outline-none focus:ring-2 shadow-sm ${
                                                            emp.petrolAllowance !== null || emp._petrolOverride !== undefined ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400' : 'border-slate-200 text-slate-500 bg-white focus:ring-slate-300'
                                                        }`} />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <input type="number" min="0" value={displayHousing}
                                                        placeholder="Mặc định"
                                                        onChange={e => handleEmpChange(emp.employeeId, 'housing', e.target.value)}
                                                        className={`w-full px-3 py-2 border rounded-xl text-right font-semibold focus:outline-none focus:ring-2 shadow-sm ${
                                                            emp.housingAllowance !== null || emp._housingOverride !== undefined ? 'border-emerald-300 text-emerald-700 bg-emerald-50 focus:ring-emerald-400' : 'border-slate-200 text-slate-500 bg-white focus:ring-slate-300'
                                                        }`} />
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <button onClick={() => handleSaveEmpCoef(emp)}
                                                        className="p-2.5 text-slate-400 hover:text-emerald-600 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-sm transition-all"
                                                        title="Lưu cấu hình riêng">
                                                        <Save size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredEmps.length === 0 && (
                                        <tr><td colSpan="7" className="py-12 text-center">
                                            <Users size={32} className="mx-auto text-slate-300 mb-3" />
                                            <div className="text-slate-400 text-sm">Không tìm thấy nhân viên phù hợp</div>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
