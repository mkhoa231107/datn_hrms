-- =====================================================
-- SCRIPT XÓA & RESET DỮ LIỆU BẢNG LƯƠNG
-- Mục đích: Xóa sạch dữ liệu tính lương để tính lại
-- Lưu ý: KHÔNG xóa PayrollSettings (giữ cấu hình)
-- Chạy theo thứ tự từ trên xuống (FK dependency)
-- =====================================================

BEGIN TRANSACTION;

-- 1. Xóa toàn bộ phiếu lương chi tiết (PayrollRecords)
--    Phải xóa trước vì FK tham chiếu đến PayrollPeriods
DELETE FROM "PayrollRecords";
PRINT N'✓ Đã xóa PayrollRecords';

-- 2. Reset trạng thái PayrollPeriods về Open để tính lại
--    (Không xóa kỳ lương, chỉ mở khóa để tính lại)
UPDATE "PayrollPeriods"
SET 
    "Status"         = 0,        -- 0 = Open
    "ProcessedById"  = NULL,
    "ReviewedById"   = NULL,
    "ReviewedAt"     = NULL,
    "ApprovedById"   = NULL,
    "ApprovedAt"     = NULL,
    "UpdatedAt"      = GETUTCDATE();
PRINT N'✓ Đã reset PayrollPeriods về trạng thái Open';

-- 3. Cập nhật PayrollSettings: Áp dụng mức lương tối thiểu vùng 2026
--    (Vùng I = 5,310,000 | Vùng II = 4,730,000 | Vùng III = 4,140,000 | Vùng IV = 3,700,000)
UPDATE "PayrollSettings"
SET
    "RegionBaseSalary" = 5310000,   -- Vùng I (mặc định, chỉnh lại nếu dùng vùng khác)
    "CommonBaseSalary" = 2340000,   -- Lương cơ sở nhà nước (từ 07/2024)
    "UpdatedAt"        = GETUTCDATE()
WHERE "IsActive" = 1;
PRINT N'✓ Đã cập nhật PayrollSettings: RegionBaseSalary = 5,310,000 (Vùng I 2026)';

-- Kiểm tra kết quả
SELECT 
    'PayrollRecords còn lại'    AS [Kiểm tra],
    COUNT(*)                    AS [SốBản ghi]
FROM "PayrollRecords"
UNION ALL
SELECT 
    'PayrollPeriods (trạng thái)',
    COUNT(*) 
FROM "PayrollPeriods" WHERE "Status" = 0
UNION ALL
SELECT 
    'PayrollSettings (đang active)',
    COUNT(*)
FROM "PayrollSettings" WHERE "IsActive" = 1;

COMMIT TRANSACTION;

-- =====================================================
-- NẾU MUỐN XÓA HOÀN TOÀN CẢ KỲ LƯƠNG (tuỳ chọn):
-- Bỏ comment 2 dòng dưới nếu muốn xóa luôn PayrollPeriods
-- DELETE FROM "PayrollRecords";
-- DELETE FROM "PayrollPeriods";
-- =====================================================
