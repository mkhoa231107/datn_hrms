USE [HRMS_DATN];
GO

-- 1. Helper to drop default constraints dynamically
DECLARE @TableName nvarchar(100) = 'PayrollRecords';
DECLARE @Columns TABLE (ColName nvarchar(100));
INSERT INTO @Columns VALUES ('SalesSalary'), ('PositionAllowance'), ('PetrolAllowance'), ('PhoneAllowance'), ('OtherAllowance');

DECLARE @CurrentCol nvarchar(100);
DECLARE @ConstraintName nvarchar(max);
DECLARE @Sql nvarchar(max);

DECLARE cur CURSOR FOR SELECT ColName FROM @Columns;
OPEN cur;
FETCH NEXT FROM cur INTO @CurrentCol;
WHILE @@FETCH_STATUS = 0
BEGIN
    -- Find and drop the default constraint
    SELECT @ConstraintName = d.name
    FROM sys.default_constraints d
    INNER JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
    WHERE d.parent_object_id = OBJECT_ID(@TableName) AND c.name = @CurrentCol;

    IF @ConstraintName IS NOT NULL
    BEGIN
        SET @Sql = 'ALTER TABLE [' + @TableName + '] DROP CONSTRAINT [' + @ConstraintName + ']';
        EXEC(@Sql);
    END

    -- Drop the column if it exists
    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(@TableName) AND name = @CurrentCol)
    BEGIN
        SET @Sql = 'ALTER TABLE [' + @TableName + '] DROP COLUMN [' + @CurrentCol + ']';
        EXEC(@Sql);
    END
    
    FETCH NEXT FROM cur INTO @CurrentCol;
END
CLOSE cur; DEALLOCATE cur;

-- 2. Ensure TotalAllowances exists for the migration rename source
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PayrollRecords]') AND name = 'TotalAllowances')
    ALTER TABLE [PayrollRecords] ADD [TotalAllowances] decimal(18, 2) NOT NULL DEFAULT 0.0;

GO
PRINT 'Database cleaned. Ready for dotnet run.';
