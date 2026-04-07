USE [HRMS_DATN];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Ngắt kiểm tra khóa ngoại để dọn dẹp dễ dàng
EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- =========================================================================
-- 1. XÓA SẠCH ID 7 (Nếu có) VÀ TẠO TÀI KHOẢN hr_rec_01 CHUẨN XÁC
-- =========================================================================
DECLARE @OldUserId INT;
SELECT @OldUserId = Id FROM Users WHERE Username = 'hr_rec_01';

IF EXISTS (SELECT 1 FROM Employees WHERE Id = 7)
BEGIN
    DELETE FROM TaskUpdates WHERE JobAssignmentId IN (SELECT Id FROM JobAssignments WHERE EmployeeId = 7);
    DELETE FROM JobAssignments WHERE EmployeeId = 7;
    DELETE FROM TimeAttendanceRecords WHERE EmployeeId = 7;
    DELETE FROM TimeAdjustmentRequests WHERE EmployeeId = 7;
    DELETE FROM LeaveRequests WHERE EmployeeId = 7;
    DELETE FROM AttendanceSummaries WHERE EmployeeId = 7;
    DELETE FROM EmployeeOvertimes WHERE EmployeeId = 7;
    DELETE FROM PayrollRecords WHERE EmployeeId = 7;
    DELETE FROM EmployeeContracts WHERE EmployeeId = 7;
    
    UPDATE Departments SET ManagerId = NULL WHERE ManagerId = 7;
    UPDATE Employees SET ManagerId = NULL WHERE ManagerId = 7;
    DELETE FROM Employees WHERE Id = 7;
END

IF @OldUserId IS NOT NULL
BEGIN
    DELETE FROM UserRoles WHERE UserId = @OldUserId;
    UPDATE Employees SET UserId = NULL WHERE UserId = @OldUserId;
    DELETE FROM Users WHERE Id = @OldUserId;
END

-- Đảm bảo có phòng Tuyển Dụng chuẩn
DECLARE @OrgId INT; SELECT TOP 1 @OrgId = Id FROM Organizations;
DECLARE @RecDeptId INT; SELECT TOP 1 @RecDeptId = Id FROM Departments WHERE DepartmentCode LIKE '%REC%';
IF @RecDeptId IS NULL 
BEGIN
    INSERT INTO Departments (DepartmentCode, DepartmentName, OrganizationId, IsActive, CreatedAt)
    VALUES ('HR-REC', N'Tổ Tuyển Dụng', @OrgId, 1, GETUTCDATE());
    SET @RecDeptId = SCOPE_IDENTITY();
END

DECLARE @RecPosId INT; SELECT TOP 1 @RecPosId = Id FROM Positions WHERE PositionCode LIKE '%REC%';
IF @RecPosId IS NULL 
BEGIN
    INSERT INTO Positions (PositionCode, PositionName, DepartmentId, IsActive, CreatedAt)
    VALUES ('REC-HEAD', N'Trưởng bộ phận Tuyển dụng', @RecDeptId, 1, GETUTCDATE());
    SET @RecPosId = SCOPE_IDENTITY();
END

-- Tạo User: hr_rec_01 tại đúng ID 7
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (Id, Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
VALUES (7, 'hr_rec_01', '$2a$11$q9h6qV3W6R7vYV7X8Pq7O.6rFp5Vv.g7B0M4p5k6p5u.6rFp5Vv.', 'hr_rec_01@techvn.com', N'Bùi Thu Hồng', 1, GETUTCDATE());
SET IDENTITY_INSERT Users OFF;
DECLARE @NewUserId INT = 7;

-- Phân quyền Trưởng bộ phận
DECLARE @RoleHeadId INT; SELECT TOP 1 @RoleHeadId = Id FROM Roles WHERE RoleName = 'DepartmentHead';
IF @RoleHeadId IS NOT NULL
    INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt) VALUES (@NewUserId, @RoleHeadId, GETUTCDATE(), GETUTCDATE());

