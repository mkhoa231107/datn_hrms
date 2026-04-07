-- Script thêm role Candidate vào database HRMS
-- Chạy script này nếu role Candidate chưa tồn tại

-- Thêm role Candidate (nếu chưa có)
IF NOT EXISTS (SELECT 1 FROM Roles WHERE RoleName = 'Candidate')
BEGIN
    INSERT INTO Roles (RoleName, Description, CreatedAt)
    VALUES ('Candidate', N'Ứng viên - Người tìm việc bên ngoài công ty', GETUTCDATE());
    PRINT 'Role Candidate đã được thêm thành công.';
END
ELSE
BEGIN
    PRINT 'Role Candidate đã tồn tại, bỏ qua.';
END

-- Kiểm tra kết quả
SELECT Id, RoleName, Description FROM Roles ORDER BY Id;
