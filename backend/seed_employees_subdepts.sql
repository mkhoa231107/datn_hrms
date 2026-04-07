-- ============================================================
-- COMPLETE RESEED: Xoa sach + Tao lai toan bo nhan vien
-- Cau truc moi:
--   1 Admin
--   5 Truong phong (DepartmentManager) - 1/phong ban
--   10 Truong bo phan (DepartmentHead) - 1/bo phan
--   100 Nhan vien (Employee) - 10/bo phan
--   Tong: 116 tai khoan
--   Xoa role CnbSpecialist
-- ============================================================
USE [HRMS_DATN];
GO
SET QUOTED_IDENTIFIER ON;
GO

-- ============================================================
-- BUOC 0: XOA SACH DU LIEU CU
-- Thu tu: FK dependencies truoc
-- ============================================================
PRINT '=== CLEANUP BAT DAU ===';

-- Xoa Leave data
DELETE FROM LeaveBalances;
DELETE FROM LeaveRequests;
PRINT '  Xoa LeaveBalances, LeaveRequests';

-- Xoa Attendance data
DELETE FROM TimeAdjustmentRequests;
DELETE FROM AttendanceSummaries;
DELETE FROM TimeAttendanceRecords;
PRINT '  Xoa Attendance data';

-- Xoa Schedule data
DELETE FROM WorkSchedules;
PRINT '  Xoa WorkSchedules';

-- Xoa Task/Job data
DELETE FROM TaskUpdates;
DELETE FROM JobAssignments;
PRINT '  Xoa TaskUpdates, JobAssignments';

-- Xoa Employee related
DELETE FROM EmployeeBankAccounts;
DELETE FROM EmployeeContracts;
DELETE FROM EmployeeEmergencyContacts;
PRINT '  Xoa BankAccounts, Contracts, EmergencyContacts';

-- Xoa EmployeeDocuments (bang moi)
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='EmployeeDocuments')
BEGIN
    DELETE FROM EmployeeDocuments;
    PRINT '  Xoa EmployeeDocuments';
END

-- Reset ManagerId trong Departments
UPDATE Departments SET ManagerId = NULL;
PRINT '  Reset ManagerId';

-- Xoa Employees
DELETE FROM Employees;
PRINT '  Xoa Employees';

-- Xoa UserRoles va Users
DELETE FROM UserRoles;
DELETE FROM AuditLogs;
DELETE FROM Users;
PRINT '  Xoa UserRoles, AuditLogs, Users';

-- Xoa Positions
DELETE FROM Positions;
PRINT '  Xoa Positions';

-- Xoa role CnbSpecialist
IF EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'CnbSpecialist')
BEGIN
    DELETE FROM RolePermissions WHERE RoleId = (SELECT Id FROM Roles WHERE RoleName = 'CnbSpecialist');
    DELETE FROM Roles WHERE RoleName = 'CnbSpecialist';
    PRINT '  Xoa role CnbSpecialist';
END

-- Reset IDENTITY seeds
DBCC CHECKIDENT ('Users', RESEED, 0);
DBCC CHECKIDENT ('Employees', RESEED, 0);
DBCC CHECKIDENT ('Positions', RESEED, 0);
DBCC CHECKIDENT ('EmployeeContracts', RESEED, 0);
DBCC CHECKIDENT ('EmployeeBankAccounts', RESEED, 0);

PRINT '=== CLEANUP HOAN TAT ===';
GO

-- ============================================================
-- BUOC 1: LAY CAC ID CAN THIET
-- ============================================================
DECLARE @PwHash NVARCHAR(255) = '$2a$04$LwSz3kE5n1R5VpF1Y8GWFO3xh9dHQs3Z3qGVLBCjL3LqU3qDs3IpG';
-- (BCrypt hash cua "123456" voi workFactor=4, tuong thich voi backend)

DECLARE @OrgId INT;
SELECT @OrgId = Id FROM Organizations WHERE OrganizationCode = 'TECHVN';

DECLARE @AdminRoleId INT, @MgrRoleId INT, @DeptHeadRoleId INT, @EmpRoleId INT;
SELECT @AdminRoleId    = Id FROM Roles WHERE RoleName = 'Admin';
SELECT @MgrRoleId      = Id FROM Roles WHERE RoleName = 'DepartmentManager';
SELECT @DeptHeadRoleId = Id FROM Roles WHERE RoleName = 'DepartmentHead';
SELECT @EmpRoleId      = Id FROM Roles WHERE RoleName = 'Employee';

