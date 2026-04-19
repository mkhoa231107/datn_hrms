import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, Signature } from 'lucide-react';
import { api } from '../../api';
import shiftSwapService from '../../services/shiftSwapService';
import ShiftSwapRequestModal from './ShiftSwapRequestModal';
import ShiftSwapRequestDetail from './ShiftSwapRequestDetail';
import toast from 'react-hot-toast';

export default function ShiftChangeRequest({ user, onBack }) {
    const [loading, setLoading] = useState(true);
    const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
    const [viewingSwapId, setViewingSwapId] = useState(null);
    const [swapRequests, setSwapRequests] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const swaps = await shiftSwapService.getMyRequests();
            setSwapRequests(swaps);
        } catch (err) {
            toast.error('Lỗi khi tải dữ liệu hoán đổi ca');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ef-wrap">
            <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between' }}>
                <div className="ef-toolbar-title">
                    <RefreshCw size={16} style={{ color: '#1a56db' }} />
                    <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>
                        Hoán Đổi Ca Làm Việc Tự Nguyện
                    </strong>
                </div>
                <div className="flex gap-2">
                    {onBack && <button onClick={onBack} className="ef-btn">Đóng</button>}
                </div>
            </div>

            {viewingSwapId ? (
                <ShiftSwapRequestDetail 
                    requestId={viewingSwapId} 
                    onBack={() => { setViewingSwapId(null); fetchData(); }} 
                    user={user}
                />
            ) : (
                <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-sm font-bold uppercase text-slate-500 flex items-center gap-2">
                            <Calendar size={18} /> Lịch sử hoán đổi ca giữa các nhân viên
                        </div>
                        <button 
                            onClick={() => setIsSwapModalOpen(true)}
                            className="bg-purple-700 text-white px-6 py-2 rounded shadow-lg font-bold uppercase text-xs hover:bg-purple-800 transition-all active:scale-95"
                        >
                            + Tạo đơn hoán đổi ca tự nguyện
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                             <div className="col-span-full border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                                Đang tải dữ liệu...
                             </div>
                        ) : swapRequests.length === 0 ? (
                            <div className="col-span-full border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400">
                                <p className="font-bold uppercase tracking-widest mb-2">Chưa có dữ liệu hoán đổi</p>
                                <p className="text-xs">Bạn có thể tạo yêu cầu hoán đổi ca tự nguyện với đồng nghiệp cùng bộ phận.</p>
                            </div>
                        ) : (
                            swapRequests.map(swap => (
                                <div 
                                    key={swap.id} 
                                    onClick={() => setViewingSwapId(swap.id)}
                                    className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col"
                                >
                                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                        <span className="text-[10px] font-bold uppercase text-slate-400">Đơn #{swap.id}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase 
                                            ${swap.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                              swap.status === 'Rejected' ? 'bg-red-100 text-red-700' : 
                                              swap.status === 'Cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>
                                            {swap.status === 'PendingPartner' ? 'Chờ đối tác' : 
                                             swap.status === 'PendingManager' ? 'Chờ quản lý' : 
                                             swap.status === 'PendingHR' ? 'Chờ nhân sự' : 
                                             swap.status === 'Approved' ? 'Đã duyệt' : 
                                             swap.status === 'Rejected' ? 'Từ chối' : 
                                             swap.status === 'Cancelled' ? 'Đã hủy' : swap.status}
                                        </span>
                                    </div>
                                    <div className="p-4 flex-1">
                                        {(() => {
                                            // So sánh employeeBId (employee ID) với employeeId trong user object (từ /auth/me)
                                            const myEmpId = user?.employeeId ?? user?.EmployeeId;
                                            const isMyTurn = myEmpId && parseInt(myEmpId) === parseInt(swap.employeeBId)
                                                           && swap.status === 'PendingPartner';
                                            return isMyTurn ? (
                                                <div className="mb-3 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase flex items-center gap-2 border border-amber-200 animate-pulse">
                                                    <Signature size={12} /> Chờ bạn xác nhận (Bên B)
                                                </div>
                                            ) : null;
                                        })()}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="text-center flex-1">
                                                <div className="font-bold text-sm text-slate-800">{swap.employeeA?.fullName?.split(' ').pop()}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">Bên A</div>
                                            </div>
                                            <div className="px-4 text-purple-400 group-hover:scale-110 transition-transform">⇄</div>
                                            <div className="text-center flex-1">
                                                <div className="font-bold text-sm text-slate-800">{swap.employeeB?.fullName?.split(' ').pop()}</div>
                                                <div className="text-[9px] text-slate-400 font-bold uppercase">Bên B</div>
                                            </div>
                                        </div>
                                        <div className="text-[11px] bg-slate-50 p-2 rounded text-center mb-3 text-slate-600 border border-slate-100">
                                            {new Date(swap.startDate).toLocaleDateString('vi-VN')} - {new Date(swap.endDate).toLocaleDateString('vi-VN')}
                                        </div>
                                        <div className="text-[11px] text-slate-500 line-clamp-1 italic mb-2"> Lý do: {swap.reason}</div>
                                        <div className="text-[10px] text-right font-bold text-slate-300">{new Date(swap.createdAt).toLocaleString('vi-VN')}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            
            <ShiftSwapRequestModal 
                isOpen={isSwapModalOpen} 
                onClose={() => setIsSwapModalOpen(false)} 
                onRefresh={fetchData} 
            />
        </div>
    );
}
