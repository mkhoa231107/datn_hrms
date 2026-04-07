USE [HRMS_DATN];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- 1. Dọn sạch ID 7 (nếu còn rác)
IF EXISTS (SELECT 1 FROM Employees WHERE Id = 7)
BEGIN
    DELETE FROM TaskUpdates     WHERE JobAssignmentId IN (SELECT Id FROM JobAssignments WHERE EmployeeId = 7);
    DELETE FROM JobAssignments  WHERE EmployeeId = 7;
    DELETE FROM TimeAttendanceRecords   WHERE EmployeeId = 7;
    DELETE FROM TimeAdjustmentRequests  WHERE EmployeeId = 7;
    DELETE FROM LeaveRequests           WHERE EmployeeId = 7;
    DELETE FROM AttendanceSummaries     WHERE EmployeeId = 7;
    DELETE FROM EmployeeOvertimes       WHERE EmployeeId = 7;
    DELETE FROM PayrollRecords          WHERE EmployeeId = 7;
    DELETE FROM EmployeeContracts       WHERE EmployeeId = 7;
    UPDATE Departments SET ManagerId = NULL WHERE ManagerId = 7;
    DELETE FROM Employees WHERE Id = 7;
END

-- Xóa User cũ hr_rec_01 nếu tồn tại
DECLARE @OldUid INT;
SELECT @OldUid = Id FROM Users WHERE Username = 'hr_rec_01';
IF @OldUid IS NOT NULL
BEGIN
    DELETE FROM UserRoles WHERE UserId = @OldUid;
    UPDATE Employees SET UserId = NULL WHERE UserId = @OldUid;
    DELETE FROM Users WHERE Id = @OldUid;
END

-- 2. Tạo User tại ID 7
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (Id, Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
VALUES (7, 'hr_rec_01',
    '$2a$04$LwSz3kE5n1R5VpF1Y8GWFO3xh9dHQs3Z3qGVLBCjL3LqU3qDs3IpG',
    'hr_rec_01@techvn.com', N'Bùi Thu Hồng', 1, GETUTCDATE());
SET IDENTITY_INSERT Users OFF;

-- 3. Phân quyền DepartmentHead
DECLARE @RoleId INT;
SELECT @RoleId = Id FROM Roles WHERE RoleName = 'DepartmentHead';
INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt)
VALUES (7, @RoleId, GETUTCDATE(), GETUTCDATE());

-- 4. Lấy phòng ban Tuyển dụng
DECLARE @OrgId  INT; SELECT TOP 1 @OrgId  = Id FROM Organizations;
DECLARE @DeptId INT; SELECT TOP 1 @DeptId = Id FROM Departments WHERE DepartmentCode LIKE '%REC%';

-- Nếu chưa có phòng Tuyển dụng thì tạo mới
IF @DeptId IS NULL
BEGIN
    INSERT INTO Departments (DepartmentCode, DepartmentName, OrganizationId, IsActive, CreatedAt)
    VALUES ('HR-REC', N'Tổ Tuyển Dụng', @OrgId, 1, GETUTCDATE());
    SET @DeptId = SCOPE_IDENTITY();
END

DECLARE @PosId INT; SELECT TOP 1 @PosId = Id FROM Positions WHERE DepartmentId = @DeptId AND PositionCode LIKE '%HEAD%';
IF @PosId IS NULL
BEGIN
    INSERT INTO Positions (PositionCode, PositionName, DepartmentId, IsActive, CreatedAt)
    VALUES ('HR-REC-HEAD', N'Trưởng bộ phận Tuyển dụng', @DeptId, 1, GETUTCDATE());
    SET @PosId = SCOPE_IDENTITY();
END

-- 5. Tạo Employee tại ID 7
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(
    Id, EmployeeCode, FullName, DateOfBirth, Gender,
    IdentityNumber, IdentityDate, IdentityPlace,
    Email, PersonalEmail, Phone, Address,
    JoinDate, [Status], IsActive,
    OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
VALUES(
    7, 'HR-REC-01', N'Bùi Thu Hồng', '1993-04-15', N'Nữ',
    '001093004444', '2017-04-15', N'Hà Nội',
    'hr_rec_01@techvn.com', 'hongbt@techvn.com', '0977665544', N'Đống Đa, Hà Nội',
    GETUTCDATE(), 2, 1,
    @OrgId, @DeptId, @PosId, 7, GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;

-- 6. Cập nhật Manager của phòng ban
UPDATE Departments SET ManagerId = 7 WHERE Id = @DeptId;

-- 7. Tạo Hợp đồng
INSERT INTO EmployeeContracts(
    EmployeeId, ContractNumber, ContractType, StartDate,
    BasicSalary, JobDescription, WorkLocation,
    IsActive, Status, SignedBy, CreatedAt)
VALUES (
    7, 'HD-REC-01-2024', 1, '2024-01-01',
    18000000, N'Quản lý Tổ Tuyển Dụng', N'Hà Nội',
    1, 3, N'Giám đốc điều hành', GETUTCDATE());

EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';
COMMIT TRANSACTION;

PRINT '✅ Đã tạo hr_rec_01 (Bùi Thu Hồng) tại User ID=7, Employee ID=7 thành công.';
PRINT '   Tài khoản: hr_rec_01 / 123456';
