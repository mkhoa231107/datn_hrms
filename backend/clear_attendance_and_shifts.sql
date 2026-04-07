-- ============================================================
-- Script xoá tất cả dữ liệu ngày công và lịch ca
-- Thứ tự: xoá bảng con trước, bảng cha sau (tránh FK error)
-- ============================================================

-- 1. Xoá bản ghi chấm công thô (check-in/check-out)
DELETE FROM TimeAttendanceRecords;

-- 2. Xoá tổng hợp chấm công (cuối tháng)
DELETE FROM AttendanceSummaries;

-- 3. Xoá lịch làm việc chi tiết của từng nhân viên
DELETE FROM WorkSchedules;

-- 4. (Tuỳ chọn) Xoá kỳ công
-- DELETE FROM SchedulePeriods;

-- 5. (Tuỳ chọn) Xoá danh mục ca làm việc (Sáng/Chiều/Đêm...)
-- DELETE FROM WorkShifts;

PRINT 'Đã xoá xong dữ liệu ngày công và lịch ca!';
