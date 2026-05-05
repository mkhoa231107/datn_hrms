-- =====================================================
-- SỬA TOÀN BỘ HỆ SỐ LƯƠNG - CHẠY THEO THỨ TỰ
-- =====================================================

-- BƯỚC 1: Cập nhật DefaultCoefficient cho các chức vụ còn thiếu
UPDATE Positions SET DefaultCoefficient = 2.00, UpdatedAt = GETUTCDATE()
WHERE Id IN (20, 22);  -- Giám đốc khu vực (RSM)

UPDATE Positions SET DefaultCoefficient = 1.60, UpdatedAt = GETUTCDATE()
WHERE Id = 19;  -- Trưởng phòng sản xuất (PRD-MGR)

UPDATE Positions SET DefaultCoefficient = 1.40, UpdatedAt = GETUTCDATE()
WHERE Id = 24;  -- Quản đốc/Xưởng trưởng

UPDATE Positions SET DefaultCoefficient = 1.20, UpdatedAt = GETUTCDATE()
WHERE Id = 25;  -- Tổ trưởng/Ca trưởng

UPDATE Positions SET DefaultCoefficient = 1.30, UpdatedAt = GETUTCDATE()
WHERE Id IN (21, 23);  -- Trưởng nhóm kinh doanh (chưa có mã chuẩn)

-- =====================================================
-- BƯỚC 2: Reset Employee.Coefficient = 0 cho TẤT CẢ nhân viên
-- Để hệ thống tự lấy DefaultCoefficient từ Position
-- =====================================================
UPDATE Employees
SET Coefficient = 0, UpdatedAt = GETUTCDATE()
WHERE IsActive = 1;

-- =====================================================
-- BƯỚC 3: Kiểm tra kết quả sau khi sửa
-- =====================================================
SELECT 
    e.EmployeeCode,
    e.FullName,
    p.PositionName,
    p.PositionCode,
    e.Coefficient            AS [HeSo_NV],
    p.DefaultCoefficient     AS [HeSo_ChucVu],
    CASE 
        WHEN e.Coefficient > 0 THEN e.Coefficient 
        ELSE p.DefaultCoefficient 
    END                      AS [HeSo_SeDungTinhLuong],
    5310000 * CASE 
        WHEN e.Coefficient > 0 THEN e.Coefficient 
        ELSE p.DefaultCoefficient 
    END                      AS [LuongCoBan_DuKien],
    5310000 * CASE 
        WHEN e.Coefficient > 0 THEN e.Coefficient 
        ELSE p.DefaultCoefficient 
    END * 0.105              AS [BH_DuKien]
FROM Employees e
JOIN Positions p ON e.PositionId = p.Id
WHERE e.IsActive = 1
ORDER BY p.DefaultCoefficient DESC, e.EmployeeCode;
