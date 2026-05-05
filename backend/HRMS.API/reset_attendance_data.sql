-- =====================================================
-- SCRIPT XÓA & RESET DỮ LIỆU BẢNG CÔNG
-- Mục đích: Xóa sạch dữ liệu chấm công và tổng hợp công để làm lại từ đầu
-- Lưu ý: Chạy theo thứ tự từ trên xuống (FK dependency)
-- =====================================================

BEGIN TRANSACTION;

-- 1. Xóa dữ liệu tính lương (vì lương phụ thuộc vào công)
-- Phải xóa lương trước nếu không sẽ bị lỗi Foreign Key Conflict
DELETE FROM "PayrollRecords";
UPDATE "PayrollPeriods"
SET "Status" = 0, "ProcessedById" = NULL, "ReviewedById" = NULL, "ApprovedById" = NULL;
PRINT N'✓ Đã dọn dẹp dữ liệu Lương liên quan';

-- 2. Xóa bảng tổng hợp công (AttendanceSummaries)
-- Đây là bảng lưu chốt công cuối tháng
DELETE FROM "AttendanceSummaries";
PRINT N'✓ Đã xóa bảng Tổng hợp công (AttendanceSummaries)';

-- 3. Xóa chi tiết công hàng ngày (AttendanceDetails)
-- Bảng này lưu công chi tiết từng ngày của từng nhân viên (đã tính toán)
DELETE FROM "AttendanceDetails";
PRINT N'✓ Đã xóa Chi tiết công (AttendanceDetails)';

-- 4. Xóa dữ liệu quẹt thẻ thô (TimeAttendanceRecords)
-- Bảng này lưu lịch sử in/out thô từ máy chấm công
DELETE FROM "TimeAttendanceRecords";
PRINT N'✓ Đã xóa Dữ liệu quẹt thẻ (TimeAttendanceRecords)';

-- 5. Xóa yêu cầu làm thêm giờ & giải trình (Tùy chọn, bỏ comment nếu muốn xóa)
-- DELETE FROM "EmployeeOvertimes";
-- DELETE FROM "OvertimeRequests";
-- DELETE FROM "TimeAdjustmentRequests";
-- PRINT N'✓ Đã xóa Yêu cầu OT và Giải trình';

-- KIỂM TRA LẠI KẾT QUẢ
SELECT 'TimeAttendanceRecords' AS [Bảng], COUNT(*) AS [Số dòng còn lại] FROM "TimeAttendanceRecords"
UNION ALL
SELECT 'AttendanceDetails', COUNT(*) FROM "AttendanceDetails"
UNION ALL
SELECT 'AttendanceSummaries', COUNT(*) FROM "AttendanceSummaries";

COMMIT TRANSACTION;
