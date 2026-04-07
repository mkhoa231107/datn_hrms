import React, { useState } from 'react';
import { employeeService } from '../../api';
import { UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EmployeeForm({ onSuccess }) {
    const [form, setForm] = useState({
        employeeCode: '',
        fullName: '',
        email: '',
        phone: '',
        address: '',
        dateOfBirth: '',
        joinDate: new Date().toISOString().split('T')[0],
        gender: 'Nam',
        status: 'Probation',
        organizationId: 1,
        departmentId: 1,
        positionId: 1
    });

    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await employeeService.create(form);
            setDone(true);
            setTimeout(() => {
                onSuccess();
                setDone(false);
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Có lỗi xảy ra khi thêm nhân viên');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (done) return (
        <div className="card text-center py-12 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-success/20">
                <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold mb-2">Thêm thành công!</h2>
            <p className="text-slate-500">Tài khoản nhân viên đã được tạo tự động.</p>
        </div>
    );

    return (
        <div className="card animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-bold">Thêm nhân viên mới</h2>
                    <p className="text-slate-500 text-sm">Hệ thống tự động kích hoạt tài khoản User</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm border border-red-100 flex items-center gap-2 mb-6">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Mã nhân viên</label>
                        <input name="employeeCode" className="input" placeholder="VD: NV100" onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Họ và tên</label>
                        <input name="fullName" className="input" placeholder="Nguyễn Văn A" onChange={handleChange} required />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Email</label>
                        <input name="email" type="email" className="input" placeholder="an.nv@gmail.com" onChange={handleChange} required />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Số điện thoại</label>
                        <input name="phone" className="input" placeholder="0123.456.789" onChange={handleChange} required />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase">Địa chỉ</label>
                    <textarea name="address" className="input min-h-[100px]" placeholder="Xóm 1, Xã X..." onChange={handleChange}></textarea>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Giới tính</label>
                        <select name="gender" className="input" onChange={handleChange}>
                            <option value="Nam">Nam</option>
                            <option value="Nữ">Nữ</option>
                            <option value="Khác">Khác</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                        <select name="status" className="input" onChange={handleChange}>
                            <option value="Probation">Thử việc (Phòng ban 1)</option>
                            <option value="Active">Đang làm việc</option>
                        </select>
                    </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-indigo-600 font-bold mb-1 uppercase tracking-wider">Thông tin tài khoản</p>
                    <p className="text-slate-500 text-xs">Username sẽ là phần trước dấu `@` của email. Mật khẩu mặc định: <b>123456</b></p>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary w-full py-4 text-lg"
                >
                    {loading ? 'Đang khởi tạo nhân viên...' : 'Tạo hồ sơ và tài khoản'}
                </button>
            </form>
        </div>
    );
}
