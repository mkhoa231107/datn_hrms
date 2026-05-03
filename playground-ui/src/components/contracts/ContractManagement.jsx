import { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Eye, Download, ShieldCheck, Users, Building2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

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

  const visibleContracts = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchText, parentDeptId, subDeptId, statusFilter]);

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
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-up">
      {/* Standard Module Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <ShieldCheck className="text-violet-600" size={28} />
            Quản lý Hợp đồng lao động
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-400 text-sm">Quản lý hồ sơ pháp lý nhân sự</span>
            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
            <span className="text-slate-400 text-sm">Hệ thống lưu trữ tập trung</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchContracts} className="btn btn-ghost shadow-sm" title="Tải lại">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          {onBack && <button onClick={onBack} className="btn btn-ghost font-bold">ĐÓNG</button>}
        </div>
      </div>

      {/* Standard Filter Bar */}
      <div className="card !p-4 bg-slate-50/50 border-slate-200/60 mb-6 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm tên nhân viên / số hợp đồng..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="input !pl-11 !py-2.5 bg-white border-slate-200"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full md:w-auto">
            <select
              value={parentDeptId}
              onChange={handleParentChange}
              className="input !py-2.5 font-bold text-sm min-w-[180px]"
            >
              <option value="">-- Phòng ban --</option>
              {parentDepts.map(d => (
                <option key={d.id} value={d.id}>{d.departmentName}</option>
              ))}
            </select>

            <select
              value={subDeptId}
              onChange={e => setSubDeptId(e.target.value)}
              disabled={!parentDeptId}
              className="input !py-2.5 font-bold text-sm min-w-[180px]"
            >
              <option value="">-- Bộ phận --</option>
              {subDepts.map(d => {
                const cleanName = d.departmentName.includes(' - ') 
                  ? d.departmentName.split(' - ').slice(1).join(' - ') 
                  : d.departmentName;
                return <option key={d.id} value={d.id}>{cleanName}</option>;
              })}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="input !py-2.5 font-bold text-sm min-w-[150px]"
            >
              <option value="">-- Trạng thái --</option>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Standard KPI Cards (Summary) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card !p-5 flex items-center gap-4 border-l-4 border-l-violet-500">
              <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center shrink-0">
                  <FileText size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tổng số hợp đồng</p>
                  <h3 className="text-xl font-black text-slate-800 stat-value">{filtered.length}</h3>
              </div>
          </div>
          <div className="card !p-5 flex items-center gap-4 border-l-4 border-l-emerald-500">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 size={20} />
              </div>
              <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Đang xem bộ phận</p>
                  <h3 className="text-sm font-bold text-slate-800 truncate">{activeDeptLabel || 'Tất cả'}</h3>
              </div>
          </div>
          <div className="card !p-5 flex items-center gap-4 border-l-4 border-l-amber-500">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Users size={20} />
              </div>
              <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Lọc trạng thái</p>
                  <h3 className="text-sm font-bold text-slate-800">{statusFilter ? STATUS_MAP[statusFilter]?.label : 'Tất cả'}</h3>
              </div>
          </div>
      </div>

      {/* Main Table Content */}
      <div className="card !p-0 overflow-hidden border-slate-200/60 shadow-sm min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nhân viên</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bộ phận</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Số HĐ</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời hạn</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
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
              visibleContracts.map((c, idx) => {
                const globalIdx = (page - 1) * PER_PAGE + idx + 1;
                return (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{globalIdx}</td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-700">{c.employeeName}</div>
                    <div className="text-[10px] font-bold text-violet-600 uppercase">{c.positionName || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-500">{c.departmentName || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-700 font-mono tracking-wider">{c.contractNumber || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[11px] text-slate-500 font-medium">
                      {c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '—'}
                      {c.endDate ? ` → ${new Date(c.endDate).toLocaleDateString('vi-VN')}` : ' (Vô thời hạn)'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setViewingContract(c)}
                        className="btn btn-ghost !p-2 text-violet-600 border-violet-100 hover:bg-violet-50"
                        title="Xem mẫu hợp đồng A4"
                      >
                        <Eye size={14} /> <span className="text-[10px] font-black">A4</span>
                      </button>
                      <button
                        onClick={() => handleExport(c.id)}
                        className="btn btn-ghost !p-2 text-slate-600 border-slate-200"
                        title="Tải file Word"
                      >
                        <Download size={14} /> <span className="text-[10px] font-black">DOCX</span>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
            <p className="text-xs font-medium text-slate-400">
                Hiển thị {visibleContracts.length} trên {filtered.length} hợp đồng
            </p>
            <div className="flex items-center gap-2">
                <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)} 
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-600 px-2">Trang {page} / {totalPages || 1}</span>
                <button 
                    disabled={page >= totalPages} 
                    onClick={() => setPage(p => p + 1)} 
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-white hover:text-violet-600 disabled:opacity-30 transition-all shadow-sm"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
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
