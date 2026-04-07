USE [HRMS_DATN];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

PRINT 'Adding sample OT hours for HR department employees (Approved)...';

-- 1. Tìm các phòng ban HR
DECLARE @HrDeptIds TABLE (Id INT);
INSERT INTO @HrDeptIds (Id)
SELECT Id FROM Departments WHERE (DepartmentName LIKE N'%Nhân sự%' OR DepartmentName LIKE N'%Tuyển dụng%');

-- 2. Tìm người duyệt (ManagerId của HR hoặc ID 7)
DECLARE @ApproverId INT;
SELECT TOP 1 @ApproverId = ManagerId FROM Departments WHERE Id IN (SELECT Id FROM @HrDeptIds) AND ManagerId IS NOT NULL;
IF @ApproverId IS NULL SET @ApproverId = 7;

-- 3. Xoá bỏ các đơn OT cũ của HR trong tháng 4 để tránh trùng
DELETE FROM OvertimeRequests 
WHERE [Date] >= '2026-04-01' 
  AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (SELECT Id FROM @HrDeptIds));

-- 4. Tạo 2 kịch bản OT Approved cho TẤT CẢ nhân viên HR
DECLARE @OtDay1 DATE = '2026-04-06';
DECLARE @OtDay2 DATE = '2026-04-15';

-- Đợt 1: 2 tiếng (17:30 - 19:30)
INSERT INTO OvertimeRequests (EmployeeId, DepartmentId, [Date], StartTime, EndTime, Reason, [Status], CreatedById, ApprovedById, ApprovedAt, CreatedAt)
SELECT e.Id, e.DepartmentId, @OtDay1, '17:30:00', '19:30:00', N'Tăng ca xử lý hồ sơ nhân viên mới', 'Approved', @ApproverId, @ApproverId, GETUTCDATE(), GETUTCDATE()
FROM Employees e WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds);

-- Đợt 2: 3 tiếng (18:00 - 21:00)
INSERT INTO OvertimeRequests (EmployeeId, DepartmentId, [Date], StartTime, EndTime, Reason, [Status], CreatedById, ApprovedById, ApprovedAt, CreatedAt)
SELECT e.Id, e.DepartmentId, @OtDay2, '18:00:00', '21:00:00', N'Hỗ trợ dự án Tech-2026', 'Approved', @ApproverId, @ApproverId, GETUTCDATE(), GETUTCDATE()
FROM Employees e WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds);

-- 5. Cập nhật CheckOut muộn để hệ thống ghi nhận OT thực tế
-- Ngày 1: CheckOut lúc 19:40
UPDATE t SET t.Timestamp = DATETIMEFROMPARTS(2026, 4, 6, 19, 40, 0, 0)
FROM TimeAttendanceRecords t JOIN Employees e ON t.EmployeeId = e.Id
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds) AND t.[Date] = @OtDay1 AND t.Type = 'CheckOut';

INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], Timestamp, Type, WorkScheduleId, CreatedAt)
SELECT e.Id, @OtDay1, DATETIMEFROMPARTS(2026, 4, 6, 19, 40, 0, 0), 'CheckOut', ws.Id, GETUTCDATE()
FROM Employees e JOIN WorkSchedules ws ON e.Id = ws.EmployeeId AND ws.WorkingDate = @OtDay1
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds)
AND NOT EXISTS (SELECT 1 FROM TimeAttendanceRecords t WHERE t.EmployeeId = e.Id AND t.[Date] = @OtDate1 AND t.Type = 'CheckOut');

-- Ngày 2: CheckOut lúc 21:15
UPDATE t SET t.Timestamp = DATETIMEFROMPARTS(2026, 4, 15, 21, 15, 0, 0)
FROM TimeAttendanceRecords t JOIN Employees e ON t.EmployeeId = e.Id
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds) AND t.[Date] = @OtDay2 AND t.Type = 'CheckOut';

INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], Timestamp, Type, WorkScheduleId, CreatedAt)
SELECT e.Id, @OtDay2, DATETIMEFROMPARTS(2026, 4, 15, 21, 15, 0, 0), 'CheckOut', ws.Id, GETUTCDATE()
FROM Employees e JOIN WorkSchedules ws ON e.Id = ws.EmployeeId AND ws.WorkingDate = @OtDay2
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds)
AND NOT EXISTS (SELECT 1 FROM TimeAttendanceRecords t WHERE t.EmployeeId = e.Id AND t.[Date] = @OtDate2 AND t.Type = 'CheckOut');

COMMIT TRANSACTION;
GO
PRINT '✅ Đã thêm dữ liệu OT mẫu (2h và 3h) cho nhân viên HR.';
PRINT 'Hãy bấm [TỔNG HỢP DỮ LIỆU] để xem kết quả.';