PRINT 'OrgId=' + CAST(@OrgId AS NVARCHAR)
    + ' | Admin=' + CAST(@AdminRoleId AS NVARCHAR)
    + ' | Mgr=' + CAST(@MgrRoleId AS NVARCHAR)
    + ' | DeptHead=' + CAST(@DeptHeadRoleId AS NVARCHAR)
    + ' | Emp=' + CAST(@EmpRoleId AS NVARCHAR);

-- ============================================================
-- BANG TEN VIET NAM (120 ten)
-- ============================================================
DECLARE @Names TABLE (Idx INT IDENTITY(1,1), FName NVARCHAR(50));
INSERT @Names(FName) VALUES
(N'An'),(N'Bình'),(N'Cường'),(N'Dũng'),(N'Giang'),
(N'Hải'),(N'Hoa'),(N'Hùng'),(N'Khoa'),(N'Lan'),
(N'Linh'),(N'Long'),(N'Mai'),(N'Nam'),(N'Nga'),
(N'Ngọc'),(N'Nhung'),(N'Phong'),(N'Phương'),(N'Quân'),
(N'Sơn'),(N'Tài'),(N'Thắng'),(N'Thu'),(N'Toàn'),
(N'Tuấn'),(N'Xuân'),(N'Yến'),(N'Đức'),(N'Hằng'),
(N'Tâm'),(N'Hạnh'),(N'Khánh'),(N'Minh'),(N'Thanh'),
(N'Thị'),(N'Vân'),(N'Việt'),(N'Diệp'),(N'Loan'),
(N'Trung'),(N'Hiếu'),(N'Duy'),(N'Hoàng'),(N'Quang'),
(N'Nhi'),(N'Trang'),(N'Thảo'),(N'Hương'),(N'Đạt'),
(N'Anh'),(N'Bảo'),(N'Chi'),(N'Đan'),(N'Gia'),
(N'Hà'),(N'Khang'),(N'Lâm'),(N'My'),(N'Ngân'),
(N'Oanh'),(N'Phú'),(N'Quyên'),(N'Sang'),(N'Thiên'),
(N'Uyên'),(N'Vinh'),(N'Vy'),(N'Bách'),(N'Cẩm'),
(N'Đào'),(N'Kim'),(N'Liên'),(N'Nghĩa'),(N'Phát'),
(N'Quốc'),(N'Sương'),(N'Thủy'),(N'Út'),(N'Vương'),
(N'Đông'),(N'Hiền'),(N'Lợi'),(N'Mận'),(N'Nhựt'),
(N'Phúc'),(N'Rằng'),(N'Sinh'),(N'Tiến'),(N'Vi'),
(N'Xanh'),(N'Bích'),(N'Cúc'),(N'Lộc'),(N'Huy'),
(N'Kiệt'),(N'Hào'),(N'Trinh'),(N'Thông'),(N'Trâm'),
(N'Tú'),(N'Nhân'),(N'Thành'),(N'Dương'),(N'Lệ'),
(N'Hồng'),(N'Phượng'),(N'Trọng'),(N'Hiệp'),(N'Khôi'),
(N'Mỹ'),(N'Tuyết'),(N'Cảnh'),(N'Tuệ'),(N'Long2'),
(N'Bắc'),(N'Doanh'),(N'Hảo'),(N'Lực'),(N'Tín');

DECLARE @NameCount INT = (SELECT COUNT(*) FROM @Names);
DECLARE @NameIdx INT = 0;

-- ============================================================
-- HELPER: Tao 1 account (User + Role + Employee + Contract + Bank)
-- ============================================================
-- Su dung bang tam de luu ket qua
DECLARE @CreatedAccounts TABLE (
    Username NVARCHAR(100),
    EmpCode NVARCHAR(100),
    EmpId INT,
    DeptId INT,
    RoleName NVARCHAR(50)
);

-- ============================================================
-- BUOC 2: TAO POSITIONS CHO 5 PHONG BAN + 10 BO PHAN
-- ============================================================
PRINT '';
PRINT '=== TAO POSITIONS ===';

