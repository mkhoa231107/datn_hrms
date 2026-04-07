USE [HRMS_DATN];
GO

PRINT '🛠️ Fixing Admin Department & Position...';

-- 1. Ensure ADM Department exists
DECLARE @OrgId INT;
SELECT @OrgId = Id FROM Organizations WHERE OrganizationCode = 'TECHVN';

DECLARE @AdmDeptId INT;
SELECT @AdmDeptId = Id FROM Departments WHERE DepartmentCode = 'ADM';

IF @AdmDeptId IS NULL
BEGIN
    INSERT INTO Departments (DepartmentName, DepartmentCode, Description, OrganizationId, IsActive, CreatedAt)
    VALUES (N'Quản trị viên', 'ADM', N'Bộ phận quản trị hệ thống', @OrgId, 1, GETUTCDATE());
    SET @AdmDeptId = SCOPE_IDENTITY();
    PRINT '  + Created ADM Department (ID: ' + CAST(@AdmDeptId AS NVARCHAR) + ')';
END
ELSE
BEGIN
    PRINT '  - ADM Department already exists (ID: ' + CAST(@AdmDeptId AS NVARCHAR) + ')';
END

-- 2. Ensure ADM-SYS Position exists
DECLARE @AdmPosId INT;
SELECT @AdmPosId = Id FROM Positions WHERE PositionCode = 'ADM-SYS';

IF @AdmPosId IS NULL
BEGIN
    INSERT INTO Positions (PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Quản trị hệ thống', 'ADM-SYS', 1, @AdmDeptId, 1, GETUTCDATE());
    SET @AdmPosId = SCOPE_IDENTITY();
    PRINT '  + Created ADM-SYS Position (ID: ' + CAST(@AdmPosId AS NVARCHAR) + ')';
END
ELSE
BEGIN
    PRINT '  - ADM-SYS Position already exists (ID: ' + CAST(@AdmPosId AS NVARCHAR) + ')';
END

-- 3. Update Admin Employee
IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeCode = 'EMP-ADMIN')
BEGIN
    UPDATE Employees 
    SET DepartmentId = @AdmDeptId, 
        PositionId = @AdmPosId,
        UpdatedAt = GETUTCDATE()
    WHERE EmployeeCode = 'EMP-ADMIN';
    PRINT '  ✅ Updated EMP-ADMIN department and position.';
END
ELSE IF EXISTS (SELECT 1 FROM Employees WHERE EmployeeCode = 'ADMIN_01')
BEGIN
    UPDATE Employees 
    SET DepartmentId = @AdmDeptId, 
        PositionId = @AdmPosId,
        UpdatedAt = GETUTCDATE()
    WHERE EmployeeCode = 'ADMIN_01';
    PRINT '  ✅ Updated ADMIN_01 department and position.';
END
ELSE
BEGIN
    PRINT '  ⚠️ Admin employee record not found by common codes (EMP-ADMIN or ADMIN_01).';
END

GO
PRINT '✅ DONE.';
