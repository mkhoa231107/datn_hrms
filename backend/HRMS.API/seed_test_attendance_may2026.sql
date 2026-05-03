-- SQL Script to seed test attendance data for May 2026
-- Target: Sales and Marketing Departments (IDs 1, 2, 5, 6)

DECLARE @StartDate DATE = '2026-05-01';
DECLARE @EndDate DATE = '2026-05-31';

-- Clear existing data for May 2026 for target departments to allow re-runs
DELETE FROM AttendanceDetails 
WHERE Date >= @StartDate AND Date <= @EndDate
AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (1, 2, 5, 6));

-- CTE to generate all dates in May 2026
WITH DateRange AS (
    SELECT @StartDate AS [Date]
    UNION ALL
    SELECT DATEADD(day, 1, [Date])
    FROM DateRange
    WHERE [Date] < @EndDate
)
-- Insert records for each employee and each date (excluding Sundays)
INSERT INTO AttendanceDetails (
    EmployeeId, 
    [Date], 
    WorkShiftId, 
    CheckInTime, 
    CheckOutTime, 
    IsLate, 
    IsEarlyLeave, 
    WorkingHours, 
    WorkingDays, 
    OTHours, 
    [Status], 
    Note, 
    CheckInCount, 
    CheckOutCount, 
    CreatedAt
)
SELECT 
    e.Id as EmployeeId,
    d.[Date],
    NULL as WorkShiftId,
    -- Check-in at 08:00:00
    CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 08:00:00') AS DATETIME2) as CheckInTime,
    -- Check-out at 17:00:00 (Standard) or 19:00:00 (OT days: Tuesday, Thursday)
    CASE 
        WHEN DATEPART(weekday, d.[Date]) IN (3, 5) THEN CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 19:00:00') AS DATETIME2)
        ELSE CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 17:00:00') AS DATETIME2)
    END as CheckOutTime,
    0 as IsLate,
    0 as IsEarlyLeave,
    8.0 as WorkingHours,
    1.0 as WorkingDays,
    -- 2 hours OT on Tuesdays (3) and Thursdays (5)
    CASE 
        WHEN DATEPART(weekday, d.[Date]) IN (3, 5) THEN 2.0
        ELSE 0.0
    END as OTHours,
    N'Hợp lệ' as [Status],
    CASE 
        WHEN DATEPART(weekday, d.[Date]) IN (3, 5) THEN N'Làm thêm giờ định kỳ'
        ELSE N'Ngày công chuẩn'
    END as Note,
    1 as CheckInCount,
    1 as CheckOutCount,
    GETDATE() as CreatedAt
FROM Employees e
CROSS JOIN DateRange d
WHERE e.DepartmentId IN (1, 2, 5, 6)
AND DATEPART(weekday, d.[Date]) <> 1 -- Skip Sundays (SQL Server default: 1 is Sunday)
OPTION (MAXRECURSION 31);

PRINT 'Successfully seeded May 2026 attendance data for 27 employees with OT hours.';
GO