-- Positions cho 5 phong ban cha
DECLARE @ParentDepts TABLE (DeptId INT, DeptCode NVARCHAR(50), DeptName NVARCHAR(200));
INSERT @ParentDepts SELECT Id, DepartmentCode, DepartmentName FROM Departments WHERE ParentDepartmentId IS NULL;

DECLARE @pd_id INT, @pd_code NVARCHAR(50), @pd_name NVARCHAR(200);
DECLARE pd_cur CURSOR FOR SELECT DeptId, DeptCode, DeptName FROM @ParentDepts;
OPEN pd_cur;
FETCH NEXT FROM pd_cur INTO @pd_id, @pd_code, @pd_name;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT INTO Positions(PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Trưởng phòng ' + @pd_name, @pd_code + '-DIR', 1, @pd_id, 1, GETUTCDATE());
    PRINT '  + ' + @pd_code + '-DIR';

    FETCH NEXT FROM pd_cur INTO @pd_id, @pd_code, @pd_name;
END
CLOSE pd_cur; DEALLOCATE pd_cur;

-- Positions cho 10 bo phan con
DECLARE @SubDepts TABLE (DeptId INT, DeptCode NVARCHAR(50), DeptName NVARCHAR(200), ParentId INT);
INSERT @SubDepts SELECT Id, DepartmentCode, DepartmentName, ParentDepartmentId FROM Departments WHERE ParentDepartmentId IS NOT NULL;

DECLARE @sd_id INT, @sd_code NVARCHAR(50), @sd_name NVARCHAR(200), @sd_pid INT;
DECLARE sd_cur CURSOR FOR SELECT DeptId, DeptCode, DeptName, ParentId FROM @SubDepts ORDER BY DeptId;
OPEN sd_cur;
FETCH NEXT FROM sd_cur INTO @sd_id, @sd_code, @sd_name, @sd_pid;
WHILE @@FETCH_STATUS = 0
BEGIN
    INSERT INTO Positions(PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Trưởng bộ phận ' + @sd_name, @sd_code + '-HEAD', 1, @sd_id, 1, GETUTCDATE());
    INSERT INTO Positions(PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Nhân viên ' + @sd_name, @sd_code + '-EMP', 3, @sd_id, 1, GETUTCDATE());
    PRINT '  + ' + @sd_code + '-HEAD, ' + @sd_code + '-EMP';

    FETCH NEXT FROM sd_cur INTO @sd_id, @sd_code, @sd_name, @sd_pid;
END
CLOSE sd_cur; DEALLOCATE sd_cur;
GO

-- ============================================================
-- BUOC 3: TAO TAI KHOAN
-- ============================================================
-- Re-declare needed vars (new batch after GO)
DECLARE @PwHash NVARCHAR(255) = '$2a$04$LwSz3kE5n1R5VpF1Y8GWFO3xh9dHQs3Z3qGVLBCjL3LqU3qDs3IpG';
DECLARE @OrgId INT; SELECT @OrgId = Id FROM Organizations WHERE OrganizationCode = 'TECHVN';
DECLARE @AdminRoleId INT; SELECT @AdminRoleId = Id FROM Roles WHERE RoleName = 'Admin';
DECLARE @MgrRoleId INT; SELECT @MgrRoleId = Id FROM Roles WHERE RoleName = 'DepartmentManager';
DECLARE @DeptHeadRoleId INT; SELECT @DeptHeadRoleId = Id FROM Roles WHERE RoleName = 'DepartmentHead';
DECLARE @EmpRoleId INT; SELECT @EmpRoleId = Id FROM Roles WHERE RoleName = 'Employee';
DECLARE @HrAdminRoleId INT; SELECT @HrAdminRoleId = Id FROM Roles WHERE RoleName = 'HrAdmin';

DECLARE @Names TABLE (Idx INT IDENTITY(1,1), FName NVARCHAR(50));
INSERT @Names(FName) VALUES
(N'An'),(N'Bình'),(N'Cường'),(N'Dũng'),(N'Giang'),
(N'Hải'),(N'Hoa'),(N'Hùng'),(N'Khoa'),(N'Lan'),
(N'Linh'),(N'Long'),(N'Mai'),(N'Nam'),(N'Nga'),
(N'Ngọc'),(N'Nhung'),(N'Phong'),(N'Phương'),(N'Quân'),
(N'Sơn'),(N'Tài'),(N'Thắng'),(N'Thu'),(N'Toàn'),
(N'Tuấn'),(N'Xuân'),(N'Yến'),(N'Đức'),(N'Hằng'),
(N'Tâm'),(N'Hạnh'),(N'Khánh'),(N'Minh'),(N'Thanh'),
(N'Thị'),(N'Vân'),(N'Việt'),(N'Diệp'),(N'Loan'),
(N'Trung'),(N'Hiếu'),(N'Duy'),(N'Hoàng'),(N'Quang'),
(N'Nhi'),(N'Trang'),(N'Thảo'),(N'Hương'),(N'Đạt'),
(N'Anh'),(N'Bảo'),(N'Chi'),(N'Đan'),(N'Gia'),
(N'Hà'),(N'Khang'),(N'Lâm'),(N'My'),(N'Ngân'),
(N'Oanh'),(N'Phú'),(N'Quyên'),(N'Sang'),(N'Thiên'),
(N'Uyên'),(N'Vinh'),(N'Vy'),(N'Bách'),(N'Cẩm'),
(N'Đào'),(N'Kim'),(N'Liên'),(N'Nghĩa'),(N'Phát'),
(N'Quốc'),(N'Sương'),(N'Thủy'),(N'Út'),(N'Vương'),
(N'Đông'),(N'Hiền'),(N'Lợi'),(N'Mận'),(N'Nhựt'),
(N'Phúc'),(N'Rằng'),(N'Sinh'),(N'Tiến'),(N'Vi'),
(N'Xanh'),(N'Bích'),(N'Cúc'),(N'Lộc'),(N'Huy'),
(N'Kiệt'),(N'Hào'),(N'Trinh'),(N'Thông'),(N'Trâm'),
(N'Tú'),(N'Nhân'),(N'Thành'),(N'Dương'),(N'Lệ'),
(N'Hồng'),(N'Phượng'),(N'Trọng'),(N'Hiệp'),(N'Khôi'),
(N'Mỹ'),(N'Tuyết'),(N'Cảnh'),(N'Tuệ'),(N'Bắc'),
(N'Doanh'),(N'Hảo'),(N'Lực'),(N'Tín'),(N'Kiên');
DECLARE @NameCount INT = (SELECT COUNT(*) FROM @Names);
DECLARE @NameIdx INT = 0;

PRINT '';
PRINT '=== TAO TAI KHOAN ===';

-- -------------------------------------------------------
-- 3A: ADMIN (1)
-- -------------------------------------------------------
DECLARE @UserId INT, @EmpId INT;

-- Ensure ADM Dept exists for Admin
DECLARE @AdmDeptId INT;
IF NOT EXISTS (SELECT 1 FROM Departments WHERE DepartmentCode = 'ADM')
BEGIN
    INSERT INTO Departments(DepartmentName, DepartmentCode, Description, OrganizationId, IsActive, CreatedAt)
    VALUES (N'Quản trị viên', 'ADM', N'Bộ phận quản trị hệ thống', @OrgId, 1, GETUTCDATE());
END
SELECT @AdmDeptId = Id FROM Departments WHERE DepartmentCode = 'ADM';

-- Ensure ADM-SYS Position exists
DECLARE @AdmPosId INT;
IF NOT EXISTS (SELECT 1 FROM Positions WHERE PositionCode = 'ADM-SYS')
BEGIN
    INSERT INTO Positions(PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Quản trị hệ thống', 'ADM-SYS', 1, @AdmDeptId, 1, GETUTCDATE());
END
SELECT @AdmPosId = Id FROM Positions WHERE PositionCode = 'ADM-SYS';

INSERT INTO Users(Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
VALUES ('admin', @PwHash, 'admin@techvn.com', N'Quản trị hệ thống', 1, GETUTCDATE());
SET @UserId = SCOPE_IDENTITY();
INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt) VALUES (@UserId, @AdminRoleId, GETUTCDATE(), GETUTCDATE());
INSERT INTO Employees(EmployeeCode, FullName, DateOfBirth, Gender, Email, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
VALUES ('EMP-ADMIN', N'Quản trị hệ thống', '1985-01-01', N'Nam', 'admin@techvn.com', '0900000000', N'Hà Nội', '2023-01-01', 1, @OrgId, @AdmDeptId, @AdmPosId, @UserId, GETUTCDATE());
SET @EmpId = SCOPE_IDENTITY();
INSERT INTO EmployeeContracts(EmployeeId, ContractNumber, ContractType, StartDate, BasicSalary, IsActive, SignedDate, JobDescription, WorkLocation, SignedBy, CreatedAt)
VALUES (@EmpId, 'HD-ADMIN', 2, '2023-01-01', 30000000, 1, '2023-01-01', N'Quản trị hệ thống', N'123 Đường Láng, Hà Nội', N'Giám đốc TechVN', GETUTCDATE());
INSERT INTO EmployeeBankAccounts(EmployeeId, BankName, BankBranch, AccountNumber, AccountHolderName, IsPrimary, IsActive, CreatedAt)
VALUES (@EmpId, N'Vietcombank', N'CN Hà Nội', 'VCB0000ADMIN', N'QUẢN TRỊ HỆ THỐNG', 1, 1, GETUTCDATE());
PRINT '[OK] admin | EMP-ADMIN | Admin';

-- -------------------------------------------------------
-- 3B: TRUONG PHONG (5) — 1 per phong ban cha
-- -------------------------------------------------------
DECLARE @deptLabels TABLE (DeptCode NVARCHAR(50), Label NVARCHAR(50));
INSERT @deptLabels VALUES ('HR',N'Nhân sự'),('ACC',N'Kế toán'),('SALES',N'Kinh doanh'),('MKT',N'Marketing'),('PRD',N'Sản xuất');

DECLARE @dc NVARCHAR(50), @dl NVARCHAR(50), @did INT, @pid INT;
DECLARE mgr_cur CURSOR FOR
    SELECT d.DepartmentCode, dl.Label, d.Id, p.Id
    FROM Departments d
    JOIN @deptLabels dl ON d.DepartmentCode = dl.DeptCode
    JOIN Positions p ON p.DepartmentId = d.Id AND p.PositionCode = d.DepartmentCode + '-DIR'
    WHERE d.ParentDepartmentId IS NULL
    ORDER BY d.Id;

OPEN mgr_cur;
FETCH NEXT FROM mgr_cur INTO @dc, @dl, @did, @pid;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @NameIdx = @NameIdx + 1;
    DECLARE @fn NVARCHAR(50); SELECT @fn = FName FROM @Names WHERE Idx = ((@NameIdx - 1) % @NameCount) + 1;
    DECLARE @mgrUser NVARCHAR(100) = 'manager_' + LOWER(@dc);
    DECLARE @mgrCode NVARCHAR(100) = 'EMP-' + @dc + '-MGR';
    DECLARE @mgrEmail NVARCHAR(200) = @mgrUser + '@techvn.com';
    DECLARE @mgrName NVARCHAR(200) = N'Trưởng phòng ' + @dl + N' - ' + @fn;

    INSERT INTO Users(Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
    VALUES (@mgrUser, @PwHash, @mgrEmail, @mgrName, 1, GETUTCDATE());
    SET @UserId = SCOPE_IDENTITY();
    INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt) VALUES (@UserId, @MgrRoleId, GETUTCDATE(), GETUTCDATE());
    INSERT INTO Employees(EmployeeCode, FullName, DateOfBirth, Gender, Email, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
    VALUES (@mgrCode, @mgrName, '1988-03-15', N'Nam', @mgrEmail, '0900000001', N'Hà Nội', '2023-06-01', 1, @OrgId, @did, @pid, @UserId, GETUTCDATE());
    SET @EmpId = SCOPE_IDENTITY();
    INSERT INTO EmployeeContracts(EmployeeId, ContractNumber, ContractType, StartDate, BasicSalary, IsActive, SignedDate, JobDescription, WorkLocation, SignedBy, CreatedAt)
    VALUES (@EmpId, 'HD-' + @mgrCode, 2, '2023-06-01', 20000000, 1, '2023-06-01', @mgrName, N'123 Đường Láng, Hà Nội', N'Giám đốc TechVN', GETUTCDATE());
    INSERT INTO EmployeeBankAccounts(EmployeeId, BankName, BankBranch, AccountNumber, AccountHolderName, IsPrimary, IsActive, CreatedAt)
    VALUES (@EmpId, N'Vietcombank', N'CN Hà Nội', 'VCB' + RIGHT('0000000000' + REPLACE(@mgrCode,'-',''), 10), UPPER(@mgrName), 1, 1, GETUTCDATE());

    -- Gan ManagerId cho phong ban
    UPDATE Departments SET ManagerId = @EmpId WHERE Id = @did;
    PRINT '[OK] ' + @mgrUser + ' | ' + @mgrCode + ' | DepartmentManager -> ' + @dl;

    FETCH NEXT FROM mgr_cur INTO @dc, @dl, @did, @pid;
END
CLOSE mgr_cur; DEALLOCATE mgr_cur;

-- -------------------------------------------------------
-- 3C: TRUONG BO PHAN (10) + NHAN VIEN (100)
--     Moi bo phan: 1 DeptHead + 10 Employee = 11
-- -------------------------------------------------------
PRINT '';
DECLARE @sdId INT, @sdCode NVARCHAR(50), @sdName NVARCHAR(200), @sdParent INT;
DECLARE sub_cur CURSOR FOR
    SELECT Id, DepartmentCode, DepartmentName, ParentDepartmentId
    FROM Departments WHERE ParentDepartmentId IS NOT NULL ORDER BY Id;

OPEN sub_cur;
FETCH NEXT FROM sub_cur INTO @sdId, @sdCode, @sdName, @sdParent;

WHILE @@FETCH_STATUS = 0
BEGIN
    PRINT '--- ' + @sdName + ' (' + @sdCode + ') ---';

    DECLARE @headPosId INT; SELECT @headPosId = Id FROM Positions WHERE PositionCode = @sdCode + '-HEAD';
    DECLARE @empPosId INT;  SELECT @empPosId  = Id FROM Positions WHERE PositionCode = @sdCode + '-EMP';
    DECLARE @headEmpId INT = NULL;

    DECLARE @j INT = 1;
    WHILE @j <= 11  -- 1 head + 10 employees
    BEGIN
        SET @NameIdx = @NameIdx + 1;
        DECLARE @fname2 NVARCHAR(50); SELECT @fname2 = FName FROM @Names WHERE Idx = ((@NameIdx - 1) % @NameCount) + 1;

        DECLARE @isHead2 BIT = CASE WHEN @j = 1 THEN 1 ELSE 0 END;
        DECLARE @sdCodeLower NVARCHAR(50) = LOWER(REPLACE(@sdCode, '-', '_'));
        DECLARE @uname2 NVARCHAR(100) = @sdCodeLower + '_' + RIGHT('0' + CAST(@j AS NVARCHAR), 2);
        DECLARE @ecode2 NVARCHAR(100) = @sdCode + '-' + RIGHT('0' + CAST(@j AS NVARCHAR), 2);
        DECLARE @email2 NVARCHAR(200) = @uname2 + '@techvn.com';
        DECLARE @fullname2 NVARCHAR(200) = CASE WHEN @isHead2 = 1
            THEN N'Trưởng BP ' + @sdName + N' - ' + @fname2
            ELSE N'NV ' + @sdName + N' - ' + @fname2 END;
        DECLARE @salary2 DECIMAL(18,2) = CASE WHEN @isHead2 = 1 THEN 15000000 ELSE 10000000 END;
        DECLARE @roleId2 INT = CASE WHEN @isHead2 = 1 THEN @DeptHeadRoleId ELSE @EmpRoleId END;
        DECLARE @posId2 INT = CASE WHEN @isHead2 = 1 THEN @headPosId ELSE @empPosId END;
        DECLARE @gender2 NVARCHAR(10) = CASE WHEN @NameIdx % 3 = 0 THEN N'Nữ' ELSE N'Nam' END;
        DECLARE @dob2 DATE = DATEADD(DAY, -(@NameIdx * 37 % 7300), '2000-01-01'); -- varied DOB

        INSERT INTO Users(Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
        VALUES (@uname2, @PwHash, @email2, @fullname2, 1, GETUTCDATE());
        SET @UserId = SCOPE_IDENTITY();

        INSERT INTO UserRoles(UserId, RoleId, AssignedAt, CreatedAt)
        VALUES (@UserId, @roleId2, GETUTCDATE(), GETUTCDATE());

        INSERT INTO Employees(EmployeeCode, FullName, DateOfBirth, Gender, Email, Phone,
            Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
        VALUES (@ecode2, @fullname2, @dob2, @gender2, @email2, '090' + RIGHT('0000000' + CAST(@NameIdx AS NVARCHAR), 7),
            N'Hà Nội, Việt Nam', '2024-01-01', 1, @OrgId, @sdId, @posId2, @UserId, GETUTCDATE());
        SET @EmpId = SCOPE_IDENTITY();

        INSERT INTO EmployeeContracts(EmployeeId, ContractNumber, ContractType, StartDate,
            BasicSalary, IsActive, SignedDate, JobDescription, WorkLocation, SignedBy, CreatedAt)
        VALUES (@EmpId, 'HD-' + @ecode2, 2, '2024-01-01',
            @salary2, 1, '2024-01-01', @fullname2, N'123 Đường Láng, Hà Nội', N'Giám đốc TechVN', GETUTCDATE());

        INSERT INTO EmployeeBankAccounts(EmployeeId, BankName, BankBranch,
            AccountNumber, AccountHolderName, IsPrimary, IsActive, CreatedAt)
        VALUES (@EmpId, N'Vietcombank', N'CN Hà Nội',
            'VCB' + RIGHT('0000000000' + REPLACE(@ecode2,'-',''), 10),
            UPPER(@fullname2), 1, 1, GETUTCDATE());

        IF @isHead2 = 1 SET @headEmpId = @EmpId;

        PRINT '  [OK] ' + @uname2 + ' | ' + @ecode2 + ' | ' +
            CASE WHEN @isHead2 = 1 THEN 'DeptHead' ELSE 'Employee' END;

        SET @j = @j + 1;
    END

    -- Gan ManagerId cho bo phan
    IF @headEmpId IS NOT NULL
    BEGIN
        UPDATE Departments SET ManagerId = @headEmpId WHERE Id = @sdId;
        PRINT '  -> Manager = ' + CAST(@headEmpId AS NVARCHAR);
    END

    SET @headEmpId = NULL;
    FETCH NEXT FROM sub_cur INTO @sdId, @sdCode, @sdName, @sdParent;
END

CLOSE sub_cur; DEALLOCATE sub_cur;
GO

-- ============================================================
-- KIEM TRA KET QUA
-- ============================================================
PRINT '';
PRINT '========== KET QUA CUOI CUNG ==========';

SELECT 'Tong Users' AS Metric, COUNT(*) AS Val FROM Users
UNION ALL SELECT 'Tong Employees', COUNT(*) FROM Employees
UNION ALL SELECT 'Tong Contracts', COUNT(*) FROM EmployeeContracts
UNION ALL SELECT 'Tong BankAccounts', COUNT(*) FROM EmployeeBankAccounts
UNION ALL SELECT 'DepartmentManagers', COUNT(*) FROM UserRoles ur JOIN Roles r ON ur.RoleId=r.Id WHERE r.RoleName='DepartmentManager'
UNION ALL SELECT 'DepartmentHeads', COUNT(*) FROM UserRoles ur JOIN Roles r ON ur.RoleId=r.Id WHERE r.RoleName='DepartmentHead'
UNION ALL SELECT 'Employees (role)', COUNT(*) FROM UserRoles ur JOIN Roles r ON ur.RoleId=r.Id WHERE r.RoleName='Employee';

-- Chi tiet theo phong ban + bo phan
PRINT '';
SELECT
    COALESCE(pd.DepartmentCode, d.DepartmentCode) AS [Mã PB],
    d.DepartmentCode    AS [Mã BP],
    d.DepartmentName    AS [Tên],
    CASE WHEN d.ParentDepartmentId IS NULL THEN N'Phòng ban' ELSE N'Bộ phận' END AS [Loại],
    COUNT(e.Id)         AS [Số NV],
    mgr.FullName        AS [Quản lý]
FROM Departments d
LEFT JOIN Departments pd ON d.ParentDepartmentId = pd.Id
LEFT JOIN Employees e ON e.DepartmentId = d.Id
LEFT JOIN Employees mgr ON d.ManagerId = mgr.Id
GROUP BY d.Id, d.DepartmentCode, d.DepartmentName, d.ParentDepartmentId, pd.DepartmentCode, mgr.FullName
ORDER BY COALESCE(pd.DepartmentCode, d.DepartmentCode), d.ParentDepartmentId, d.Id;

-- Roles
SELECT Id, RoleName, [Description] FROM Roles ORDER BY Id;
GO
