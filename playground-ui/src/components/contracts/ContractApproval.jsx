import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Search, Eye, Filter, Edit, Clock } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ui/ConfirmDialog';

export default function ContractApproval({ user, scope = 'department', onBack }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirm, setConfirm] = useState({ open: false, type: null, contractId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [acting, setActing] = useState(false);

  const closeConfirm = () => setConfirm({ open: false, type: null, contractId: null });

  const fetchPendingContracts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/contracts'); 
      const pending = response.data.filter(c => c.status === 'PendingAdmin');
      setContracts(pending);
    } catch (error) {
      toast.error('Không thể tải danh sách chờ duyệt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingContracts();
  }, []);

  const handleAction = async (id, action, noteOrReason) => {
    try {
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      const payload = action === 'approve' ? { note: noteOrReason } : { reason: noteOrReason };
      
      await api.post(`/contracts/${id}/${endpoint}`, payload);
      toast.success(action === 'approve' ? 'Đã phê duyệt thành công' : 'Đã từ chối hợp đồng');
      fetchPendingContracts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const confirmReject = (id) => {
    setRejectReason('');
    setConfirm({ open: true, type: 'reject', contractId: id });
  };

  const confirmApprove = (id) => {
    setConfirm({ open: true, type: 'approve', contractId: id });
  };

  const executeAction = async () => {
    if (confirm.type === 'reject' && !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }
    setActing(true);
    await handleAction(
      confirm.contractId,
      confirm.type,
      confirm.type === 'approve' ? 'Đã xem xét và đồng ý.' : rejectReason
    );
    setActing(false);
    closeConfirm();
  };

  const filteredContracts = contracts.filter(c => 
    c.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ef-wrap animate-in fade-in duration-300">
       <div className="ef-toolbar print:hidden">
           <div className="ef-toolbar-title">
               <Clock size={16} style={{ color: '#1a56db' }} />
               <strong>
                 HỢP ĐỒNG ĐANG CHỜ DUYỆT <span style={{ color: '#64748b', marginLeft: '5px' }}>({filteredContracts.length})</span>
               </strong>
           </div>
           {onBack && <button onClick={onBack} className="ef-btn">ĐÓNG LẠI</button>}
       </div>

       <div className="ef-toolbar print:hidden" style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: '#94a3b8' }} />
              <input
                  type="text"
                  placeholder="Tìm kiếm mã HĐ, tên nhân viên..."
                  className="ef-input"
                  style={{ width: '350px', paddingLeft: '32px' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button onClick={fetchPendingContracts} className="ef-btn" style={{ marginLeft: 'auto' }}>
              TẢI LẠI DANH SÁCH
            </button>
       </div>

       <div className="ef-table-wrap" style={{ margin: '15px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#fff' }}>
          <table className="ef-table no-top-border">
              <thead>
                  <tr>
                      <th style={{ width: '25%', paddingLeft: '15px' }}>HỢP ĐỒNG / SỐ HIỆU</th>
                      <th style={{ width: '30%' }}>NHÂN VIÊN / BỘ PHẬN</th>
                      <th className="c" style={{ width: '15%' }}>NGÀY GỬI</th>
                      <th className="c" style={{ width: '15%' }}>TRẠNG THÁI</th>
                      <th className="c" style={{ width: '15%', paddingRight: '15px' }}>THAO TÁC</th>
                  </tr>
              </thead>
              <tbody>
                  {loading ? (
                    <tr><td colSpan="5" className="ef-empty" style={{ padding: '40px' }}>Đang tải dữ liệu trình duyệt...</td></tr>
                  ) : filteredContracts.length === 0 ? (
                    <tr><td colSpan="5" className="ef-empty" style={{ padding: '40px' }}>Hiện tại không có hợp đồng nào đang chờ phê duyệt từ phía bạn.</td></tr>
                  ) : filteredContracts.map(c => (
                     <tr key={c.id}>
                         <td style={{ paddingLeft: '15px' }}>
                             <div style={{ fontWeight: 'bold', color: '#4f46e5' }}>{c.contractNumber}</div>
                             <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{c.contractType}</div>
                         </td>
                         <td>
                             <div style={{ fontWeight: 'bold' }}>{c.employeeName}</div>
                             <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{c.department}</div>
                         </td>
                         <td className="c">
                             <div style={{ fontSize: '12px' }}>{new Date(c.updatedAt || c.createdAt).toLocaleDateString('vi-VN')}</div>
                             <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(c.updatedAt || c.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                         </td>
                         <td className="c">
                             <span style={{ 
                               display: 'inline-block',
                               padding: '3px 8px', 
                               background: '#fff7ed', 
                               color: '#c2410c', 
                               fontSize: '10px', 
                               fontWeight: 'bold',
                               border: '1px solid #ffedd5',
                               borderRadius: '3px',
                               textTransform: 'uppercase'
                             }}>
                               Chờ duyệt
                             </span>
                         </td>
                         <td className="c" style={{ paddingRight: '15px' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                               <button 
                                 onClick={() => confirmApprove(c.id)} 
                                 className="ef-btn" 
                                 style={{ 
                                   padding: '4px 12px', 
                                   fontSize: '11px', 
                                   background: '#10b981', 
                                   color: '#fff', 
                                   border: 'none',
                                   fontWeight: 'bold'
                                 }}
                               >
                                 DUYỆT
                               </button>
                               <button 
                                 onClick={() => confirmReject(c.id)} 
                                 className="ef-btn" 
                                 style={{ 
                                   padding: '4px 12px', 
                                   fontSize: '11px',
                                   color: '#ef4444',
                                   fontWeight: 'bold'
                                 }}
                               >
                                 TỪ CHỐI
                               </button>
                            </div>
                         </td>
                     </tr>
                  ))}
              </tbody>
          </table>
       </div>

    {/* ── Approve ConfirmDialog ── */}
    <ConfirmDialog
        open={confirm.open && confirm.type === 'approve'}
        variant="success"
        title="Phê duyệt hợp đồng"
        message="Bạn có chắc chắn muốn phê duyệt hợp đồng này? Nhân viên sẽ được thông báo ngay sau khi phê duyệt."
        confirmLabel="Phê duyệt"
        cancelLabel="Hủy bỏ"
        loading={acting}
        onConfirm={executeAction}
        onCancel={closeConfirm}
    />

    {/* ── Reject ConfirmDialog (with reason input) ── */}
    <ConfirmDialog
        open={confirm.open && confirm.type === 'reject'}
        variant="danger"
        title="Từ chối hợp đồng"
        message={
            <div className="flex flex-col gap-2 mt-1">
                <span className="text-sm text-slate-500">Vui lòng nhập lý do từ chối để thông báo cho nhân viên.</span>
                <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mt-1"
                    rows={3}
                    placeholder="Nhập lý do từ chối..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    autoFocus
                />
            </div>
        }
        confirmLabel="Từ chối hợp đồng"
        cancelLabel="Hủy bỏ"
        loading={acting}
        onConfirm={executeAction}
        onCancel={closeConfirm}
    />
    </div>
  );
}
