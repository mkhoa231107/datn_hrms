-- =========================================================================
-- MASTER SCRIPT: RESET & RE-SEED ALL ATTENDANCE DATA FOR MAY 2026
-- Targets: ALL ACTIVE EMPLOYEES
-- Logic: 6 working days/week (Mon-Sat), skipping Sundays (5 days off).
-- Results in exactly 26 working days for May 2026.
-- =========================================================================

SET DATEFIRST 1; -- 1: Monday, 7: Sunday

DECLARE @PeriodId INT = 5; -- May 2026 Period ID
DECLARE @StartDate DATE = '2026-05-01';
DECLARE @EndDate DATE = '2026-05-31';
DECLARE @ShiftStart TIME = '08:00:00';
DECLARE @ShiftEnd TIME = '17:30:00';

PRINT 'Starting Attendance Reset for May 2026...';

-- 1. CLEAR ALL EXISTING TRANSACTIONAL DATA FOR MAY 2026
DELETE FROM AttendanceDetails WHERE [Date] >= @StartDate AND [Date] <= @EndDate;
DELETE FROM AttendanceSummaries WHERE PeriodId = @PeriodId;
DELETE FROM TimeAttendanceRecords WHERE [Date] >= @StartDate AND [Date] <= @EndDate;

PRINT '1. Cleared old AttendanceSummaries, Details, and Raw Records.';

-- 2. SEED RAW TIME ATTENDANCE RECORDS (Check-In & Check-Out)
-- Generate 26 days of logs for each employee
WITH DateRange AS (
    SELECT @StartDate AS [Date]
    UNION ALL
    SELECT DATEADD(day, 1, [Date])
    FROM DateRange
    WHERE [Date] < @EndDate
)
-- Insert Check-In
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], [Location], DeviceInfo, CreatedAt)
SELECT 
    e.Id, d.[Date], 
    CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 08:00:00') AS DATETIME2), 
    'CheckIn', N'Văn phòng', 'System Seed', GETUTCDATE()
FROM Employees e
CROSS JOIN DateRange d
WHERE e.IsActive = 1 
AND DATEPART(DW, d.[Date]) < 7; -- Skip Sundays

WITH DateRange AS (
    SELECT @StartDate AS [Date]
    UNION ALL
    SELECT DATEADD(day, 1, [Date])
    FROM DateRange
    WHERE [Date] < @EndDate
)
-- Insert Check-Out
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], [Location], DeviceInfo, CreatedAt)
SELECT 
    e.Id, d.[Date], 
    CASE 
        WHEN DATEPART(DW, d.[Date]) IN (2, 4) THEN CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 19:30:00') AS DATETIME2) -- OT days
        ELSE CAST(CONCAT(FORMAT(d.[Date], 'yyyy-MM-dd'), ' 17:30:00') AS DATETIME2)
    END, 
    'CheckOut', N'Văn phòng', 'System Seed', GETUTCDATE()
FROM Employees e
CROSS JOIN DateRange d
WHERE e.IsActive = 1 
AND DATEPART(DW, d.[Date]) < 7; -- Skip Sundays

PRINT '2. Seeded Raw TimeAttendanceRecords (26 days/employee).';

-- 3. AGGREGATE INTO ATTENDANCE DETAILS (Daily breakdown)
INSERT INTO AttendanceDetails (
    EmployeeId, [Date], WorkShiftId, CheckInTime, CheckOutTime, 
    IsLate, IsEarlyLeave, WorkingHours, WorkingDays, OTHours, 
    [Status], CheckInCount, CheckOutCount, CreatedAt
)
SELECT 
    EmployeeId, WorkDate, 1, CAST(CheckIn AS TIME), CAST(CheckOut AS TIME),
    0, 0, 8.0, 1.0, 
    CASE WHEN CAST(CheckOut AS TIME) > '17:45:00' THEN 2.0 ELSE 0 END,
    N'Đúng giờ', 1, 1, GETUTCDATE()
FROM (
    SELECT 
        EmployeeId, [Date] AS WorkDate,
        MIN(CASE WHEN [Type] = 'CheckIn'  THEN [Timestamp] END) AS CheckIn,
        MAX(CASE WHEN [Type] = 'CheckOut' THEN [Timestamp] END) AS CheckOut
    FROM TimeAttendanceRecords
    WHERE [Date] >= @StartDate AND [Date] <= @EndDate
    GROUP BY EmployeeId, [Date]
) AS Raw
WHERE CheckIn IS NOT NULL;

PRINT '3. Generated AttendanceDetails.';

-- 4. AGGREGATE INTO ATTENDANCE SUMMARIES (Monthly totals)
INSERT INTO AttendanceSummaries (
    EmployeeId, PeriodId, TotalWorkingDays, AdjustedWorkingDays,
    LateDays, EarlyLeaveDays, AbsentDays, TotalWorkingHours, OvertimeHours,
    PaidLeaveDays, UnpaidLeaveDays, [Status], CreatedAt
)
SELECT 
    EmployeeId, @PeriodId, COUNT(*), SUM(WorkingDays),
    SUM(CASE WHEN IsLate = 1 THEN 1 ELSE 0 END),
    SUM(CASE WHEN IsEarlyLeave = 1 THEN 1 ELSE 0 END),
    GREATEST(0, 26 - COUNT(*)),
    SUM(WorkingHours), SUM(OTHours),
    0, 0, 0, GETUTCDATE() -- 0 = Draft (TimesheetStatus.Draft)
FROM AttendanceDetails
WHERE [Date] >= @StartDate AND [Date] <= @EndDate
GROUP BY EmployeeId;

PRINT '4. Generated AttendanceSummaries (Draft Status).';
PRINT '=========================================================================';
PRINT 'SUCCESS: All attendance data for May 2026 has been reset and re-seeded.';
PRINT 'Total Working Days: 26. Status: Draft.';
PRINT '=========================================================================';
GO
