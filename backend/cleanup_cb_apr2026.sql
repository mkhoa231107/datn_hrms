
-- 1. Tìm các EmployeeId thuộc tổ C&B (DepartmentId = 7)
DECLARE @CBEmployeeIds TABLE (Id INT);
INSERT INTO @CBEmployeeIds SELECT Id FROM Employees WHERE DepartmentId = 7;

-- 2. Tìm PeriodId cho tháng 4/2026
DECLARE @SchedulePeriodId INT;
SELECT @SchedulePeriodId = Id FROM SchedulePeriods WHERE PeriodName LIKE '%04/2026%' OR PeriodName LIKE '%4/2026%';

DECLARE @PayrollPeriodId INT;
SELECT @PayrollPeriodId = Id FROM PayrollPeriods WHERE Name LIKE '%04/2026%' OR Name LIKE '%4/2026%';

-- 3. Xoá dữ liệu tính lương (PayrollRecords)
IF @PayrollPeriodId IS NOT NULL
BEGIN
    DELETE FROM PayrollRecords 
    WHERE PayrollPeriodId = @PayrollPeriodId 
    AND EmployeeId IN (SELECT Id FROM @CBEmployeeIds);
    PRINT '✅ Đã xoá dữ liệu bảng lương tháng 4 tổ C&B (PeriodId: ' + CAST(@PayrollPeriodId AS VARCHAR) + ')';
END
ELSE
BEGIN
    PRINT '⚠️ Không tìm thấy kỳ lương tháng 4/2026';
END

-- 4. Xoá dữ liệu ngày công (AttendanceSummaries)
IF @SchedulePeriodId IS NOT NULL
BEGIN
    DELETE FROM AttendanceSummaries 
    WHERE PeriodId = @SchedulePeriodId 
    AND EmployeeId IN (SELECT Id FROM @CBEmployeeIds);
    PRINT '✅ Đã xoá dữ liệu tổng hợp công tháng 4 tổ C&B (PeriodId: ' + CAST(@SchedulePeriodId AS VARCHAR) + ')';
END
ELSE
BEGIN
    PRINT '⚠️ Không tìm thấy kỳ công tháng 4/2026';
END

-- 5. Xoá dữ liệu chấm công chi tiết (AttendanceDetails) nếu có trong tháng 4
DELETE FROM AttendanceDetails
WHERE EmployeeId IN (SELECT Id FROM @CBEmployeeIds)
AND [Date] >= '2026-04-01' AND [Date] <= '2026-04-30';
PRINT '✅ Đã xoá dữ liệu chấm công chi tiết tháng 4 tổ C&B';