-- Chèn cứng ID 7 vào Employees (IsActive = 1)
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(Id, EmployeeCode, FullName, DateOfBirth, Gender, IdentityNumber, IdentityDate, IdentityPlace, Email, PersonalEmail, Phone, Address, JoinDate, [Status], IsActive, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
VALUES(7, 'HR-REC-01', N'Bùi Thu Hồng', '1994-05-20', N'Nữ', '001094009999', '2016-05-20', N'TP Hà Nội', 'hr_rec_01@techvn.com', 'hongbt_rec@techvn.com', '0988776655', N'Cầu Giấy, Hà Nội', GETUTCDATE(), 1, 1, @OrgId, @RecDeptId, @RecPosId, @NewUserId, GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;

UPDATE Departments SET ManagerId = 7 WHERE Id = @RecDeptId;

-- Tạo hợp đồng cho ID 7 để khi tính lương không bị bỏ qua
INSERT INTO EmployeeContracts (EmployeeId, ContractNumber, ContractType, StartDate, BasicSalary, JobDescription, WorkLocation, IsActive, Status, SignedBy, CreatedAt)
VALUES (7, 'HD-REC-2024-001', 1, '2024-01-01', 25000000, N'Quản lý tuyển dụng', N'Hà Nội', 1, 3, N'Giám đốc điều hành', GETUTCDATE());

-- =========================================================================
-- 2. TẠO LỊCH CÔNG & DỮ LIỆU TĂNG CA (MẪU THÁNG 3/2026) ĐỂ TEST CHỐT CÔNG
-- =========================================================================
DECLARE @StartDate DATE = '2026-03-01';
DECLARE @EndDate DATE = '2026-03-31';

-- Lấy ca Hành chính
DECLARE @HcShiftId INT;
SELECT TOP 1 @HcShiftId = Id FROM WorkShifts WHERE ShiftCode = 'HC';

-- Lấy Kỳ công tháng 3/2026
DECLARE @PeriodId INT;
SELECT TOP 1 @PeriodId = Id FROM SchedulePeriods WHERE StartDate <= @StartDate AND EndDate >= @EndDate;
IF @PeriodId IS NULL
BEGIN
    INSERT INTO SchedulePeriods (PeriodName, StartDate, EndDate, IsLocked, OrganizationId, CreatedAt) VALUES (N'Kỳ công tháng 3/2026', '2026-03-01', '2026-03-31', 0, @OrgId, GETUTCDATE());
    SET @PeriodId = SCOPE_IDENTITY();
END

-- Xóa dữ liệu cũ của nhân viên phòng Tuyển dụng (tránh trùng)
DELETE FROM TimeAttendanceRecords WHERE EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId = @RecDeptId);
DELETE FROM EmployeeOvertimes WHERE EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId = @RecDeptId);
DELETE FROM OvertimeRequests WHERE DepartmentId = @RecDeptId;
DELETE FROM WorkSchedules WHERE PeriodId = @PeriodId AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId = @RecDeptId);
DELETE FROM AttendanceSummaries WHERE PeriodId = @PeriodId AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId = @RecDeptId);

-- Thêm Lịch Làm Việc (Thứ 2 đến Thứ 6)
INSERT INTO WorkSchedules (EmployeeId, WorkingDate, WorkShiftId, PeriodId, Note, CreatedAt, UpdatedAt)
SELECT e.Id, d.DateVal, @HcShiftId, @PeriodId, N'Lịch ca hành chính', GETUTCDATE(), GETUTCDATE()
FROM Employees e
CROSS JOIN (
    SELECT DATEADD(day, number, @StartDate) AS DateVal FROM master.dbo.spt_values WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
) d
WHERE e.DepartmentId = @RecDeptId AND DATEPART(dw, d.DateVal) NOT IN (1, 7);

