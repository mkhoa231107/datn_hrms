import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Eye, Download, ShieldCheck, Users, Building2, RefreshCw } from 'lucide-react';
import { api } from '../../api';
import ContractTemplate from './ContractTemplate';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const STATUS_MAP = {
  Active:          { label: 'Đang hiệu lực', cls: 'ef-text-ok',      bg: '#ecfdf5', color: '#065f46' },
  Draft:           { label: 'Bản nháp',       cls: '',                bg: '#f1f5f9', color: '#64748b' },
  PendingHR:       { label: 'Chờ HR duyệt',   cls: 'ef-text-warn',   bg: '#fffbeb', color: '#92400e' },
  PendingDeptHead: { label: 'Chờ TP duyệt',   cls: 'ef-text-warn',   bg: '#fffbeb', color: '#92400e' },
  PendingAdmin:    { label: 'Chờ GĐ duyệt',   cls: 'ef-text-warn',   bg: '#fffbeb', color: '#92400e' },
  WaitingSign:     { label: 'Chờ ký',          cls: 'ef-text-process',bg: '#eff6ff', color: '#1e40af' },
  Expired:         { label: 'Hết hạn',         cls: 'ef-text-err',    bg: '#fef2f2', color: '#991b1b' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '12px',
      fontSize: '10px',
      fontWeight: '700',
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      background: s.bg,
      color: s.color,
    }}>
      {s.label}
    </span>
  );
}

