namespace HRMS.Application.DTOs.Scheduling
{
    public class GenerateFromContractDto
    {
        /// <summary>Nếu null, áp dụng cho tất cả nhân viên có hợp đồng active.</summary>
        public int? EmployeeId { get; set; }

        /// <summary>Năm cần tạo lịch (ví dụ: 2026).</summary>
        public int Year { get; set; }

        /// <summary>
        /// Có ghi đè lịch hiện tại không?
        /// Nếu false: chỉ tạo mới những ngày chưa có lịch.
        /// Nếu true: ghi đè tất cả, NGOẠI TRỪ những ngày đang trong đơn đổi ca đã duyệt.
        /// </summary>
        public bool Overwrite { get; set; } = false;
    }
}