-- Tạo CheckIn lúc 8:00
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt, WorkScheduleId)
SELECT e.Id, d.DateVal, DATEADD(hour, 8, CAST(d.DateVal AS DATETIME)), 'CheckIn', N'Văn phòng - REC', 'Máy SQL', GETUTCDATE(), ws.Id
FROM Employees e
JOIN WorkSchedules ws ON ws.EmployeeId = e.Id
CROSS JOIN (
    SELECT DATEADD(day, number, @StartDate) AS DateVal FROM master.dbo.spt_values WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
) d
WHERE e.DepartmentId = @RecDeptId AND ws.WorkingDate = d.DateVal AND DATEPART(dw, d.DateVal) NOT IN (1, 7);

-- Tạo CheckOut lúc 17:00 (chuẩn giờ)
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt, WorkScheduleId)
SELECT e.Id, d.DateVal, DATEADD(hour, 17, CAST(d.DateVal AS DATETIME)), 'CheckOut', N'Văn phòng - REC', 'Máy SQL', GETUTCDATE(), ws.Id
FROM Employees e
JOIN WorkSchedules ws ON ws.EmployeeId = e.Id
CROSS JOIN (
    SELECT DATEADD(day, number, @StartDate) AS DateVal FROM master.dbo.spt_values WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
) d
WHERE e.DepartmentId = @RecDeptId AND ws.WorkingDate = d.DateVal AND DATEPART(dw, d.DateVal) NOT IN (1, 7);

-- =========================================================================
-- 3. CẮM TĂNG CA CHO 3 NGÀY MẪU (TEST OVERTIME)
-- =========================================================================
DECLARE @OtDay1 DATE = '2026-03-10';
DECLARE @OtDay2 DATE = '2026-03-12';
DECLARE @OtDay3 DATE = '2026-03-16';

-- Request 1
INSERT INTO OvertimeRequests (Date, StartTime, EndTime, Reason, Status, DepartmentId, CreatedById, CreatedAt)
VALUES (@OtDay1, '17:30:00', '19:30:00', N'Chạy chiến dịch KPI Tuyển Dụng', 'Scheduled', @RecDeptId, 7, GETUTCDATE());
DECLARE @OtReq1 INT = SCOPE_IDENTITY();

-- Request 2
INSERT INTO OvertimeRequests (Date, StartTime, EndTime, Reason, Status, DepartmentId, CreatedById, CreatedAt)
VALUES (@OtDay2, '17:30:00', '19:00:00', N'Phỏng vấn ca muộn', 'Scheduled', @RecDeptId, 7, GETUTCDATE());
DECLARE @OtReq2 INT = SCOPE_IDENTITY();

-- Request 3
INSERT INTO OvertimeRequests (Date, StartTime, EndTime, Reason, Status, DepartmentId, CreatedById, CreatedAt)
VALUES (@OtDay3, '18:00:00', '21:00:00', N'Thiết lập hệ thống onboard', 'Scheduled', @RecDeptId, 7, GETUTCDATE());
DECLARE @OtReq3 INT = SCOPE_IDENTITY();

-- Map nhân viên phòng REC vào 3 đợt tăng ca này
INSERT INTO EmployeeOvertimes (EmployeeId, OvertimeRequestId)
SELECT Id, @OtReq1 FROM Employees WHERE DepartmentId = @RecDeptId;
INSERT INTO EmployeeOvertimes (EmployeeId, OvertimeRequestId)
SELECT Id, @OtReq2 FROM Employees WHERE DepartmentId = @RecDeptId;
INSERT INTO EmployeeOvertimes (EmployeeId, OvertimeRequestId)
SELECT Id, @OtReq3 FROM Employees WHERE DepartmentId = @RecDeptId;

-- Bật lại FK Constraint
EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

COMMIT TRANSACTION;
GO
PRINT '✅ HOÀN TẤT. Đã khôi phục hr_rec_01 ở ID 7 và bơm dữ liệu công & tăng ca phòng nhân sự tháng 3/2026.';
