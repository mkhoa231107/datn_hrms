USE [HRMS_DATN];
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- Ngắt kiểm tra khóa ngoại (FK) tạm thời để dễ dàng dịch chuyển dữ liệu
EXEC sp_msforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL';

-- 1. Lọc thông tin gốc
DECLARE @OrgId INT; SELECT @OrgId = Id FROM Organizations WHERE OrganizationCode = 'TECHVN';
DECLARE @CbDeptId INT; SELECT @CbDeptId = Id FROM Departments WHERE DepartmentCode = 'HR-CB';
DECLARE @CbHeadPosId INT; SELECT @CbHeadPosId = Id FROM Positions WHERE PositionCode = 'HR-CB-HEAD';
DECLARE @CbUserId INT; SELECT @CbUserId = Id FROM Users WHERE Username = 'hr_cb_01';

-- 2. Dọn sạch dữ liệu cũ hr_cb_01 nếu vô tình ở sai ID
DECLARE @oldId INT;
SELECT @oldId = Id FROM Employees WHERE EmployeeCode = 'HR-CB-01';
IF @oldId IS NOT NULL
BEGIN
    DECLARE @TablesDel TABLE (TableName NVARCHAR(256), SchemaName NVARCHAR(256));
    INSERT INTO @TablesDel SELECT t.name, s.name FROM sys.tables t JOIN sys.columns c ON t.object_id = c.object_id JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE c.name = 'EmployeeId' AND t.name != 'Employees' AND t.type = 'U';
    
    DECLARE @sqlDel NVARCHAR(MAX) = '';
    SELECT @sqlDel = @sqlDel + 'DELETE FROM [' + SchemaName + '].[' + TableName + '] WHERE EmployeeId = ' + CAST(@oldId AS NVARCHAR(10)) + ';' FROM @TablesDel;
    EXEC sp_executesql @sqlDel;
    
    UPDATE Departments SET ManagerId = NULL WHERE ManagerId = @oldId;
    UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId = @oldId;
    UPDATE TimeAdjustmentRequests SET ApproverId = NULL WHERE ApproverId = @oldId;
    
    DELETE FROM Employees WHERE Id = @oldId;
END

-- 3. Dịch chuyển toàn bộ Nhân viên có ID >= 19 và các bảng con liên kết xuống +1
IF EXISTS (SELECT 1 FROM Employees WHERE Id >= 19)
BEGIN
    -- Dịch ID của toàn bộ bảng bị trỏ (khóa ngoại trỏ vào EmployeeId) thay vì xóa
    DECLARE @Tables TABLE (TableName NVARCHAR(256), SchemaName NVARCHAR(256));
    INSERT INTO @Tables SELECT t.name, s.name FROM sys.tables t JOIN sys.columns c ON t.object_id = c.object_id JOIN sys.schemas s ON t.schema_id = s.schema_id WHERE c.name = 'EmployeeId' AND t.name != 'Employees' AND t.type = 'U';
    
    DECLARE @sqlShift NVARCHAR(MAX) = '';
    SELECT @sqlShift = @sqlShift + 'UPDATE [' + SchemaName + '].[' + TableName + '] SET EmployeeId = EmployeeId + 1 WHERE EmployeeId >= 19;' FROM @Tables;
    EXEC sp_executesql @sqlShift;
    
    -- Dịch các ForeignKey chỉ định vào Employees (như ManagerId, ApproverId)
    UPDATE Departments SET ManagerId = ManagerId + 1 WHERE ManagerId >= 19;
    UPDATE LeaveRequests SET ApproverId = ApproverId + 1 WHERE ApproverId >= 19;
    UPDATE TimeAdjustmentRequests SET ApproverId = ApproverId + 1 WHERE ApproverId >= 19;

    -- Dịch chính Employees (xóa ra, tăng ID lên 1 rồi ghi lại)
    SELECT * INTO #TempEmps FROM Employees WHERE Id >= 19;
    UPDATE #TempEmps SET Id = Id + 1;
    
    DELETE FROM Employees WHERE Id >= 19;
    SET IDENTITY_INSERT Employees ON;
    INSERT INTO Employees (Id, EmployeeCode, FullName, DateOfBirth, Gender, Email, Phone, Address, JoinDate, [Status], IsActive, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt, PersonalEmail)
    SELECT Id, EmployeeCode, FullName, DateOfBirth, Gender, Email, Phone, Address, JoinDate, [Status], 1, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt, PersonalEmail FROM #TempEmps;
    SET IDENTITY_INSERT Employees OFF;
    
    DROP TABLE #TempEmps;
END

-- 4. Tạo tài khoản User cho HR_CB_01 (nếu chưa có)
IF @CbUserId IS NULL
BEGIN
    INSERT INTO Users(Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
    VALUES ('hr_cb_01', '$2a$11$q9h6qV3W6R7vYV7X8Pq7O.6rFp5Vv.g7B0M4p5k6p5u.6rFp5Vv.', 'hr_cb_01@techvn.com', N'Lê Thị Thảo', 1, GETUTCDATE());
    SET @CbUserId = SCOPE_IDENTITY();
END

IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @CbUserId)
BEGIN
    DECLARE @dhRoleId INT; SELECT @dhRoleId = Id FROM Roles WHERE RoleName = 'DepartmentHead';
    INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt) VALUES (@CbUserId, @dhRoleId, GETUTCDATE(), GETUTCDATE());
END

-- 5. Chèn chính xác nhân viên hr_cb_01 vào ID 19
SET IDENTITY_INSERT Employees ON;
INSERT INTO Employees(Id, EmployeeCode, FullName, DateOfBirth, Gender, IdentityNumber, IdentityDate, IdentityPlace, Email, PersonalEmail, Phone, Address, JoinDate, [Status], IsActive, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
VALUES(19, 'HR-CB-01', N'Lê Thị Thảo', '1990-05-12', N'Nữ', '001090012345', '2015-05-12', N'Cục Cảnh sát QLHC về TTXH', 'hr_cb_01@techvn.com', 'thaolt@techvn.com', '0912345678', N'Hà Nội', GETUTCDATE(), 1, 1, @OrgId, @CbDeptId, @CbHeadPosId, @CbUserId, GETUTCDATE());
SET IDENTITY_INSERT Employees OFF;

UPDATE Departments SET ManagerId = 19 WHERE Id = @CbDeptId;

-- Phục hồi lại kiểm tra khóa ngoại để database an toàn
EXEC sp_msforeachtable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL';

COMMIT TRANSACTION;
GO
PRINT '=== RESTORED HR-CB-01 AT ID 19 AND SHIFTED OTHERS SAFELY (FKs PRESERVED) ===';
