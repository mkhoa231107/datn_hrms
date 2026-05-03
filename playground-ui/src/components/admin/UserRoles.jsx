import React, { useState, useEffect } from 'react';
import { usersService, api } from '../../api';
import {
    Shield, Search, X, Check, AlertCircle, Loader2,
    UserPlus, Pencil, Trash2, KeyRound, ToggleLeft, ToggleRight, ChevronDown, RefreshCw, UserCircle,
    ChevronLeft, ChevronRight, Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import TabFilter from '../ui/TabFilter';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// ── Role badge ──────────────────────────────────────────────────────
const ROLE_COLORS = {
    Admin: 'bg-rose-50 text-rose-700 border-rose-200',
    CnbSpecialist: 'bg-teal-50 text-teal-700 border-teal-200',
    Accountant: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DepartmentManager: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    DepartmentHead: 'bg-amber-50 text-amber-700 border-amber-200',
    TeamLeader: 'bg-orange-50 text-orange-700 border-orange-200',
    Employee: 'bg-slate-50 text-slate-600 border-slate-200',
};

function RoleBadge({ name }) {
    const cls = ROLE_COLORS[name] || 'bg-slate-50 text-slate-600 border-slate-200';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
            {name}
        </span>
    );
}

// ── Modal wrapper ───────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, children, footer }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0">
                    <div>
                        <h3 className="font-bold text-lg">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1">{children}</div>
                {footer && <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">{footer}</div>}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}

const inputCls = "w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all";

// ── Main Component ──────────────────────────────────────────────────
export default function UserRoles({ user }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [saving, setSaving] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [selectedTabId, setSelectedTabId] = useState('all');
    const [page, setPage] = useState(1);
    const PER_PAGE = 10;
    const { isMobile } = useBreakpoint();

    // Modal states
    const [modal, setModal] = useState(null); // 'create' | 'edit-info' | 'edit-roles' | 'reset-pw' | 'delete'
    const [selectedUser, setSelectedUser] = useState(null);

    // Form states
    const [form, setForm] = useState({});
    const [selectedRoles, setSelectedRoles] = useState([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [u, r, d] = await Promise.all([
                usersService.getAllUsers(), 
                usersService.getRoles(),
                api.get('/departments').catch(() => ({ data: [] }))
            ]);
            
            // Handle both wrapped and unwrapped API responses
            const userList = Array.isArray(u) ? u : (u?.data || []);
            const roleList = Array.isArray(r) ? r : (r?.data || []);
            const deptList = Array.isArray(d.data) ? d.data : (d.data?.data || []);

            setUsers(userList);
            setRoles(roleList);
            setDepartments(deptList);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Lỗi khi tải dữ liệu.');
        } finally { setLoading(false); }
    };

    const openModal = (type, u = null) => {
        setSelectedUser(u);
        setModal(type);
        if (type === 'create') {
            setForm({ username: '', password: '', fullName: '', email: '', isActive: true });
            setSelectedRoles([]);
        } else if (type === 'edit-info') {
            setForm({ fullName: u.fullName, email: u.email });
        } else if (type === 'edit-roles') {
            setSelectedRoles(u.roles.map(r => r.id));
        } else if (type === 'reset-pw') {
            setForm({ newPassword: '' });
        }
    };

    const closeModal = () => { setModal(null); setSelectedUser(null); };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (modal === 'create') {
                if (!form.username || !form.password || !form.fullName || !form.email)
                    throw new Error('Vui lòng điền đầy đủ thông tin bắt buộc.');
                await usersService.createUser({ ...form, roleIds: selectedRoles });
                toast.success(`Đã tạo tài khoản @${form.username}`);
            } else if (modal === 'edit-info') {
                await usersService.updateUserInfo(selectedUser.id, form);
                toast.success('Đã cập nhật thông tin tài khoản.');
            } else if (modal === 'edit-roles') {
                await usersService.updateRoles(selectedUser.id, selectedRoles);
                toast.success(`Đã cập nhật phân quyền cho @${selectedUser.username}`);
            } else if (modal === 'reset-pw') {
                if (!form.newPassword || form.newPassword.length < 6)
                    throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
                await usersService.resetPassword(selectedUser.id, form.newPassword);
                toast.success(`Đã đặt lại mật khẩu cho @${selectedUser.username}`);
            } else if (modal === 'reset-pw') {
                if (!form.newPassword || form.newPassword.length < 6)
                    throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
                await usersService.resetPassword(selectedUser.id, form.newPassword);
                toast.success(`Đã đặt lại mật khẩu cho @${selectedUser.username}`);
            } else if (modal === 'delete') {
                await usersService.deleteUser(selectedUser.id);
                toast.success(`Đã xóa tài khoản @${selectedUser.username}`);
            }
            closeModal();
            await fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || e.message || 'Có lỗi xảy ra.');
        } finally { setSaving(false); }
    };

    const handleToggleActive = async (u) => {
        try {
            await usersService.toggleActive(u.id);
            toast.success(u.isActive ? `Đã khóa @${u.username}` : `Đã mở khóa @${u.username}`);
            await fetchData();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Không thể thay đổi trạng thái.');
        }
    };

    const toggleRole = (id) => setSelectedRoles(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);

    const getAllDescendantIds = (deptId, allDepts) => {
        if (!deptId) return [];
        let ids = [deptId.toString()];
        const children = allDepts.filter(d => d.parentDepartmentId && d.parentDepartmentId.toString() === deptId.toString());
        children.forEach(child => {
            ids = [...ids, ...getAllDescendantIds(child.id, allDepts)];
        });
        return ids;
    };

    const filteredUsers = React.useMemo(() => {
        const result = users.filter(u => {
            const matchesSearch = 
                (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!matchesSearch) return false;

            if (selectedTabId === 'all') return true;
            
            const tabMatch = {
                'kd': 'Kinh doanh',
                'mkt': 'Marketing',
                'sx': 'Sản xuất'
            }[selectedTabId];

            if (!tabMatch) return true;

            const rootDept = departments.find(d => 
                d.departmentName.toLowerCase().includes(tabMatch.toLowerCase()) && !d.parentDepartmentId
            );

            if (!rootDept) {
                return u.departmentName?.toLowerCase().includes(tabMatch.toLowerCase());
            }

            const allowedIds = getAllDescendantIds(rootDept.id, departments);
            return u.departmentId && allowedIds.includes(u.departmentId.toString());
        });
        return result;
    }, [users, departments, searchTerm, selectedTabId]);

    const visibleUsers = React.useMemo(() => {
        return filteredUsers.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    }, [filteredUsers, page]);

    const totalPages = Math.ceil(filteredUsers.length / PER_PAGE);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, selectedTabId]);

    const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        locked: users.filter(u => !u.isActive).length,
        admins: users.filter(u => u.roles.some(r => r.roleName === 'Admin')).length
    };

    const SaveBtn = ({ label = 'Lưu thay đổi', danger = false }) => (
        <button onClick={handleSave} disabled={saving}
            className={`btn ${danger ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'btn-primary'} shadow-sm flex items-center gap-2 disabled:opacity-70`}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : label}
        </button>
    );
    const CancelBtn = () => (
        <button onClick={closeModal} disabled={saving} className="btn btn-ghost border-slate-200">Hủy bỏ</button>
    );

    return (
        <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
            {/* Standard Module Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Shield className="text-violet-600" size={28} />
                        Quản lý Tài khoản & Phân Quyền
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-400 text-sm">Quản lý định danh người dùng và quyền truy cập hệ thống (RBAC)</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="text-slate-400 text-sm">{users.length} tài khoản</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="btn btn-ghost shadow-sm">
                        <RefreshCw className={loading ? 'animate-spin' : ''} size={16} /> Làm mới
                    </button>
                    <button onClick={() => openModal('create')} className="btn btn-primary shadow-lg shadow-violet-200">
                        <UserPlus size={16} /> Tạo tài khoản
                    </button>
                </div>
            </div>

            {/* Standard KPI Cards */}
            <div className={isMobile ? 'kpi-scroll mb-8' : 'grid grid-cols-2 md:grid-cols-4 gap-6 mb-8'}>
                {[
                    { label: 'Tổng tài khoản', value: stats.total, icon: UserCircle, color: 'violet' },
                    { label: 'Đang hoạt động', value: stats.active, icon: Check, color: 'emerald' },
                    { label: 'Đã khóa', value: stats.locked, icon: AlertCircle, color: 'rose' },
                    { label: 'Quản trị viên', value: stats.admins, icon: Shield, color: 'amber' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className={`card !p-5 flex items-center gap-4 border-l-4 border-l-${color}-500 shadow-sm`}>
                        <div className={`w-12 h-12 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>
                            <Icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                            <h3 className="text-xl font-black text-slate-800 stat-value">{value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Department Tabs */}
            <TabFilter 
                tabs={[
                    { id: 'all', label: 'TẤT CẢ' },
                    { id: 'kd', label: 'PHÒNG KINH DOANH' },
                    { id: 'mkt', label: 'PHÒNG MARKETING' },
                    { id: 'sx', label: 'PHÒNG SẢN XUẤT' },
                ]}
                activeTabId={selectedTabId}
                onTabChange={setSelectedTabId}
                className="mb-8"
            />

            {/* Standard Filter Bar */}
            <div className="card !p-4 bg-slate-50/50 border-slate-200/60 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo username, email, tên người dùng..."
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input !pl-11 !py-3 bg-white border-slate-200 font-bold"
                    />
                </div>
            </div>

            {/* Main Table */}
            <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm">
                <div className="table-mobile-scroll">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Người dùng</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phòng ban</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vai trò</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400 italic">
                                        <div className="flex flex-col items-center gap-3">
                                            <RefreshCw className="animate-spin text-violet-500" size={32} />
                                            <span>Đang tải danh sách tài khoản...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center text-slate-400 italic font-medium">
                                        Không tìm thấy tài khoản nào phù hợp.
                                    </td>
                                </tr>
                            ) : visibleUsers.map(u => (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 text-center font-bold text-slate-400">#{u.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-violet-100 transition-colors">
                                                {u.fullName.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-sm font-black text-slate-700 truncate">{u.fullName}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">@{u.username}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{u.email}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-[11px] font-bold text-slate-600">{u.departmentName || <span className="text-slate-300 italic font-normal">Chưa gán</span>}</div>
                                        {u.positionName && <div className="text-[9px] text-violet-500 uppercase font-black">{u.positionName}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles.length === 0 && <span className="text-[10px] text-slate-400 italic font-bold">CHƯA PHÂN QUYỀN</span>}
                                            {u.roles.map(r => <RoleBadge key={r.id} name={r.roleName} />)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleToggleActive(u)} title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
                                            {u.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-all">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 hover:bg-slate-100 transition-all">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Đã khóa
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openModal('edit-info', u)} title="Sửa thông tin"
                                                className="btn btn-ghost !p-2 text-slate-500 hover:text-violet-600">
                                                <Pencil size={14} />
                                            </button>
                                            <button onClick={() => openModal('edit-roles', u)} title="Phân quyền"
                                                className="btn btn-ghost !p-2 text-slate-500 hover:text-teal-600">
                                                <Shield size={14} />
                                            </button>
                                            <button onClick={() => openModal('reset-pw', u)} title="Đặt lại mật khẩu"
                                                className="btn btn-ghost !p-2 text-slate-500 hover:text-amber-600">
                                                <KeyRound size={14} />
                                            </button>
                                            {u.id !== user?.id && (
                                                <button onClick={() => openModal('delete', u)} title="Xóa tài khoản"
                                                    className="btn btn-ghost !p-2 text-slate-500 hover:text-rose-600">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-xs font-medium text-slate-400">
                        Hiển thị {visibleUsers.length} trên {filteredUsers.length} tài khoản
                    </p>
                    <div className="flex items-center gap-2">
                        <button 
                            disabled={page === 1} 
                            onClick={() => setPage(p => p - 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages || 1}</span>
                        <button 
                            disabled={page >= totalPages} 
                            onClick={() => setPage(p => p + 1)} 
                            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── MODALS (Keep existing logic but apply standard styling) ── */}
            {modal === 'create' && (
                <Modal title="Tạo tài khoản mới" onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Tạo tài khoản" /></>}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Tên đăng nhập *">
                                <input className="input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="vd: nguyen_van_a" />
                            </Field>
                            <Field label="Mật khẩu *">
                                <input className="input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" />
                            </Field>
                        </div>
                        <Field label="Họ và tên đầy đủ *">
                            <input className="input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="vd: Nguyễn Văn A" />
                        </Field>
                        <Field label="Email *">
                            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vd: a@company.com" />
                        </Field>
                        <Field label="Vai trò (có thể chọn nhiều)">
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {roles.map(r => {
                                    const on = selectedRoles.includes(r.id);
                                    return (
                                        <div key={r.id} onClick={() => toggleRole(r.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${on ? 'border-violet-500 bg-violet-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${on ? 'bg-violet-500 text-white' : 'bg-white border border-slate-300'}`}>
                                                {on && <Check size={14} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-black text-[13px] text-slate-700">{r.roleName}</div>
                                                {r.description && <div className="text-[10px] font-bold text-slate-400 uppercase truncate tracking-widest">{r.description}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Field>
                    </div>
                </Modal>
            )}

            {modal === 'edit-info' && selectedUser && (
                <Modal title="Sửa thông tin tài khoản" subtitle={`@${selectedUser.username}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn /></>}>
                    <div className="space-y-4">
                        <Field label="Họ và tên">
                            <input className="input" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                        </Field>
                        <Field label="Email">
                            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </Field>
                    </div>
                </Modal>
            )}

            {modal === 'edit-roles' && selectedUser && (
                <Modal title="Phân quyền tài khoản" subtitle={`@${selectedUser.username} — ${selectedUser.fullName}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn /></>}>
                    {selectedUser.id === user?.id && (
                        <div className="mb-4 p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs flex gap-3 items-center">
                            <AlertCircle size={20} className="shrink-0" />
                            <span className="font-bold">Cảnh báo: Bạn đang tự chỉnh sửa quyền của chính mình. Thao tác sai có thể khiến bạn mất quyền truy cập.</span>
                        </div>
                    )}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                        {roles.map(r => {
                            const on = selectedRoles.includes(r.id);
                            return (
                                <div key={r.id} onClick={() => toggleRole(r.id)}
                                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${on ? 'border-violet-500 bg-violet-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors shrink-0 ${on ? 'bg-violet-500 text-white' : 'bg-white border border-slate-300'}`}>
                                        {on && <Check size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-black text-sm text-slate-700">{r.roleName}</div>
                                        {r.description && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{r.description}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Modal>
            )}

            {modal === 'reset-pw' && selectedUser && (
                <Modal title="Đặt lại mật khẩu" subtitle={`@${selectedUser.username}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Đặt lại mật khẩu" /></>}>
                    <div className="space-y-4">
                        <div className="p-4 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs flex gap-3 items-center">
                            <AlertCircle size={20} className="shrink-0" />
                            <span className="font-bold">Mật khẩu mới sẽ được áp dụng ngay lập tức. Hãy đảm bảo bạn đã ghi lại mật khẩu này để thông báo cho người dùng.</span>
                        </div>
                        <Field label="Mật khẩu mới (tối thiểu 6 ký tự)">
                            <input className="input" type="password" value={form.newPassword}
                                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                                placeholder="Nhập mật khẩu mới..." />
                        </Field>
                    </div>
                </Modal>
            )}

            {modal === 'delete' && selectedUser && (
                <Modal title="Xác nhận xóa tài khoản" onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Xóa tài khoản" danger /></>}>
                    <div className="space-y-3">
                        <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <p className="font-black text-rose-700 text-lg">Hành động nguy hiểm!</p>
                                <p className="text-sm text-rose-600 mt-1">Tài khoản <b>@{selectedUser.username}</b> ({selectedUser.fullName}) sẽ bị xóa vĩnh viễn. Tất cả phân quyền và thông tin liên quan sẽ bị loại bỏ.</p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
