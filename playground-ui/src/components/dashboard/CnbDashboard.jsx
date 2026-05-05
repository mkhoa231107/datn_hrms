import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../api';
import { useSignalR } from '../../hooks/useSignalR';
import {
    Users, Clock, DollarSign, FileText, Shield,
    CheckSquare, AlertTriangle, TrendingUp, RefreshCw,
    UserPlus, Settings, BarChart2, ChevronRight,
    Calendar, ArrowRight, Building2, UserCheck,
    Hourglass, FileSignature, Activity, Zap, Sparkles, TrendingDown, Clock3, Info, AlertCircle
} from 'lucide-react';

const fmt = (val) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val ?? 0);

const fmtShort = (val) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} tỷ`;
    if (val >= 1_000_000)     return `${(val / 1_000_000).toFixed(0)} tr`;
    return new Intl.NumberFormat('vi-VN').format(val ?? 0);
};

const now = new Date();
const monthLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;

/* ── Reusable KPI Card ── */
function KpiCard({ icon: Icon, label, value, sub, color, onClick, loading, trend, isAlert }) {
    return (
        <div
            onClick={onClick}
            style={{
                background: isAlert ? '#FEF2F2' : 'var(--bg-surface)',
                border: isAlert ? '2px solid #EF4444' : '1px solid var(--border)',
                borderRadius: '16px',
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                cursor: onClick ? 'pointer' : 'default',
                transition: 'box-shadow 0.2s, transform 0.2s',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
        >
            {!isAlert && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, borderRadius: '16px 16px 0 0' }} />}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                    width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                    background: isAlert ? '#FEE2E2' : `${color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={20} style={{ color: isAlert ? '#EF4444' : color }} />
                </div>
                {trend && !loading && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 8px', borderRadius: '20px',
                        background: trend.isPositive ? '#ECFDF5' : (trend.isNeutral ? '#F1F5F9' : '#FEF2F2'),
                        color: trend.isPositive ? '#059669' : (trend.isNeutral ? '#64748B' : '#E11D48'),
                        fontSize: '11px', fontWeight: 700
                    }}>
                        {trend.isPositive ? <TrendingUp size={12} /> : (trend.isNeutral ? <Activity size={12} /> : <TrendingDown size={12} />)}
                        {trend.value}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: isAlert ? '#B91C1C' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                    {label}
                </p>
                {loading ? (
                    <div style={{ height: 28, width: 80, borderRadius: 6, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                ) : (
                    <p style={{ fontSize: '24px', fontWeight: 800, color: isAlert ? '#991B1B' : 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {value}
                        {onClick && <ChevronRight size={16} style={{ color: isAlert ? '#EF4444' : 'var(--text-secondary)', opacity: 0.5 }} />}
                    </p>
                )}
                {sub && !loading && (
                    <p style={{ fontSize: '12px', color: isAlert ? '#DC2626' : 'var(--text-secondary)', mt: 1, fontWeight: isAlert ? 600 : 400 }}>{sub}</p>
                )}
            </div>
        </div>
    );
}

/* ── Quick Action Button ── */
function QuickAction({ icon: Icon, label, color, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 16px', borderRadius: '10px',
                border: `1px solid ${color}30`,
                background: `${color}0D`,
                color: color, fontWeight: 600, fontSize: '13px',
                cursor: 'pointer', transition: 'all 0.2s', width: '100%',
                textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${color}20`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${color}0D`; }}
        >
            <Icon size={15} />
            <span style={{ flex: 1 }}>{label}</span>
            <ArrowRight size={13} style={{ opacity: 0.5 }} />
        </button>
    );
}

/* ── Section Card wrapper ── */
function Section({ title, children, action }) {
    return (
        <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid var(--border)',
            }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</p>
                {action}
            </div>
            <div style={{ padding: '16px 20px' }}>{children}</div>
        </div>
    );
}

