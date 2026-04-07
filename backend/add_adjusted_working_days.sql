-- ============================================================
-- Add AdjustedWorkingDays column to AttendanceSummaries
-- Grace Period logic: đi trễ/về sớm → trừ 0.5 ngày công
-- ============================================================

USE HRMS_DB;
GO

-- 1. Thêm cột mới (nếu chưa tồn tại)
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('AttendanceSummaries') 
      AND name = 'AdjustedWorkingDays'
)
BEGIN
    ALTER TABLE AttendanceSummaries 
    ADD AdjustedWorkingDays DECIMAL(5,1) NOT NULL DEFAULT 0;
    PRINT 'Column AdjustedWorkingDays added successfully.';
END
ELSE
BEGIN
    PRINT 'Column AdjustedWorkingDays already exists, skipping.';
END
GO

-- 2. Migrate dữ liệu cũ: tính AdjustedWorkingDays cho các record đã có
-- Công thức: AdjustedWorkingDays = TotalWorkingDays - (LateDays * 0.5) - (EarlyLeaveDays * 0.5)
UPDATE AttendanceSummaries
SET AdjustedWorkingDays = CAST(TotalWorkingDays AS DECIMAL(5,1))
                         - (CAST(LateDays AS DECIMAL(5,1)) * 0.5)
                         - (CAST(EarlyLeaveDays AS DECIMAL(5,1)) * 0.5)
WHERE AdjustedWorkingDays = 0;  -- Chỉ update nếu chưa được tính

-- Đảm bảo không âm
UPDATE AttendanceSummaries
SET AdjustedWorkingDays = 0
WHERE AdjustedWorkingDays < 0;

PRINT 'AdjustedWorkingDays migrated for existing records.';
GO

SELECT 
    Id, EmployeeId, TotalWorkingDays, LateDays, EarlyLeaveDays, AdjustedWorkingDays
FROM AttendanceSummaries
ORDER BY Id;
GO
