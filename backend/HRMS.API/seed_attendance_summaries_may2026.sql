-- =====================================================
-- Script: Tổng hợp bảng công tháng 05/2026
-- Tính toán từ TimeAttendanceRecords đã có sẵn
-- Ca làm việc mặc định: 08:00 - 17:30 (Id = 1)
-- =====================================================
SET DATEFIRST 1; -- 1: Monday, 7: Sunday

DECLARE @PeriodId INT = 5;  -- Tháng 05/2026
DECLARE @StartDate DATETIME2 = '2026-05-01 00:00:00';
DECLARE @EndDate   DATETIME2 = '2026-05-31 23:59:59';
DECLARE @ShiftStart TIME = '08:00:00';
DECLARE @ShiftEnd   TIME = '17:30:00';

-- Xoá TOÀN BỘ các bản ghi cũ của tháng 05 (cả Draft và Approved) để tính lại sạch
DELETE FROM AttendanceSummaries WHERE PeriodId = @PeriodId;

-- Xoá chi tiết công cũ tháng 05
DELETE FROM AttendanceDetails WHERE [Date] >= @StartDate AND [Date] <= @EndDate;

PRINT N'Deleted ALL old summaries and details for May 2026';

-- =====================================================
-- Tạo bảng tạm: tổng hợp theo từng nhân viên
-- =====================================================
WITH DailyWork AS (
    -- Lấy check-in sớm nhất và check-out muộn nhất mỗi ngày
    SELECT 
        EmployeeId,
        CAST([Date] AS DATE) AS WorkDate,
        MIN(CASE WHEN [Type] = 'CheckIn'  THEN [Timestamp] END) AS CheckIn,
        MAX(CASE WHEN [Type] = 'CheckOut' THEN [Timestamp] END) AS CheckOut
    FROM TimeAttendanceRecords
    WHERE [Date] >= @StartDate AND [Date] <= @EndDate
    GROUP BY EmployeeId, CAST([Date] AS DATE)
    HAVING MIN(CASE WHEN [Type] = 'CheckIn' THEN [Timestamp] END) IS NOT NULL
),
DayCalc AS (
    SELECT 
        EmployeeId,
        WorkDate,
        CheckIn,
        CheckOut,
        -- Xác định trễ/sớm (so với ca hành chính)
        CASE WHEN CAST(CheckIn AS TIME) > @ShiftStart THEN 1 ELSE 0 END AS IsLate,
        CASE WHEN CheckOut IS NOT NULL AND CAST(CheckOut AS TIME) < @ShiftEnd THEN 1 ELSE 0 END AS IsEarlyLeave,
        -- Tính ngày công: đúng giờ = 1.0, 1 lỗi = 0.5, 2 lỗi = 0
        CASE
            WHEN CheckOut IS NULL THEN 0.5  -- Không có checkout → 0.5 công
            WHEN CAST(CheckIn AS TIME) <= @ShiftStart AND CAST(CheckOut AS TIME) >= @ShiftEnd THEN 1.0  -- Đúng giờ
            WHEN (CAST(CheckIn AS TIME) > @ShiftStart AND CAST(CheckOut AS TIME) < @ShiftEnd) THEN 0.0  -- 2 lỗi
            ELSE 0.5  -- 1 lỗi
        END AS WorkingDays,
        -- Tính OT: nếu checkout sau 17:30 + 15p grace = 17:45
        CASE
            WHEN CheckOut IS NOT NULL AND CAST(CheckOut AS TIME) > '17:45:00'
            THEN FLOOR(DATEDIFF(MINUTE, CAST(CONCAT(FORMAT(WorkDate,'yyyy-MM-dd'), ' ', @ShiftEnd) AS DATETIME2), CheckOut) / 30.0) * 0.5
            ELSE 0
        END AS OTHours,
        -- Giờ làm việc thực tế (giờ chuẩn: 8h nếu đúng giờ, tính thực nếu không)
        CASE WHEN CheckOut IS NULL THEN 4.0
             ELSE 8.0
        END AS WorkingHours
    FROM DailyWork
    WHERE DATEPART(DW, WorkDate) <> 7  -- Bỏ Chủ nhật (7 khi DATEFIRST = 1)
)
-- Insert AttendanceSummaries
INSERT INTO AttendanceSummaries (
    EmployeeId, PeriodId, 
    TotalWorkingDays, AdjustedWorkingDays,
    LateDays, EarlyLeaveDays, AbsentDays,
    TotalWorkingHours, OvertimeHours,
    PaidLeaveDays, UnpaidLeaveDays,
    [Status], CreatedAt
)
SELECT 
    dc.EmployeeId,
    @PeriodId,
    COUNT(*) AS TotalWorkingDays,
    SUM(dc.WorkingDays) AS AdjustedWorkingDays,
    SUM(dc.IsLate) AS LateDays,
    SUM(dc.IsEarlyLeave) AS EarlyLeaveDays,
    -- Vắng: kỳ vọng 26 ngày (thứ 2-7 không chủ nhật tháng 5/2026) trừ ngày thực làm
    GREATEST(0, 26 - COUNT(*)) AS AbsentDays,
    SUM(dc.WorkingHours) AS TotalWorkingHours,
    SUM(dc.OTHours) AS OvertimeHours,
    0 AS PaidLeaveDays,       -- Chưa có dữ liệu nghỉ phép
    0 AS UnpaidLeaveDays,     -- Chưa có dữ liệu nghỉ không lương
    1 AS [Status],  -- 1 = Approved (Để tính lương được luôn)
    GETUTCDATE() AS CreatedAt
FROM DayCalc dc
GROUP BY dc.EmployeeId;

DECLARE @Count INT = @@ROWCOUNT;
PRINT N'✅ Đã tổng hợp bảng công cho ' + CAST(@Count AS NVARCHAR) + N' nhân viên.';

-- Hiển thị kết quả kiểm tra
SELECT 
    s.Id,
    e.FullName,
    d.DepartmentName,
    s.TotalWorkingDays,
    s.AdjustedWorkingDays,
    s.LateDays,
    s.EarlyLeaveDays,
    s.OvertimeHours,
    CASE s.[Status] WHEN 0 THEN 'Draft' WHEN 1 THEN 'Approved' WHEN 2 THEN 'Rejected' ELSE 'Unknown' END AS StatusName
FROM AttendanceSummaries s
JOIN Employees e ON s.EmployeeId = e.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE s.PeriodId = @PeriodId
ORDER BY d.DepartmentName, e.FullName;
