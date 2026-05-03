import React, { useState, useEffect } from 'react';
import { employeeService } from '../../api';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { Camera, Mail, Phone, MapPin, User, Shield, Briefcase, Calendar, CreditCard, Save, ChevronLeft, Building2 } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5052';

export default function Profile({ mode = 'me', employeeId = null, onBack }) {
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('personal');
    const fileInputRef = React.useRef(null);

    useEffect(() => {
        fetchProfile();
    }, [mode, employeeId]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = mode === 'me'
                ? await employeeService.getMyProfile()
                : await employeeService.getById(employeeId);
            setProfile(data);
            setFormData(data);
        } catch (err) {
            console.error(err);
            toast.error("Không thể tải thông tin hồ sơ");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (mode === 'me') {
                await api.put('/employees/my-profile', formData);
            } else {
                await employeeService.update(employeeId, formData);
            }
            toast.success("Cập nhật hồ sơ thành công");
            fetchProfile(); 
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Không thể cập nhật hồ sơ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-48 skeleton w-full" />
            <div className="h-96 skeleton w-full" />
        </div>
    );

    if (!profile) return (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <User size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-700">Hồ Sơ Không Tồn Tại</h3>
            <p className="text-slate-500 max-w-sm mt-2">Hồ sơ này không tồn tại hoặc bạn không có quyền truy cập.</p>
            {onBack && (
                <button onClick={onBack} className="btn btn-ghost mt-6">
                    <ChevronLeft size={16} /> Quay lại
                </button>
            )}
        </div>
    );

    const avatarUrl = profile.avatar 
        ? (profile.avatar.startsWith('http') ? profile.avatar : `${BACKEND_URL}${profile.avatar}`)
        : null;

    const renderField = (label, icon, value, isEditable = false, field = null, type = "text") => (
        <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500 flex items-center gap-2">
                {icon && React.createElement(icon, { size: 14 })}
                {label}
            </label>
            {isEditable ? (
                <input 
                    type={type}
                    className="input"
                    value={value || ''}
                    onChange={e => handleInputChange(field, e.target.value)}
                />
            ) : (
                <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-lg text-[14px] text-slate-700 font-medium">
                    {value || '--'}
                </div>
            )}
        </div>
    );

    return (
        <div className="flex flex-col gap-6 animate-fade-up">
            {/* Header / Summary Card */}
            <div className="card overflow-hidden !p-0">
                <div className="h-32 bg-violet-600 relative">
                    {onBack && (
                        <button 
                            onClick={onBack}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                    )}
                </div>
                <div className="px-8 pb-8 flex flex-col md:flex-row items-end gap-6 -mt-12 relative z-10">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-slate-100">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <User size={48} />
                                </div>
                            )}
                        </div>
                        {mode === 'me' && (
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-violet-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Camera size={16} />
                            </button>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" />
                    </div>

                    <div className="flex-1 pb-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">{profile.fullName}</h1>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="badge badge-accent uppercase tracking-wide text-[10px] px-2 py-0.5 whitespace-nowrap">{profile.employeeCode}</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <Briefcase size={14} className="text-violet-500" />
                                        {profile.positionName || 'Chưa Xếp Vị Trí'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="btn btn-primary"
                                >
                                    <Save size={16} />
                                    {saving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Quick Stats Overlay */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-slate-100 divide-x divide-slate-100">
                    <div className="p-4 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Building2 size={20} />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Phòng ban</p>
                            <p className="text-sm font-bold text-slate-700">{profile.departmentName || '---'}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Shield size={20} />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Trạng thái</p>
                            <p className="text-sm font-bold text-emerald-600">{profile.isActive ? 'Đang làm việc' : 'Đã nghỉ việc'}</p>
                        </div>
                    </div>
                    <div className="p-4 flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Ngày gia nhập</p>
                            <p className="text-sm font-bold text-slate-700">12/05/2022</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Tabs */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2 border-b border-slate-200">
                    <button 
                        onClick={() => setActiveTab('personal')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === 'personal' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Thông tin cá nhân
                        {activeTab === 'personal' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('work')}
                        className={`px-6 py-3 text-sm font-bold transition-all relative ${activeTab === 'work' ? 'text-violet-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Quá trình làm việc
                        {activeTab === 'work' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 rounded-full" />}
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {activeTab === 'personal' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Personal Info Group */}
                            <div className="card h-fit">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-6 bg-violet-500 rounded-full" />
                                    <h3 className="text-lg font-bold text-slate-800">Thông tin cơ bản</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                    {renderField("Họ và tên", User, profile.fullName, mode !== 'me', 'fullName')}
                                    {renderField("Ngày sinh", Calendar, profile.dateOfBirth?.split('T')[0], mode !== 'me', 'dateOfBirth', 'date')}
                                    {renderField("Giới tính", User, profile.gender, mode !== 'me', 'gender')}
                                    {renderField("Số điện thoại", Phone, formData.phone, true, 'phone', 'tel')}
                                    {renderField("Email cá nhân", Mail, formData.personalEmail, true, 'personalEmail', 'email')}
                                    {renderField("Email công việc", Mail, profile.email)}
                                    <div className="sm:col-span-2">
                                        {renderField("Địa chỉ liên lạc", MapPin, formData.address || '---', true, 'address')}
                                    </div>
                                </div>
                            </div>

                            {/* Identity Group */}
                            <div className="card h-fit">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                    <h3 className="text-lg font-bold text-slate-800">Giấy tờ tùy thân</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="sm:col-span-2">
                                        {renderField("Số CCCD", CreditCard, formData.identityNumber, mode !== 'me', 'identityNumber')}
                                    </div>
                                    {renderField("Ngày cấp", Calendar, formData.identityDate?.split('T')[0], mode !== 'me', 'identityDate', 'date')}
                                    {renderField("Ngày hết hạn", Calendar, formData.identityExpirationDate?.split('T')[0], mode !== 'me', 'identityExpirationDate', 'date')}
                                    <div className="sm:col-span-2">
                                        {renderField("Nơi cấp", MapPin, formData.identityPlace, mode !== 'me', 'identityPlace')}
                                    </div>
                                    {renderField("Dân tộc", User, formData.ethnicity, true, 'ethnicity')}
                                    {renderField("Quốc tịch", MapPin, formData.placeOfOrigin || 'Việt Nam', true, 'placeOfOrigin')}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                                    <Briefcase size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">Chưa có dữ liệu quá trình làm việc để hiển thị.</p>
                                <p className="text-xs text-slate-400 mt-1">Dữ liệu sẽ được tự động cập nhật khi có biến động nhân sự.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
