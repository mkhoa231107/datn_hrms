import React, { useState, useEffect } from 'react';
import { usersService } from '../../api';
import { Shield, Search, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserRoles({ user }) {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                usersService.getAllUsers(),
                usersService.getRoles()
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Error loading permissions data:", error);
            const msg = error.response?.data?.message || error.message || "Lỗi khi tải dữ liệu phân quyền.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        // debounce slightly or just search directly if server is fast
        // For simplicity we will filter locally or we can call API.
        // Let's filter locally for fast UX:
    };

    const filteredUsers = users.filter(u => 
        (u.username || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openModal = (u) => {
        setSelectedUser(u);
        setSelectedRoles(u.roles.map(r => r.id));
        setIsModalOpen(true);
    };

    const toggleRole = (roleId) => {
        setSelectedRoles(prev => 
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    const handleSave = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            await usersService.updateRoles(selectedUser.id, selectedRoles);
            toast.success(`Đã cập nhật quyền cho ${selectedUser.username}`);
            setIsModalOpen(false);
            // Refresh list
            const newUsers = await usersService.getAllUsers();
            setUsers(newUsers);
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || "Lỗi cập nhật quyền");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Phân Quyền Hệ Thống</h2>
                        <p className="text-slate-500 text-sm">Quản lý tài khoản và gán vai trò truy cập (Role-based access)</p>
                    </div>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Tìm username, email, tên..." 
                        value={searchTerm}
                        onChange={handleSearch}
                        className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg w-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 w-12 text-center">ID</th>
                                <th className="p-4">Tài khoản</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Vai trò (Roles)</th>
                                <th className="p-4 w-28 text-center">Trạng thái</th>
                                <th className="p-4 w-24 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-500">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Search className="w-5 h-5 text-slate-400" />
                                        </div>
                                        Không tìm thấy tài khoản nào phù hợp
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                                        <td className="p-4 text-center font-medium text-slate-400">#{u.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-800">{u.fullName}</div>
                                            <div className="text-xs text-slate-500">@{u.username}</div>
                                        </td>
                                        <td className="p-4 text-slate-600">{u.email}</td>
                                        <td className="p-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {u.roles.length === 0 && <span className="text-xs text-slate-400 italic">Chưa cấp quyền</span>}
                                                {u.roles.map(r => (
                                                    <span key={r.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                        {r.roleName}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {u.isActive ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Hoạt động
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Đã khóa
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => openModal(u)}
                                                className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100/50"
                                            >
                                                Sửa Quyền
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-3 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500 font-medium">
                    Tổng số: {filteredUsers.length} tài khoản
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-lg">Phân quyền tài khoản</h3>
                                <p className="text-xs text-slate-500 mt-0.5">@{selectedUser.username} - {selectedUser.fullName}</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-5">
                            {selectedUser.id === user.id && (
                                <div className="mb-4 p-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs flex gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span><b>Cảnh báo:</b> Bạn đang tự chỉnh sửa quyền của chính mình. Nếu gỡ bỏ quyền Admin, bạn có thể mất quyền truy cập trang này.</span>
                                </div>
                            )}

                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Chọn vai trò (Roles)</label>
                            <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                                {roles.map(role => {
                                    const isSelected = selectedRoles.includes(role.id);
                                    return (
                                        <div 
                                            key={role.id}
                                            onClick={() => toggleRole(role.id)}
                                            className={`
                                                flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer select-none
                                                ${isSelected 
                                                    ? 'border-indigo-500 bg-indigo-50/50' 
                                                    : 'border-slate-100 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-200'
                                                }
                                            `}
                                        >
                                            <div className={`
                                                w-5 h-5 rounded flex items-center justify-center transition-colors
                                                ${isSelected ? 'bg-indigo-500 text-white' : 'bg-white border border-slate-300'}
                                            `}>
                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-bold text-sm text-slate-700">{role.roleName}</div>
                                                {role.description && <div className="text-xs text-slate-500">{role.description}</div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving}
                                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-70"
                            >
                                {saving ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...</>
                                ) : (
                                    <>Lưu thay đổi</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
