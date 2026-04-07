-- Seeding Full Attendance Data for March 2026
-- 8:00 AM Check-in, 5:00 PM Check-out, Weekdays only

DECLARE @StartDate DATE = '2026-03-01';
DECLARE @EndDate DATE = '2026-03-31';

-- Clear existing test records for March 2026 to avoid duplicates
DELETE FROM [TimeAttendanceRecords] 
WHERE [Date] >= @StartDate AND [Date] <= @EndDate;

DECLARE @CurrentEmployeeId INT;
DECLARE @CurrentDate DATE;

DECLARE Emp_Cursor CURSOR FOR 
SELECT Id FROM [Employees];

OPEN Emp_Cursor;
FETCH NEXT FROM Emp_Cursor INTO @CurrentEmployeeId;

WHILE @@FETCH_STATUS = 0
BEGIN
    SET @CurrentDate = @StartDate;
    
    WHILE @CurrentDate <= @EndDate
    BEGIN
        -- Skip Saturdays (7) and Sundays (1)
        IF DATEPART(dw, @CurrentDate) NOT IN (1, 7)
        BEGIN
            -- CheckIn at 08:00
            INSERT INTO [TimeAttendanceRecords] (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt)
            VALUES (@CurrentEmployeeId, @CurrentDate, DATEADD(hour, 8, CAST(@CurrentDate AS DATETIME)), 'CheckIn', N'Văn phòng (SQL Seed)', 'SQL Script', GETUTCDATE());

            -- CheckOut at 17:00
            INSERT INTO [TimeAttendanceRecords] (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt)
            VALUES (@CurrentEmployeeId, @CurrentDate, DATEADD(hour, 17, CAST(@CurrentDate AS DATETIME)), 'CheckOut', N'Văn phòng (SQL Seed)', 'SQL Script', GETUTCDATE());
        END
        
        SET @CurrentDate = DATEADD(day, 1, @CurrentDate);
    END

    FETCH NEXT FROM Emp_Cursor INTO @CurrentEmployeeId;
END

CLOSE Emp_Cursor;
DEALLOCATE Emp_Cursor;

PRINT '✅ Successfully seeded full attendance data for March 2026.';
