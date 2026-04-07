-- ============================================================
-- HRMS_DATN - Database Restructuring Script
-- Ngay       : 2026-03-06
-- Mo ta      :
--   1. Them bang EmployeeDocuments (bang cap / chung chi / hoc van)
--   2. Xoa bang Teams, xoa cot TeamId trong Employees
--   3. Them 10 bo phan con (SubDepartments) voi ParentDepartmentId
--   4. Doi role 'TeamLeader' -> 'DepartmentHead' (Truong bo phan)
-- Chay tren  : localhost\SQLEXPRESS  |  Database: HRMS_DATN
-- ============================================================

USE [HRMS_DATN];
GO

-- ============================================================
-- BUOC 1: THEM BANG EmployeeDocuments
-- ============================================================
IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'EmployeeDocuments'
)
BEGIN
    CREATE TABLE [dbo].[EmployeeDocuments] (
        [Id]           INT            NOT NULL IDENTITY(1,1) PRIMARY KEY,
        [EmployeeId]   INT            NOT NULL,
        [DocumentType] NVARCHAR(100)  NOT NULL,
        [Title]        NVARCHAR(255)  NOT NULL,
        [IssuedBy]     NVARCHAR(255)  NULL,
        [IssuedDate]   DATE           NULL,
        [ExpiryDate]   DATE           NULL,
        [FileUrl]      NVARCHAR(500)  NULL,
        [Notes]        NVARCHAR(1000) NULL,
        [CreatedAt]    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt]    DATETIME2      NULL,
        CONSTRAINT [FK_EmployeeDocuments_Employees]
            FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees]([Id])
            ON DELETE CASCADE
    );
    PRINT 'OK Tao bang EmployeeDocuments thanh cong.';
END
ELSE
    PRINT 'SKIP Bang EmployeeDocuments da ton tai.';
GO

-- ============================================================
-- BUOC 2: XOA BANG Teams
-- ============================================================

-- 2a. Xoa FK cua cot TeamId trong Employees
DECLARE @fkName NVARCHAR(255);
SELECT @fkName = fk.name
FROM   sys.foreign_keys fk
JOIN   sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
JOIN   sys.columns c ON fkc.parent_object_id = c.object_id
                     AND fkc.parent_column_id  = c.column_id
WHERE  OBJECT_NAME(fk.parent_object_id) = 'Employees'
  AND  c.name = 'TeamId';

IF @fkName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE [dbo].[Employees] DROP CONSTRAINT [' + @fkName + ']');
    PRINT 'OK Xoa FK TeamId trong Employees.';
END
ELSE
    PRINT 'SKIP Khong tim thay FK TeamId trong Employees.';
GO

-- 2b. Drop tat ca FK con lai trong bang Teams
DECLARE fk_cursor CURSOR FOR
    SELECT fk.name
    FROM   sys.foreign_keys fk
    WHERE  OBJECT_NAME(fk.parent_object_id) = 'Teams';

DECLARE @fk NVARCHAR(255);
OPEN fk_cursor;
FETCH NEXT FROM fk_cursor INTO @fk;
WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC('ALTER TABLE [dbo].[Teams] DROP CONSTRAINT [' + @fk + ']');
    PRINT 'OK Xoa FK: ' + @fk;
    FETCH NEXT FROM fk_cursor INTO @fk;
END
CLOSE fk_cursor;
DEALLOCATE fk_cursor;
GO

-- 2c. Xoa cot TeamId khoi Employees
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = 'TeamId'
)
BEGIN
    ALTER TABLE [dbo].[Employees] DROP COLUMN [TeamId];
    PRINT 'OK Xoa cot TeamId khoi Employees.';
END
ELSE
    PRINT 'SKIP Cot TeamId khong ton tai trong Employees.';
GO

-- 2d. Drop bang Teams
IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Teams'
)
BEGIN
    DROP TABLE [dbo].[Teams];
    PRINT 'OK Xoa bang Teams thanh cong.';
END
ELSE
    PRINT 'SKIP Bang Teams khong ton tai.';
GO

-- ============================================================
-- BUOC 3: THEM 10 BO PHAN CON (Sub-Departments)
-- ============================================================
DECLARE @OrgId INT;
SELECT TOP 1 @OrgId = Id FROM [dbo].[Organizations] WHERE [OrganizationCode] = 'TECHVN';

DECLARE @HrId    INT; SELECT @HrId    = Id FROM [dbo].[Departments] WHERE [DepartmentCode] = 'HR';
DECLARE @AccId   INT; SELECT @AccId   = Id FROM [dbo].[Departments] WHERE [DepartmentCode] = 'ACC';
DECLARE @SalesId INT; SELECT @SalesId = Id FROM [dbo].[Departments] WHERE [DepartmentCode] = 'SALES';
DECLARE @MktId   INT; SELECT @MktId   = Id FROM [dbo].[Departments] WHERE [DepartmentCode] = 'MKT';
DECLARE @PrdId   INT; SELECT @PrdId   = Id FROM [dbo].[Departments] WHERE [DepartmentCode] = 'PRD';

