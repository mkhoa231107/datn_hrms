-- =============================================
-- SCRIPT: ROTATING SHIFTS FOR PRD-ASS (APRIL 2026)
-- Cycle: S1 -> C1 -> D1 every week
-- 3 Groups of 50 workers
-- =============================================

USE [HRMS_DATN];
GO

SET NOCOUNT ON;
BEGIN TRANSACTION;

BEGIN TRY
    -- 1. Setup metadata
    DECLARE @PeriodId INT = (SELECT TOP 1 Id FROM SchedulePeriods WHERE PeriodName LIKE '%04/2026%');
    DECLARE @C1 INT = (SELECT Id FROM WorkShifts WHERE ShiftCode = 'C1'); -- Ca 1 (Sáng)
    DECLARE @C2 INT = (SELECT Id FROM WorkShifts WHERE ShiftCode = 'C2'); -- Ca 2 (Chiều)
    DECLARE @C3 INT = (SELECT Id FROM WorkShifts WHERE ShiftCode = 'C3'); -- Ca 3 (Đêm)
    DECLARE @HC INT = (SELECT Id FROM WorkShifts WHERE ShiftCode = 'HC'); -- Hành chính

    IF @PeriodId IS NULL OR @C1 IS NULL OR @C2 IS NULL OR @C3 IS NULL OR @HC IS NULL
    BEGIN
        PRINT 'ERROR: Missing required data (Period or Shifts).';
        ROLLBACK;
        RETURN;
    END

    -- 2. Identify workers and assign Groups
    -- We assume workers are PRD-ASS-002 to PRD-ASS-151
    PRINT '🔄 Processing 150 workers for rotating schedule...';

    -- Temporary table to hold groupings
    IF OBJECT_ID('tempdb..#Workers') IS NOT NULL DROP TABLE #Workers;
    CREATE TABLE #Workers (
        EmployeeId INT,
        Grp INT -- 1, 2, or 3
    );

    INSERT INTO #Workers (EmployeeId, Grp)
    SELECT Id, 
           CASE 
             WHEN CAST(RIGHT(EmployeeCode, 3) AS INT) BETWEEN 2 AND 51 THEN 1
             WHEN CAST(RIGHT(EmployeeCode, 3) AS INT) BETWEEN 52 AND 101 THEN 2
             WHEN CAST(RIGHT(EmployeeCode, 3) AS INT) BETWEEN 102 AND 151 THEN 3
             ELSE 1 -- Fallback
           END
    FROM Employees
    WHERE EmployeeCode LIKE 'PRD-ASS-%' AND EmployeeCode <> 'PRD-ASS-001'; -- Exclude Manager

    -- 3. Clear existing schedules for these workers in this period to avoid duplicates
    DELETE FROM WorkSchedules 
    WHERE EmployeeId IN (SELECT EmployeeId FROM #Workers)
      AND PeriodId = @PeriodId;

    -- 4. Generate Daily Schedules using a matrix
    -- Group 1: W1=C1, W2=C2, W3=C3, W4=C1, W5=C2
    -- Group 2: W1=C2, W2=C3, W3=C1, W4=C2, W5=C3
    -- Group 3: W1=C3, W2=C1, W3=C2, W4=C3, W5=C1

    DECLARE @CurrentDate DATE = '2026-04-01';
    DECLARE @EndDate DATE = '2026-04-30';

    WHILE @CurrentDate <= @EndDate
    BEGIN
        -- Calculate which week it is (W1-W5)
        -- April 1-5 = W1, April 6-12 = W2, etc.
        DECLARE @W INT;
        IF @CurrentDate <= '2026-04-05' SET @W = 1;
        ELSE IF @CurrentDate <= '2026-04-12' SET @W = 2;
        ELSE IF @CurrentDate <= '2026-04-19' SET @W = 3;
        ELSE IF @CurrentDate <= '2026-04-26' SET @W = 4;
        ELSE SET @W = 5;

        -- Insert for Group 1
        INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, PeriodId, WorkingDate, CreatedAt, UpdatedAt)
        SELECT EmployeeId, 
               CASE (@W % 3)
                 WHEN 1 THEN @C1
                 WHEN 2 THEN @C2
                 WHEN 0 THEN @C3
               END,
               @PeriodId, @CurrentDate, GETUTCDATE(), GETUTCDATE()
        FROM #Workers WHERE Grp = 1;

        -- Insert for Group 2
        INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, PeriodId, WorkingDate, CreatedAt, UpdatedAt)
        SELECT EmployeeId, 
               CASE (@W % 3)
                 WHEN 1 THEN @C2
                 WHEN 2 THEN @C3
                 WHEN 0 THEN @C1
               END,
               @PeriodId, @CurrentDate, GETUTCDATE(), GETUTCDATE()
        FROM #Workers WHERE Grp = 2;

        -- Insert for Group 3
        INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, PeriodId, WorkingDate, CreatedAt, UpdatedAt)
        SELECT EmployeeId, 
               CASE (@W % 3)
                 WHEN 1 THEN @C3
                 WHEN 2 THEN @C1
                 WHEN 0 THEN @C2
               END,
               @PeriodId, @CurrentDate, GETUTCDATE(), GETUTCDATE()
        FROM #Workers WHERE Grp = 3;

        SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
    END

    -- 5. Manager (001) always on HC
    DECLARE @MgrId INT = (SELECT Id FROM Employees WHERE EmployeeCode = 'PRD-ASS-001');
    IF @MgrId IS NOT NULL
    BEGIN
        INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, PeriodId, WorkingDate, CreatedAt, UpdatedAt)
        SELECT @MgrId, @HC, @PeriodId, WorkingDate, GETUTCDATE(), GETUTCDATE()
        FROM (SELECT DISTINCT WorkingDate FROM WorkSchedules WHERE PeriodId = @PeriodId) AS D
        WHERE NOT EXISTS (SELECT 1 FROM WorkSchedules WHERE EmployeeId = @MgrId AND WorkingDate = D.WorkingDate);
    END

    COMMIT TRANSACTION;
    PRINT '✅ Done: Rotating shifts applied for 150 workers.';

END TRY
BEGIN CATCH
    PRINT '❌ Error occurred: ' + ERROR_MESSAGE();
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
END CATCH;

DROP TABLE #Workers;
GO
