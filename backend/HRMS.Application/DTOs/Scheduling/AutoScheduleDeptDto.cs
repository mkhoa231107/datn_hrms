using System;

namespace HRMS.Application.DTOs.Scheduling
{
    public class AutoScheduleDeptDto
    {
        public int Year { get; set; }
        public int DepartmentId { get; set; }

        /// <summary>
        /// Ngày bắt đầu xếp ca — tính từ ngày này đến hết năm.
        /// Ngày này cũng là ngày đầu của Tuần 1 trong chu kỳ.
        /// </summary>
        public DateTime CycleStartDate { get; set; }

        /// <summary>Ca 1 — Tuần 1–2 và Tuần 7–8</summary>
        public int Shift1Id { get; set; }

        /// <summary>Ca 2 — Tuần 3–4</summary>
        public int Shift2Id { get; set; }

        /// <summary>Ca 3 — Tuần 5–6</summary>
        public int Shift3Id { get; set; }

        /// <summary>
        /// Nếu true → ghi đè lịch đã có.
        /// Nếu false → chỉ điền vào ngày chưa có ca.
        /// </summary>
        public bool OverwriteExisting { get; set; } = false;
    }
}
