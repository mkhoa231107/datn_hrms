import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { api } from '../../api';
import toast from 'react-hot-toast';

export default function CreateBatchModal({ onClose, onSuccess }) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const [formData, setFormData] = useState({
    year: currentYear,
    month: new Date().getMonth() + 1,
    batchName: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/contracts/batches', formData);
      toast.success('Khởi tạo đợt hợp đồng thành công!');
      onSuccess(response.data.id);
    } catch (error) {
      toast.error('Lỗi khi tạo đợt hợp đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-md font-bold text-slate-800 uppercase tracking-tight">Tạo mới đợt hợp đồng</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200/50 rounded-md transition-colors border border-transparent hover:border-slate-300">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Năm thực hiện</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none text-sm transition-all"
                value={formData.year}
                onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })}
              >
                {years.map(y => <option key={y} value={y}>Năm {y}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tháng thực hiện</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none text-sm transition-all"
                value={formData.month}
                onChange={e => setFormData({ ...formData, month: parseInt(e.target.value) })}
              >
                {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tên đợt ký kết (*)</label>
            <input
              required
              type="text"
              placeholder="VD: Đợt ký HĐ tháng 3/2026"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none text-sm transition-all font-medium"
              value={formData.batchName}
              onChange={e => setFormData({ ...formData, batchName: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ghi chú bổ sung</label>
            <textarea
              rows="2"
              placeholder="Nhập lý do hoặc mô tả cho đợt này..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded focus:border-indigo-500 outline-none text-sm transition-all"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 -mx-8 px-8 bg-slate-50/50 -mb-8 pb-8 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="ef-btn"
              style={{ padding: '8px 24px' }}
            >
              HỦY BỎ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ef-btn"
              style={{ 
                padding: '8px 24px', 
                background: '#4f46e5', 
                color: '#fff', 
                border: 'none',
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}
            >
              <Check size={14} /> BẮT ĐẦU TẠO ĐỢT
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
