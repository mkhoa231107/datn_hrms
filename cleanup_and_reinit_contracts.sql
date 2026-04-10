USE [HRMS_DATN];
GO

-- 1. DELETE ALL CONTRACT DATA
PRINT 'Deleting old batches and contracts...';
DELETE FROM [ContractBatches];
DELETE FROM [EmployeeContracts];

-- 2. RE-INITIALIZE CONTRACTS FOR ALL EMPLOYEES
PRINT 'Initializing fresh contracts for all active employees...';

INSERT INTO [EmployeeContracts] (
    [EmployeeId],
    [ContractNumber],
    [ContractType],
    [StartDate],
    [EndDate],
    [BasicSalary],
    [JobDescription],
    [WorkLocation],
    [IsActive],
    [Status],
    [SignedBy],
    [SignedDate],
    [Notes],
    [ShiftId],
    [TargetDepartmentId],
    [TargetPositionId],
    [CreatedAt],
    [UpdatedAt]
)
SELECT 
    e.Id,
    'HDLD/2026/' + e.EmployeeCode,
    2, -- FixedTerm
    CASE 
        WHEN e.JoinDate < '2026-01-01' THEN '2026-01-01'
        ELSE e.JoinDate
    END,
    DATEADD(year, 1, 
        CASE 
            WHEN e.JoinDate < '2026-01-01' THEN '2026-01-01'
            ELSE e.JoinDate
        END
    ),
    ISNULL(p.BaseSalaryMin, 10000000), -- Fallback to 10M
    N'Thực hiện các công việc chuyên môn theo mô tả công việc của vị trí ' + p.PositionName + N' tại đơn vị.',
    N'Văn phòng chính',
    1, -- IsActive
    5, -- Active status (Status)
    N'Giám đốc Nhân sự',
    GETUTCDATE(),
    N'Khởi tạo mẫu hợp đồng đồng bộ hệ thống 2026',
    ISNULL(p.DefaultShiftId, (SELECT TOP 1 Id FROM WorkShifts)),
    e.DepartmentId,
    e.PositionId,
    GETUTCDATE(),
    NULL
FROM [Employees] e
JOIN [Positions] p ON e.PositionId = p.Id
WHERE e.IsActive = 1;

PRINT 'Completed! ' + CAST(@@ROWCOUNT AS VARCHAR) + ' contracts initialized.';
GO
