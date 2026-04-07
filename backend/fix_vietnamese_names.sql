USE [HRMS_DATN];
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. Fix Address
UPDATE [Employees]
SET [Address] = N'Hà Nội, Việt Nam';

-- 2. Fix Admin
UPDATE [Employees]
SET [FullName] = N'Quản trị hệ thống'
WHERE [EmployeeCode] = 'EMP-ADMIN';

UPDATE [Users]
SET [FullName] = N'Quản trị hệ thống'
WHERE [Username] = 'admin';

-- 3. Loop and fix Managers, DeptHeads, Employees
DECLARE @Names TABLE (Idx INT IDENTITY(1,1), FName NVARCHAR(50));
INSERT @Names(FName) VALUES
(N'An'),(N'Bình'),(N'Cường'),(N'Dũng'),(N'Giang'),
(N'Hải'),(N'Hoa'),(N'Hùng'),(N'Khoa'),(N'Lan'),
(N'Linh'),(N'Long'),(N'Mai'),(N'Nam'),(N'Nga'),
(N'Ngọc'),(N'Nhung'),(N'Phong'),(N'Phương'),(N'Quân'),
(N'Sơn'),(N'Tài'),(N'Thắng'),(N'Thu'),(N'Toàn'),
(N'Tuấn'),(N'Xuân'),(N'Yến'),(N'Đức'),(N'Hằng'),
(N'Tâm'),(N'Hạnh'),(N'Khánh'),(N'Minh'),(N'Thanh'),
(N'Thị'),(N'Vân'),(N'Việt'),(N'Diệp'),(N'Loan'),
(N'Trung'),(N'Hiếu'),(N'Duy'),(N'Hoàng'),(N'Quang'),
(N'Nhi'),(N'Trang'),(N'Thảo'),(N'Hương'),(N'Đạt'),
(N'Anh'),(N'Bảo'),(N'Chi'),(N'Đan'),(N'Gia'),
(N'Hà'),(N'Khang'),(N'Lâm'),(N'My'),(N'Ngân'),
(N'Oanh'),(N'Phú'),(N'Quyên'),(N'Sang'),(N'Thiên'),
(N'Uyên'),(N'Vinh'),(N'Vy'),(N'Bách'),(N'Cẩm'),
(N'Đào'),(N'Kim'),(N'Liên'),(N'Nghĩa'),(N'Phát'),
(N'Quốc'),(N'Sương'),(N'Thủy'),(N'Út'),(N'Vương'),
(N'Đông'),(N'Hiền'),(N'Lợi'),(N'Mận'),(N'Nhựt'),
(N'Phúc'),(N'Rằng'),(N'Sinh'),(N'Tiến'),(N'Vi'),
(N'Xanh'),(N'Bích'),(N'Cúc'),(N'Lộc'),(N'Huy'),
(N'Kiệt'),(N'Hào'),(N'Trinh'),(N'Thông'),(N'Trâm'),
(N'Tú'),(N'Nhân'),(N'Thành'),(N'Dương'),(N'Lệ'),
(N'Hồng'),(N'Phượng'),(N'Trọng'),(N'Hiệp'),(N'Khôi'),
(N'Mỹ'),(N'Tuyết'),(N'Cảnh'),(N'Tuệ'),(N'Bắc'),
(N'Doanh'),(N'Hảo'),(N'Lực'),(N'Tín'),(N'Kiên');
DECLARE @NameCount INT = (SELECT COUNT(*) FROM @Names);

DECLARE @EmpId INT, @DeptName NVARCHAR(200), @Username NVARCHAR(100), @Level INT, @NewName NVARCHAR(255);
DECLARE @Idx INT = 1;

DECLARE cur CURSOR FOR
SELECT e.Id, d.DepartmentName, u.Username, p.Level
FROM Employees e
JOIN Users u ON e.UserId = u.Id
JOIN Departments d ON e.DepartmentId = d.Id
JOIN Positions p ON e.PositionId = p.Id
WHERE u.Username != 'admin'
ORDER BY e.Id;

OPEN cur;
FETCH NEXT FROM cur INTO @EmpId, @DeptName, @Username, @Level;

WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @FName NVARCHAR(50);
    SELECT @FName = FName FROM @Names WHERE Idx = (@Idx % @NameCount) + 1;
    
    IF @Level = 1 AND @DeptName LIKE N'Phòng%'
    BEGIN
        SET @NewName = N'Trưởng phòng ' + REPLACE(@DeptName, N'Phòng ', N'') + N' - ' + @FName;
    END
    ELSE IF @Level = 1
    BEGIN
        SET @NewName = N'Trưởng BP ' + @DeptName + N' - ' + @FName;
    END
    ELSE
    BEGIN
        SET @NewName = N'NV ' + @DeptName + N' - ' + @FName;
    END

    UPDATE Employees SET FullName = @NewName WHERE Id = @EmpId;
    UPDATE Users SET FullName = @NewName WHERE Id = (SELECT UserId FROM Employees WHERE Id = @EmpId);
    
    SET @Idx = @Idx + 1;
    FETCH NEXT FROM cur INTO @EmpId, @DeptName, @Username, @Level;
