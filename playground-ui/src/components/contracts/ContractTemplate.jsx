import React from 'react';
import { ShieldCheck, MapPin, Calendar, User, Briefcase, FileText } from 'lucide-react';

export default function ContractTemplate({ contract }) {
  if (!contract) return null;

  const formatDate = (date) => {
    if (!date) return '...';
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getContractTypeName = (type) => {
    const types = {
      'Probation': 'THỬ VIỆC',
      'FixedTerm': 'XÁC ĐỊNH THỜI HẠN',
      'Indefinite': 'KHÔNG XÁC ĐỊNH THỜI HẠN',
      'Seasonal': 'THỜI VỤ',
      'PartTime': 'BÁN THỜI GIAN'
    };
    return types[type] || type.toUpperCase();
  };

  const numberToVietnameseText = (number) => {
    const units = ['', ' nghìn', ' triệu', ' tỷ'];
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    if (number === 0) return 'không đồng';
    
    let res = "";
    let count = 0;
    let n = Math.abs(number);

    const readThreeDigits = (num, isFull) => {
      let temp = "";
      const hundred = Math.floor(num / 100);
      const ten = Math.floor((num % 100) / 10);
      const unit = num % 10;

      if (hundred > 0 || isFull) {
        temp = digits[hundred] + " trăm ";
      }

      if (ten > 1) {
        temp += digits[ten] + " mươi ";
        if (unit === 1) temp += "mốt";
        else if (unit === 5) temp += "lăm";
        else if (unit > 0) temp += digits[unit];
      } else if (ten === 1) {
        temp += "mười ";
        if (unit === 5) temp += "lăm";
        else if (unit > 0) temp += digits[unit];
      } else if (hundred > 0 && unit > 0) {
        temp += "linh " + digits[unit];
      } else if (unit > 0) {
        temp += digits[unit];
      }
      return temp;
    };

    let groupCount = 0;
    while (n > 0) {
      const group = n % 1000;
      if (group > 0) {
        const groupText = readThreeDigits(group, n > 999);
        res = groupText + units[groupCount] + " " + res;
      }
      n = Math.floor(n / 1000);
      groupCount++;
    }

    res = res.trim();
    return res.charAt(0).toUpperCase() + res.slice(1) + " đồng chẵn";
  };

  return (
    <div className="bg-slate-200 p-8 min-h-screen flex justify-center overflow-auto animate-fade-in py-12">
      {/* Official A4 Paper Container with enhanced shadow and border */}
      <div 
        className="bg-white w-full max-w-[850px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-12 md:p-24 text-slate-900 leading-[1.7] relative overflow-hidden border border-slate-300"
        style={{ fontFamily: '"Times New Roman", Times, serif', textRendering: 'optimizeLegibility' }}
      >
        
        {/* Subtle Paper Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')]"></div>

        {/* National Header - More formal and tight */}
        <div className="text-center mb-12">
          <h2 className="font-bold text-lg uppercase mb-1">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
          <h3 className="font-bold text-md mb-2">Độc lập - Tự do - Hạnh phúc</h3>
          <div className="flex justify-center items-center mb-10">
            <div className="h-[1.5px] w-48 bg-slate-900"></div>
          </div>
        </div>

        {/* Contract Title - Elegant and bold */}
        <div className="text-center mb-16">
          <h1 className="text-3xl font-black uppercase mb-3">HỢP ĐỒNG LAO ĐỘNG</h1>
          <div className="flex justify-center items-center gap-3 mb-4">
            <span className="h-px w-8 bg-slate-300"></span>
            <p className="font-bold text-slate-600 text-sm uppercase italic">Số: {contract.contractNumber}</p>
            <span className="h-px w-8 bg-slate-300"></span>
          </div>
        </div>

        {/* Parties Information - Legalistic styling */}
        <div className="space-y-10 text-base">
          <section className="text-justify">
            <p className="mb-6">Hôm nay, ngày {formatDate(new Date())}, tại trụ sở Công ty Cổ phần Công nghệ TechVN, chúng tôi gồm có:</p>
            
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-md mb-3 flex items-center gap-2">BÊN SỬ DỤNG LAO ĐỘNG (BÊN A):</h4>
                <div className="grid grid-cols-1 gap-1.5 pl-6 border-l-2 border-slate-100">
                  <p><span className="font-semibold underline underline-offset-2">Tên tổ chức:</span> <strong>CÔNG TY CỔ PHẦN CÔNG NGHỆ TECHVN</strong></p>
                  <p><span className="font-semibold underline underline-offset-2">Địa chỉ:</span> 123 Đường Láng, Phường Láng Thượng, Quận Đống Đa, TP. Hà Nội</p>
                  <p><span className="font-semibold underline underline-offset-2">Đại diện bởi Ông/Bà:</span> <span className="font-bold">{contract.signedBy || 'Phùng Thành'}</span></p>
                  <p><span className="font-semibold underline underline-offset-2">Chức vụ:</span> Giám đốc điều hành</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-md mb-3 flex items-center gap-2">BÊN NGƯỜI LAO ĐỘNG (BÊN B):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 pl-6 border-l-2 border-slate-100">
                  <p><span className="font-semibold underline underline-offset-2">Họ và tên:</span> <span className="font-bold">{contract.employeeName}</span></p>
                  <p><span className="font-semibold underline underline-offset-2">Mã nhân viên:</span> {contract.employeeCode}</p>
                  <p><span className="font-semibold underline underline-offset-2">Số CCCD:</span> {contract.identityNumber || '001099023456'}</p>
                  <p><span className="font-semibold underline underline-offset-2">Phòng ban:</span> {contract.departmentName || 'Phòng Kỹ thuật'}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="text-justify">
            <h4 className="font-bold text-md mb-4 uppercase text-blue-900 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] border border-blue-200">01</div>
              ĐIỀU KHOẢN VỀ CÔNG VIỆC VÀ THỜI HẠN
            </h4>
            <div className="pl-9 space-y-2">
              <p>1. <span className="font-bold">Chức danh chuyên môn:</span> {contract.jobDescription || 'Chuyên viên Phát triển phần mềm'}</p>
              <p>2. <span className="font-bold">Địa điểm làm việc:</span> {contract.workLocation || 'Tại trụ sở chính của Bên A hoặc theo sự điều động công tác'}</p>
              <p>3. <span className="font-bold">Loại hợp đồng:</span> {getContractTypeName(contract.contractType)}</p>
              <p>4. <span className="font-bold">Thời hạn hợp đồng:</span> Từ ngày {formatDate(contract.startDate)} {contract.endDate ? `đến ngày ${formatDate(contract.endDate)}` : '(Hợp đồng vô thời hạn)'}.</p>
            </div>
          </section>

          <section className="text-justify">
             <h4 className="font-bold text-md mb-4 uppercase text-blue-900 flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[10px] border border-blue-200">02</div>
              CHẾ ĐỘ LƯƠNG VÀ ĐÃI NGỘ
            </h4>
            <div className="pl-9 space-y-2">
              <p>1. <span className="font-bold">Lương cơ bản:</span> <span className="text-blue-700 font-black">{Number(contract.basicSalary).toLocaleString('vi-VN')} VNĐ</span> (Bằng chữ: {numberToVietnameseText(contract.basicSalary)}).</p>
              <p>2. <span className="font-bold">Hình thức trả lương:</span> Chuyển khoản qua tài khoản ngân hàng liên kết vào ngày 05 hàng tháng.</p>
              <p>3. <span className="font-bold">Thời gian làm việc:</span> 08 giờ/ngày, từ thứ Hai đến thứ Sáu hàng tuần.</p>
            </div>
          </section>

          {/* Legal Stamp/Signature Footer - More authentic layout */}
          <div className="mt-24 grid grid-cols-2 gap-12">
            <div className="text-center">
              <p className="font-bold uppercase mb-24">ĐẠI DIỆN BÊN A</p>
              <div className="relative inline-block">
                <div className="absolute -top-16 -left-12 w-36 h-36 border-[3px] border-red-500/40 rounded-full flex flex-col items-center justify-center -rotate-12 select-none group pointer-events-none">
                   <div className="border border-red-500/40 w-full h-px mb-2"></div>
                   <span className="text-red-600/50 text-[9px] uppercase font-black text-center leading-tight px-4">
                     CÔNG TY CP TECHVN<br/>ĐÃ XÁC THỰC SỐ
                   </span>
                   <div className="border border-red-500/40 w-full h-px mt-2"></div>
                </div>
                <div className="h-20 flex items-center justify-center italic text-blue-900 font-serif text-3xl opacity-90" style={{ fontFamily: '"Brush Script MT", cursive' }}>
                  {contract.signedBy || 'Thanh Phung'}
                </div>
                <p className="font-bold text-slate-800 mt-2 uppercase">{contract.signedBy || 'Phùng Thành'}</p>
              </div>
            </div>

            <div className="text-center">
              <p className="font-bold uppercase mb-2">BÊN NGƯỜI LAO ĐỘNG</p>
              <p className="text-[10px] text-slate-400 italic mb-10">(Ký và ghi rõ họ tên)</p>
              
              <div className="min-h-[160px] flex flex-col items-center justify-center">
                {contract.employeeSignature ? (
                  <div className="relative group">
                    <img src={contract.employeeSignature} alt="Digital Signature" className="max-h-32 mb-4 mix-blend-multiply transition-transform hover:scale-110" />
                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg border border-blue-200/50 flex items-center justify-center pointer-events-none">
                       <ShieldCheck className="w-20 h-20 text-blue-500/10" />
                    </div>
                    <p className="font-bold text-slate-800 uppercase leading-none">{contract.employeeName}</p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase font-mono">Verified ID: {contract.employeeCode}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-10 grayscale opacity-40">
                    <div className="w-16 h-1 bg-slate-200"></div>
                    <p className="text-xs font-bold uppercase text-slate-400">Chưa xác thực</p>
                    <div className="w-16 h-1 bg-slate-200"></div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Enhanced Watermark */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.04] rotate-[-35deg] select-none">
          <span className="text-[140px] font-black italic">CONFIDENTIAL</span>
        </div>

        {/* Legal Footer Note */}
        <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
           <span>HRMS Net - Digital Contract System</span>
           <span>Trang 01 / 01</span>
        </div>
      </div>
    </div>
  );
}
