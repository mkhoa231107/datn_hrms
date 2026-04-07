import React, { useState, useEffect } from 'react';
import { employeeService } from '../../api';
import '../employee/EmployeeFlat.css';
import { toast } from 'react-hot-toast';
import api from '../../api';
import { Camera } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5052';

export default function Profile({ mode = 'me', employeeId = null, onBack }) {
    const [profile, setProfile] = useState(null);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
        <div style={{ backgroundColor: '#fff', padding: '50px', textAlign: 'center', color: '#888' }}>
            <strong>Đang tải dữ liệu hồ sơ...</strong>
        </div>
    );

    if (!profile) return (
        <div style={{ backgroundColor: '#fff', padding: '50px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '10px' }}>Hồ Sơ Không Tồn Tại</h3>
            <p style={{ color: '#555' }}>Hồ sơ này không tồn tại hoặc bạn không có quyền truy cập.</p>
        </div>
    );

    const avatarUrl = profile.avatar 
        ? (profile.avatar.startsWith('http') ? profile.avatar : `${BACKEND_URL}${profile.avatar}`)
        : null;

    // A helper for rendering a form field in the grid
    const renderField = (label, required, content) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', color: '#333' }}>
                {label} {required && <span style={{ color: '#d32f2f' }}>*</span>}
            </label>
            {content}
        </div>
    );

    const inputStyle = {
        width: '100%',
        height: '32px',
        padding: '0 8px',
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        fontSize: '13px',
        color: '#333',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const readOnlyStyle = {
        ...inputStyle,
        backgroundColor: '#f9f9f9',
        color: '#555'
    };

    return (
        <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', padding: '0', minHeight: '600px', fontFamily: 'Arial, sans-serif' }}>
            
            <div style={{ display: 'flex', padding: '20px', gap: '30px' }}>
                
                {/* Left Column: Avatar */}
                <div style={{ width: '180px', flexShrink: 0, position: 'relative' }}>
                    <div style={{ 
                        width: '180px', 
                        height: '240px', 
                        border: '1px solid #ddd', 
                        backgroundColor: '#f8f8f8', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}>
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: '#aaa', fontSize: '13px' }}>Không có ảnh</span>
                        )}
                    </div>
                    {mode === 'me' && (
                        <>
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                style={{
                                    position: 'absolute', bottom: '0', right: '0',
                                    border: 'none', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                                    padding: '6px', cursor: 'pointer', display: 'flex'
                                }}
                            >
                                <Camera size={14} />
                            </button>
                            <input type="file" ref={fileInputRef} style={{ display: 'none' }} />
                        </>
                    )}
                </div>

                {/* Right Column: Grid Fields */}
                <div style={{ flex: '1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px 20px', alignContent: 'start' }}>
                    
                    {/* ROW 1 */}
                    {renderField("Họ và tên", true, 
                        <input style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.fullName || ''} onChange={e => handleInputChange('fullName', e.target.value)} readOnly={mode === 'me'} />
                    )}
                    {renderField("Mã nhân viên", true, 
                        <input style={readOnlyStyle} value={profile.employeeCode || ''} readOnly />
                    )}
                    {renderField("Ngày sinh", true, 
                        <input type="date" style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.dateOfBirth?.split('T')[0] || ''} onChange={e => handleInputChange('dateOfBirth', e.target.value)} readOnly={mode === 'me'} />
                    )}

                    {/* ROW 2 */}
                    {renderField("", false, 
                        <div style={{ 
                            backgroundColor: '#0056b3', color: '#fff', fontWeight: 'bold', 
                            height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', marginTop: '18px'
                        }}>
                            {profile.departmentName || 'Chưa Xếp Phòng Ban'}
                        </div>
                    )}
                    {renderField("Chức danh", true, 
                        <div style={{ display: 'flex', height: '32px' }}>
                            <input style={{ ...readOnlyStyle, width: 'calc(100% - 32px)', borderRight: 'none' }} value={profile.positionName || 'Chưa Xếp Vị Trí'} readOnly />
                            <button style={{ width: '32px', backgroundColor: '#0056b3', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: '1' }}>+</span>
                            </button>
                        </div>
                    )}
                    {renderField("Trạng thái", true, 
                        <input style={{...readOnlyStyle, color: profile.isActive ? '#28a745' : '#dc3545', fontWeight: 'bold'}} value={profile.isActive ? 'Đang làm việc' : 'Đã nghỉ việc'} readOnly />
                    )}

                    {/* ROW 3 */}
                    {renderField("SĐT di động", true, 
                        <input type="tel" style={inputStyle} value={formData.phone || ''} onChange={e => handleInputChange('phone', e.target.value)} />
                    )}
                    {renderField("Email", false, 
                        <input type="email" style={readOnlyStyle} value={formData.email || ''} readOnly />
                    )}
                    {renderField("Giới tính", false, 
                        mode === 'me' ? (
                            <input style={readOnlyStyle} value={formData.gender || ''} readOnly />
                        ) : (
                            <select style={inputStyle} value={formData.gender || 'Nam'} onChange={e => handleInputChange('gender', e.target.value)}>
                                <option value="Nam">Nam</option>
                                <option value="Nữ">Nữ</option>
                                <option value="Khác">Khác</option>
                            </select>
                        )
                    )}

                    {/* ROW 4 */}
                    {renderField("Số CCCD", true, 
                        <input style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.identityNumber || ''} onChange={e => handleInputChange('identityNumber', e.target.value)} readOnly={mode === 'me'} />
                    )}
                    {renderField("Ngày cấp", false, 
                        <input type="date" style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.identityDate?.split('T')[0] || ''} onChange={e => handleInputChange('identityDate', e.target.value)} readOnly={mode === 'me'} />
                    )}
                    {renderField("Ngày hết hạn", false, 
                        <input type="date" style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.identityExpirationDate?.split('T')[0] || ''} onChange={e => handleInputChange('identityExpirationDate', e.target.value)} readOnly={mode === 'me'} />
                    )}

                    {/* ROW 5 */}
                    {renderField("Nơi sinh (Quốc tịch)", false, 
                        <input style={inputStyle} value={formData.placeOfOrigin || ''} onChange={e => handleInputChange('placeOfOrigin', e.target.value)} />
                    )}
                    {renderField("Nơi cấp CCCD", false, 
                        <input style={mode === 'me' ? readOnlyStyle : inputStyle} value={formData.identityPlace || ''} onChange={e => handleInputChange('identityPlace', e.target.value)} readOnly={mode === 'me'} />
                    )}
                    {renderField("Email cá nhân", false, 
                        <input type="email" style={inputStyle} value={formData.personalEmail || ''} onChange={e => handleInputChange('personalEmail', e.target.value)} />
                    )}

                    {/* ROW 6 */}
                    {renderField("Dân tộc", false, 
                        <input style={inputStyle} value={formData.ethnicity || ''} onChange={e => handleInputChange('ethnicity', e.target.value)} />
                    )}
                    {renderField("Ghi chú", false, 
                        <input style={inputStyle} placeholder="Không có ghi chú..." />
                    )}
                    {renderField("Nơi làm việc", false, 
                        <select style={inputStyle} disabled>
                            <option>Trụ sở chính</option>
                        </select>
                    )}

                </div>
            </div>

        </div>
    );
}
