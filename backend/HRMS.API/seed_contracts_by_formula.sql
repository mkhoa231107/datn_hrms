SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
-- SQL Script to recalculate all contract salaries based on the dynamic formula
-- Formula: BasicSalary = (RegionBaseSalary / 26) * Coefficient * 26
-- Standard RegionBaseSalary: 5,310,000 VNĐ (Vùng I - 2026)

DECLARE @RegionBaseSalary DECIMAL(18, 2) = 5310000;

-- 1. Update active Payroll Settings to ensure reference is correct
UPDATE PayrollSettings 
SET RegionBaseSalary = @RegionBaseSalary 
WHERE IsActive = 1;

-- 2. Update Employee BasicSalary based on their Position's Coefficient
-- If employee has a specific Coefficient (>0), use it; otherwise use Position's DefaultCoefficient
UPDATE e
SET e.BasicSalary = ROUND((@RegionBaseSalary / 26.0) * 
    CASE 
        WHEN e.Coefficient > 0 THEN e.Coefficient 
        ELSE ISNULL(p.DefaultCoefficient, 1.0) 
    END * 26.0, 0),
    e.UpdatedAt = GETUTCDATE()
FROM Employees e
JOIN Positions p ON e.PositionId = p.Id;

-- 3. Update ALL active contracts to match the calculated Employee BasicSalary
UPDATE ec
SET ec.BasicSalary = e.BasicSalary,
    ec.UpdatedAt = GETUTCDATE()
FROM EmployeeContracts ec
JOIN Employees e ON ec.EmployeeId = e.Id
WHERE ec.IsActive = 1 
  AND ec.Status = 5; -- Status Active (5)

-- 4. Verify results for top 10 employees
SELECT TOP 10 
    e.EmployeeCode, 
    e.FullName, 
    p.PositionName, 
    ISNULL(NULLIF(e.Coefficient, 0), p.DefaultCoefficient) as EffectiveCoefficient,
    e.BasicSalary as NewSalary
FROM Employees e
JOIN Positions p ON e.PositionId = p.Id
ORDER BY e.EmployeeCode;