export default function ContractManagement({ user, onBack }) {
  const [contracts, setContracts]           = useState([]);
  const [departments, setDepartments]       = useState([]);
  const [loading, setLoading]               = useState(false);
  const [searchText, setSearchText]         = useState('');
  const [parentDeptId, setParentDeptId]     = useState('');   // phòng ban cấp 1
  const [subDeptId, setSubDeptId]           = useState('');   // bộ phận cấp 2
  const [statusFilter, setStatusFilter]     = useState('');
  const [viewingContract, setViewingContract] = useState(null);

  /* ── effective deptId to query: prefer sub-dept, else parent ── */
  const effectiveDeptId = subDeptId || parentDeptId;

  /* ── fetch departments (flat list) ── */
  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data || [])).catch(() => {});
  }, []);

  /* ── Cascading: reset sub-dept whenever parent changes ── */
  const handleParentChange = (e) => {
    setParentDeptId(e.target.value);
    setSubDeptId('');           // clear child selection
  };

  /* ── fetch contracts whenever effective filter changes ── */
  const fetchContracts = useCallback(async () => {
    // Chỉ fetch khi đã chọn bộ phận (hoặc nếu phòng ban đó không có bộ phận con)
    const hasSubDepts = subDepts.length > 0;
    const readyToFetch = parentDeptId && (subDeptId || !hasSubDepts);

    if (!readyToFetch) {
      setContracts([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (effectiveDeptId) params.append('deptId', effectiveDeptId);
      if (statusFilter)    params.append('status', statusFilter);
      const r = await api.get(`/contracts?${params}`);
      setContracts(r.data || []);
    } catch {
      toast.error('Không thể tải danh sách hợp đồng');
    } finally {
      setLoading(false);
    }
  }, [parentDeptId, effectiveDeptId, statusFilter]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  /* ── label for summary bar ── */
  const activeDeptLabel = (() => {
    if (subDeptId)    return departments.find(d => String(d.id) === String(subDeptId))?.departmentName;
    if (parentDeptId) return departments.find(d => String(d.id) === String(parentDeptId))?.departmentName;
    return null;
  })();

  /* ── client-side search & MUST match department filter ── */
  const filtered = contracts.filter(c => {
    const matchesSearch = 
      c.employeeName?.toLowerCase().includes(searchText.toLowerCase()) ||
      c.contractNumber?.toLowerCase().includes(searchText.toLowerCase());
    
    // Đảm bảo chỉ hiển thị hợp đồng thuộc bộ phận/phòng ban đã chọn 
    // Kiểm tra tất cả các trường có thể chứa ID phòng ban
    const cDeptId = c.departmentId || c.deptId || c.departmentID;
    const matchesDept = !effectiveDeptId || 
                        String(cDeptId) === String(effectiveDeptId) ||
                        c.departmentName === activeDeptLabel; 
    
    return matchesSearch && matchesDept;
  });

  /* ── export ── */
  const handleExport = async (id) => {
    try {
      const r = await api.get(`/contracts/${id}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url; a.setAttribute('download', `HopDong_${id}.docx`);
      document.body.appendChild(a); a.click(); a.remove();
    } catch { toast.error('Lỗi khi xuất hợp đồng'); }
  };

  /* ── dept hierarchy ── */
  // Chỉ lấy 5 phòng ban cha chính (không có ParentDepartmentId)
  const parentDepts  = departments.filter(d => !d.parentDepartmentId);
  
  // Chỉ lấy bộ phận thuộc phòng ban cha đã chọn
  const subDepts     = parentDeptId
    ? departments.filter(d => String(d.parentDepartmentId) === String(parentDeptId))
    : [];


  return (
    <div className="ef-wrap animate-fade-in" style={{ fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>

      {/* ── Toolbar ── */}
      <div className="ef-toolbar print:hidden" style={{ justifyContent: 'space-between', borderBottom: 'none' }}>
        <div className="ef-toolbar-title">
          <ShieldCheck size={18} style={{ color: '#4f46e5' }} />
          <strong style={{ fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Quản lý Hợp đồng lao động
          </strong>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
          {/* Search */}
          <div className="relative" style={{ minWidth: '200px' }}>
            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Tìm tên NV / số hợp đồng..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-indigo-500 transition-all"
            />
          </div>

          {/* ── Level 1: Parent department ── */}
          <select
            value={parentDeptId}
            onChange={handleParentChange}
            className={`bg-slate-50 border ${parentDeptId ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'} rounded-md px-3 py-2 text-sm outline-none font-bold text-slate-700 transition-all`}
            style={{ minWidth: '180px' }}
          >
            <option value="">— Chọn Phòng ban —</option>
            {parentDepts.map(d => (
              <option key={d.id} value={d.id}>{d.departmentName}</option>
            ))}
          </select>

          {/* ── Level 2: Sub-department ── */}
          <select
            value={subDeptId}
            onChange={e => setSubDeptId(e.target.value)}
            disabled={!parentDeptId}
            className={`bg-slate-50 border ${subDeptId ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} rounded-md px-3 py-2 text-sm outline-none font-bold ${!parentDeptId ? 'text-slate-300' : 'text-slate-700'} transition-all`}
            style={{ minWidth: '180px' }}
          >
            <option value="">— Chọn Bộ phận —</option>
            {subDepts.map(d => {
              const cleanName = d.departmentName.includes(' - ') 
                ? d.departmentName.split(' - ').slice(1).join(' - ') 
                : d.departmentName;
              return <option key={d.id} value={d.id}>{cleanName}</option>;
            })}
          </select>

          {/* ── Status filter ── */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-indigo-500 font-semibold text-slate-600"
            style={{ minWidth: '150px' }}
          >
            <option value="">— Trạng thái —</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <button onClick={fetchContracts} className="ef-btn" title="Tải lại">
            <RefreshCw size={14} />
          </button>

          {onBack && <button onClick={onBack} className="ef-btn font-bold hover:bg-slate-100">ĐÓNG</button>}
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{
        display: 'flex', gap: '16px', padding: '10px 16px',
        background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
        fontSize: '12px', color: '#64748b', fontWeight: '600',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Users size={14} /> Tổng: <strong style={{ color: '#1e293b' }}>{filtered.length}</strong> hợp đồng
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Building2 size={14} />
          {activeDeptLabel
            ? <>
                {parentDeptId && subDeptId && (
                  <span style={{ color: '#94a3b8' }}>
                    {departments.find(d => String(d.id) === String(parentDeptId))?.departmentName}
                    <span style={{ margin: '0 5px' }}>›</span>
                  </span>
                )}
                <strong style={{ color: '#4f46e5' }}>{activeDeptLabel}</strong>
              </>
            : <span>Tất cả phòng ban</span>
          }
        </span>
        {statusFilter && (
          <span style={{ color: '#6366f1' }}>
            Trạng thái: {STATUS_MAP[statusFilter]?.label || statusFilter}
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="ef-table-wrap">
        <table className="ef-table no-top-border">
          <thead>
            <tr>
              <th style={{ width: '5%'  }}>#</th>
              <th style={{ width: '26%' }}>NHÂN VIÊN</th>
              <th style={{ width: '20%' }}>PHÒNG BAN / BỘ PHẬN</th>
              <th style={{ width: '16%' }}>SỐ HỢP ĐỒNG</th>
              <th style={{ width: '14%' }}>THỜI HẠN</th>
              <th className="c" style={{ width: '10%' }}>TRẠNG THÁI</th>
              <th className="c" style={{ width: '9%'  }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {(!parentDeptId || (subDepts.length > 0 && !subDeptId)) ? (
              <tr>
                <td colSpan="7" className="c" style={{ padding: '80px 20px', color: '#64748b' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-2">
                      <Building2 size={32} className="text-slate-400" />
                    </div>
                    <strong style={{ fontSize: '16px', color: '#1e293b' }}>YÊU CẦU CHỌN CHI TIẾT</strong>
                    <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '13px' }}>
                      {!parentDeptId 
                        ? "Vui lòng chọn Phòng ban cha để tiếp tục."
                        : "Vui lòng chọn cụ thể một Bộ phận để xem danh sách hợp đồng."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan="7" className="c italic" style={{ padding: '40px', color: '#94a3b8' }}>
                  Đang tải danh sách hợp đồng...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="c" style={{ padding: '40px', color: '#94a3b8' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  Không tìm thấy hợp đồng nào cho <strong>{activeDeptLabel}</strong>.
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => (
                <tr key={c.id}>
                  <td style={{ color: '#94a3b8', fontSize: '11px' }}>{idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{c.employeeName}</div>
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: '600' }}>{c.positionName || '—'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: '#475569', fontWeight: '600' }}>{c.departmentName || '—'}</div>
                  </td>
                  <td style={{ fontWeight: '700', color: '#1e293b', fontSize: '12px', fontFamily: 'monospace' }}>
                    {c.contractNumber || '—'}
                  </td>
                  <td style={{ fontSize: '11px', color: '#64748b' }}>
                    {c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '—'}
                    {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString('vi-VN')}` : ' (Vô thời hạn)'}
                  </td>
                  <td className="c">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="c">
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                      <button
                        onClick={() => setViewingContract(c)}
                        className="ef-btn"
                        title="Xem mẫu hợp đồng A4"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '4px 8px', background: '#4f46e5', color: '#fff', border: 'none' }}
                      >
                        <Eye size={11} /> A4
                      </button>
                      <button
                        onClick={() => handleExport(c.id)}
                        className="ef-btn"
                        title="Tải file Word"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '4px 8px' }}
                      >
                        <Download size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Contract Template Viewer Modal ── */}
      {viewingContract && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-start justify-center overflow-y-auto animate-in fade-in"
          style={{ paddingTop: '40px', paddingBottom: '40px' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full relative" style={{ maxWidth: '960px', margin: '0 auto' }}>
            {/* Modal header bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
              borderRadius: '12px 12px 0 0',
            }} className="print:hidden">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} style={{ color: '#4f46e5' }} />
                <span style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', textTransform: 'uppercase' }}>
                  Hợp đồng lao động — {viewingContract.contractNumber}
                </span>
                <StatusBadge status={viewingContract.status} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleExport(viewingContract.id)}
                  className="ef-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px' }}
                >
                  <Download size={12} /> Tải DOCX
                </button>
                <button
                  onClick={() => setViewingContract(null)}
                  className="ef-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                >
                  <X size={12} /> ĐÓNG
                </button>
              </div>
            </div>

            {/* Template content */}
            <ContractTemplate contract={viewingContract} />
          </div>
        </div>
      )}
    </div>
  );
}
