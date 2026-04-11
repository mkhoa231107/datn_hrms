import React, { useState, useEffect, useRef } from 'react';
import { attendanceService } from '../../api';
import { Scan, CheckCircle, XCircle, Clock, User, ArrowLeft } from 'lucide-react';

export default function BarcodeAttendancePage({ onBack }) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState(null); // { type: 'success'|'error', message, data }
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]); // lịch sử trong phiên
  const inputRef = useRef(null);
  const resetTimer = useRef(null);

  // Luôn giữ focus ở input để máy quét có thể nhập trực tiếp
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleScan = async (scannedCode) => {
    if (!scannedCode.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await attendanceService.scanBarcode(scannedCode.trim());
      const action = res.data?.type === 'CheckIn' ? '🟢 Vào Ca' : '🔴 Tan Ca';
      const newEntry = {
        id: Date.now(),
        code: scannedCode,
        name: res.data?.employeeName || '—',
        action,
        time: new Date().toLocaleTimeString('vi-VN'),
        success: true,
      };
      setStatus({ type: 'success', message: res.message, data: res.data });
      setLog((prev) => [newEntry, ...prev].slice(0, 20));
    } catch (err) {
      const msg = err.response?.data?.message || 'Lỗi hệ thống, vui lòng thử lại.';
      const newEntry = {
        id: Date.now(),
        code: scannedCode,
        name: '—',
        action: '⚠️ Lỗi',
        time: new Date().toLocaleTimeString('vi-VN'),
        success: false,
        errorMsg: msg,
      };
      setStatus({ type: 'error', message: msg });
      setLog((prev) => [newEntry, ...prev].slice(0, 20));
    } finally {
      setLoading(false);
      setCode('');
      // Tự xóa trạng thái sau 4 giây
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setStatus(null), 4000);
      // Giữ focus lại
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleScan(code);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: '24px', fontFamily: 'Inter, sans-serif', position: 'relative' }}>
      
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '24px', left: '24px',
            background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px',
            padding: '8px 16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', fontWeight: '600'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        >
          <ArrowLeft size={16} /> Quay lại
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px 24px', marginBottom: '16px' }}>
          <Scan size={28} color="#38bdf8" />
          <h1 style={{ color: '#f0f9ff', fontSize: '22px', fontWeight: '700', margin: 0 }}>Trạm Chấm Công Mã Vạch</h1>
        </div>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
          Hướng máy quét vào thẻ nhân viên để chấm công tự động
        </p>
      </div>

      {/* Scanner box */}
      <div style={{ maxWidth: '540px', margin: '0 auto 32px' }}>
        <div style={{
          background: loading ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.04)',
          border: loading ? '2px solid #38bdf8' : '2px dashed rgba(255,255,255,0.15)',
          borderRadius: '20px',
          padding: '36px',
          textAlign: 'center',
          transition: 'all 0.3s',
        }}>
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: loading ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              transition: 'all 0.3s',
            }}>
              <Scan size={36} color={loading ? '#38bdf8' : '#64748b'} />
            </div>
            <p style={{ color: loading ? '#38bdf8' : '#475569', fontSize: '13px', margin: 0 }}>
              {loading ? 'Đang xử lý...' : 'Đang chờ quét mã vạch...'}
            </p>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mã nhân viên (hoặc nhập thủ công rồi Enter)"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '10px', padding: '12px 16px',
              color: '#f1f5f9', fontSize: '16px', textAlign: 'center',
              outline: 'none', letterSpacing: '2px',
            }}
          />
          <p style={{ color: '#475569', fontSize: '11px', marginTop: '10px' }}>
            Bấm <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: '#cbd5e1' }}>Enter</kbd> nếu nhập thủ công
          </p>
        </div>

        {/* Status Banner */}
        {status && (
          <div style={{
            marginTop: '16px',
            padding: '20px 24px',
            borderRadius: '16px',
            background: status.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${status.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: '16px',
            animation: 'fadeIn 0.2s ease',
          }}>
            {status.type === 'success'
              ? <CheckCircle size={32} color="#22c55e" />
              : <XCircle size={32} color="#ef4444" />}
            <div>
              {status.data && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <User size={14} color="#94a3b8" />
                  <span style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '15px' }}>{status.data.employeeName}</span>
                  <span style={{
                    background: status.data.type === 'CheckIn' ? '#166534' : '#7c2d12',
                    color: status.data.type === 'CheckIn' ? '#4ade80' : '#fb923c',
                    padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                  }}>
                    {status.data.type === 'CheckIn' ? 'VÀO CA' : 'TAN CA'}
                  </span>
                </div>
              )}
              <p style={{ color: status.type === 'success' ? '#86efac' : '#fca5a5', margin: 0, fontSize: '13px' }}>
                {status.message}
              </p>
              {status.data && (
                <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={11} /> {new Date(status.data.timestamp).toLocaleTimeString('vi-VN')}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent log */}
      {log.length > 0 && (
        <div style={{ maxWidth: '540px', margin: '0 auto' }}>
          <h3 style={{ color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>
            Lịch sử phiên làm việc
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {log.map((entry) => (
              <div key={entry.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: entry.success ? 'rgba(255,255,255,0.03)' : 'rgba(239,68,68,0.07)',
                border: `1px solid ${entry.success ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.15)'}`,
                borderRadius: '10px', padding: '10px 16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px' }}>{entry.action.split(' ')[0]}</span>
                  <div>
                    <p style={{ color: '#e2e8f0', fontWeight: '600', margin: 0, fontSize: '13px' }}>{entry.name}</p>
                    <p style={{ color: '#475569', margin: 0, fontSize: '11px' }}>{entry.code}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '11px' }}>{entry.time}</p>
                  {!entry.success && <p style={{ color: '#ef4444', margin: 0, fontSize: '10px' }}>{entry.errorMsg}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        input:focus { border-color: rgba(56,189,248,0.5) !important; box-shadow: 0 0 0 3px rgba(56,189,248,0.1); }
      `}</style>
    </div>
  );
}
