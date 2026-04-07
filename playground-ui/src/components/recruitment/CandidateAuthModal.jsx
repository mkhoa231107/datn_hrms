import React, { useState } from 'react';
import { authService } from '../../api';
import { Lock, User, Eye, EyeOff, Mail, UserPlus, LogIn, X } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * CandidateAuthModal - Modal popup cho phép ứng viên bên ngoài:
 *  - Đăng nhập bằng tài khoản có role Candidate
 *  - Đăng ký tài khoản mới (tự động gán role Candidate)
 * 
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onSuccess: (userData) => void   <- gọi sau khi login/register thành công
 *  - message: string (tùy chọn, vd "Vui lòng đăng nhập để ứng tuyển")
 */
export default function CandidateAuthModal({ isOpen, onClose, onSuccess, message }) {
    const [tab, setTab] = useState('login'); // 'login' | 'register'

    // Login state
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [showLoginPwd, setShowLoginPwd] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    // Register state
    const [regForm, setRegForm] = useState({ fullName: '', email: '', username: '', password: '', confirmPassword: '' });
    const [showRegPwd, setShowRegPwd] = useState(false);
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');

    if (!isOpen) return null;

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError('');
        try {
            const data = await authService.login(loginForm.username, loginForm.password);
            toast.success(`Chào mừng, ${data.user.fullName}!`);
            onSuccess(data.user);
        } catch (err) {
            setLoginError(err.response?.data?.message || 'Đăng nhập thất bại. Kiểm tra lại thông tin.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        if (regForm.password !== regForm.confirmPassword) {
            setRegError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (regForm.password.length < 6) {
            setRegError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }
        setRegLoading(true);
        setRegError('');
        try {
            const data = await authService.register(regForm.username, regForm.password, regForm.email, regForm.fullName);
            toast.success('Tạo tài khoản thành công! Chào mừng bạn đến với HRMS Net.');
            onSuccess(data.user);
        } catch (err) {
            setRegError(err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.');
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-8 py-7 text-white">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                        <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold">
                        {tab === 'login' ? 'Đăng nhập ứng viên' : 'Tạo tài khoản ứng viên'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                        {message || 'Vui lòng đăng nhập hoặc tạo tài khoản để ứng tuyển'}
                    </p>
                </div>

                {/* Tab switcher */}
                <div className="flex border-b border-slate-100">
                    <button
                        onClick={() => { setTab('login'); setLoginError(''); }}
                        className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            tab === 'login'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <LogIn size={15} /> Đăng nhập
                    </button>
                    <button
                        onClick={() => { setTab('register'); setRegError(''); }}
                        className={`flex-1 py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                            tab === 'register'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <UserPlus size={15} /> Đăng ký mới
                    </button>
                </div>

                <div className="px-8 py-6">
                    {/* ─── LOGIN FORM ─── */}
                    {tab === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            {loginError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {loginError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tài khoản</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Tên đăng nhập"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={loginForm.username}
                                        onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mật khẩu</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                    <input
                                        type={showLoginPwd ? 'text' : 'password'}
                                        required
                                        placeholder="Mật khẩu"
                                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={loginForm.password}
                                        onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                    />
                                    <button type="button" onClick={() => setShowLoginPwd(!showLoginPwd)} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600">
                                        {showLoginPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={loginLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
                            >
                                {loginLoading
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><LogIn size={16} /> Đăng nhập</>
                                }
                            </button>
                            <p className="text-center text-sm text-slate-500 pt-1">
                                Chưa có tài khoản?{' '}
                                <button type="button" onClick={() => setTab('register')} className="text-blue-600 font-bold hover:underline">
                                    Đăng ký ngay
                                </button>
                            </p>
                        </form>
                    )}

                    {/* ─── REGISTER FORM ─── */}
                    {tab === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4">
                            {regError && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                                    {regError}
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Họ và tên</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nguyễn Văn A"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={regForm.fullName}
                                        onChange={e => setRegForm({ ...regForm, fullName: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                    <input
                                        type="email"
                                        required
                                        placeholder="email@example.com"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={regForm.email}
                                        onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tên đăng nhập</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="username (không dấu, không khoảng trắng)"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        value={regForm.username}
                                        onChange={e => setRegForm({ ...regForm, username: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Mật khẩu</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                        <input
                                            type={showRegPwd ? 'text' : 'password'}
                                            required
                                            placeholder="Tối thiểu 6 ký tự"
                                            className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            value={regForm.password}
                                            onChange={e => setRegForm({ ...regForm, password: e.target.value })}
                                        />
                                        <button type="button" onClick={() => setShowRegPwd(!showRegPwd)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                                            {showRegPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Xác nhận</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-3 text-slate-400" size={16} />
                                        <input
                                            type={showRegPwd ? 'text' : 'password'}
                                            required
                                            placeholder="Nhập lại mật khẩu"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            value={regForm.confirmPassword}
                                            onChange={e => setRegForm({ ...regForm, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={regLoading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 mt-2"
                            >
                                {regLoading
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><UserPlus size={16} /> Tạo tài khoản</>
                                }
                            </button>
                            <p className="text-center text-sm text-slate-500 pt-1">
                                Đã có tài khoản?{' '}
                                <button type="button" onClick={() => setTab('login')} className="text-blue-600 font-bold hover:underline">
                                    Đăng nhập ngay
                                </button>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
