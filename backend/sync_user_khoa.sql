USE HRMS_DATN;
GO

-- 1. Xóa các user từ 118 đến 122
DELETE FROM Users WHERE Id BETWEEN 118 AND 122;

-- 2. Xử lý Minh Khoa (Dời 123 -> 18 và đổi username)
-- Xóa user cũ tại ID 18 (nếu có) để lấy chỗ
DELETE FROM Users WHERE Id = 18;

-- Chèn Minh Khoa vào ID 18 với thông tin từ ID 123 (khoadeptrai)
SET IDENTITY_INSERT Users ON;
INSERT INTO Users (Id, Username, PasswordHash, Email, FullName, IsActive, CreatedAt, UpdatedAt)
SELECT 18, 'hr_rec_12', PasswordHash, Email, N'Đặng Phạm Minh Khoa', 1, CreatedAt, GETDATE()
FROM Users WHERE Id = 123;
SET IDENTITY_INSERT Users OFF;

-- 3. Xóa bản ghi cũ ID 123
DELETE FROM Users WHERE Id = 123;

-- 4. Cập nhật bảng Employees để trỏ đúng UserId mới cho Minh Khoa
UPDATE Employees SET UserId = 18 WHERE Id = 18;

-- Kiểm tra kết quả
SELECT Id, Username, FullName FROM Users WHERE Id = 18;
SELECT Id, FullName, UserId FROM Employees WHERE Id = 18;
GO
