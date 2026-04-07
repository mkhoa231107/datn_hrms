import { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, Eye, Clock, Download, Users } from 'lucide-react';

import { api } from '../../api';
import ContractForm from './ContractForm';
import CreateBatchModal from './CreateBatchModal';
import BatchContractEditor from './BatchContractEditor';
import toast from 'react-hot-toast';

export default function ContractManagement({ user, onBack }) {
  const [batches, setBatches] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' or 'signed'
  const [showForm, setShowForm] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const response = await api.get('/contracts/batches');
      setBatches(response.data || []);
    } catch (error) {
      toast.error('Không thể tải lịch sử đợt hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  const fetchSignedContracts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/contracts?status=Active');
      setContracts(response.data || []);
    } catch (error) {
      toast.error('Không thể tải danh sách hợp đồng đã ký');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    } else {
      fetchSignedContracts();
    }
  }, [activeTab]);

  const handleExport = async (id) => {
    try {
      const response = await api.get(`/contracts/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `HopDong_${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error('Lỗi khi xuất hợp đồng');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-emerald-100 text-emerald-700';
      case 'Draft': return 'bg-slate-100 text-slate-600';
      case 'PendingHR':
      case 'PendingDeptHead':
      case 'PendingAdmin': return 'bg-amber-100 text-amber-700';
      case 'WaitingSign': return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Expired': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getBatchStatusLabel = (status) => {
    switch (status) {
      case 'Draft': return { label: 'Bản nháp', class: 'bg-slate-100 text-slate-600' };
      case 'Pending': return { label: 'Đang gửi ký', class: 'bg-blue-100 text-blue-700' };
      case 'Completed': return { label: 'Hoàn thành', class: 'bg-emerald-100 text-emerald-700' };
      default: return { label: status, class: 'bg-slate-100 text-slate-600' };
    }
  };

  return (
    <div className="ef-wrap animate-fade-in">
      {/* Upper Toolbar */}
      <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between', borderBottom: 'none' }}>
        <div className="ef-toolbar-title">
          <FileText size={16} style={{ color: '#1a56db' }} />
          <strong style={{ fontSize: '14px', textTransform: 'uppercase' }}>Quản lý Hợp đồng lao động</strong>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowBatchModal(true)} className="ef-btn">TẠO ĐỢT MỚI</button>
          <button onClick={() => setShowForm(true)} className="ef-btn ef-btn-primary">TẠO HỢP ĐỒNG LẺ</button>
          {onBack && <button onClick={onBack} className="ef-btn font-bold">ĐÓNG</button>}
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="ef-tab-bar no-margin print:hidden">
        <div 
          className={`ef-tab ${activeTab === 'batches' ? 'ef-tab-on' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          LỊCH SỬ ĐỢT TẠO
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            background: activeTab === 'batches' ? '#eef2ff' : '#f1f5f9',
            padding: '2px 8px',
            borderRadius: '12px',
            color: activeTab === 'batches' ? '#1a56db' : '#64748b',
          }}>
            {batches.length}
          </span>
        </div>
        <div 
          className={`ef-tab ${activeTab === 'signed' ? 'ef-tab-on' : ''}`}
          onClick={() => setActiveTab('signed')}
        >
          HỢP ĐỒNG ĐÃ XÁC NHẬN
          <span style={{
            marginLeft: '8px',
            fontSize: '11px',
            background: activeTab === 'signed' ? '#eef2ff' : '#f1f5f9',
            padding: '2px 8px',
            borderRadius: '12px',
            color: activeTab === 'signed' ? '#1a56db' : '#64748b',
          }}>
            {contracts.length}
          </span>
        </div>
      </div>

      <div className="ef-table-wrap">
        {activeTab === 'batches' ? (
          <table className="ef-table no-top-border">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>TÊN ĐỢT / THỜI GIAN</th>
                <th style={{ width: '20%' }}>NGƯỜI TẠO</th>
                <th className="c" style={{ width: '15%' }}>SỐ LƯỢNG HĐ</th>
                <th className="c" style={{ width: '15%' }}>TRẠNG THÁI</th>
                <th className="c" style={{ width: '15%' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="c italic" style={{ padding: '30px', color: '#94a3b8' }}>Đang tải danh sách...</td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan="5" className="c" style={{ padding: '30px', color: '#94a3b8' }}>Chưa có lịch sử đợt ký nào.</td></tr>
              ) : (
                batches.map((b) => {
                  const status = getBatchStatusLabel(b.status);
                  return (
                    <tr key={b.id}>
                      <td>
                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{b.batchName}</div>
                        <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 'bold' }}>THÁNG {b.month}/{b.year}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{b.creatorName || 'Hệ thống'}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(b.createdAt).toLocaleDateString('vi-VN')}</div>
                      </td>
                      <td className="c">
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b' }}>{b.contractCount} NV</span>
                      </td>
                      <td className="c">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${status.class.includes('emerald') ? 'ef-text-ok' : status.class.includes('blue') ? 'ef-text-process' : ''}`} style={{ background: status.class.includes('emerald') ? '#ecfdf5' : status.class.includes('blue') ? '#eff6ff' : '#f1f5f9' }}>
                          {status.label}
                        </span>
                      </td>
                      <td className="c">
                        <button onClick={() => setEditingBatchId(b.id)} className="ef-btn" style={{ fontSize: '10px', padding: '4px 10px' }}>SỬA ĐỢT</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="ef-table no-top-border">
            <thead>
              <tr>
                <th style={{ width: '20%' }}>MÃ HỢP ĐỒNG</th>
                <th style={{ width: '35%' }}>NHÂN VIÊN</th>
                <th className="c" style={{ width: '20%' }}>NGÀY BẮT ĐẦU</th>
                <th className="c" style={{ width: '25%' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="c italic" style={{ padding: '30px', color: '#94a3b8' }}>Đang tải danh sách...</td></tr>
              ) : contracts.length === 0 ? (
                <tr><td colSpan="4" className="c" style={{ padding: '30px', color: '#94a3b8' }}>Chưa có hợp đồng nào được xác nhận.</td></tr>
              ) : (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 'bold', color: '#1e293b' }}>{c.contractNumber}</td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{c.employeeName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{c.contractType}</div>
                    </td>
                    <td className="c" style={{ color: '#64748b' }}>
                      {new Date(c.startDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="c">
                      <button 
                        onClick={() => handleExport(c.id)}
                        className="ef-btn"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px' }}
                      >
                        <Download size={12} /> TẢI XUỐNG (.DOCX)
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ContractForm 
          onClose={() => setShowForm(false)} 
          onSuccess={() => {
            setShowForm(false);
            if (activeTab === 'batches') fetchBatches();
            else fetchSignedContracts();
          }} 
        />
      )}
      {showBatchModal && (
        <CreateBatchModal 
          onClose={() => setShowBatchModal(false)}
          onSuccess={(id) => {
            setShowBatchModal(false);
            setEditingBatchId(id);
            fetchBatches();
          }}
        />
      )}
      {editingBatchId && (
        <BatchContractEditor 
          batchId={editingBatchId}
          onClose={() => setEditingBatchId(null)}
          onSuccess={() => {
            setEditingBatchId(null);
            if (activeTab === 'batches') fetchBatches();
            else fetchSignedContracts();
          }}
        />
      )}
    </div>
  );
}
