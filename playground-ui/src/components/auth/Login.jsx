import React, { useState, useEffect } from 'react';
import { authService } from '../../api';
import { Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import ForgotPasswordModal from './ForgotPasswordModal';

const BACKGROUND_IMAGES = [
    "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?q=80&w=2000&auto=format&fit=crop",
];

const QUOTES = [
    "Doanh nghiệp thành công bắt đầu từ những con người tuyệt vời",
    "Quản lý nhân sự hiệu quả — nền tảng của mọi thành công",
    "Đầu tư vào con người là đầu tư sinh lời nhất",
    "Mỗi nhân viên là một tài sản vô giá",
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
        const savedUser = localStorage.getItem('remembered_user');
        if (savedUser) { setUsername(savedUser); setRememberMe(true); }
        const timer = setInterval(() => setBgIndex(p => (p + 1) % BACKGROUND_IMAGES.length), 3000);
        return () => clearInterval(timer);
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await authService.login(username, password);
            if (rememberMe) localStorage.setItem('remembered_user', username);
            else localStorage.removeItem('remembered_user');
            onLoginSuccess(data.user);
        } catch (err) {
            setError(err.response?.data?.message || 'Tài khoản hoặc mật khẩu không đúng.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '11px 14px 11px 42px',
        background: 'rgba(255,255,255,0.05)',
        border: '1.5px solid rgba(124,58,237,0.25)',
        borderRadius: '8px',
        color: '#F3F0FF',
        fontSize: '14px',
        fontFamily: 'Inter, sans-serif',
        outline: 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    };

    return (
        <div style={{ minHeight: '100dvh', background: '#0F0A1E', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'Inter, Plus Jakarta Sans, sans-serif' }}>

            {/* Main card */}
            <div style={{
                width: '100%', maxWidth: '960px',
                minHeight: '640px',
                background: '#1A1030',
                borderRadius: '12px',
                border: '1px solid rgba(124,58,237,0.12)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
                display: 'flex',
                overflow: 'hidden',
            }}>

                {/* Left — Hero image panel */}
                <div style={{ position: 'relative', width: '50%', flexShrink: 0, overflow: 'hidden' }} className="hidden md:block">
                    <div style={{
                        display: 'flex',
                        height: '100%',
                        width: `${BACKGROUND_IMAGES.length * 100}%`,
                        transform: `translateX(-${(bgIndex * 100) / BACKGROUND_IMAGES.length}%)`,
                        transition: 'transform 1.5s cubic-bezier(0.645, 0.045, 0.355, 1)',
                    }}>
                        {BACKGROUND_IMAGES.map((img, i) => (
                            <div key={img} style={{ width: `${100 / BACKGROUND_IMAGES.length}%`, height: '100%', flexShrink: 0 }}>
                                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                    {/* Overlay */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'linear-gradient(to top right, rgba(15,10,30,0.92) 0%, rgba(15,10,30,0.4) 60%, transparent 100%)' }} />

                    {/* Branding */}
                    <div style={{ position: 'absolute', inset: 0, zIndex: 10, padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '0.06em' }}>
                            HRMS <span style={{ color: '#A78BFA' }}>Net</span>
                        </div>
                        <div>
                            <p style={{ fontSize: '20px', fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: '20px' }}>
                                {QUOTES[bgIndex]}
                            </p>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {BACKGROUND_IMAGES.map((_, i) => (
                                    <div key={i} style={{
                                        height: '3px',
                                        width: i === bgIndex ? '28px' : '10px',
                                        background: i === bgIndex ? '#A78BFA' : 'rgba(255,255,255,0.25)',
                                        borderRadius: '99px',
                                        transition: 'all 0.4s ease',
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right — Form panel */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 40px' }}>

                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F0FF', marginBottom: '6px', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}>
                            Đăng nhập
                        </h1>
                        <p style={{ fontSize: '14px', color: 'rgba(167,139,250,0.7)', fontWeight: 400 }}>
                            Vui lòng nhập thông tin tài khoản của bạn
                        </p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                        {/* Error */}
                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(239,68,68,0.10)',
                                border: '1px solid rgba(239,68,68,0.25)',
                                borderRadius: '8px',
                                color: '#FCA5A5',
                                fontSize: '13px',
                                fontWeight: 500,
                                animation: 'shake 0.45s both',
                            }}>
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                                Tài khoản
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(167,139,250,0.5)' }} />
                                <input
                                    type="text"
                                    id="username"
                                    placeholder="Nhập tên đăng nhập"
                                    style={inputStyle}
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    onFocus={e => { e.target.style.borderColor = '#7C3AED'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(124,58,237,0.25)'; e.target.style.boxShadow = 'none'; }}
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'rgba(167,139,250,0.8)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                                Mật khẩu
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'rgba(167,139,250,0.5)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    placeholder="Nhập mật khẩu"
                                    style={{ ...inputStyle, paddingRight: '42px' }}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    onFocus={e => { e.target.style.borderColor = '#7C3AED'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                                    onBlur={e => { e.target.style.borderColor = 'rgba(124,58,237,0.25)'; e.target.style.boxShadow = 'none'; }}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(167,139,250,0.5)', padding: '2px' }}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember + Forgot */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onChange={e => setRememberMe(e.target.checked)}
                                    style={{ width: '15px', height: '15px', accentColor: '#7C3AED', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '13px', color: 'rgba(167,139,250,0.7)', userSelect: 'none' }}>Ghi nhớ đăng nhập</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsForgotModalOpen(true)}
                                style={{ fontSize: '13px', color: '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, padding: 0 }}
                                onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.target.style.textDecoration = 'none'}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            id="loginButton"
                            disabled={loading}
                            style={{
                                width: '100%', padding: '13px',
                                background: loading ? '#5B21B6' : '#7C3AED',
                                border: 'none', borderRadius: '8px',
                                color: '#fff', fontSize: '14px', fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                boxShadow: 'none',
                                transition: 'background 0.18s ease, transform 0.15s ease',
                                letterSpacing: '0.02em',
                                marginTop: '4px',
                            }}
                            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#6D28D9'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                            onMouseLeave={e => { e.currentTarget.style.background = loading ? '#5B21B6' : '#7C3AED'; e.currentTarget.style.transform = 'none'; }}
                            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.98)'; }}
                            onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        >
                            {loading ? (
                                <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            ) : (
                                <>Đăng nhập <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>

                        {/* Barcode divider */}
                        <div style={{ borderTop: '1px solid rgba(124,58,237,0.15)', paddingTop: '16px', textAlign: 'center', marginTop: '4px' }}>
                            <p style={{ fontSize: '12px', color: 'rgba(167,139,250,0.6)', marginBottom: '10px' }}>
                                Bạn muốn điểm danh bằng mã vạch?
                            </p>
                            <button
                                type="button"
                                onClick={onShowPublic}
                                style={{
                                    padding: '9px 20px',
                                    background: 'rgba(124,58,237,0.10)',
                                    border: '1px solid rgba(124,58,237,0.25)',
                                    borderRadius: '8px',
                                    color: '#A78BFA',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.18s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.18)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.10)'; e.currentTarget.style.borderColor = 'rgba(124,58,237,0.25)'; }}
                            >
                                Chấm công bằng Mã Vạch
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes spin  { to { transform: rotate(360deg); } }
                @keyframes shake {
                    0%,100%            { transform: translateX(0); }
                    10%,30%,50%,70%,90% { transform: translateX(-4px); }
                    20%,40%,60%,80%    { transform: translateX(4px); }
                }
                input::placeholder { color: rgba(167,139,250,0.35); }
            `}</style>

            <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
        </div>
    );
}