PRINT 'Parent IDs -> HR:' + CAST(ISNULL(@HrId,0) AS NVARCHAR)
    + ' ACC:'   + CAST(ISNULL(@AccId,0)   AS NVARCHAR)
    + ' SALES:' + CAST(ISNULL(@SalesId,0) AS NVARCHAR)
    + ' MKT:'   + CAST(ISNULL(@MktId,0)   AS NVARCHAR)
    + ' PRD:'   + CAST(ISNULL(@PrdId,0)   AS NVARCHAR);

-- HR sub-depts
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'HR-REC')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'To Tuyen dung','HR-REC',N'Phu trach tuyen dung',@OrgId,@HrId,1,GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'HR-CB')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'To Luong Thuong (C&B)','HR-CB',N'Cham cong, tinh luong',@OrgId,@HrId,1,GETUTCDATE());

-- ACC sub-depts
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'ACC-TAX')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Ke toan Thue','ACC-TAX',N'Bao cao, quyet toan',@OrgId,@AccId,1,GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'ACC-INT')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Ke toan Noi bo','ACC-INT',N'Thu chi noi bo',@OrgId,@AccId,1,GETUTCDATE());

-- SALES sub-depts
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'SALES-N')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Kinh doanh Mien Bac','SALES-N',N'Khu vuc phia Bac',@OrgId,@SalesId,1,GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'SALES-S')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Kinh doanh Mien Nam','SALES-S',N'Khu vuc phia Nam',@OrgId,@SalesId,1,GETUTCDATE());

-- MKT sub-depts
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'MKT-DIG')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Digital Marketing','MKT-DIG',N'Chay Ads, SEO',@OrgId,@MktId,1,GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'MKT-EVT')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'To chuc Su kien','MKT-EVT',N'Event offline',@OrgId,@MktId,1,GETUTCDATE());

-- PRD sub-depts
IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'PRD-ASS')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Xuong Lap rap','PRD-ASS',N'Lap rap san pham',@OrgId,@PrdId,1,GETUTCDATE());

IF NOT EXISTS (SELECT 1 FROM [dbo].[Departments] WHERE [DepartmentCode] = 'PRD-QA')
    INSERT INTO [dbo].[Departments]([DepartmentName],[DepartmentCode],[Description],[OrganizationId],[ParentDepartmentId],[IsActive],[CreatedAt])
    VALUES (N'Quan ly Chat luong','PRD-QA',N'Dam bao chat luong',@OrgId,@PrdId,1,GETUTCDATE());

PRINT 'OK Seed 10 bo phan con hoan tat.';
GO

-- ============================================================
-- BUOC 4: DOI ROLE 'TeamLeader' -> 'DepartmentHead'
-- ============================================================
IF EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'TeamLeader')
BEGIN
    UPDATE [dbo].[Roles]
    SET    [RoleName]    = 'DepartmentHead',
           [Description] = N'Truong bo phan - Quan ly nhan vien trong bo phan con'
    WHERE  [RoleName] = 'TeamLeader';
    PRINT 'OK Doi role TeamLeader -> DepartmentHead.';
END
ELSE IF EXISTS (SELECT 1 FROM [dbo].[Roles] WHERE [RoleName] = 'DepartmentHead')
    PRINT 'SKIP Role DepartmentHead da ton tai.';
ELSE
    PRINT 'WARN Khong tim thay role TeamLeader.';
GO

-- ============================================================
-- KIEM TRA KET QUA
-- ============================================================
PRINT '=== KIEM TRA KET QUA ===';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Teams')
    PRINT 'OK Bang Teams da bi xoa.'
ELSE PRINT 'ERR Bang Teams van con!';

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Employees' AND COLUMN_NAME='TeamId')
    PRINT 'OK Cot TeamId da xoa khoi Employees.'
ELSE PRINT 'ERR Cot TeamId van con trong Employees!';

IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'EmployeeDocuments')
    PRINT 'OK Bang EmployeeDocuments ton tai.'
ELSE PRINT 'ERR Bang EmployeeDocuments chua duoc tao!';

-- Danh sach departments
SELECT
    d.[Id],
    d.[DepartmentCode]                     AS [Ma],
    d.[DepartmentName]                     AS [Ten phong/bo phan],
    d.[ParentDepartmentId]                 AS [ID Cha],
    p.[DepartmentName]                     AS [Phong ban cha],
    d.[IsActive]                           AS [Hoat dong]
FROM   [dbo].[Departments] d
LEFT JOIN [dbo].[Departments] p ON d.[ParentDepartmentId] = p.[Id]
ORDER BY ISNULL(d.[ParentDepartmentId], d.[Id]), d.[Id];

-- Danh sach roles
SELECT [Id], [RoleName], [Description] FROM [dbo].[Roles] ORDER BY [Id];
GO
