-- SQL Script to seed test TimeAttendanceRecords for May 2026
-- Target: Sales and Marketing Departments (IDs 1, 2, 5, 6)
-- Ensures exactly 26 working days (Mon-Sat) for May 2026.

SET DATEFIRST 1; -- 1: Monday, 7: Sunday

DECLARE @StartDate DATE = '2026-05-01';
DECLARE @EndDate DATE = '2026-05-31';

-- Clear existing data for May 2026 for target departments
DELETE FROM TimeAttendanceRecords 
WHERE [Date] >= @StartDate AND [Date] <= @EndDate
AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (1, 2, 5, 6));

-- CTE to generate all dates from May 1 to May 31
WITH DateRange AS (
    SELECT @StartDate AS [Date]
    UNION ALL
    SELECT DATEADD(day, 1, [Date])
    FROM DateRange
    WHERE [Date] < @EndDate
)
-- 1. Insert CheckIn records for all Mon-Sat
INSERT INTO TimeAttendanceRecords (
    EmployeeId, 
    [Date], 
    Timestamp, 
    Type, 
    Location, 
    DeviceInfo, 
    CreatedAt
)
SELECT 
    e.Id as EmployeeId,
    d.[Date],
    -- Check-in at 08:00:00
    CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 08:00:00') AS DATETIME2) as Timestamp,
    'CheckIn' as Type,
    N'Văn phòng (Dữ liệu mẫu)' as Location,
    'System Seed' as DeviceInfo,
    GETUTCDATE() as CreatedAt
FROM Employees e
CROSS JOIN DateRange d
WHERE e.DepartmentId IN (1, 2, 5, 6)
AND DATEPART(dw, d.[Date]) < 7; -- Skip Sundays (7)

-- 2. Insert CheckOut records for all Mon-Sat
WITH DateRange AS (
    SELECT @StartDate AS [Date]
    UNION ALL
    SELECT DATEADD(day, 1, [Date])
    FROM DateRange
    WHERE [Date] < @EndDate
)
INSERT INTO TimeAttendanceRecords (
    EmployeeId, 
    [Date], 
    Timestamp, 
    Type, 
    Location, 
    DeviceInfo, 
    CreatedAt
)
SELECT 
    e.Id as EmployeeId,
    d.[Date],
    -- Check-out at 17:30:00 (Standard) or 19:30:00 (OT days: Tuesday, Thursday)
    CASE 
        WHEN DATEPART(dw, d.[Date]) IN (2, 4) -- Tuesday, Thursday in DATEFIRST 1
        THEN CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 19:30:00') AS DATETIME2)
        ELSE CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 17:30:00') AS DATETIME2)
    END as Timestamp,
    'CheckOut' as Type,
    N'Văn phòng (Dữ liệu mẫu)' as Location,
    'System Seed' as DeviceInfo,
    GETUTCDATE() as CreatedAt
FROM Employees e
CROSS JOIN DateRange d
WHERE e.DepartmentId IN (1, 2, 5, 6)
AND DATEPART(dw, d.[Date]) < 7; -- Skip Sundays (7)

PRINT 'Successfully seeded May 2026 TimeAttendanceRecords (26 working days) for Sales & Marketing.';
GO
