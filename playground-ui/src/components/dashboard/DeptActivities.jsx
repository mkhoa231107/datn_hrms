import React, { useState, useEffect } from 'react';
import { auditLogService } from '../../api';
import {
    Activity, Clock, Info,
    RefreshCw, Search, Filter,
    ArrowRight, Calendar, Umbrella,
    CheckCircle, XCircle, Edit
} from 'lucide-react';

export default function DeptActivities({ user, onBack }) {
    const roles = user?.roles || [];
    const isTeamLeader = roles.includes('TeamLeader') && !roles.includes('DepartmentManager') && !roles.includes('Admin');
    const label = isTeamLeader ? 'Tổ' : 'Phòng ban';

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('All');
    const [activeDeptTab, setActiveDeptTab] = useState('Tổ Lương Thưởng');
    const [selectedLog, setSelectedLog] = useState(null);

    useEffect(() => { fetchLogs(); }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await auditLogService.getDepartmentActivities();
            // Lọc bỏ thao tác của chính mình và Lọc Spam (De-duplication)
            const seen = new Set();
            const othersLogs = [];
            
            data.forEach(l => {
                if (l.userId === user?.id) return;
                
                // Key để nhận diện spam: cùng User, cùng Hành động, cùng Giây
                const timeKey = new Date(l.createdAt).toISOString().split('.')[0]; // Lấy đến giây
                const spamKey = `${l.userId}-${l.action}-${timeKey}`;
                
                if (!seen.has(spamKey)) {
                    seen.add(spamKey);
                    
                    let processedLog = { ...l };
                    const name = l.userFullName || '';
                    if (name.includes('Lê Thị Thảo')) processedLog.userDepartmentName = 'Tổ Lương Thưởng';
                    if (name.includes('Hoàng Anh Hồng') || name.includes('Minh') || name.includes('Bùi Thu Hồng')) {
                        processedLog.userDepartmentName = 'Tổ Tuyển Dụng';
                    }
                    othersLogs.push(processedLog);
                }
            });
            
            setLogs(othersLogs);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const getActionLabel = (action, entityType) => {
        if (action.includes('approve')) return 'Phê duyệt đơn';
        if (action.includes('reject')) return 'Từ chối đơn';
        const method = action.split(' ')[0];
        if (method === 'POST') return `Tạo mới ${entityType}`;
        if (method === 'PUT') return `Cập nhật ${entityType}`;
        if (method === 'DELETE') return `Xóa ${entityType}`;
        if (method === 'PATCH') return `Sửa ${entityType}`;
        return action;
    };

    const getMethodBadge = (action) => {
        if (action.includes('approve')) return { label: 'DUYỆT', css: 'ef-text-ok' };
        if (action.includes('reject')) return { label: 'TỪ CHỐI', css: 'ef-text-miss' };
        const method = action.split(' ')[0];
        if (method === 'POST') return { label: 'TẠO MỚI', color: '#0369a1' };
        if (method === 'PUT') return { label: 'CẬP NHẬT', color: '#b45309' };
        if (method === 'DELETE') return { label: 'XÓA', css: 'ef-text-miss' };
        return { label: method, color: '#333' };
    };

    const filteredLogs = logs.filter(log => {
        const matchesTab = log.userDepartmentName?.toLowerCase().includes(activeDeptTab.toLowerCase());
        const matchesSearch =
            log.userFullName?.toLowerCase().includes(search.toLowerCase()) ||
            log.action.toLowerCase().includes(search.toLowerCase()) ||
            log.entityType.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'All' || log.entityType === filter;
        return matchesTab && matchesSearch && matchesFilter;
    });

    const entityTypes = ['All', ...new Set(logs.map(l => l.entityType))];

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar print:hidden">
                <div className="ef-toolbar-title">
                    <Activity size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ textTransform: 'uppercase' }}>NHẬT KÝ HOẠT ĐỘNG {label.toUpperCase()}</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={fetchLogs} disabled={loading} className="ef-btn">LÀM MỚI</button>
                    {onBack && <button onClick={onBack} className="ef-btn">ĐÓNG</button>}
                </div>
            </div>

            {/* Department Tabs */}
            <div className="ef-toolbar print:hidden" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minHeight: '44px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['Tổ Lương Thưởng', 'Tổ Tuyển Dụng'].map(deptName => {
                        const count = logs.filter(l => l.userDepartmentName?.toLowerCase().includes(deptName.toLowerCase())).length;
                        const isActive = activeDeptTab === deptName;
                        return (
                            <button
                                key={deptName}
                                onClick={() => setActiveDeptTab(deptName)}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    background: isActive ? '#fff' : 'transparent',
                                    color: isActive ? '#6366f1' : '#64748b',
                                    borderBottom: isActive ? '3px solid #6366f1' : '3px solid transparent',
                                    transition: 'all 0.2s',
                                    position: 'relative'
                                }}
                            >
                                {deptName}
                                <span style={{
                                    marginLeft: '6px',
                                    fontSize: '10px',
                                    background: isActive ? '#eef2ff' : '#f1f5f9',
                                    padding: '2px 6px',
                                    borderRadius: '10px'
                                }}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="ef-toolbar print:hidden">
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm người thực hiện, hành động..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="ef-input"
                        style={{ width: '300px', paddingLeft: '32px' }}
                    />
                </div>
                
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '12px', fontWeight: 'bold' }}>LOẠI ĐỐI TƯỢNG:</span>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="ef-select"
                    style={{ width: '150px' }}
                >
                    {entityTypes.map(type => (
                        <option key={type} value={type}>{type === 'All' ? 'Tất cả' : type}</option>
                    ))}
                </select>

                <div style={{ flex: 1 }}></div>
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'medium' }}>
                    <Activity size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                    {activeDeptTab}: <strong>{filteredLogs.length}</strong>
                </div>
            </div>

            <div className="ef-table-wrap">
                <table className="ef-table no-top-border">
                    <thead>
                        <tr>
                            <th style={{ width: '25%' }}>NGƯỜI THỰC HIỆN</th>
                            <th className="c" style={{ width: '18%' }}>THỜI GIAN</th>
                            <th style={{ width: '22%' }}>HÀNH ĐỘNG</th>
                            <th style={{ width: '15%' }}>ĐỐI TƯỢNG</th>
                            <th className="c" style={{ width: '10%' }}>TRẠNG THÁI</th>
                            <th className="c" style={{ width: '10%' }}>XEM</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && logs.length === 0 ? (
                            <tr><td colSpan="6" className="ef-empty">Đang tải biểu nhật ký...</td></tr>
                        ) : filteredLogs.length === 0 ? (
                            <tr><td colSpan="6" className="ef-empty">Không có dữ liệu hoạt động.</td></tr>
                        ) : filteredLogs.map((log) => {
                            const badge = getMethodBadge(log.action);
                            return (
                                <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedLog(log)}>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{log.userFullName}</div>
                                        <div style={{ fontSize: '10px', color: '#888' }}>{log.userRoleName || 'NHÂN VIÊN'}</div>
                                    </td>
                                    <td className="c">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                                    <td>
                                        <div style={{ fontSize: '12px', color: '#333' }}>
                                            {getActionLabel(log.action, log.entityType)}
                                            {log.entityId && (
                                                <span style={{ marginLeft: '4px', fontWeight: 'bold', color: '#888' }}>
                                                    #{log.entityId}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>{log.entityType}</td>
                                    <td className="c">
                                        <span className={badge.css} style={{ fontSize: '10px', fontWeight: 'bold', color: badge.color }}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="c">
                                        <button className="ef-btn" style={{ padding: '2px 8px', fontSize: '10px' }}>XEM</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedLog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', width: '500px', border: '1px solid #1a56db', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <div style={{ background: '#1a56db', color: '#fff', padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong style={{ fontSize: '12px' }}>CHI TIẾT HOẠT ĐỘNG #{selectedLog.id}</strong>
                            <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><XCircle size={14} /></button>
                        </div>
                        <div style={{ padding: '15px', maxHeight: '70vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '15px' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px', background: '#f5f5f5', border: '1px solid #ddd', width: '35%', fontWeight: 'bold' }}>Người thao tác</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{selectedLog.userFullName} ({selectedLog.userRoleName})</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', background: '#f5f5f5', border: '1px solid #ddd', fontWeight: 'bold' }}>Thời gian</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{new Date(selectedLog.createdAt).toLocaleString('vi-VN')}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', background: '#f5f5f5', border: '1px solid #ddd', fontWeight: 'bold' }}>Hành động</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{selectedLog.action}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', background: '#f5f5f5', border: '1px solid #ddd', fontWeight: 'bold' }}>Đối tượng</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ''}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', background: '#f5f5f5', border: '1px solid #ddd', fontWeight: 'bold' }}>IP / Agent</td>
                                        <td style={{ padding: '8px', border: '1px solid #ddd' }}>{selectedLog.ipAddress}</td>
                                    </tr>
                                </tbody>
                            </table>

                            {selectedLog.newValue && (
                                <div>
                                    <strong style={{ fontSize: '11px', color: '#555' }}>DỮ LIỆU PAYLOAD:</strong>
                                    <pre style={{
                                        padding: '10px',
                                        background: '#f9f9f9',
                                        border: '1px solid #ddd',
                                        color: '#333',
                                        fontSize: '11px',
                                        marginTop: '5px',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                    }}>
                                        {(() => {
                                            try { return JSON.stringify(JSON.parse(selectedLog.newValue), null, 2); }
                                            catch { return selectedLog.newValue; }
                                        })()}
                                    </pre>
                                </div>
                            )}
                        </div>
                        <div style={{ padding: '10px 15px', background: '#f9f9f9', borderTop: '1px solid #ddd', textAlign: 'right' }}>
                            <button onClick={() => setSelectedLog(null)} className="ef-btn">ĐÓNG</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
