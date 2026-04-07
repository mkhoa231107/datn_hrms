import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { toast } from 'react-hot-toast';
import '../employee/EmployeeFlat.css';
import { Loader2 } from 'lucide-react';

export default function MyInsurance({ user, onBack }) {
    const [insurance, setInsurance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { fetchMyInsurance(); }, []);

    const fetchMyInsurance = async () => {
        setLoading(true);
        try {
            const empId = user?.employeeId || 0;
            const r = await api.get(`/Insurance/employee/${empId}`);
            setInsurance(r.data.data);
        } catch {
            toast.error('Không thể tải thông tin bảo hiểm');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.post('/Insurance/my', {
                healthcareAmount: insurance.healthcareAmount,
                isHealthcareEnabled: insurance.isHealthcareEnabled,
                lifeInsuranceAmount: insurance.lifeInsuranceAmount,
                isLifeInsuranceEnabled: insurance.isLifeInsuranceEnabled,
                additionalInsuranceAmount: insurance.additionalInsuranceAmount,
                note: insurance.note,
                isSocialEnabled: insurance.isSocialEnabled,
                isHealthEnabled: insurance.isHealthEnabled,
                isUnemploymentEnabled: insurance.isUnemploymentEnabled,
            });
            toast.success('Đăng ký bảo hiểm tự nguyện thành công!');
        } catch {
            toast.error('Lỗi khi lưu thông tin');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="ef-wrap" style={{ textAlign: 'center', padding: '50px', color: '#888' }}>
            <strong>Đang tải thông tin phúc lợi bảo hiểm...</strong>
        </div>
    );

    if (!insurance) return (
        <div className="ef-wrap" style={{ textAlign: 'center', padding: '50px' }}>
            <h3 style={{ marginBottom: '10px' }}>Chưa Có Hồ Sơ Bảo Hiểm</h3>
            <p style={{ color: '#555' }}>Hệ thống chưa ghi nhận thông tin đóng bảo hiểm của bạn. Vui lòng liên hệ bộ phận nhân sự C&B.</p>
        </div>
    );

    return (
        <div className="ef-wrap">


            <div className="ef-section-title">
                Quyền Lợi Bảo Hiểm Bắt Buộc
            </div>

            <div className="ef-table-wrap" style={{ marginBottom: '20px' }}>
                <table className="ef-table no-top-border">
                    <tbody>
                        <tr>
                            <th className="c" style={{ width: '33%', backgroundColor: '#f4f4f4' }}>Bảo Hiểm Xã Hội (8%)</th>
                            <th className="c" style={{ width: '33%', backgroundColor: '#f4f4f4' }}>Bảo Hiểm Y Tế (1.5%)</th>
                            <th className="c" style={{ width: '33%', backgroundColor: '#f4f4f4' }}>BH Thất Nghiệp (1%)</th>
                        </tr>
                        <tr>
                            <td className={`c ${insurance.isSocialEnabled ? 'ef-text-ok' : 'ef-text-miss'}`}>
                                {insurance.isSocialEnabled ? 'THAM GIA' : 'CHƯA KÍCH HOẠT'}
                            </td>
                            <td className={`c ${insurance.isHealthEnabled ? 'ef-text-ok' : 'ef-text-miss'}`}>
                                {insurance.isHealthEnabled ? 'THAM GIA' : 'CHƯA KÍCH HOẠT'}
                            </td>
                            <td className={`c ${insurance.isUnemploymentEnabled ? 'ef-text-ok' : 'ef-text-miss'}`}>
                                {insurance.isUnemploymentEnabled ? 'THAM GIA' : 'CHƯA KÍCH HOẠT'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="ef-section-title">
                Đăng Ký Gói Phúc Lợi Tự Nguyện
            </div>

            <div className="ef-table-wrap" style={{ marginBottom: '20px' }}>
                <table className="ef-table no-top-border">
                    <thead>
                        <tr>
                            <th>Thông Tin Gói Quyền Lợi</th>
                            <th className="c" style={{ width: '15%' }}>Tham Gia</th>
                            <th className="r" style={{ width: '25%' }}>Mức Đóng Hàng Tháng (VND)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Healthcare */}
                        <tr>
                            <td>
                                <strong>Gói Chăm Sóc Sức Khỏe Toàn Diện</strong>
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '0' }}>Hỗ trợ chi trả khi khám chữa bệnh tại các bệnh viện tư nhân, quốc tế chất lượng cao.</p>
                            </td>
                            <td className="c">
                                <input 
                                    type="checkbox" 
                                    checked={insurance.isHealthcareEnabled} 
                                    onChange={() => setInsurance({ ...insurance, isHealthcareEnabled: !insurance.isHealthcareEnabled })} 
                                    style={{ cursor: 'pointer', accentColor: '#1a56db' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    className="ef-input"
                                    disabled={!insurance.isHealthcareEnabled} 
                                    value={insurance.healthcareAmount || 0} 
                                    onChange={e => setInsurance({ ...insurance, healthcareAmount: parseFloat(e.target.value) || 0 })} 
                                    style={{ textAlign: 'right' }}
                                />
                            </td>
                        </tr>

                        {/* Life Insurance */}
                        <tr>
                            <td>
                                <strong>Quỹ Bảo Hiểm Nhân Thọ</strong>
                                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginBottom: '0' }}>Kênh đầu tư ủy thác đóng phí dài hạn qua doanh nghiệp, bảo vệ trước rủi ro.</p>
                            </td>
                            <td className="c">
                                <input 
                                    type="checkbox" 
                                    checked={insurance.isLifeInsuranceEnabled} 
                                    onChange={() => setInsurance({ ...insurance, isLifeInsuranceEnabled: !insurance.isLifeInsuranceEnabled })} 
                                    style={{ cursor: 'pointer', accentColor: '#1a56db' }}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    className="ef-input"
                                    disabled={!insurance.isLifeInsuranceEnabled} 
                                    value={insurance.lifeInsuranceAmount || 0} 
                                    onChange={e => setInsurance({ ...insurance, lifeInsuranceAmount: parseFloat(e.target.value) || 0 })} 
                                    style={{ textAlign: 'right' }}
                                />
                            </td>
                        </tr>

                        {/* Additional */}
                        <tr>
                            <td>
                                <strong>Ghi chú & Yêu cầu thiết kế riêng</strong>
                                <textarea 
                                    rows="1" 
                                    value={insurance.note || ''} 
                                    onChange={e => setInsurance({ ...insurance, note: e.target.value })} 
                                    className="ef-textarea"
                                    style={{ marginTop: '8px', minHeight: '40px' }}
                                    placeholder="Nhập ghi chú yêu cầu tư vấn gói bảo hiểm phù hợp..."
                                ></textarea>
                            </td>
                            <td className="c" style={{ verticalAlign: 'top', paddingTop: '15px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>BỔ SUNG</span>
                            </td>
                            <td style={{ verticalAlign: 'top', paddingTop: '10px' }}>
                                <input 
                                    type="number" 
                                    className="ef-input"
                                    value={insurance.additionalInsuranceAmount || 0} 
                                    onChange={e => setInsurance({ ...insurance, additionalInsuranceAmount: parseFloat(e.target.value) || 0 })} 
                                    style={{ textAlign: 'right' }}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ fontSize: '12px', color: '#856404', backgroundColor: '#fff3cd', padding: '10px 15px', border: '1px solid #ffeeba', flex: '1', minWidth: '300px' }}>
                    <strong>Lưu ý:</strong> Mọi khoản chi phí bảo hiểm tự nguyện sẽ được xử lý tự động và đối trừ trực tiếp vào tổng thu nhập trước thuế hàng tháng (Gross).
                </div>
                <div>
                    <button onClick={handleSave} disabled={saving} className="ef-btn ef-btn-primary" style={{ padding: '8px 24px' }}>
                        {saving ? 'Đang lưu...' : 'Xác Nhận Đăng Ký'}
                    </button>
                </div>
            </div>
        </div>
    );
}
