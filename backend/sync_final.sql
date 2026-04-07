USE [HRMS_DATN];
GO

-- 1. Xóa các nhân viên thừa từ ID 125 đến 130
DELETE FROM Employees WHERE Id BETWEEN 125 AND 130;

-- 2. Đảm bảo bản ghi Employee của Khoa trỏ đúng vào UserId 18
-- Tìm Employee có mã HR-REC-12 hoặc có tên Khoa mang mã code HR-REC
UPDATE Employees 
SET UserId = 18,
    FullName = N'Đặng Phạm Minh Khoa',
    PersonalEmail = 'khoadeptrai231107@gmail.com'
WHERE EmployeeCode = 'HR-REC-12';

-- Nếu chưa có bản ghi HR-REC-12 thì cập nhật bản ghi nào đang có tên Khoa
IF @@ROWCOUNT = 0
BEGIN
    UPDATE Employees SET UserId = 18 WHERE FullName LIKE N'%Khoa%' AND DepartmentId = (SELECT Id FROM Departments WHERE DepartmentCode = 'HR-REC');
END

-- 3. Sửa font cho bảng Users (Cho chắc chắn)
UPDATE Users SET FullName = N'Đặng Phạm Minh Khoa' WHERE Id = 18;

-- 4. Kiểm tra lại sự liên kết
SELECT u.Id as UserId, u.Username, e.Id as EmpId, e.FullName, e.UserId as LinkedUserId
FROM Users u
JOIN Employees e ON u.Id = e.UserId
WHERE u.Username = 'hr_rec_12';
GO
