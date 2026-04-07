USE [HRMS_DATN];
SET XACT_ABORT ON;

-- =========================================================
-- MỤC TIÊU: Bơm AttendanceSummaries tháng 3/2026
-- cho TOÀN BỘ nhân viên thuộc phòng REC và CB
-- (Status = Draft = 1) để Trưởng BP có thể vào Chốt công
-- =========================================================

-- 1. Lấy PeriodId tháng 3/2026
DECLARE @PeriodId INT;
SELECT TOP 1 @PeriodId = Id FROM SchedulePeriods 
WHERE StartDate <= '2026-03-01' AND EndDate >= '2026-03-31';

-- Tạo kỳ nếu chưa có
IF @PeriodId IS NULL
BEGIN
    DECLARE @OrgId2 INT; SELECT TOP 1 @OrgId2 = Id FROM Organizations;
    INSERT INTO SchedulePeriods (PeriodName, StartDate, EndDate, IsLocked, OrganizationId, CreatedAt)
    VALUES (N'Kỳ công tháng 3/2026', '2026-03-01', '2026-03-31', 0, @OrgId2, GETUTCDATE());
    SET @PeriodId = SCOPE_IDENTITY();
    PRINT 'Đã tạo kỳ công tháng 3/2026, ID = ' + CAST(@PeriodId AS NVARCHAR);
END
ELSE
    PRINT 'Kỳ công tháng 3/2026 đã tồn tại, ID = ' + CAST(@PeriodId AS NVARCHAR);

-- 2. Lấy danh sách phòng REC và CB
DECLARE @TargetDepts TABLE (DeptId INT, DeptCode NVARCHAR(50));
INSERT INTO @TargetDepts
SELECT Id, DepartmentCode FROM Departments 
WHERE DepartmentCode LIKE '%REC%' OR DepartmentCode LIKE '%CB%';

PRINT 'Phòng ban mục tiêu:';
SELECT * FROM @TargetDepts;

-- 3. Xóa AttendanceSummaries cũ (tháng 3) của các phòng này để tránh trùng
DELETE FROM AttendanceSummaries 
WHERE PeriodId = @PeriodId 
  AND EmployeeId IN (SELECT Id FROM Employees WHERE DepartmentId IN (SELECT DeptId FROM @TargetDepts));
PRINT 'Đã xóa dữ liệu AttendanceSummaries cũ.';

-- 4. Đếm số ngày làm việc chuẩn tháng 3/2026 (T2-T6, không tính CN và T7)
-- Tháng 3/2026: T2=2,3,4,5,6; tuần có 23 ngày làm việc
DECLARE @StandardDays INT = 23; -- 23 ngày công chuẩn T3/2026

-- 5. Chèn AttendanceSummaries cho tất cả nhân viên trong phòng REC và CB
BEGIN TRANSACTION;

INSERT INTO AttendanceSummaries (
    EmployeeId, PeriodId, 
    TotalWorkingDays, LateDays, EarlyLeaveDays, AbsentDays,
    TotalWorkingHours, OvertimeHours,
    [Status], CreatedAt)
SELECT 
    e.Id,
    @PeriodId,
    -- Ngày công: hầu hết đủ, một vài người vắng 1-2 ngày (random dựa trên Id)
    @StandardDays - (e.Id % 3),           -- 20, 21, hoặc 23 ngày
    e.Id % 2,                              -- 0 hoặc 1 ngày đi muộn
    0,                                     -- Không về sớm
    (e.Id % 3),                            -- 0, 1 hoặc 2 ngày vắng
    -- Giờ làm: (ngày công - 1 giờ nghỉ trưa) * 8 giờ
    CAST((@StandardDays - (e.Id % 3)) * 8 AS DECIMAL(10,2)),
    -- Tăng ca: một số người có OT (Trưởng bộ phận và vài người khác)
    CASE 
        WHEN e.Id % 4 = 0 THEN 4.0  -- 4 tiếng OT
        WHEN e.Id % 4 = 1 THEN 2.0  -- 2 tiếng OT
        ELSE 0.0                     -- Không OT
    END,
    1, -- Draft = 1
    GETUTCDATE()
FROM Employees e
WHERE e.DepartmentId IN (SELECT DeptId FROM @TargetDepts)
  AND e.IsActive = 1;

DECLARE @Inserted INT = @@ROWCOUNT;
COMMIT TRANSACTION;

PRINT '✅ Đã chèn ' + CAST(@Inserted AS NVARCHAR) + ' bản ghi AttendanceSummaries (Status=Draft).';
PRINT '   → Trưởng BP đăng nhập, vào "Duyệt công BP" → chọn Tháng 3/2026 sẽ thấy danh sách.';

-- 6. Kiểm tra kết quả
SELECT 
    e.EmployeeCode,
    e.FullName,
    d.DepartmentCode,
    s.TotalWorkingDays,
    s.OvertimeHours,
    CASE s.[Status] WHEN 1 THEN 'Draft' WHEN 2 THEN 'Chờ chốt' WHEN 4 THEN 'Đã duyệt' ELSE 'Khác' END AS TrangThai
FROM AttendanceSummaries s
JOIN Employees e ON s.EmployeeId = e.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE s.PeriodId = @PeriodId
  AND e.DepartmentId IN (SELECT DeptId FROM @TargetDepts)
ORDER BY d.DepartmentCode, e.EmployeeCode;
