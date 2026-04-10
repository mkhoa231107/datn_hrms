-- =============================================
-- SCRIPT: STANDARDIZE WORKER ACCOUNTS (prd_ass_x)
-- =============================================
USE [HRMS_DATN];
GO

SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
BEGIN TRANSACTION;

BEGIN TRY
    DECLARE @DefaultHash NVARCHAR(MAX) = '$2a$04$HqOrFEeG6NpYagwMxHBuuOr/MpdRmPxHV/9aO7gh69xfQZAHqYbxm'; -- '123456'
    DECLARE @EmployeeRoleId INT = 3;

    DECLARE @i INT = 1;
    WHILE @i <= 151
    BEGIN
        DECLARE @EmpSuffix NVARCHAR(3) = RIGHT('000' + CAST(@i AS VARCHAR), 3);
        DECLARE @UserSuffix NVARCHAR(3) = CASE 
            WHEN @i < 10 THEN '0' + CAST(@i AS VARCHAR) 
            ELSE CAST(@i AS VARCHAR) 
        END;

        DECLARE @EmpCode NVARCHAR(50) = 'PRD-ASS-' + @EmpSuffix;
        DECLARE @Username NVARCHAR(255) = 'prd_ass_' + @UserSuffix;
        DECLARE @Email NVARCHAR(255) = @Username + '@hrms.local';
        
        DECLARE @EmpId INT = (SELECT Id FROM Employees WHERE EmployeeCode = @EmpCode);
        DECLARE @FullName NVARCHAR(255) = (SELECT FullName FROM Employees WHERE Id = @EmpId);

        IF @EmpId IS NOT NULL
        BEGIN
            -- 1. Ensure User exists with standard format (prd_ass_02, etc.)
            IF NOT EXISTS (SELECT 1 FROM Users WHERE Username = @Username)
            BEGIN
                INSERT INTO Users (Username, PasswordHash, Email, FullName, IsActive, CreatedAt, UpdatedAt)
                VALUES (@Username, @DefaultHash, @Email, ISNULL(@FullName, @Username), 1, GETUTCDATE(), GETUTCDATE());
            END
            ELSE
            BEGIN
                UPDATE Users SET PasswordHash = @DefaultHash, FullName = ISNULL(@FullName, FullName), UpdatedAt = GETUTCDATE()
                WHERE Username = @Username;
            END

            DECLARE @UserId INT = (SELECT Id FROM Users WHERE Username = @Username);

            -- 2. Link Employee to this User
            UPDATE Employees SET UserId = @UserId WHERE Id = @EmpId;

            -- 3. Ensure "Employee" Role
            IF NOT EXISTS (SELECT 1 FROM UserRoles WHERE UserId = @UserId AND RoleId = @EmployeeRoleId)
            BEGIN
                INSERT INTO UserRoles (UserId, RoleId, AssignedAt, CreatedAt) 
                VALUES (@UserId, @EmployeeRoleId, GETUTCDATE(), GETUTCDATE());
            END

            -- 4. CLEANUP: Delete legacy usernames that are not the standard one
            -- e.g., if i=2, delete prd_ass_2 and prd-ass-002 if they exist
            DELETE FROM Users WHERE (Username = 'prd_ass_' + CAST(@i AS VARCHAR) AND Username <> @Username);
            DELETE FROM Users WHERE Username = 'PRD-ASS-' + @EmpSuffix AND Username <> @Username;
        END

        SET @i = @i + 1;
    END

    COMMIT TRANSACTION;
    PRINT '✅ Success: All PRD-ASS accounts (01 to 151) standardized and linked.';
END TRY
BEGIN CATCH
    PRINT '❌ Error occurred: ' + ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;
GO
