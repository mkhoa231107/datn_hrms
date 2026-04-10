-- =============================================
-- SEEDING SCRIPT: 151 PRD-ASS PERSONNEL
-- Goal: 1 Manager (001), 150 Workers (002-151) + Schedules April 2026
-- =============================================

USE [HRMS_DATN];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Get IDs & Roles
    DECLARE @DeptId INT, @MgrPosId INT, @StaffPosId INT, @OrgId INT, @S1 INT, @C1 INT, @D1 INT, @PeriodId INT;
    DECLARE @EmpRoleId INT, @HeadRoleId INT;
    
    SELECT TOP 1 @DeptId = Id FROM Departments WHERE DepartmentCode = 'PRD-ASS';
    SELECT TOP 1 @MgrPosId = Id FROM Positions WHERE PositionCode = 'PRD-ASS-MGR';
    SELECT TOP 1 @StaffPosId = Id FROM Positions WHERE PositionCode = 'PRD-ASS-STAFF';
    SELECT TOP 1 @OrgId = Id FROM Organizations;
    SELECT TOP 1 @S1 = Id FROM WorkShifts WHERE ShiftCode = 'S1';
    SELECT TOP 1 @C1 = Id FROM WorkShifts WHERE ShiftCode = 'C1';
    SELECT TOP 1 @D1 = Id FROM WorkShifts WHERE ShiftCode = 'D1';
    SELECT TOP 1 @PeriodId = Id FROM SchedulePeriods WHERE PeriodName LIKE '%04/2026%';
    
    SELECT @EmpRoleId = Id FROM Roles WHERE RoleName = 'Employee';
    SELECT @HeadRoleId = Id FROM Roles WHERE RoleName = 'DepartmentHead';

    IF @DeptId IS NULL OR @MgrPosId IS NULL OR @StaffPosId IS NULL
    BEGIN
        PRINT 'ERROR: Missing Dept or Positions. Please ensure PRD-ASS, PRD-ASS-MGR, and PRD-ASS-STAFF exist.';
        ROLLBACK;
        RETURN;
    END

    -- 2. Cleanup
    PRINT '🧹 Cleaning up old PRD-ASS data...';
    IF OBJECT_ID('tempdb..#T') IS NOT NULL DROP TABLE #T;
    CREATE TABLE #T (EId INT, UId INT);
    INSERT INTO #T (EId, UId)
    SELECT Id, UserId FROM Employees 
    WHERE (EmployeeCode LIKE 'PRD-ASS-%' OR EmployeeCode LIKE 'CN-%');

    -- BREAK FK REFERENCES FIRST (CRITICAL)
    UPDATE Departments SET ManagerId = NULL WHERE ManagerId IN (SELECT EId FROM #T);
    UPDATE Employees SET ManagerId = NULL WHERE ManagerId IN (SELECT EId FROM #T);

    -- DELETE DEPENDENTS
    DELETE FROM WorkSchedules WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM EmployeeContracts WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM LeaveBalances WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM AttendanceDetails WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM AttendanceSummaries WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM PayrollRecords WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM LeaveRequests WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM EmployeeInsurances WHERE EmployeeId IN (SELECT EId FROM #T);
    DELETE FROM EmployeeBankAccounts WHERE EmployeeId IN (SELECT EId FROM #T);

    -- DELETE EMPLOYEES & USERS
    DELETE FROM Employees WHERE Id IN (SELECT EId FROM #T);
    
    -- Delete users based on ID or prefix
    DELETE FROM UserRoles WHERE UserId IN (SELECT UId FROM #T WHERE UId IS NOT NULL) OR UserId IN (SELECT Id FROM Users WHERE Username LIKE 'prd-ass-%');
    DELETE FROM Users WHERE Id IN (SELECT UId FROM #T WHERE UId IS NOT NULL) OR Username LIKE 'prd-ass-%' OR Username LIKE 'worker_ass_%';

    -- Reset Department Manager specifically for @DeptId after cleanup
    UPDATE Departments SET ManagerId = NULL WHERE Id = @DeptId;

    -- 3. Seed Names Reference
    DECLARE @Surnames TABLE (Name NVARCHAR(50));
    INSERT INTO @Surnames VALUES (N'Nguyễn'),(N'Trần'),(N'Lê'),(N'Phạm'),(N'Phan'),(N'Vũ'),(N'Đặng'),(N'Bùi');
    DECLARE @Middles TABLE (Name NVARCHAR(50));
    INSERT INTO @Middles VALUES (N'Văn'),(N'Công'),(N'Minh'),(N'Đức'),(N'Thành'),(N'Quốc'),(N'Hữu');
    DECLARE @Firsts TABLE (Name NVARCHAR(50));
    INSERT INTO @Firsts VALUES (N'Nam'),(N'Hùng'),(N'Dũng'),(N'Tuấn'),(N'Anh'),(N'Sơn'),(N'Tùng'),(N'Hải');

    -- 4. Main Seed Loop
    PRINT '🔍 Creating 151 Personnel...';
    DECLARE @i INT = 1;
    -- Standard BCrypt hash for '123456'
    DECLARE @Hash NVARCHAR(255) = '$2a$12$vcBlGZpBf.uF.uS1y8Yf8uS7BvR9B5O3Z.tH.R6uYv8.eM9I7u/oK';
    
    WHILE @i <= 151
    BEGIN
        DECLARE @Code NVARCHAR(50) = 'PRD-ASS-' + RIGHT('000' + CAST(@i AS NVARCHAR(10)), 3);
        DECLARE @User NVARCHAR(50) = LOWER(@Code);
        DECLARE @FullName NVARCHAR(200);
        
        -- Randomize Name
        SELECT @FullName = (SELECT TOP 1 Name FROM @Surnames ORDER BY NEWID()) + ' ' + 
                           (SELECT TOP 1 Name FROM @Middles ORDER BY NEWID()) + ' ' + 
                           (SELECT TOP 1 Name FROM @Firsts ORDER BY NEWID());

        DECLARE @PosId INT = CASE WHEN @i = 1 THEN @MgrPosId ELSE @StaffPosId END;
        DECLARE @Sal DECIMAL(18,2) = CASE WHEN @i = 1 THEN 22000000 ELSE 7000000 END;
        
        -- Determine Initial Shift for Contract
        DECLARE @InitialShiftId INT;
        IF @i = 1 SET @InitialShiftId = @S1; -- Manager defaults to S1
        ELSE IF @i <= 51 SET @InitialShiftId = @S1;  -- Workers 002-051
        ELSE IF @i <= 101 SET @InitialShiftId = @C1; -- Workers 052-101
        ELSE SET @InitialShiftId = @D1;               -- Workers 102-151

        -- Insert User
        INSERT INTO Users (Username, PasswordHash, Email, FullName, IsActive, CreatedAt)
        VALUES (@User, @Hash, @User + '@techvn.com', @FullName, 1, GETUTCDATE());
        DECLARE @UId INT = SCOPE_IDENTITY();

        -- Assign Role
        DECLARE @TargetRoleId INT = CASE WHEN @i = 1 THEN @HeadRoleId ELSE @EmpRoleId END;
        IF @TargetRoleId IS NOT NULL
            INSERT INTO UserRoles (UserId, RoleId, AssignedAt, CreatedAt) VALUES (@UId, @TargetRoleId, GETUTCDATE(), GETUTCDATE());

        -- Insert Employee
        INSERT INTO Employees (EmployeeCode, FullName, Gender, Email, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt, IsActive, DateOfBirth, PlaceOfBirth, PlaceOfOrigin, UpdatedAt)
        VALUES (@Code, @FullName, N'Nam', @User + '@techvn.com', '2026-01-01', 2, @OrgId, @DeptId, @PosId, @UId, GETUTCDATE(), 1, '1995-01-01', N'Hà Nội', N'Hà Nội', GETUTCDATE());
        DECLARE @EId INT = SCOPE_IDENTITY();

        -- Insert Contract
        INSERT INTO EmployeeContracts (EmployeeId, ContractNumber, ContractType, StartDate, EndDate, BasicSalary, IsActive, Status, CreatedAt, ShiftId, TargetDepartmentId, TargetPositionId, UpdatedAt, JobDescription)
        VALUES (@EId, 'HDLD/2026/' + @Code, 2, '2026-01-01', '2027-01-01', @Sal, 1, 5, GETUTCDATE(), @InitialShiftId, @DeptId, @PosId, GETUTCDATE(), N'Công nhân lắp ráp (Ca xoay hàng tuần)');

        IF @i = 1 
            UPDATE Departments SET ManagerId = @EId WHERE Id = @DeptId;

        SET @i = @i + 1;
    END

    -- 5. Seed Schedules (April 2026)
    PRINT '📅 Generating Rotating Schedules (April 2026)...';
    
    -- Temporarily store workers for scheduling
    CREATE TABLE #W (EId INT, Num INT);
    INSERT INTO #W (EId, Num)
    SELECT Id, CAST(REPLACE(EmployeeCode, 'PRD-ASS-', '') AS INT) 
    FROM Employees WHERE EmployeeCode LIKE 'PRD-ASS-%' AND EmployeeCode <> 'PRD-ASS-001';

    DECLARE @StartDate DATE = '2026-04-01', @EndDate DATE = '2026-04-30';
    DECLARE @Day DATE;
    DECLARE @ShiftIds TABLE (Idx INT, SId INT);
    INSERT INTO @ShiftIds VALUES (0, @S1), (1, @C1), (2, @D1);

    INSERT INTO WorkSchedules (EmployeeId, WorkingDate, WorkShiftId, PeriodId, Note, CreatedAt, UpdatedAt)
    SELECT 
        w.EId, 
        d.[Date],
        s.SId,
        @PeriodId,
        N'Xoay ca tự động',
        GETUTCDATE(),
        GETUTCDATE()
    FROM #W w
    CROSS JOIN (
        SELECT DATEADD(DAY, n, @StartDate) AS [Date]
        FROM (SELECT TOP (DATEDIFF(DAY, @StartDate, @EndDate) + 1) n = ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 FROM sys.objects) x
    ) d
    JOIN @ShiftIds s ON s.Idx = ( ((w.Num - 2) / 50) + (DATEDIFF(WEEK, '2026-01-05', d.[Date])) ) % 3
    WHERE DATENAME(WEEKDAY, d.[Date]) <> 'Sunday';

    COMMIT TRANSACTION;
    PRINT '✅ SUCCESSFULLY SEEDED 151 PERSONNEL IN PRD-ASS!';
END TRY
BEGIN CATCH
    PRINT '❌ ERROR DETECTED: ' + ERROR_MESSAGE();
    ROLLBACK TRANSACTION;
END CATCH;

IF OBJECT_ID('tempdb..#T') IS NOT NULL DROP TABLE #T;
IF OBJECT_ID('tempdb..#W') IS NOT NULL DROP TABLE #W;
GO
