USE [HRMS_DATN];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

PRINT 'Adding sample OT hours (Set-based) for HR department...';

-- 1. Tìm các phòng ban HR
DECLARE @HrDeptIds TABLE (Id INT);
INSERT INTO @HrDeptIds (Id)
SELECT Id FROM Departments WHERE (DepartmentName LIKE N'%Nhân sự%' OR DepartmentName LIKE N'%Tuyển dụng%');

-- 2. Tìm người duyệt
DECLARE @ApproverId INT;
SELECT TOP 1 @ApproverId = ManagerId FROM Departments WHERE Id IN (SELECT Id FROM @HrDeptIds) AND ManagerId IS NOT NULL;
IF @ApproverId IS NULL SET @ApproverId = 7;

DECLARE @OtDate1 DATE = '2026-04-06';
DECLARE @OtDate2 DATE = '2026-04-15';

-- 3. Xoá đơn OT cũ
DELETE FROM EmployeeOvertimes WHERE OvertimeRequestId IN (SELECT Id FROM OvertimeRequests WHERE [Date] IN (@OtDate1, @OtDate2) AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (SELECT Id FROM @HrDeptIds)));
DELETE FROM OvertimeRequests WHERE [Date] IN (@OtDate1, @OtDate2) AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (SELECT Id FROM @HrDeptIds));

-- 4. Tạo đơn OT Approved
INSERT INTO OvertimeRequests (EmployeeId, DepartmentId, [Date], StartTime, EndTime, Reason, [Status], CreatedById, ApprovedById, ApprovedAt, CreatedAt)
SELECT e.Id, e.DepartmentId, @OtDate1, '17:30:00', '19:30:00', N'Tăng ca hồ sơ nhân viên', 'Approved', @ApproverId, @ApproverId, GETUTCDATE(), GETUTCDATE()
FROM Employees e WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds);

INSERT INTO OvertimeRequests (EmployeeId, DepartmentId, [Date], StartTime, EndTime, Reason, [Status], CreatedById, ApprovedById, ApprovedAt, CreatedAt)
SELECT e.Id, e.DepartmentId, @OtDate2, '18:00:00', '21:00:00', N'Hỗ trợ dự án Tech-2026', 'Approved', @ApproverId, @ApproverId, GETUTCDATE(), GETUTCDATE()
FROM Employees e WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds);

-- 5. Cập nhật CheckOut muộn (Set-based)
-- Cập nhật bản ghi có sẵn
UPDATE t
SET t.Timestamp = DATETIMEFROMPARTS(2026, 4, 6, 19, 45, 0, 0)
FROM TimeAttendanceRecords t
JOIN Employees e ON t.EmployeeId = e.Id
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds) AND t.[Date] = @OtDate1 AND t.Type = 'CheckOut';

UPDATE t
SET t.Timestamp = DATETIMEFROMPARTS(2026, 4, 15, 21, 10, 0, 0)
FROM TimeAttendanceRecords t
JOIN Employees e ON t.EmployeeId = e.Id
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds) AND t.[Date] = @OtDate2 AND t.Type = 'CheckOut';

-- Chèn bản ghi thiếu
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], Timestamp, Type, WorkScheduleId, CreatedAt)
SELECT e.Id, @OtDate1, DATETIMEFROMPARTS(2026, 4, 6, 19, 45, 0, 0), 'CheckOut', ws.Id, GETUTCDATE()
FROM Employees e
JOIN WorkSchedules ws ON e.Id = ws.EmployeeId AND ws.WorkingDate = @OtDate1
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds)
AND NOT EXISTS (SELECT 1 FROM TimeAttendanceRecords t WHERE t.EmployeeId = e.Id AND t.[Date] = @OtDate1 AND t.Type = 'CheckOut');

INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], Timestamp, Type, WorkScheduleId, CreatedAt)
SELECT e.Id, @OtDate2, DATETIMEFROMPARTS(2026, 4, 15, 21, 10, 0, 0), 'CheckOut', ws.Id, GETUTCDATE()
FROM Employees e
JOIN WorkSchedules ws ON e.Id = ws.EmployeeId AND ws.WorkingDate = @OtDate2
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds)
AND NOT EXISTS (SELECT 1 FROM TimeAttendanceRecords t WHERE t.EmployeeId = e.Id AND t.[Date] = @OtDate2 AND t.Type = 'CheckOut');

COMMIT TRANSACTION;
GO
PRINT '✅ Đã hoàn tất thêm dữ liệu tăng ca 2.0h và 3.0h cho nhân viên HR.';
