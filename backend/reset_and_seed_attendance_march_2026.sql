USE [HRMS_DATN];
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- =========================================================
-- 1. XOÁ LỊCH CA & NGÀY CÔNG (TRÁNH LỖI FK)
-- =========================================================
DELETE FROM TimeAdjustmentRequests;
DELETE FROM AttendanceSummaries;
DELETE FROM TimeAttendanceRecords;
DELETE FROM WorkSchedules;

PRINT '✅ 1. Đã xoá sạch lịch làm việc và ngày công cũ.';

-- =========================================================
-- 2. TẠO LỊCH CA Hành Chính CHO TOÀN BỘ NHÂN VIÊN THÁNG 3/2026
-- =========================================================
DECLARE @StartDate DATE = '2026-03-01';
DECLARE @EndDate DATE = '2026-03-31';

DECLARE @HcShiftId INT;
SELECT TOP 1 @HcShiftId = Id FROM WorkShifts WHERE ShiftCode = 'HC';

DECLARE @PeriodId INT;
SELECT TOP 1 @PeriodId = Id FROM SchedulePeriods 
WHERE StartDate <= @StartDate AND EndDate >= @EndDate;

-- Cung cấp ID cứng nếu chưa seed SchedulePeriods
IF @PeriodId IS NULL
BEGIN
    INSERT INTO SchedulePeriods (PeriodName, StartDate, EndDate, IsActive, CreatedAt)
    VALUES (N'Kỳ công tháng 3/2026', '2026-03-01', '2026-03-31', 1, GETUTCDATE());
    SET @PeriodId = SCOPE_IDENTITY();
END

IF @HcShiftId IS NOT NULL AND @PeriodId IS NOT NULL
BEGIN
    INSERT INTO WorkSchedules (EmployeeId, WorkingDate, WorkShiftId, PeriodId, CreatedAt)
    SELECT e.Id, d.DateVal, @HcShiftId, @PeriodId, GETUTCDATE()
    FROM Employees e
    CROSS JOIN (
        SELECT DATEADD(day, number, @StartDate) AS DateVal
        FROM master.dbo.spt_values
        WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
    ) d
    WHERE DATEPART(dw, d.DateVal) NOT IN (1, 7); -- 1: Chủ Nhật, 7: Thứ 7
    
    PRINT '✅ 2. Đã thêm lịch ca cho toàn bộ nhân viên tháng 3/2026.';
END

-- =========================================================
-- 3. THÊM CHẤM CÔNG CHECK-IN (8:00) / CHECK-OUT (17:00) 
-- =========================================================
INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt)
SELECT e.Id, d.DateVal, DATEADD(hour, 8, CAST(d.DateVal AS DATETIME)), 'CheckIn', N'Văn phòng', 'SQL Script', GETUTCDATE()
FROM Employees e
CROSS JOIN (
    SELECT DATEADD(day, number, @StartDate) AS DateVal
    FROM master.dbo.spt_values
    WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
) d
WHERE DATEPART(dw, d.DateVal) NOT IN (1, 7);

INSERT INTO TimeAttendanceRecords (EmployeeId, [Date], [Timestamp], [Type], Location, DeviceInfo, CreatedAt)
SELECT e.Id, d.DateVal, DATEADD(hour, 17, CAST(d.DateVal AS DATETIME)), 'CheckOut', N'Văn phòng', 'SQL Script', GETUTCDATE()
FROM Employees e
CROSS JOIN (
    SELECT DATEADD(day, number, @StartDate) AS DateVal
    FROM master.dbo.spt_values
    WHERE type = 'P' AND number <= DATEDIFF(day, @StartDate, @EndDate)
) d
WHERE DATEPART(dw, d.DateVal) NOT IN (1, 7);

PRINT '✅ 3. Đã chấm đầy đủ công sáng và chiều tháng 3 cho toàn bộ nhân viên.';

COMMIT TRANSACTION;
GO
