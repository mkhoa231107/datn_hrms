import React, { useState, useEffect } from 'react';
import { usersService } from '../../api';
import {
    Shield, Search, X, Check, AlertCircle, Loader2,
    UserPlus, Pencil, Trash2, KeyRound, ToggleLeft, ToggleRight, ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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
            const [u, r] = await Promise.all([usersService.getAllUsers(), usersService.getRoles()]);
            setUsers(u);
            setRoles(r);
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

    const filteredUsers = users.filter(u =>
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const SaveBtn = ({ label = 'Lưu thay đổi', danger = false }) => (
        <button onClick={handleSave} disabled={saving}
            className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-70 ${danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</> : label}
        </button>
    );
    const CancelBtn = () => (
        <button onClick={closeModal} disabled={saving} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors">Hủy bỏ</button>
    );

    return (
        <div className="card animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Quản lý Tài khoản & Phân Quyền</h2>
                        <p className="text-slate-500 text-sm">Thêm, sửa, xóa tài khoản và gán vai trò truy cập (RBAC)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Tìm username, email, tên..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium" />
                    </div>
                    <button onClick={() => openModal('create')}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shrink-0">
                        <UserPlus className="w-4 h-4" /> Tạo TK
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 w-12 text-center">ID</th>
                                <th className="p-4">Tài khoản</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Vai trò</th>
                                <th className="p-4 w-28 text-center">Trạng thái</th>
                                <th className="p-4 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />Đang tải...
                                </td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-slate-400">
                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Search className="w-5 h-5 text-slate-300" />
                                    </div>
                                    Không tìm thấy tài khoản phù hợp
                                </td></tr>
                            ) : filteredUsers.map(u => (
                                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 text-center font-medium text-slate-400">#{u.id}</td>
                                    <td className="p-4">
                                        <div className="font-bold text-slate-800">{u.fullName}</div>
                                        <div className="text-xs text-slate-500">@{u.username}</div>
                                    </td>
                                    <td className="p-4 text-slate-600 text-xs">{u.email}</td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.roles.length === 0 && <span className="text-xs text-slate-400 italic">Chưa phân quyền</span>}
                                            {u.roles.map(r => <RoleBadge key={r.id} name={r.roleName} />)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleToggleActive(u)} title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}>
                                            {u.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full hover:bg-emerald-100 transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full hover:bg-slate-200 transition-colors">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Đã khóa
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => openModal('edit-info', u)} title="Sửa thông tin"
                                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => openModal('edit-roles', u)} title="Phân quyền"
                                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                                                <Shield className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => openModal('reset-pw', u)} title="Đặt lại mật khẩu"
                                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                <KeyRound className="w-3.5 h-3.5" />
                                            </button>
                                            {u.id !== user?.id && (
                                                <button onClick={() => openModal('delete', u)} title="Xóa tài khoản"
                                                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 font-medium">
                    Tổng số: {filteredUsers.length} / {users.length} tài khoản
                </div>
            </div>

            {/* ── MODAL: CREATE USER ── */}
            {modal === 'create' && (
                <Modal title="Tạo tài khoản mới" onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Tạo tài khoản" /></>}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Tên đăng nhập *">
                                <input className={inputCls} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="vd: nguyen_van_a" />
                            </Field>
                            <Field label="Mật khẩu *">
                                <input className={inputCls} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Tối thiểu 6 ký tự" />
                            </Field>
                        </div>
                        <Field label="Họ và tên đầy đủ *">
                            <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="vd: Nguyễn Văn A" />
                        </Field>
                        <Field label="Email *">
                            <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vd: a@company.com" />
                        </Field>
                        <Field label="Vai trò (có thể chọn nhiều)">
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {roles.map(r => {
                                    const on = selectedRoles.includes(r.id);
                                    return (
                                        <div key={r.id} onClick={() => toggleRole(r.id)}
                                            className={`flex items-center gap-3 p-2.5 rounded-xl border-2 cursor-pointer transition-all ${on ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${on ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-300'}`}>
                                                {on && <Check className="w-3 h-3" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-slate-700">{r.roleName}</div>
                                                {r.description && <div className="text-xs text-slate-400 truncate">{r.description}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Field>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: EDIT INFO ── */}
            {modal === 'edit-info' && selectedUser && (
                <Modal title="Sửa thông tin tài khoản" subtitle={`@${selectedUser.username}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn /></>}>
                    <div className="space-y-4">
                        <Field label="Họ và tên">
                            <input className={inputCls} value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
                        </Field>
                        <Field label="Email">
                            <input className={inputCls} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                        </Field>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: EDIT ROLES ── */}
            {modal === 'edit-roles' && selectedUser && (
                <Modal title="Phân quyền tài khoản" subtitle={`@${selectedUser.username} — ${selectedUser.fullName}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn /></>}>
                    {selectedUser.id === user?.id && (
                        <div className="mb-4 p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span><b>Cảnh báo:</b> Bạn đang tự chỉnh sửa quyền của chính mình.</span>
                        </div>
                    )}
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {roles.map(r => {
                            const on = selectedRoles.includes(r.id);
                            return (
                                <div key={r.id} onClick={() => toggleRole(r.id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${on ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors shrink-0 ${on ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-300'}`}>
                                        {on && <Check className="w-3.5 h-3.5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-700">{r.roleName}</div>
                                        {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Modal>
            )}

            {/* ── MODAL: RESET PASSWORD ── */}
            {modal === 'reset-pw' && selectedUser && (
                <Modal title="Đặt lại mật khẩu" subtitle={`@${selectedUser.username}`} onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Đặt lại mật khẩu" /></>}>
                    <div className="space-y-4">
                        <div className="p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs flex gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>Mật khẩu mới sẽ được áp dụng ngay lập tức. Hãy thông báo cho người dùng.</span>
                        </div>
                        <Field label="Mật khẩu mới (tối thiểu 6 ký tự)">
                            <input className={inputCls} type="password" value={form.newPassword}
                                onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
                                placeholder="Nhập mật khẩu mới..." />
                        </Field>
                    </div>
                </Modal>
            )}

            {/* ── MODAL: DELETE ── */}
            {modal === 'delete' && selectedUser && (
                <Modal title="Xác nhận xóa tài khoản" onClose={closeModal}
                    footer={<><CancelBtn /><SaveBtn label="Xóa tài khoản" danger /></>}>
                    <div className="space-y-3">
                        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                            <p className="font-bold text-rose-700">Bạn có chắc chắn muốn xóa tài khoản này?</p>
                            <p className="text-sm text-rose-600 mt-1">Tài khoản <b>@{selectedUser.username}</b> ({selectedUser.fullName}) sẽ bị xóa vĩnh viễn khỏi hệ thống. Thao tác này không thể hoàn tác.</p>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