/* ── Main Component ── */
export default function CnbDashboard({ onNavigate }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ⚡ Real-time updates
    useSignalR({
        onAttendanceUpdate: () => loadData(true),
        onDashboardRefresh: () => loadData(true),
        onLeaveStatusUpdate: () => loadData(true)
    });

    const [stats, setStats] = useState({
        totalEmployees: 0,
        totalDepts: 0,
        pendingLeaves: 0,
        missingTimesheets: 12, // Mocked critical missing data
        pendingContracts: 0,
        totalInsured: 0,
        estimatedPayroll: 0,
    });
    const [deptBreakdown, setDeptBreakdown] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [anomalies, setAnomalies] = useState([]);

    const fetchAttendance = useCallback(async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            const res = await api.get(`/attendance/department/0/date/${todayStr}`);
            // Logic to update anomalies would go here using the data from `res`
            // Triggered by SignalR update or refresh
        } catch (err) {
            console.error('Fetch attendance error:', err);
        }
    }, []);

    const loadData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

            const [empRes, deptRes, leaveRes, contractRes, attRes, activeContractsRes] = await Promise.allSettled([
                api.get('/employees/managed-users'),
                api.get('/departments'),
                api.get('/leave/to-approve'),
                api.get('/contracts?status=3'), // awaiting approval
                api.get(`/attendance/department/0/date/${todayStr}`), // Get today's attendance
                api.get('/contracts?status=5') // Active contracts
            ]);

            const employees = empRes.status === 'fulfilled' ? (empRes.value.data || []) : [];
            const departments = deptRes.status === 'fulfilled' ? (deptRes.value.data || []) : [];
            const leaveRequests = leaveRes.status === 'fulfilled' ? (leaveRes.value.data || []) : [];
            const contracts = contractRes.status === 'fulfilled' ? (contractRes.value.data || []) : [];
            const attendanceRecords = attRes.status === 'fulfilled' ? (attRes.value.data || []) : [];
            const activeContracts = activeContractsRes.status === 'fulfilled' ? (activeContractsRes.value.data || []) : [];

            // Department breakdown
            const deptMap = {};
            employees.forEach(emp => {
                const name = emp.departmentName || 'Chưa phân bộ phận';
                if (!deptMap[name]) deptMap[name] = 0;
                deptMap[name]++;
            });
            const breakdown = Object.entries(deptMap)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)
                .map(([dept, count]) => ({ dept, count, pct: Math.round((count / Math.max(employees.length, 1)) * 100) }));

            // Estimate payroll based on actual base salaries from active contracts
            let estimated = 0;
            if (activeContracts.length > 0) {
                estimated = activeContracts.reduce((sum, c) => sum + (c.basicSalary || 0), 0);
            } else {
                estimated = employees.length * 8_500_000; // Fallback estimate
            }

            setStats({
                totalEmployees: employees.length,
                totalDepts: departments.filter(d => !d.parentDepartmentId).length,
                pendingLeaves: leaveRequests.length,
                missingTimesheets: Math.floor(employees.length * 0.15), // Mock: 15% missing
                pendingContracts: contracts.length,
                totalInsured: Math.round(employees.length * 0.92), // ~92% estimate
                estimatedPayroll: estimated,
            });

            // Mock trend data to dept breakdown
            const breakdownWithTrend = breakdown.map(d => ({
                ...d,
                trend: Math.floor(Math.random() * 5) - 1 // -1 to +3
            }));
            setDeptBreakdown(breakdownWithTrend);

            // Compute real anomalies based on today's attendance records
            const detectedAnomalies = [];
            const currentHourMinutes = now.getHours() * 60 + now.getMinutes();

            employees.forEach(emp => {
                const empRecords = attendanceRecords.filter(r => r.employeeId === emp.id);
                const checkIn = empRecords.find(r => r.type === 'CheckIn');
                const checkOut = empRecords.find(r => r.type === 'CheckOut');
                
                let shiftStartMins = 8 * 60; // Default 08:00
                let shiftEndMins = 17 * 60; // Default 17:00
                
                const shiftStartTimeStr = checkIn?.shiftStartTime || emp.shiftStartTime;
                const shiftEndTimeStr = checkIn?.shiftEndTime || emp.shiftEndTime;
                
                if (shiftStartTimeStr && typeof shiftStartTimeStr === 'string') {
                    const [h, m] = shiftStartTimeStr.split(':');
                    shiftStartMins = parseInt(h) * 60 + parseInt(m);
                }
                if (shiftEndTimeStr && typeof shiftEndTimeStr === 'string') {
                    const [h, m] = shiftEndTimeStr.split(':');
                    shiftEndMins = parseInt(h) * 60 + parseInt(m);
                }
                
                const deptName = emp.departmentName || 'Không rõ';
                const name = emp.fullName || emp.employeeName || 'Nhân viên';

                if (checkIn) {
                    const checkInDate = new Date(checkIn.timestamp);
                    const checkInMins = checkInDate.getHours() * 60 + checkInDate.getMinutes();
                    if (checkInMins > shiftStartMins) {
                        const diff = checkInMins - shiftStartMins;
                        detectedAnomalies.push({ name, type: `Đi muộn ${diff}p`, time: `${String(checkInDate.getHours()).padStart(2,'0')}:${String(checkInDate.getMinutes()).padStart(2,'0')}`, dept: deptName, color: '#F59E0B' });
                    }
                    
                    if (checkOut) {
                        const checkOutDate = new Date(checkOut.timestamp);
                        const checkOutMins = checkOutDate.getHours() * 60 + checkOutDate.getMinutes();
                        if (checkOutMins < shiftEndMins) {
                            const diff = shiftEndMins - checkOutMins;
                            detectedAnomalies.push({ name, type: `Về sớm ${diff}p`, time: `${String(checkOutDate.getHours()).padStart(2,'0')}:${String(checkOutDate.getMinutes()).padStart(2,'0')}`, dept: deptName, color: '#F97316' });
                        }
                    } else if (currentHourMinutes > shiftEndMins + 30) {
                        // Chưa checkout và đã qua giờ làm 30 phút
                        detectedAnomalies.push({ name, type: `Chưa check-out`, time: `Hôm nay`, dept: deptName, color: '#8B5CF6' });
                    }
                } else {
                    // Chưa check in. Đã qua giờ làm 60 phút -> Vắng
                    if (currentHourMinutes > shiftStartMins + 60) {
                        detectedAnomalies.push({ name, type: `Vắng không rõ lý do`, time: `Cả ngày`, dept: deptName, color: '#EF4444' });
                    }
                }
            });

            // Sort anomalies: absent first, then late/early, take top 5
            detectedAnomalies.sort((a, b) => {
                if (a.color === '#EF4444' && b.color !== '#EF4444') return -1;
                if (b.color === '#EF4444' && a.color !== '#EF4444') return 1;
                return 0;
            });

            setAnomalies(detectedAnomalies.slice(0, 5));

            // Build activity feed from leave requests
            const activities = leaveRequests.slice(0, 5).map(r => ({
                type: 'leave',
                title: `${r.employeeName || 'Nhân viên'} xin nghỉ phép`,
                sub: r.leaveTypeName || 'Nghỉ phép',
                time: r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay',
                color: '#F59E0B',
                icon: Calendar,
            }));

            setRecentActivity(activities.length > 0 ? activities : [
                { type: 'info', title: 'Hệ thống hoạt động bình thường', sub: 'Không có yêu cầu mới', time: 'Vừa xong', color: '#10B981', icon: Activity },
            ]);

        } catch (err) {
            console.error('Dashboard load error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const nav = (tab) => onNavigate && onNavigate(tab);

    const maxDeptCount = deptBreakdown[0]?.count || 1;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'pageEnter 0.4s ease' }}>

            {/* ── Top Header & Smart Summary ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
                        <div style={{ background: '#0D948815', padding: '8px', borderRadius: '12px' }}>
                            <Zap size={24} style={{ color: '#0D9488' }} />
                        </div>
                        Bảng điều khiển C&B
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: 500 }}>
                        Tổng quan nhân sự & tiền lương — {monthLabel}
                    </p>
                </div>

                {/* Smart Summary */}
                <div style={{
                    background: 'linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%)',
                    border: '1px solid #DDD6FE', borderRadius: '16px', padding: '16px 20px',
                    maxWidth: '400px', display: 'flex', gap: '12px', alignItems: 'flex-start',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.08)'
                }}>
                    <div style={{ background: '#8B5CF6', padding: '8px', borderRadius: '12px', flexShrink: 0, color: '#fff' }}>
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#5B21B6', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Insight Tháng Này</h4>
                        <p style={{ fontSize: '13px', color: '#4C1D95', lineHeight: 1.5, fontWeight: 500 }}>
                            Nhân sự tăng nhẹ <strong>+2%</strong> so với tháng trước. Quỹ lương dự kiến tăng <strong>+1.5%</strong>. Khối <strong>Sản xuất</strong> có tỷ lệ tăng ca cao nhất tuần qua. Cần chú ý <strong>{stats.missingTimesheets}</strong> nhân viên chưa đủ công.
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Actionable Alerts (Thanh cảnh báo ưu tiên) ── */}
            {(stats.pendingLeaves > 0 || stats.pendingContracts > 0 || stats.missingTimesheets > 0) && (
                <div style={{
                    background: '#FFFBEB', border: '1px solid #FCD34D', borderLeft: '4px solid #F59E0B',
                    borderRadius: '12px', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
                    boxShadow: '0 2px 10px rgba(245, 158, 11, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={20} style={{ color: '#D97706', flexShrink: 0 }} />
                        <div>
                            <h4 style={{ fontSize: '14px', color: '#92400E', fontWeight: 800, marginBottom: '2px' }}>Cần hành động hôm nay</h4>
                            <p style={{ fontSize: '13px', color: '#B45309', fontWeight: 500 }}>
                                {stats.missingTimesheets > 0 && <>Có <strong>{stats.missingTimesheets} nhân viên</strong> thiếu dữ liệu công. </>}
                                {stats.pendingLeaves > 0 && <><strong>{stats.pendingLeaves} đơn phép</strong> chờ duyệt. </>}
                                {stats.pendingContracts > 0 && <><strong>{stats.pendingContracts} hợp đồng</strong> sắp hết hạn/chờ ký.</>}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '8px 14px', borderRadius: '8px',
                            border: '1px solid #FCD34D', background: '#FEF3C7',
                            color: '#92400E', fontSize: '12px', fontWeight: 700,
                            cursor: refreshing ? 'not-allowed' : 'pointer',
                            opacity: refreshing ? 0.6 : 1, transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FDE68A'}
                        onMouseLeave={e => e.currentTarget.style.background = '#FEF3C7'}
                    >
                        <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                        Làm mới
                    </button>
                </div>
            )}

            {/* ── KPI Cards Row 1 ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                <KpiCard
                    icon={CheckSquare} label="Chốt công tháng này" color="#EF4444"
                    value={`${stats.missingTimesheets} NV`}
                    sub="Thiếu/sai dữ liệu công"
                    loading={loading}
                    isAlert={stats.missingTimesheets > 0}
                    onClick={() => nav('attendance-management')}
                />
                <KpiCard
                    icon={Users} label="Tổng nhân sự" color="#0D9488"
                    value={stats.totalEmployees}
                    sub={`${stats.totalDepts} phòng/bộ phận`}
                    trend={{ value: '+2%', isPositive: true }}
                    loading={loading}
                    onClick={() => nav('employees')}
                />
                <KpiCard
                    icon={DollarSign} label="Dự chi lương" color="#8B5CF6"
                    value={loading ? '—' : fmtShort(stats.estimatedPayroll)}
                    sub="Ước tính tháng này"
                    trend={{ value: '+1.5%', isPositive: true }}
                    loading={loading}
                    onClick={() => nav('payroll-processing')}
                />
                <KpiCard
                    icon={Calendar} label="Đơn nghỉ chờ duyệt" color="#F59E0B"
                    value={stats.pendingLeaves}
                    sub="Cần xử lý trong tuần"
                    trend={{ value: '-3', isPositive: true }} // Less leaves is good
                    loading={loading}
                    onClick={() => nav('team-leaves')}
                />
                <KpiCard
                    icon={Shield} label="NV đóng bảo hiểm" color="#10B981"
                    value={stats.totalInsured}
                    sub={`/ ${stats.totalEmployees} nhân viên`}
                    trend={{ value: '92%', isNeutral: true }}
                    loading={loading}
                    onClick={() => nav('insurance-management')}
                />
                <KpiCard
                    icon={FileSignature} label="Hợp đồng chờ duyệt" color="#3B82F6"
                    value={stats.pendingContracts}
                    sub="Sắp hết hạn/Đang chờ ký"
                    loading={loading}
                    onClick={() => nav('admin-contracts')}
                />
            </div>

            {/* ── Row 2: Dept Breakdown + Anomalies + Quick Actions ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px 240px', gap: '16px' }}>

                {/* Left: Department distribution */}
                <Section
                    title="Phân bổ nhân sự theo bộ phận"
                    action={
                        <button
                            onClick={() => nav('employees')}
                            style={{ fontSize: '11px', color: '#0D9488', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                            Xem tất cả <ArrowRight size={11} />
                        </button>
                    }
                >
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[1,2,3,4].map(i => (
                                <div key={i} style={{ height: 36, borderRadius: 8, background: 'var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                            ))}
                        </div>
                    ) : deptBreakdown.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Chưa có dữ liệu phòng ban</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {deptBreakdown.map(({ dept, count, pct, trend }) => (
                                <div key={dept}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {dept}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {trend !== 0 && (
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: trend > 0 ? '#059669' : '#E11D48', display: 'flex', alignItems: 'center' }}>
                                                    {trend > 0 ? '+' : ''}{trend}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                {count} NV <span style={{ opacity: 0.5, marginLeft: '2px' }}>({pct}%)</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ height: '8px', borderRadius: '99px', background: 'var(--border)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${(count / maxDeptCount) * 100}%`,
                                            background: 'linear-gradient(90deg, #0D9488, #0891B2)',
                                            borderRadius: '99px',
                                            transition: 'width 0.8s ease',
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* Middle: Anomalies */}
                <Section title="Cảnh báo chấm công (Hôm nay)">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {anomalies.map((item, i) => (
                            <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '12px', borderRadius: '12px',
                                background: `${item.color}0A`, border: `1px solid ${item.color}20`
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%', background: item.color,
                                    boxShadow: `0 0 8px ${item.color}`
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</p>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                                        <span style={{ color: item.color, fontWeight: 600 }}>{item.type}</span>
                                        <span>{item.dept}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => nav('attendance-management')}
                            style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--border)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, marginTop: '4px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        >
                            Xem chi tiết
                        </button>
                    </div>
                </Section>

                {/* Right: Quick Actions */}
                <Section title="Thao tác nhanh">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <QuickAction icon={UserPlus}     label="Thêm nhân viên"    color="#0D9488" onClick={() => nav('add-employee')} />
                        <QuickAction icon={Clock}        label="Quản lý chấm công" color="#3B82F6" onClick={() => nav('attendance-management')} />
                        <QuickAction icon={CheckSquare}  label="Chốt bảng công"    color="#EF4444" onClick={() => nav('team-timesheets')} />
                        <QuickAction icon={DollarSign}   label="Tính lương"        color="#F59E0B" onClick={() => nav('payroll-processing')} />
                        <QuickAction icon={BarChart2}    label="Báo cáo lương"     color="#8B5CF6" onClick={() => nav('payroll-report')} />
                        <QuickAction icon={Shield}       label="Bảo hiểm XH"       color="#10B981" onClick={() => nav('insurance-management')} />
                        <QuickAction icon={Settings}     label="Cấu hình lương"    color="#94A3B8" onClick={() => nav('payroll-settings')} />
                    </div>
                </Section>
            </div>

            {/* ── Row 3: Activity Feed + Payroll Pipeline ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Activity feed */}
                <Section title="Yêu cầu mới nhất">
                    {recentActivity.length === 0 ? (
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                            Không có hoạt động mới
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
                            {recentActivity.map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '10px 0',
                                    borderBottom: i < recentActivity.length - 1 ? '1px solid var(--border)' : 'none',
                                }}>
                                    <div style={{
                                        width: 34, height: 34, borderRadius: '8px', flexShrink: 0,
                                        background: `${item.color}18`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <item.icon size={15} style={{ color: item.color }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.title}
                                        </p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                            {item.sub} · {item.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* Payroll pipeline */}
                <Section
                    title="Tiến độ Lương & Phúc lợi"
                    action={
                        <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                            padding: '4px 10px', borderRadius: '6px',
                            background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0'
                        }}>
                            {monthLabel}
                        </span>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {[
                            { step: 1, label: 'Kiểm tra công & Tăng ca', tab: 'attendance-management', icon: Clock,       status: 'done', deadline: 'Ngày 02' },
                            { step: 2, label: 'Chốt bảng công',           tab: 'team-timesheets',       icon: CheckSquare, status: 'urgent', deadline: 'Ngày 05 (Sắp tới)' },
                            { step: 3, label: 'Tính lương & Thuế',       tab: 'payroll-processing',    icon: DollarSign,  status: 'pending', deadline: 'Ngày 07' },
                            { step: 4, label: 'Gửi phiếu lương',         tab: 'payroll-report',         icon: FileText,    status: 'pending', deadline: 'Ngày 10' },
                            { step: 5, label: 'Quyết toán Bảo hiểm',     tab: 'insurance-management',  icon: Shield,      status: 'pending', deadline: 'Ngày 15' },
                        ].map(({ step, label, tab, icon: Icon, status, deadline }) => {
                            const isDone = status === 'done';
                            const isUrgent = status === 'urgent';
                            const borderColor = isDone ? '#10B98130' : (isUrgent ? '#F59E0B50' : 'var(--border)');
                            const bgColor = isDone ? '#10B98108' : (isUrgent ? '#FFFBEB' : 'transparent');
                            const textColor = isDone ? '#10B981' : (isUrgent ? '#B45309' : 'var(--text-primary)');
                            const iconColor = isDone ? '#10B981' : (isUrgent ? '#F59E0B' : 'var(--text-secondary)');

                            return (
                                <button
                                    key={step}
                                    onClick={() => nav(tab)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 14px', borderRadius: '12px',
                                        border: `1px solid ${borderColor}`,
                                        background: bgColor,
                                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
                                >
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800,
                                        background: isDone ? '#10B981' : (isUrgent ? '#F59E0B' : 'var(--bg-surface)'),
                                        border: (!isDone && !isUrgent) ? '1px solid var(--border)' : 'none',
                                        color: (isDone || isUrgent) ? '#fff' : 'var(--text-secondary)',
                                    }}>
                                        {isDone ? '✓' : (isUrgent ? '!' : step)}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '13px', fontWeight: 700, color: textColor, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Icon size={14} style={{ color: iconColor }} />
                                            {label}
                                        </p>
                                        <p style={{ fontSize: '11px', color: isUrgent ? '#D97706' : 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: isUrgent ? 600 : 400 }}>
                                            <Clock3 size={11} /> {deadline}
                                        </p>
                                    </div>

                                    <ChevronRight size={14} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                                </button>
                            );
                        })}
                    </div>
                </Section>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
            `}</style>
        </div>
    );
}
