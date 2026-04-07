import React, { useState } from 'react';
import { authService } from '../../api';
import { X, Mail, Key, ShieldCheck, ArrowLeft, Loader2, Lock, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState(1); // 1: Username, 2: OTP, 3: New Password
  const [username, setUsername] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(username);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tìm thấy tài khoản hoặc lỗi gửi mail.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authService.verifyOTP(username, otpCode);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.resetPassword({ username, otpCode, newPassword });
      setSuccess('Mật khẩu đã được đặt lại thành công!');
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state after a delay to avoid flickering
    setTimeout(() => {
      setStep(1);
      setUsername('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccess('');
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f0f1b]/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a1a2e] rounded-xl shadow-2xl border border-white/10 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-600/10">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="text-indigo-400" size={20} />
            Quên mật khẩu
          </h3>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-lg flex flex-col items-center gap-3 text-center">
              <CheckCircle2 size={48} className="text-emerald-500 animate-in zoom-in duration-500" />
              <p className="font-semibold text-lg">{success}</p>
              <p className="text-slate-400">Bạn sẽ được quay lại trang đăng nhập...</p>
            </div>
          )}

          {!success && (
            <>
              {/* Progress Indicators */}
              <div className="flex justify-between mb-8 px-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      step === s ? 'bg-indigo-600 text-white ring-4 ring-indigo-600/20' : 
                      step > s ? 'bg-emerald-500 text-white' : 'bg-[#252545] text-slate-500'
                    }`}>
                      {step > s ? <CheckCircle2 size={16} /> : s}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${step === s ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {s === 1 ? 'Tài khoản' : s === 2 ? 'Mã OTP' : 'Mật khẩu'}
                    </span>
                  </div>
                ))}
              </div>

              {step === 1 && (
                <form onSubmit={handleRequestOTP} className="space-y-6">
                  <p className="text-slate-400 text-sm leading-relaxed text-center">
                    Nhập tên đăng nhập để nhận mã xác thực qua Email cá nhân.
                  </p>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tài khoản</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-slate-500" size={18} />
                      <input
                        type="text"
                        className="w-full bg-[#252545] border border-white/5 rounded-lg px-12 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                        placeholder="Nhập username của bạn"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : (
                      <>Tiếp tục <ArrowLeft className="rotate-180 transform group-hover:translate-x-1 transition-transform" size={18} /></>
                    )}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleVerifyOTP} className="space-y-6">
                  <div className="text-center space-y-2">
                    <p className="text-slate-400 text-sm">Mã OTP đã được gửi cho tài khoản <b>{username}</b></p>
                    <p className="text-xs text-indigo-400 italic">Vui lòng kiểm tra hòm thư Gmail của bạn.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest text-center block">Nhập 6 số xác thực</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-3.5 text-slate-500" size={18} />
                      <input
                        type="text"
                        maxLength="6"
                        className="w-full bg-[#252545] border border-indigo-500/30 rounded-lg px-12 py-4 text-white text-2xl font-mono tracking-[12px] placeholder:tracking-normal placeholder:text-sm placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                        placeholder="••••••"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      type="button" 
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg font-bold transition-all"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6}
                      className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : "Xác nhận mã"}
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-emerald-400 text-sm font-medium flex items-center justify-center gap-1">
                      <ShieldCheck size={16} /> Xác thực thành công!
                    </p>
                    <p className="text-slate-400 text-xs">Vui lòng đặt mật khẩu mới cho tài khoản.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Mật khẩu mới</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-3.5 text-slate-500" size={18} />
                      <input
                        type="password"
                        className="w-full bg-[#252545] border border-white/5 rounded-lg px-12 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        placeholder="Tối thiểu 6 ký tự"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-3.5 text-slate-500" size={18} />
                      <input
                        type="password"
                        className="w-full bg-[#252545] border border-white/5 rounded-lg px-12 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !newPassword}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : "Đổi mật khẩu"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
