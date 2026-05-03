import React from 'react';
import { CheckCircle2 } from 'lucide-react';

/* ── helpers ── */
const fmtDate = (d) => {
  if (!d) return '.....................';
  return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const fmtMoney = (n) => {
  const num = Number(n);
  if (!num || isNaN(num)) return '.....................';
  return num.toLocaleString('vi-VN') + ' đồng';
};

/* A simple underlined fill-in */
const Fill = ({ children, width = 'auto', bold = false }) => (
  <span style={{
    display: 'inline-block',
    borderBottom: '1px solid #000',
    minWidth: width,
    maxWidth: '100%',
    wordBreak: 'break-word',
    fontWeight: bold ? '700' : 'inherit',
    paddingBottom: '1px',
  }}>
    {children || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
  </span>
);

/* ── Main component ── */
export default function ContractTemplate({ contract }) {
  if (!contract) return null;

  const signDate  = contract.startDate ? new Date(contract.startDate) : new Date();
  const signDay   = signDate.getDate().toString().padStart(2, '0');
  const signMonth = (signDate.getMonth() + 1).toString().padStart(2, '0');
  const signYear  = signDate.getFullYear();

  const p = { // shorthand
    name:       contract.employeeName           || '.....................',
    position:   contract.positionName           || '.....................',
    dept:       contract.departmentName         || '.....................',
    dob:        fmtDate(contract.dateOfBirth),
    address:    contract.address                || '.....................',
    tmpAddress: contract.currentAddress || contract.address || '.....................',
    cccd:       contract.identityNumber         || '.....................',
    cccdDate:   fmtDate(contract.identityDate   || '2015-01-01'),
    cccdPlace:  contract.identityPlace          || 'Cục CSQLHC về TTXH',
    placeOfOrigin: contract.placeOfOrigin       || '.....................',
    placeOfBirth:  contract.placeOfBirth        || '.....................',
    contractNo: contract.contractNumber         || '...',
    type:       contract.contractType           || 'Xác định thời hạn',
    startDate:  fmtDate(contract.startDate),
    endDate:    contract.endDate ? fmtDate(contract.endDate) : null,
    location:   contract.workLocation           || 'Văn phòng công ty',
    salary:     fmtMoney(contract.basicSalary),
    meal:       fmtMoney(contract.mealAllowance    || 730000),
    phone:      fmtMoney(contract.phoneAllowance   || 300000),
    petrol:     fmtMoney(contract.petrolAllowance  || 600000),
    housing:    fmtMoney(contract.housingAllowance || 700000),
    signedBy:   contract.signedBy              || 'Phùng Thành',
    shiftName:  contract.shiftName             || 'Hành chính',
    shiftTime:  contract.shiftTime             || '08:30 – 17:30',
    notes:      contract.notes                 || null,
    empSig:     contract.employeeSignature     || null,
  };

  return (
    <div
      className="p-5 sm:p-12 md:p-16 mx-auto w-full max-w-[900px] overflow-hidden"
      style={{
        fontFamily: '"Times New Roman", Times, serif',
        fontSize: '12pt',
        lineHeight: '1.65',
        color: '#000',
        background: '#fff',
      }}
    >
      {/* ── National header ── */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontWeight: '700', fontSize: '13pt', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Cộng hòa xã hội chủ nghĩa Việt Nam
        </div>
        <div style={{ fontWeight: '700', fontSize: '12pt' }}>
          Độc lập – Tự do – Hạnh phúc
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 0' }}>
          <div style={{ borderBottom: '1px solid #000', width: '160px' }} />
        </div>
      </div>

      {/* ── Contract title ── */}
      <div style={{ textAlign: 'center', margin: '22px 0 18px' }}>
        <div style={{ fontWeight: '700', fontSize: '16pt', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Hợp đồng lao động
        </div>
        <div style={{ fontSize: '10pt', color: '#555', marginTop: '4px' }}>
          Số: <Fill width="120px">{p.contractNo}</Fill>
        </div>
      </div>

      {/* ── Legal bases ── */}
      <p style={{ marginBottom: '4px' }}>- Căn cứ Bộ luật lao động ngày 20 tháng 11 năm 2019;</p>
      <p style={{ marginBottom: '4px' }}>- Căn cứ vào nhu cầu của các Bên</p>
      <p style={{ marginBottom: '16px' }}>
        Hôm nay, ngày <Fill width="28px">{signDay}</Fill> tháng <Fill width="28px">{signMonth}</Fill> năm{' '}
        <Fill width="48px">{signYear}</Fill>, tại Công ty Cổ phần Công nghệ TECHVN, chúng tôi gồm:
      </p>

      {/* ── Bên A ── */}
      <p style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
        Bên A: Người sử dụng lao động
      </p>
      <div className="pl-3 sm:pl-5 mb-4">
        <p>Công ty: <strong>CÔNG TY CỔ PHẦN CÔNG NGHỆ TECHVN</strong></p>
        <p>Địa chỉ: 123 Đường Láng, Phường Láng Thượng, Quận Đống Đa, TP. Hà Nội</p>
        <p>Điện thoại: (024) 3766 88XX</p>
        <p>
          Đại diện: <strong style={{ textTransform: 'uppercase' }}>{p.signedBy}</strong>
          &emsp;&emsp;Chức vụ: Giám đốc điều hành&emsp;&emsp;Quốc tịch: Việt Nam
        </p>
      </div>

      {/* ── Bên B ── */}
      <p style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>
        Bên B: Người lao động
      </p>
      <div className="pl-3 sm:pl-5 mb-4">
        <p>Ông/bà: <strong style={{ textTransform: 'uppercase', fontSize: '13pt' }}>{p.name}</strong></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-6">
          <p>Quốc tịch: <Fill width="120px">Việt Nam</Fill></p>
          <p>Ngày sinh: <Fill width="120px">{p.dob}</Fill></p>
        </div>
        <p>Nơi sinh: <Fill width="300px">{p.placeOfBirth}</Fill></p>
        <p>Quê quán: <Fill width="300px">{p.placeOfOrigin}</Fill></p>
        <p>Địa chỉ thường trú: <Fill width="300px">{p.address}</Fill></p>
        <p>Địa chỉ tạm trú: <Fill width="300px">{p.tmpAddress}</Fill></p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4">
          <p className="sm:col-span-1">Số CMND/CCCD: <Fill width="100px">{p.cccd}</Fill></p>
          <p className="sm:col-span-1">Cấp ngày: <Fill width="80px">{p.cccdDate}</Fill></p>
          <p className="sm:col-span-1">Tại: <Fill width="100px">{p.cccdPlace}</Fill></p>
        </div>
      </div>

      <p style={{ marginBottom: '18px', textAlign: 'justify' }}>
        Cùng thoả thuận ký kết Hợp đồng lao động (HĐLĐ) và cam kết làm đúng những điều khoản sau đây:
      </p>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 1
      ══════════════════════════════════════════════ */}
      <Section title="Điều 1: Công việc, địa điểm làm việc và thời hạn của Hợp đồng">
        <p>
          - Loại hợp đồng: <Fill width="180px">{p.type}</Fill> – Ký lần thứ{' '}
          <Fill width="40px">01</Fill>
        </p>
        <p>
          - Từ ngày: <Fill width="100px">{p.startDate}</Fill>&emsp;
          Đến ngày: <Fill width="100px">{p.endDate || '(Vô thời hạn)'}</Fill>
        </p>
        <p>- Địa điểm làm việc: <Fill width="260px">{p.location}</Fill></p>
        <p>- Bộ phận công tác:</p>
        <p className="pl-4 sm:pl-6">
          + Phòng: <Fill width="260px">{p.dept}</Fill>
        </p>
        <p className="pl-4 sm:pl-6">
          + Chức danh chuyên môn (vị trí công tác):{' '}
          <Fill width="200px">{p.position}</Fill>
        </p>
        <p style={{ marginTop: '6px' }}>- Nhiệm vụ công việc như sau:</p>
        <ul style={{ paddingLeft: '32px', marginTop: '4px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '4px', textAlign: 'justify' }}>
            Thực hiện công việc theo đúng chức danh chuyên môn của mình dưới sự quản lý, điều hành
            của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền phụ trách).
          </li>
          <li style={{ marginBottom: '4px', textAlign: 'justify' }}>
            Phối hợp cùng với các bộ phận, phòng ban khác trong Người sử dụng lao động để phát huy
            tối đa hiệu quả công việc.
          </li>
          <li style={{ textAlign: 'justify' }}>
            Hoàn thành những công việc khác tùy thuộc theo yêu cầu kinh doanh của Người sử dụng lao
            động và theo quyết định của Ban Giám đốc (và các cá nhân được bổ nhiệm hoặc ủy quyền
            phụ trách).
          </li>
        </ul>
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 2
      ══════════════════════════════════════════════ */}
      <Section title="Điều 2: Lương, phụ cấp, các khoản bổ sung khác">
        <p>
          - Lương căn bản: <Fill width="200px" bold>{p.salary}</Fill>
        </p>
        <p>- Phụ cấp (tổng cộng các khoản):</p>
        <ul style={{ paddingLeft: '32px', marginTop: '4px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '2px' }}>Phụ cấp ăn ca: <Fill width="100px">{p.meal}</Fill> VNĐ/tháng</li>
          <li style={{ marginBottom: '2px' }}>Phụ cấp điện thoại: <Fill width="100px">{p.phone}</Fill> VNĐ/tháng</li>
          <li style={{ marginBottom: '2px' }}>Phụ cấp xăng xe: <Fill width="100px">{p.petrol}</Fill> VNĐ/tháng</li>
          <li style={{ marginBottom: '2px' }}>Phụ cấp nhà ở: <Fill width="100px">{p.housing}</Fill> VNĐ/tháng</li>
        </ul>
        <p style={{ marginTop: '6px' }}>- Các khoản bổ sung khác: tùy quy định cụ thể của Công ty.</p>
        <p>- Hình thức trả lương: Tiền mặt hoặc chuyển khoản.</p>
        <p>
          - Thời hạn trả lương: Được trả lương vào ngày{' '}
          <Fill width="30px">05</Fill> của tháng.
        </p>
        <p style={{ textAlign: 'justify' }}>
          - Chế độ nâng bậc, nâng lương: Người lao động được xét nâng bậc, nâng lương theo kết quả
          làm việc và theo quy định của Người sử dụng lao động.
        </p>
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 3
      ══════════════════════════════════════════════ */}
      <Section title="Điều 3: Thời giờ làm việc, nghỉ ngơi, bảo hộ lao động, BHXH, BHYT, BHTN">
        <p>
          - Thời giờ làm việc: <Fill width="40px">08</Fill> giờ/ngày,{' '}
          <Fill width="40px">44</Fill> giờ/tuần. Nghỉ hàng tuần: ngày{' '}
          <Fill width="80px">Chủ Nhật</Fill>
        </p>
        <p>- Từ ngày Thứ <Fill width="40px">Hai</Fill> đến ngày Thứ <Fill width="60px">Bảy</Fill> hàng tuần:</p>
        <p className="pl-4 sm:pl-6">
          + Ca làm việc hiện tại: <strong>{p.shiftName}</strong> ({p.shiftTime})
        </p>
        <p style={{ marginTop: '6px', textAlign: 'justify' }}>
          - Chế độ nghỉ ngơi các ngày lễ, tết, phép năm:
        </p>
        <ul style={{ paddingLeft: '32px', marginTop: '4px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '4px', textAlign: 'justify' }}>
            Người lao động được nghỉ lễ, tết theo luật định; các ngày nghỉ lễ nếu trùng với ngày
            nghỉ thì sẽ được nghỉ bù vào ngày trước hoặc ngày kế tiếp tùy theo tình hình cụ thể mà
            Ban lãnh đạo Công ty sẽ chỉ đạo trực tiếp.
          </li>
          <li style={{ textAlign: 'justify' }}>
            Người lao động đã ký HĐLĐ chính thức và có thâm niên công tác 12 tháng thì sẽ được nghỉ
            phép năm có hưởng lương (01 ngày phép/01 tháng, 12 ngày phép/01 năm); trường hợp có thâm
            niên làm việc dưới 12 tháng thì thời gian nghỉ hằng năm được tính theo tỷ lệ tương ứng
            với số thời gian làm việc.
          </li>
        </ul>
        <p style={{ marginTop: '6px' }}>
          - Thiết bị và công cụ làm việc sẽ được Công ty cấp phát tùy theo nhu cầu của công việc.
        </p>
        <p>
          - Điều kiện an toàn và vệ sinh lao động tại nơi làm việc theo quy định của pháp luật hiện
          hành.
        </p>
        <p>
          - Bảo hiểm xã hội, bảo hiểm y tế và bảo hiểm thất nghiệp: Theo quy định của pháp luật.
        </p>
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 4
      ══════════════════════════════════════════════ */}
      <Section title="Điều 4: Đào tạo, bồi dưỡng, các quyền lợi và nghĩa vụ liên quan của người lao động">
        <p style={{ textAlign: 'justify' }}>
          - Đào tạo, bồi dưỡng: Người lao động được đào tạo, bồi dưỡng, huấn luyện tại nơi làm
          việc hoặc được gửi đi đào tạo theo quy định của Công ty và yêu cầu công việc.
        </p>
        <p style={{ textAlign: 'justify' }}>
          - Khen thưởng: Người lao động được khuyến khích bằng vật chất và tinh thần khi có thành
          tích trong công tác hoặc theo quy định của Công ty.
        </p>
        <p style={{ textAlign: 'justify' }}>
          - Các khoản thỏa thuận khác gồm: tiền cơm trưa, thưởng mặc định, hỗ trợ xăng xe, điện
          thoại, nhà ở, trang phục…, theo quy định của Công ty.
        </p>
        <p style={{ marginTop: '6px' }}>- Nghĩa vụ liên quan của người lao động:</p>
        <ul style={{ paddingLeft: '32px', marginTop: '4px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '3px' }}>Tuân thủ hợp đồng lao động.</li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Thực hiện công việc với sự tận tâm, tận lực và mẫn cán, đảm bảo hoàn thành công việc
            với hiệu quả cao nhất theo sự phân công, điều hành (bằng văn bản hoặc bằng miệng) của
            Ban Giám đốc (và các cá nhân được Ban Giám đốc bổ nhiệm hoặc ủy quyền phụ trách).
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Hoàn thành công việc được giao và sẵn sàng chấp nhận mọi sự điều động khi có yêu cầu.
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Nắm rõ và chấp hành nghiêm túc kỷ luật lao động, an toàn lao động, vệ sinh lao động,
            phòng cháy chữa cháy, văn hóa Công ty, nội quy lao động và các chủ trương, chính sách
            của Công ty.
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Trong trường hợp được cử đi đào tạo thì nhân viên phải hoàn thành khoá học đúng thời
            hạn, phải cam kết sẽ phục vụ lâu dài cho Công ty sau khi kết thúc khoá học và được
            hưởng nguyên lương, các quyền lợi khác được hưởng như người đi làm.
            <br />
            Nếu sau khi kết thúc khóa đào tạo mà nhân viên không tiếp tục hợp tác với Công ty thì
            nhân viên phải hoàn trả lại 100% phí đào tạo và các khoản chế độ đã được nhận trong
            thời gian đào tạo.
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Bồi thường vi phạm vật chất: Theo quy định nội bộ của Công ty và quy định của pháp luật
            hiện hành.
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Có trách nhiệm đề xuất các giải pháp nâng cao hiệu quả công việc, giảm thiểu các rủi
            ro. Khuyến khích các đóng góp này được thực hiện bằng văn bản.
          </li>
          <li style={{ textAlign: 'justify' }}>
            Thuế TNCN, nếu có: do người lao động đóng. Công ty sẽ tạm khấu trừ trước khi chi trả
            cho người lao động theo quy định.
          </li>
        </ul>
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 5
      ══════════════════════════════════════════════ */}
      <Section title="Điều 5: Nghĩa vụ và quyền lợi của Người sử dụng lao động">
        <p style={{ fontWeight: '600', marginBottom: '4px' }}>1. Nghĩa vụ:</p>
        <ul style={{ paddingLeft: '32px', marginBottom: '8px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Thực hiện đầy đủ những điều kiện cần thiết đã cam kết trong HĐLĐ để Người lao động đạt
            hiệu quả công việc cao. Bảo đảm việc làm cho Người lao động theo HĐLĐ đã ký.
          </li>
          <li style={{ textAlign: 'justify' }}>
            Thanh toán đầy đủ, đúng hạn các chế độ và quyền lợi cho người lao động theo hợp đồng
            lao động, thỏa ước lao động tập thể (nếu có).
          </li>
        </ul>
        <p style={{ fontWeight: '600', marginBottom: '4px' }}>2. Quyền lợi:</p>
        <ul style={{ paddingLeft: '32px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Điều hành Người lao động hoàn thành công việc theo HĐLĐ (bố trí, điều chuyển công việc
            cho Người lao động theo đúng chức năng chuyên môn).
          </li>
          <li style={{ marginBottom: '3px', textAlign: 'justify' }}>
            Có quyền chuyển tạm thời lao động, ngừng việc, thay đổi, tạm hoãn, chấm dứt HĐLĐ và
            áp dụng các biện pháp kỷ luật theo quy định của Pháp luật hiện hành và theo nội quy của
            Công ty trong thời gian HĐLĐ còn giá trị.
          </li>
          <li style={{ textAlign: 'justify' }}>
            Có quyền đòi bồi thường, khiếu nại với cơ quan liên đới để bảo vệ quyền lợi của mình
            nếu Người lao động vi phạm Pháp luật hay các điều khoản của HĐLĐ.
          </li>
        </ul>
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 6
      ══════════════════════════════════════════════ */}
      <Section title="Điều 6: Những thỏa thuận khác">
        {p.notes ? (
          <p style={{ textAlign: 'justify', fontStyle: 'italic' }}>{p.notes}</p>
        ) : (
          <>
            <p style={{ borderBottom: '1px solid #aaa', marginBottom: '12px', minHeight: '22px' }} />
            <p style={{ borderBottom: '1px solid #aaa', marginBottom: '12px', minHeight: '22px' }} />
            <p style={{ borderBottom: '1px solid #aaa', marginBottom: '4px',  minHeight: '22px' }} />
          </>
        )}
      </Section>

      <Hr />

      {/* ══════════════════════════════════════════════
          ĐIỀU 7
      ══════════════════════════════════════════════ */}
      <Section title="Điều 7: Điều khoản thi hành">
        <p style={{ textAlign: 'justify' }}>
          - Những vấn đề về lao động không ghi trong hợp đồng lao động này thì áp dụng quy định
          của thỏa ước tập thể, trường hợp chưa có thỏa ước thì áp dụng quy định của pháp luật
          lao động.
        </p>
        <p style={{ textAlign: 'justify' }}>
          - Hợp đồng này được lập thành 2 bản có giá trị pháp lý như nhau, mỗi bên giữ 1 bản và
          có hiệu lực kể từ ngày ký.
        </p>
        <p style={{ textAlign: 'justify' }}>
          - Khi ký kết các phụ lục hợp đồng lao động thì nội dung của phụ lục cũng có giá trị như
          các nội dung của bản hợp đồng này.
        </p>
      </Section>

      {/* ══════════════════════════════════════════════
          SIGNATURES
      ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 sm:gap-6 mt-12">
        {/* Employee side */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            Người lao động
          </p>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '80px' }}>
            (Ký, ghi rõ họ tên)
          </p>
          {p.empSig ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img src={p.empSig} alt="Chữ ký người lao động" style={{ maxHeight: '70px', mixBlendMode: 'multiply', marginBottom: '4px' }} />
              <p style={{ fontWeight: '700', textTransform: 'uppercase', fontSize: '11pt' }}>{p.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8pt', color: '#065f46', fontWeight: '700', marginTop: '4px', border: '1px solid #a7f3d0', background: '#ecfdf5', padding: '2px 8px', borderRadius: '12px' }}>
                <CheckCircle2 size={10} /> Đã xác thực điện tử
              </div>
            </div>
          ) : (
            <p style={{ color: '#ccc', fontStyle: 'italic', fontSize: '10pt' }}>(Chưa ký tên)</p>
          )}
        </div>

        {/* Employer side */}
        <div className="text-center sm:border-l border-slate-200 sm:pl-4">
          <p style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
            Người sử dụng lao động
          </p>
          <p style={{ fontSize: '10pt', fontStyle: 'italic', marginBottom: '80px' }}>
            (Ký tên và đóng dấu)
          </p>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Decorative stamp ring */}
            <div style={{
              position: 'absolute',
              top: '-72px',
              left: '-56px',
              width: '140px',
              height: '140px',
              border: '3px solid rgba(185,28,28,0.35)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
            }}>
              <span style={{ color: 'rgba(185,28,28,0.5)', fontSize: '7pt', fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', lineHeight: 1.3, padding: '0 12px' }}>
                CÔNG TY CP TECHVN<br />ĐÃ XÁC THỰC
              </span>
            </div>
            <p style={{ fontWeight: '700', fontSize: '14pt', fontStyle: 'italic', fontFamily: 'Georgia, serif', color: '#1e3a8a', textTransform: 'uppercase' }}>
              {p.signedBy}
            </p>
          </div>
        </div>
      </div>

      {/* ── Footer metadata ── */}
      <div style={{
        marginTop: '48px',
        paddingTop: '10px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '8pt',
        color: '#94a3b8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        <span>HRMS – Hợp đồng số {p.contractNo}</span>
        <span>Trang 01 / 01</span>
      </div>
    </div>
  );
}

/* ── Small layout helpers ── */
function Hr() {
  return <div style={{ borderTop: '1px dashed #d1d5db', margin: '14px 0' }} />;
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '14px' }}>
      <p style={{ fontWeight: '700', marginBottom: '8px' }}>{title}</p>
      <div className="pl-2 sm:pl-4">{children}</div>
    </section>
  );
}
