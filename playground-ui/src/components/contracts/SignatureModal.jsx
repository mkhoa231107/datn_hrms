import React, { useRef, useState, useEffect } from 'react';
import { X, PenTool, Upload, RefreshCw, Check, BrainCircuit, Loader2 } from 'lucide-react';

export default function SignatureModal({ onClose, onConfirm }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('draw'); // 'draw' or 'upload'
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [uploadedImage, setUploadedImage] = useState(null);

  // Initialize Canvas
  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      // Set display size
      canvas.width = canvas.offsetWidth;
      canvas.height = 300;
      // Style
      ctx.strokeStyle = '#1e293b'; // Slate 800
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, [activeTab]);

  const startDrawing = (e) => {
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getCoordinates = (e) => {
    if (e.touches && e.touches.length > 0) {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        offsetX: e.touches[0].clientX - rect.left,
        offsetY: e.touches[0].clientY - rect.top
      };
    }
    return {
      offsetX: e.nativeEvent.offsetX,
      offsetY: e.nativeEvent.offsetY
    };
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setUploadedImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = async () => {
    let signatureData = null;
    
    if (activeTab === 'draw') {
      signatureData = canvasRef.current.toDataURL('image/png');
    } else {
      signatureData = uploadedImage;
    }

    if (!signatureData) return;

    // Simulate AI Processing
    setIsProcessing(true);
    setAiStatus('Khởi tạo mô hình AI...');
    await new Promise(r => setTimeout(r, 800));
    setAiStatus('Tách nền và chuẩn hóa chữ ký...');
    await new Promise(r => setTimeout(r, 1200));
    setAiStatus('Xác thực danh tính chủ sở hữu...');
    await new Promise(r => setTimeout(r, 1000));
    setAiStatus('Bảo mật bằng mã hóa đầu cuối...');
    await new Promise(r => setTimeout(r, 500));
    
    setIsProcessing(false);
    onConfirm(signatureData);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="ef-toolbar" style={{ justifyContent: 'space-between', padding: '0 20px', minHeight: '60px', background: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <PenTool size={18} className="text-indigo-600" />
            <div style={{ height: '24px', width: '1px', background: '#e2e8f0' }} />
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>XÁC NHẬN PHÁP LÝ</div>
              <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e293b' }}>KÝ TÊN ĐIỆN TỬ</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-md transition-colors border border-slate-100">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 bg-[#f8fafc]">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-5">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <BrainCircuit size={28} className="text-indigo-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div className="text-center">
                <h4 className="font-bold text-slate-800 uppercase text-[13px] tracking-wider mb-2">Hệ thống AI đang xử lý</h4>
                <p className="text-slate-500 text-xs italic">{aiStatus}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex bg-slate-200/50 p-1 rounded-sm mb-6 border border-slate-200">
                <button
                  onClick={() => setActiveTab('draw')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-[12px] font-bold transition-all ${
                    activeTab === 'draw' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <PenTool size={14} /> VẼ TRỰC TIẾP
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-sm text-[12px] font-bold transition-all ${
                    activeTab === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Upload size={14} /> TẢI ẢNH CHỮ KÝ
                </button>
              </div>

              {/* Content Area */}
              <div className="mb-6">
                {activeTab === 'draw' ? (
                  <div className="relative bg-white rounded-sm border border-slate-200 overflow-hidden shadow-inner">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full cursor-crosshair"
                      style={{ height: '240px' }}
                    />
                    <button
                      onClick={clearCanvas}
                      className="absolute bottom-3 right-3 ef-btn"
                      style={{ background: '#fff', padding: '5px 10px' }}
                      title="Xóa vẽ lại"
                    >
                      <RefreshCw size={14} /> LÀM MỚI
                    </button>
                    <div className="absolute top-3 left-3 pointer-events-none opacity-40 text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-1 bg-slate-50">
                      VÙNG KÝ TÊN
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-white rounded-sm border border-slate-200 p-8 min-h-[240px] shadow-inner">
                    {uploadedImage ? (
                      <div className="relative">
                        <img src={uploadedImage} alt="Signature Upload" className="max-h-40 mix-blend-multiply" />
                        <button 
                          onClick={() => setUploadedImage(null)}
                          className="absolute -top-3 -right-3 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors shadow-sm"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer hover:bg-slate-50 p-6 rounded-sm transition-all border-2 border-dashed border-slate-200 w-full">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
                          <Upload size={20} />
                        </div>
                        <span className="text-slate-700 font-bold text-sm mb-1">CHỌN TỆP ẢNH CHỮ KÝ</span>
                        <span className="text-slate-400 text-[11px] uppercase font-bold tracking-tight">Hỗ trợ PNG, JPG (Nền trắng)</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 pt-6 border-t border-slate-200">
                <button
                  onClick={onClose}
                  className="flex-1 ef-btn"
                  style={{ padding: '10px' }}
                >
                  HỦY BỎ
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={activeTab === 'draw' ? false : !uploadedImage}
                  className="flex-[2] ef-btn"
                  style={{ 
                    padding: '10px', 
                    background: '#4f46e5', 
                    color: '#fff', 
                    border: 'none',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} /> HOÀN TẤT VÀ KÝ TÊN
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
