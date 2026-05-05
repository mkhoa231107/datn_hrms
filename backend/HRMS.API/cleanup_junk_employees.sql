-- =====================================================
-- SCRIPT XOÁ NHÂN SỰ RÁC (KT_01, TP_01, PRD-ASS-001..150)
-- Lưu ý: Chỉ giữ lại PRD-ASS-W-001..150
-- =====================================================

BEGIN TRANSACTION;

-- 1. Xác định danh sách ID nhân viên cần xoá
DECLARE @EmployeeIds TABLE (Id INT, UserId INT);

INSERT INTO @EmployeeIds (Id, UserId)
SELECT Id, UserId 
FROM Employees 
WHERE EmployeeCode IN ('KT_01', 'TP_01')
   OR (EmployeeCode LIKE 'PRD-ASS-%' AND EmployeeCode NOT LIKE 'PRD-ASS-W-%');

-- Kiểm tra số lượng
DECLARE @Count INT = (SELECT COUNT(*) FROM @EmployeeIds);
PRINT N'Đang xoá ' + CAST(@Count AS NVARCHAR) + N' nhân sự rác...';

-- 2. Ngắt các ràng buộc (ManagerId, ApproverId)
UPDATE Departments SET ManagerId = NULL WHERE ManagerId IN (SELECT Id FROM @EmployeeIds);
UPDATE Employees SET ManagerId = NULL WHERE ManagerId IN (SELECT Id FROM @EmployeeIds);

-- Cần kiểm tra xem bảng LeaveRequests có ApproverId không (tùy version schema)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'ApproverId')
BEGIN
    DECLARE @UpdateSQL NVARCHAR(MAX) = 'UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId IN (SELECT Id FROM @EmployeeIds)';
    -- Vì @EmployeeIds là table variable, không thể dùng trực tiếp trong EXEC. 
    -- Chuyển sang dùng temp table cho chắc chắn nếu cần động, nhưng ở đây dùng SQL tĩnh là được nếu biết chắc cột tồn tại.
    UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId IN (SELECT Id FROM @EmployeeIds);
END

-- 3. Xoá dữ liệu phụ thuộc (Theo EmployeeId)
DELETE FROM AttendanceDetails WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM TimeAttendanceRecords WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM TimeAdjustmentRequests WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM OvertimeRequests WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM WorkSchedules WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM AttendanceSummaries WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM LeaveRequests WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM LeaveBalances WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM PayrollRecords WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeContracts WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeInsurances WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeBankAccounts WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeEmergencyContacts WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeDocuments WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM Notifications WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);
DELETE FROM EmployeeOvertimes WHERE EmployeeId IN (SELECT Id FROM @EmployeeIds);

-- 4. Xoá dữ liệu phụ thuộc (Theo UserId)
DELETE FROM AuditLogs WHERE UserId IN (SELECT UserId FROM @EmployeeIds WHERE UserId IS NOT NULL);
DELETE FROM UserRoles WHERE UserId IN (SELECT UserId FROM @EmployeeIds WHERE UserId IS NOT NULL);
DELETE FROM PasswordResetOTPs WHERE UserId IN (SELECT UserId FROM @EmployeeIds WHERE UserId IS NOT NULL);
DELETE FROM CompanyNews WHERE AuthorId IN (SELECT UserId FROM @EmployeeIds WHERE UserId IS NOT NULL);

-- 5. Xoá chính chủ
DELETE FROM Employees WHERE Id IN (SELECT Id FROM @EmployeeIds);
DELETE FROM Users WHERE Id IN (SELECT UserId FROM @EmployeeIds WHERE UserId IS NOT NULL);

PRINT N'✓ Đã dọn dẹp sạch sẽ ' + CAST(@Count AS NVARCHAR) + N' nhân sự và tài khoản liên quan.';

-- KIỂM TRA LẠI
SELECT 'Employees còn lại' AS [Bảng], COUNT(*) AS [Số dòng] FROM Employees
UNION ALL
SELECT 'Users còn lại', COUNT(*) FROM Users;

COMMIT TRANSACTION;