END

CLOSE cur; DEALLOCATE cur;

-- Fix Department Names and Positions if they are corrupted
UPDATE Departments SET DepartmentName = N'Phòng Kế toán', Description = N'Quản lý tài chính, kế toán' WHERE DepartmentCode = 'ACC';
UPDATE Departments SET DepartmentName = N'Phòng Nhân sự', Description = N'Quản lý nhân sự, tuyển dụng' WHERE DepartmentCode = 'HR';
UPDATE Departments SET DepartmentName = N'Phòng Marketing', Description = N'Marketing, truyền thông' WHERE DepartmentCode = 'MKT';
UPDATE Departments SET DepartmentName = N'Phòng Sản xuất', Description = N'Sản xuất, kho bãi, QC' WHERE DepartmentCode = 'PRD';
UPDATE Departments SET DepartmentName = N'Phòng Kinh doanh', Description = N'Phát triển thị trường, bán hàng' WHERE DepartmentCode = 'SALES';

UPDATE Departments SET DepartmentName = N'Tổ Tuyển dụng', Description = N'Phụ trách tuyển dụng' WHERE DepartmentCode = 'HR-REC';
UPDATE Departments SET DepartmentName = N'Tổ Lương Thưởng (C&B)', Description = N'Chấm công, tính lương' WHERE DepartmentCode = 'HR-CB';
UPDATE Departments SET DepartmentName = N'Kế toán Thuế', Description = N'Báo cáo, quyết toán' WHERE DepartmentCode = 'ACC-TAX';
UPDATE Departments SET DepartmentName = N'Kế toán Nội bộ', Description = N'Thu chi nội bộ' WHERE DepartmentCode = 'ACC-INT';
UPDATE Departments SET DepartmentName = N'Kinh doanh Miền Bắc', Description = N'Khu vực phía Bắc' WHERE DepartmentCode = 'SALES-N';
UPDATE Departments SET DepartmentName = N'Kinh doanh Miền Nam', Description = N'Khu vực phía Nam' WHERE DepartmentCode = 'SALES-S';
UPDATE Departments SET DepartmentName = N'Digital Marketing', Description = N'Chạy Ads, SEO' WHERE DepartmentCode = 'MKT-DIG';
UPDATE Departments SET DepartmentName = N'Tổ chức Sự kiện', Description = N'Event offline' WHERE DepartmentCode = 'MKT-EVT';
UPDATE Departments SET DepartmentName = N'Xưởng Lắp ráp', Description = N'Lắp ráp sản phẩm' WHERE DepartmentCode = 'PRD-ASS';
UPDATE Departments SET DepartmentName = N'Quản lý Chất lượng', Description = N'Đảm bảo chất lượng' WHERE DepartmentCode = 'PRD-QA';

UPDATE Positions SET PositionName = N'Trưởng phòng Nhân sự' WHERE PositionCode = 'HR-DIR';
UPDATE Positions SET PositionName = N'Trưởng phòng Kế toán' WHERE PositionCode = 'ACC-DIR';
UPDATE Positions SET PositionName = N'Trưởng phòng Kinh doanh' WHERE PositionCode = 'SALES-DIR';
UPDATE Positions SET PositionName = N'Trưởng phòng Marketing' WHERE PositionCode = 'MKT-DIR';
UPDATE Positions SET PositionName = N'Trưởng phòng Sản xuất' WHERE PositionCode = 'PRD-DIR';

-- Example SubDepartments fix for positions
UPDATE Positions SET PositionName = N'Trưởng bộ phận Tổ Tuyển dụng' WHERE PositionCode = 'HR-REC-HEAD';
UPDATE Positions SET PositionName = N'Nhân viên Tổ Tuyển dụng' WHERE PositionCode = 'HR-REC-EMP';

-- Assuming standard pattern to fix positions
UPDATE Positions SET PositionName = N'Trưởng bộ phận ' + (SELECT DepartmentName FROM Departments WHERE Id = DepartmentId) WHERE Level = 1 AND DepartmentId IN (SELECT Id FROM Departments WHERE ParentDepartmentId IS NOT NULL);
UPDATE Positions SET PositionName = N'Nhân viên ' + (SELECT DepartmentName FROM Departments WHERE Id = DepartmentId) WHERE Level = 3;

PRINT '✅ Fixed all Vietnamese Names and Addresses!';
GO
