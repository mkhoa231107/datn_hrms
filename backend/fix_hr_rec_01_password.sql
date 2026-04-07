USE [HRMS_DATN];

-- Copy hash từ tài khoản admin (đang login được) sang hr_rec_01
-- Đảm bảo mật khẩu 100% khớp
UPDATE Users 
SET PasswordHash = (SELECT PasswordHash FROM Users WHERE Username = 'admin')
WHERE Username = 'hr_rec_01';

-- Kiểm tra kết quả
SELECT 
    u.Id,
    u.Username, 
    u.IsActive,
    LEFT(u.PasswordHash, 15) AS HashPrefix,
    ur.RoleId,
    r.RoleName
FROM Users u
LEFT JOIN UserRoles ur ON ur.UserId = u.Id
LEFT JOIN Roles r ON r.Id = ur.RoleId
WHERE u.Username = 'hr_rec_01';
