import { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle, Search, Eye, Filter, Edit, Clock } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function ContractApproval({ user, scope = 'department', onBack }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
    const reason = window.prompt("Nhập lý do từ chối hợp đồng này:");
    if (reason) handleAction(id, 'reject', reason);
  };

  const confirmApprove = (id) => {
    if (window.confirm("Bạn có chắc chắn muốn phê duyệt hợp đồng này?")) {
      handleAction(id, 'approve', "Đã xem xét và đồng ý.");
    }
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
    </div>
  );
}
