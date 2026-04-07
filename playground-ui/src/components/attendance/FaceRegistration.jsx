import React, { useEffect, useRef, useState, useCallback } from 'react';
import api from '../../api';
import { useFaceRecognition } from '../../hooks/useFaceRecognition';
import { Upload, CheckCircle, AlertCircle, RefreshCw, User, Camera, X, Loader2, Search } from 'lucide-react';


const BACKEND_URL = 'http://localhost:5052';

const StatusBadge = ({ hasPhoto, hasDescriptor }) => {
    // Fixed height container to prevent jumping
    return (
        <div style={{ height: '26px', display: 'flex', alignItems: 'center' }}>
            {hasDescriptor ? (
                <span className="ef-badge ef-badge-success" style={{ fontSize: '11px', padding: '3px 10px', letterSpacing: '0.2px' }}>
                    <CheckCircle size={12} strokeWidth={3} /> ĐẠI DIỆN ĐÃ ĐĂNG KÝ
                </span>
            ) : hasPhoto ? (
                <span className="ef-badge" style={{ fontSize: '11px', background: '#fffbeb', color: '#92400e', border: '1px solid #fef3c7', padding: '3px 10px' }}>
                    <AlertCircle size={12} strokeWidth={3} /> CÓ ẢNH - CHƯA QUÉT
                </span>
            ) : (
                <span className="ef-badge" style={{ fontSize: '11px', padding: '3px 10px', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                    <X size={12} strokeWidth={3} /> CHƯA CÓ DỮ LIỆU
                </span>
            )}
        </div>
    );
};

const ScanningModal = ({ employee, modelsLoaded, onUpdated, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [status, setStatus] = useState('starting'); // starting | scanning | success | error
    const [error, setError] = useState(null);
    const { startWebcam, stopWebcam, detectAndDraw } = useFaceRecognition();
    const scanTimerRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            try {
                await startWebcam(videoRef);
                setStatus('scanning');
                
                // Start detection loop
                scanTimerRef.current = setInterval(async () => {
                    const desc = await detectAndDraw(videoRef, canvasRef);
                    if (desc) {
                        clearInterval(scanTimerRef.current);
                        setStatus('success');
                        saveDescriptor(desc);
                    }
                }, 500);
            } catch (err) {
                console.error(err);
                setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.');
                setStatus('error');
            }
        };

        if (modelsLoaded) init();
        return () => {
            stopWebcam();
            if (scanTimerRef.current) clearInterval(scanTimerRef.current);
        };
    }, [modelsLoaded]);

    const saveDescriptor = async (desc) => {
        try {
            await api.post(`/employees/${employee.id}/face-descriptor`, {
                descriptor: JSON.stringify(desc)
            });
            toast.success(`Đã đăng ký xong cho ${employee.fullName}`);
            onUpdated({ ...employee, hasFaceDescriptor: true });
            setTimeout(onClose, 1500);
        } catch (err) {
            setError('Lỗi khi lưu dữ liệu khuôn mặt.');
            setStatus('error');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="animate-scale-in" style={{ background: '#fff', width: '100%', maxWidth: '500px', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justify: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Quét Khuôn Mặt: {employee.fullName}</strong>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
                </div>
                
                <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                    
                    {status === 'starting' && (
                        <div style={{ position: 'absolute', color: '#fff', textAlign: 'center' }}>
                            <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 10px' }} />
                            <div>Đang khởi động camera...</div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(16, 185, 129, 0.2)', border: '4px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: '#10b981', color: '#fff', padding: '10px 20px', borderRadius: '40px', fontWeight: 'bold' }}>
                                ✅ ĐÃ NHẬN DIỆN & LƯU XONG!
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ padding: '20px', textAlign: 'center' }}>
                    {status === 'scanning' && <p style={{ margin: 0, color: '#1a56db', fontWeight: 'bold' }}>Vui lòng nhìn thẳng vào camera và giữ yên...</p>}
                    {status === 'error' && <p style={{ margin: 0, color: '#ef4444', fontWeight: 'bold' }}>{error}</p>}
                    <button onClick={onClose} className="ef-btn" style={{ marginTop: '15px', width: '100%' }}>HỦY BỎ</button>
                </div>
            </div>
        </div>
    );
};

function EmployeePhotoCard({ employee, modelsLoaded, detectDescriptorFromImage, onUpdated, onOpenScan }) {
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);
    const [msg, setMsg] = useState(null);
    const fileInputRef = useRef(null);

    const flash = (type, text) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 4000); };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setMsg(null);
        try {
            const formData = new FormData();
            formData.append('photo', file);
            const res = await api.post(`/employees/${employee.id}/photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            flash('ok', 'Tải ảnh thành công! Đang quét khuôn mặt...');
            onUpdated({ ...employee, avatar: res.data.avatarUrl });
            // Auto-scan after upload
            await autoScan(res.data.avatarUrl);
        } catch (err) {
            flash('err', err?.response?.data?.message || 'Lỗi khi tải ảnh lên.');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const autoScan = useCallback(async (avatarUrl) => {
        if (!modelsLoaded) { flash('err', 'AI chưa tải xong, vui lòng thử lại.'); return; }
        setScanning(true);
        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const isExternal = avatarUrl.startsWith('http');
            img.src = isExternal 
                ? `${BACKEND_URL}/api/employees/proxy-image?url=${encodeURIComponent(avatarUrl)}` 
                : `${BACKEND_URL}${avatarUrl}?t=${Date.now()}`;
            await new Promise((res, rej) => {
                img.onload = res;
                img.onerror = rej;
            });
            const descriptor = await detectDescriptorFromImage(img);
            if (!descriptor) {
                flash('err', 'Không phát hiện khuôn mặt trong ảnh. Hãy dùng ảnh có mặt rõ nét, đủ sáng.');
                return;
            }
            await api.post(`/employees/${employee.id}/face-descriptor`, {
                descriptor: JSON.stringify(descriptor)
            });
            flash('ok', '✅ Đã đăng ký khuôn mặt tự động!');
            onUpdated({ ...employee, avatar: avatarUrl, hasFaceDescriptor: true });
        } catch (err) {
            flash('err', 'Lỗi khi quét khuôn mặt: ' + (err?.message || 'Unknown error'));
        } finally {
            setScanning(false);
        }
    }, [modelsLoaded, detectDescriptorFromImage, employee, onUpdated]);

    const handleRescan = () => {
        if (employee.avatar) autoScan(employee.avatar);
        else flash('err', 'Chưa có ảnh để quét.');
    };

    const avatarSrc = employee.avatar 
        ? (employee.avatar.startsWith('http') ? employee.avatar : `${BACKEND_URL}${employee.avatar}`) 
        : null;

    return (
        <div style={{ 
            background: '#fff', 
            border: '1px solid #e2e8f0', 
            padding: '14px', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            transition: 'all 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }} className="hover:border-slate-300 hover:shadow-md">
            {/* Top row: Avatar + Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                    position: 'relative', 
                    width: '72px', 
                    height: '72px', 
                    borderRadius: '8px', 
                    overflow: 'hidden', 
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    flexShrink: 0
                }} className={!imgLoaded && avatarSrc ? 'skeleton' : ''}>
                    {avatarSrc && (
                        <img 
                            src={avatarSrc} 
                            alt={employee.fullName}
                            loading="lazy"
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgLoaded(true)}
                            style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover', 
                                objectPosition: 'center top',
                                opacity: imgLoaded ? 1 : 0,
                                transition: 'opacity 0.3s ease'
                            }} 
                        />
                    )}
                    {!avatarSrc && (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <User size={28} style={{ color: '#cbd5e1' }} />
                        </div>
                    )}
                    {(uploading || scanning) && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Loader2 size={16} className="text-slate-600 animate-spin" />
                        </div>
                    )}
                </div>
                
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {employee.fullName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '6px' }}>
                        Mã NV: {employee.employeeCode}
                    </div>
                    <StatusBadge hasPhoto={!!employee.avatar} hasDescriptor={employee.hasFaceDescriptor} />
                </div>
            </div>

            {/* Flash message (Inline and stable) */}
            <div style={{ height: msg ? 'auto' : '0', overflow: 'hidden', transition: 'all 0.3s' }}>
                {msg && (
                    <div style={{ 
                        fontSize: '11px', 
                        padding: '6px 10px', 
                        borderRadius: '4px', 
                        fontWeight: 'bold', 
                        background: msg.type === 'ok' ? '#f0fdf4' : '#fef2f2', 
                        color: msg.type === 'ok' ? '#166534' : '#991b1b',
                        border: `1px solid ${msg.type === 'ok' ? '#dcfce7' : '#fee2e2'}`
                    }}>
                        {msg.text}
                    </div>
                )}
            </div>

            {/* Actions: Reorganized for cleaner hierarchy */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button 
                    onClick={() => onOpenScan(employee)} 
                    disabled={!modelsLoaded}
                    className="ef-btn ef-btn-primary" 
                    style={{ flex: 1, height: '36px', fontSize: '12px', borderRadius: '4px' }}
                >
                    <Camera size={14} /> QUÉT CAMERA
                </button>
                
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={uploading || scanning}
                        className="ef-btn" 
                        style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Tải ảnh từ máy tính"
                    >
                        <Upload size={14} />
                    </button>
                    {employee.avatar && (
                        <button 
                            onClick={handleRescan} 
                            disabled={scanning || !modelsLoaded}
                            className="ef-btn" 
                            style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                            title="Quét lại từ ảnh hiện tại"
                        >
                            <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleFileChange} />
        </div>
    );
}

export default function FaceRegistration({ onBack }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all | registered | pending
    const [searchQuery, setSearchQuery] = useState('');
    const [scanningEmployee, setScanningEmployee] = useState(null);
    const [bulkScanning, setBulkScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });

    const { modelsLoaded, loading: modelsLoading, loadModels, detectDescriptorFromImage } = useFaceRecognition();

    useEffect(() => {
        loadModels();
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const [empRes, descRes] = await Promise.all([
                api.get('/employees/managed-users'),
                api.get('/employees/face-descriptors'),
            ]);
            const employees = empRes.data || [];
            const descriptors = descRes.data || [];
            const descriptorMap = new Set(descriptors.map(d => d.employeeId));

            setEmployees(employees.map(e => ({
                ...e,
                hasFaceDescriptor: descriptorMap.has(e.id),
            })));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdated = (updated) => {
        setEmployees(prev => prev.map(e => e.id === updated.id ? { ...e, ...updated } : e));
    };

    const handleBulkScan = async () => {
        const toScan = employees.filter(e => e.avatar && !e.hasFaceDescriptor);
        if (toScan.length === 0) {
            alert('Không có nhân sự nào cần quét (yêu cầu có ảnh nhưng chưa có dữ liệu mặt).');
            return;
        }

        if (!window.confirm(`Hệ thống sẽ quét tự động cho ${toScan.length} nhân sự. Tiếp tục?`)) return;

        setBulkScanning(true);
        setScanProgress({ current: 0, total: toScan.length });

        for (let i = 0; i < toScan.length; i++) {
            const emp = toScan[i];
            setScanProgress(prev => ({ ...prev, current: i + 1 }));

            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                const avatarUrl = emp.avatar;
                const isExternal = avatarUrl.startsWith('http');
                img.src = isExternal 
                    ? `${BACKEND_URL}/api/employees/proxy-image?url=${encodeURIComponent(avatarUrl)}` 
                    : `${BACKEND_URL}${avatarUrl}?t=${Date.now()}`;

                await new Promise((res, rej) => {
                    img.onload = res;
                    img.onerror = rej;
                    setTimeout(() => rej(new Error('Timeout')), 10000);
                });

                const descriptor = await detectDescriptorFromImage(img);
                if (descriptor) {
                    await api.post(`/employees/${emp.id}/face-descriptor`, {
                        descriptor: JSON.stringify(descriptor)
                    });
                    handleUpdated({ ...emp, hasFaceDescriptor: true });
                }
            } catch (err) {
                console.error(`Lỗi khi quét ${emp.fullName}:`, err);
            }
        }

        setBulkScanning(false);
        alert(`✅ Đã hoàn thành quét tự động cho ${toScan.length} nhân sự!`);
    };

    const filtered = employees
        .filter(e => {
            if (filter === 'registered') return e.hasFaceDescriptor;
            if (filter === 'pending') return !e.hasFaceDescriptor;
            return true;
        })
        .filter(e => !searchQuery || e.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || e.employeeCode?.includes(searchQuery));

    const stats = {
        total: employees.length,
        registered: employees.filter(e => e.hasFaceDescriptor).length,
    };

    return (
        <div className="ef-wrap animate-fade-in">
            <div className="ef-toolbar" style={{ borderBottom: 'none' }}>
                <div className="ef-toolbar-title">
                    <Camera size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Hệ thống Quét khuôn mặt</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {bulkScanning && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', px: '12px', py: '4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', color: '#16a34a' }}>
                            <Loader2 size={12} className="animate-spin" />
                            ĐANG QUÉT: {scanProgress.current}/{scanProgress.total}
                        </div>
                    )}
                    <div className={`ef-badge ${modelsLoaded ? 'ef-badge-success' : ''}`} style={{ padding: '4px 12px', background: modelsLoaded ? '' : '#fff7ed', color: modelsLoaded ? '' : '#9a3412', border: modelsLoaded ? '' : '1px solid #fdba74' }}>
                        <div className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                        {modelsLoading ? 'AI ĐANG TẢI...' : modelsLoaded ? 'AI SẴN SÀNG' : 'AI CHƯA TẢI'}
                    </div>
                    <button onClick={handleBulkScan} disabled={!modelsLoaded || bulkScanning} className="ef-btn ef-btn-primary" style={{ background: '#10b981', borderColor: '#10b981' }}>
                        <RefreshCw className={bulkScanning ? 'animate-spin' : ''} size={14} /> QUÉT TOÀN BỘ
                    </button>
                    <button onClick={fetchEmployees} disabled={bulkScanning} className="ef-btn">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={14} /> LÀM MỚI
                    </button>
                    {onBack && <button onClick={onBack} className="ef-btn">ĐÓNG</button>}
                </div>
            </div>

            <div className="ef-toolbar" style={{ background: '#f8fafc' }}>
                <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#1e293b', lineHeight: 1 }}>{stats.total}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginTop: '4px' }}>TỔNG NHÂN VIÊN</div>
                    </div>
                    <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '20px' }}>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981', lineHeight: 1 }}>{stats.registered}</div>
                        <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', marginTop: '4px' }}>ĐÃ ĐĂNG KÝ</div>
                    </div>
                    <div style={{ flex: 1, maxWidth: '400px', marginLeft: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>TỶ LỆ HOÀN THÀNH</span>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981', marginLeft: 'auto' }}>{stats.total > 0 ? Math.round((stats.registered / stats.total) * 100) : 0}%</span>
                        </div>
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#10b981', width: `${stats.total > 0 ? (stats.registered / stats.total) * 100 : 0}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Toolbar */}
            <div className="ef-toolbar" style={{ background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
                    <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', color: '#94a3b8' }} />
                    <input 
                        type="text"
                        placeholder="Tìm theo tên hoặc mã nhân viên..."
                        className="ef-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '32px', fontSize: '12px' }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    {[
                        ['all', 'TẤT CẢ'], 
                        ['registered', 'ĐÃ XONG'], 
                        ['pending', 'CHƯA CÓ']
                    ].map(([v, l]) => (
                        <button key={v} onClick={() => setFilter(v)}
                            className={`ef-btn ${filter === v ? 'ef-btn-primary' : 'bg-transparent text-slate-500 border-none hover:bg-slate-50'}`}
                            style={{ padding: '6px 15px', fontSize: '11px', borderRadius: '4px' }}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div style={{ padding: '20px', background: '#fdfdfe', flex: 1 }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                        <div>Đang tải dữ liệu nhân sự...</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>Không tìm thấy nhân viên nào phù hợp.</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '15px' }}>
                        {filtered.map(emp => (
                            <EmployeePhotoCard
                                key={emp.id}
                                employee={emp}
                                modelsLoaded={modelsLoaded}
                                detectDescriptorFromImage={detectDescriptorFromImage}
                                onUpdated={handleUpdated}
                                onOpenScan={setScanningEmployee}
                            />
                        ))}
                    </div>
                )}
            </div>

            {scanningEmployee && (
                <ScanningModal
                    employee={scanningEmployee}
                    modelsLoaded={modelsLoaded}
                    onUpdated={handleUpdated}
                    onClose={() => setScanningEmployee(null)}
                />
            )}
        </div>
    );
}
