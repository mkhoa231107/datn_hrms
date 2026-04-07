USE [HRMS_DATN];
GO

-- Sửa tên cho User ID 18
UPDATE [Users] 
SET [FullName] = N'Đặng Phạm Minh Khoa' 
WHERE [Id] = 18;

-- Sửa tên và Email cho Employee liên kết với User ID 18
UPDATE [Employees] 
SET [FullName] = N'Đặng Phạm Minh Khoa', 
    [PersonalEmail] = 'khoadeptrai231107@gmail.com' 
WHERE [UserId] = 18;

-- Kiểm tra lại kết quả
SELECT u.Id, u.Username, u.FullName as UserFullName, e.FullName as EmpFullName, e.PersonalEmail
FROM Users u
LEFT JOIN Employees e ON u.Id = e.UserId
WHERE u.Id = 18;
GO
