-- Seed HC (Office) schedules for ALL non-production employees for April 2026
-- PeriodId 4 = April 2026

DECLARE @PeriodId INT = 4;
DECLARE @StartDate DATE = '2026-04-01';
DECLARE @EndDate DATE = '2026-04-30';
DECLARE @ShiftId INT = 1; -- HC Shift

PRINT 'Seeding office schedules for April 2026...';

INSERT INTO WorkSchedules (EmployeeId, WorkingDate, WorkShiftId, PeriodId, CreatedAt, UpdatedAt)
SELECT 
    e.Id,
    d.SelectedDate,
    @ShiftId,
    @PeriodId,
    GETUTCDATE(),
    GETUTCDATE()
FROM Employees e
CROSS JOIN (
    SELECT DATEADD(day, n, @StartDate) AS SelectedDate
    FROM (
        SELECT TOP (DATEDIFF(day, @StartDate, @EndDate) + 1) 
               ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) - 1 AS n
        FROM sys.objects s1 CROSS JOIN sys.objects s2
    ) nums
) d
WHERE e.DepartmentId <> 14 -- Exclude PRD-ASS
AND DATEPART(weekday, d.SelectedDate) <> 1 -- Exclude Sunday
AND NOT EXISTS (
    SELECT 1 FROM WorkSchedules ws 
    WHERE ws.EmployeeId = e.Id AND ws.WorkingDate = d.SelectedDate
);

PRINT 'Success! New schedules added: ' + CAST(@@ROWCOUNT AS VARCHAR);
