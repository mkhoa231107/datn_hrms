import React, { useState, useEffect } from 'react';
import { authService } from '../../api';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

const BACKGROUND_IMAGES = [
    "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2000&auto=format&fit=crop"
];

export default function Login({ onLoginSuccess, onShowPublic }) {
    const [bgIndex, setBgIndex] = useState(0);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

    useEffect(() => {
        // Load remembered user
        const savedUser = localStorage.getItem('remembered_user');
        if (savedUser) {
            setUsername(savedUser);
            setRememberMe(true);
        }

        const timer = setInterval(() => {
            setBgIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await authService.login(username, password);
            
            if (rememberMe) {
                localStorage.setItem('remembered_user', username);
            } else {
                localStorage.removeItem('remembered_user');
            }
            
            onLoginSuccess(data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = () => {
        setIsForgotModalOpen(true);
    };

    return (
        <div className="fixed inset-0 bg-[#0f0f1b] flex items-center justify-center p-0 md:p-4 overflow-hidden">
            <div className="w-full max-w-[1000px] h-full md:h-[650px] bg-[#1a1a2e] rounded-[5px] overflow-hidden flex flex-col md:flex-row shadow-2xl border border-white/5 p-4 md:p-6 gap-6">
                
                {/* Left Side: Visual Branding - Card Style as per sketch */}
                <div className="hidden md:block w-[50%] h-full relative rounded-[5px] overflow-hidden border border-white/10">
                    {BACKGROUND_IMAGES.map((img, index) => (
                        <div 
                            key={img}
                            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === bgIndex ? 'opacity-100' : 'opacity-0'}`}
                        >
                            <img 
                                src={img} 
                                alt={`Background ${index}`} 
                                className="w-full h-full object-cover transform scale-110 active:scale-100 transition-transform duration-[5000ms]"
                            />
                        </div>
                    ))}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#1a1a2e]/90 via-[#1a1a2e]/20 to-transparent" />
                    
                    {/* Brand Info Overlay */}
                    <div className="absolute inset-0 p-10 flex flex-col justify-between">
                        <div className="text-3xl font-extrabold tracking-widest text-white" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                            HRMS Net
                        </div>
                        
                        <div className="space-y-6">
                            <h2 className="text-2xl lg:text-3xl font-bold text-white leading-tight">
                                Doanh nghiệp thành công bắt đầu từ những con người tuyệt vời
                            </h2>
                            <div className="flex gap-2">
                                {BACKGROUND_IMAGES.map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-1 rounded-[5px] transition-all duration-500 ${i === bgIndex ? 'w-10 bg-white' : 'w-10 bg-white/30'}`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="flex-1 h-full flex flex-col items-center justify-center p-4 lg:p-12 relative">
                    <div className="w-full max-w-[360px] space-y-10">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Đăng nhập</h1>
                            <p className="text-slate-400 text-sm">Vui lòng nhập thông tin đăng nhập của bạn</p>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-[5px] text-sm animate-shake">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Tài khoản</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Nhập tên đăng nhập"
                                        className="w-full bg-[#252545] border border-white/5 rounded-[5px] px-12 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 text-slate-500" size={18} />
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        placeholder="Nhập mật khẩu"
                                        className="w-full bg-[#252545] border border-white/5 rounded-[5px] px-12 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all text-sm"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="terms" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded-[2px] bg-[#252545] border-white/10 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-[#1a1a2e]"
                                    />
                                    <label htmlFor="terms" className="text-xs text-slate-400 cursor-pointer">Ghi nhớ đăng nhập</label>
                                </div>
                                <span 
                                    onClick={handleForgotPassword}
                                    className="text-xs text-indigo-400 hover:underline cursor-pointer"
                                >
                                    Quên mật khẩu?
                                </span>
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[5px] font-semibold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    "Đăng nhập"
                                )}
                            </button>
                            
                            <div className="mt-4 pt-6 text-center border-t border-white/10">
                                <p className="text-slate-400 text-sm mb-3">Bạn muốn điểm danh bằng mã vạch?</p>
                                <button 
                                    type="button" 
                                    onClick={onShowPublic} 
                                    className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-[5px] text-sm font-medium transition-colors"
                                >
                                    Chấm công bằng Mã Vạch
                                </button>
                            </div>
                        </form>
                        
                        <div className="pt-8 text-center border-t border-white/5 hidden">
                        </div>
                    </div>
                </div>
            </div>

            <ForgotPasswordModal 
                isOpen={isForgotModalOpen} 
                onClose={() => setIsForgotModalOpen(false)} 
            />
        </div>
    );
}

