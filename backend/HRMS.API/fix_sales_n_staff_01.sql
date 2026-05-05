SET QUOTED_IDENTIFIER ON;
GO

-- Fix Employee sales_n_staff_01 (EmployeeId=7): 
-- Đổi PositionId từ 5 (Trưởng nhóm kinh doanh) sang 6 (Nhân viên kinh doanh)
UPDATE Employees 
SET PositionId = 6,
    UpdatedAt = GETUTCDATE()
WHERE Id = 7;

-- Fix Contract (ContractId=3): 
-- Đổi lương từ 6.903.000 sang 10.000.000 và sửa TargetPositionId
UPDATE EmployeeContracts
SET BasicSalary = 10000000,
    TargetPositionId = 6,
    UpdatedAt = GETUTCDATE()
WHERE Id = 3 AND EmployeeId = 7;

PRINT 'Done. Verifying...';

-- Verify
SELECT 
    u.Username,
    e.Id AS EmployeeId, 
    e.FullName, 
    e.PositionId,
    p.PositionName,
    ec.Id AS ContractId, 
    ec.BasicSalary,
    ec.TargetPositionId,
    ec.Status
FROM Users u
JOIN Employees e ON e.UserId = u.Id
JOIN Positions p ON p.Id = e.PositionId
JOIN EmployeeContracts ec ON ec.EmployeeId = e.Id
WHERE u.Username = 'sales_n_staff_01';
