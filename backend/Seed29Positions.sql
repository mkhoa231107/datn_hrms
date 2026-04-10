-- HRMS DATN Seeder (Chạy trên SQL Server Management Studio)
-- Sinh các khối phòng ban chức vụ và mức lương, ca mặc định

-- 1. Bổ sung các cột mới vào CSDL nếu chưa có
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'BaseSalaryMin')
    ALTER TABLE [Positions] ADD [BaseSalaryMin] decimal(18,2) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'BaseSalaryMax')
    ALTER TABLE [Positions] ADD [BaseSalaryMax] decimal(18,2) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'DefaultShiftId')
    ALTER TABLE [Positions] ADD [DefaultShiftId] int NULL CONSTRAINT FK_Positions_DefaultShiftId_WorkShifts FOREIGN KEY REFERENCES [WorkShifts](Id);

-- Lấy Organization
DECLARE @OrgId INT = (SELECT TOP 1 Id FROM Organizations);
IF @OrgId IS NULL 
BEGIN
    INSERT INTO Organizations (OrganizationName, TaxCode, CreatedAt, IsActive) VALUES (N'Dự Án HRMS DATN', '123456789', GETDATE(), 1);
    SET @OrgId = SCOPE_IDENTITY();
END

-- Lấy mã Ca Hành Chính
DECLARE @HC_ShiftId INT = (SELECT TOP 1 Id FROM WorkShifts WHERE ShiftName LIKE N'%Hành chính%' OR ShiftCode = 'HC');

-- 2. Đổ dữ liệu trung gian từ file vào Temp Table
DECLARE @PosData TABLE (
    BigDept NVarChar(100),
    SmallDept NVarChar(100),
    DeptCode NVarChar(50),
    PositionName NVarChar(100),
    PositionCode NVarChar(50),
    MinSalary Decimal(18,2),
    MaxSalary Decimal(18,2),
    ShiftKey NVarChar(50),
    Level Int
);

INSERT INTO @PosData VALUES 
(N'Ban Giám đốc', N'Quản trị', 'BOD', N'Giám đốc đại diện', 'BOD-DIR', 50000000, 100000000, N'Hành chính', 0),
(N'Phòng Nhân sự', N'Quản lý chung', 'HR', N'Trưởng phòng Nhân sự', 'HR-MGR', 25000000, 40000000, N'Hành chính', 1),
(N'Phòng Nhân sự', N'Tổ Tuyển dụng', 'HR-REC', N'Trưởng nhóm Tuyển dụng', 'HR-REC-LEAD', 15000000, 22000000, N'Hành chính', 2),
(N'Phòng Nhân sự', N'Tổ Tuyển dụng', 'HR-REC', N'Chuyên viên Tuyển dụng', 'HR-REC-SPEC', 9000000, 15000000, N'Hành chính', 3),
(N'Phòng Nhân sự', N'Tổ Lương thưởng', 'HR-CB', N'Trưởng nhóm C&B', 'HR-CB-LEAD', 15000000, 25000000, N'Hành chính', 2),
(N'Phòng Nhân sự', N'Tổ Lương thưởng', 'HR-CB', N'Chuyên viên C&B', 'HR-CB-SPEC', 10000000, 16000000, N'Hành chính', 3),

(N'Phòng Kế toán', N'Quản lý chung', 'ACC', N'Kế toán trưởng', 'ACC-MGR', 30000000, 50000000, N'Hành chính', 1),
(N'Phòng Kế toán', N'Kế toán Thuế', 'ACC-TAX', N'Trưởng nhóm Kế toán thuế', 'ACC-TAX-LEAD', 18000000, 25000000, N'Hành chính', 2),
(N'Phòng Kế toán', N'Kế toán Thuế', 'ACC-TAX', N'Nhân viên Kế toán thuế', 'ACC-TAX-SPEC', 10000000, 15000000, N'Hành chính', 3),
(N'Phòng Kế toán', N'Kế toán Nội bộ', 'ACC-INT', N'Trưởng nhóm Kế toán nội bộ', 'ACC-INT-LEAD', 15000000, 22000000, N'Hành chính', 2),
(N'Phòng Kế toán', N'Kế toán Nội bộ', 'ACC-INT', N'Kế toán viên nội bộ', 'ACC-INT-SPEC', 8000000, 13000000, N'Hành chính', 3),

(N'Phòng Marketing', N'Quản lý chung', 'MKT', N'Trưởng phòng Marketing', 'MKT-MGR', 20000000, 35000000, N'Hành chính', 1),
(N'Phòng Marketing', N'Digital MKT', 'MKT-DIG', N'Trưởng nhóm Digital', 'MKT-DIG-LEAD', 18000000, 28000000, N'Hành chính', 2),
(N'Phòng Marketing', N'Digital MKT', 'MKT-DIG', N'Chuyên viên Ads/SEO/Content', 'MKT-DIG-SPEC', 9000000, 16000000, N'Hành chính', 3),
(N'Phòng Marketing', N'Sự kiện', 'MKT-EVT', N'Trưởng nhóm Sự kiện', 'MKT-EVT-LEAD', 15000000, 22000000, N'Hành chính', 2),
(N'Phòng Marketing', N'Sự kiện', 'MKT-EVT', N'Nhân viên điều phối sự kiện', 'MKT-EVT-SPEC', 8000000, 14000000, N'Linh hoạt', 3),

(N'Kinh doanh', N'Miền Bắc', 'SALES-N', N'Giám đốc khu vực (RSM)', 'SALES-N-RSM', 25000000, 45000000, N'Hành chính', 1),
(N'Kinh doanh', N'Miền Bắc', 'SALES-N', N'Trưởng nhóm kinh doanh', 'SALES-N-LEAD', 12000000, 18000000, N'Linh hoạt', 2),
(N'Kinh doanh', N'Miền Bắc', 'SALES-N', N'Nhân viên kinh doanh', 'SALES-N-SPEC', 6000000, 9000000, N'Linh hoạt', 3),
(N'Kinh doanh', N'Miền Nam', 'SALES-S', N'Giám đốc khu vực (RSM)', 'SALES-S-RSM', 25000000, 45000000, N'Hành chính', 1),
(N'Kinh doanh', N'Miền Nam', 'SALES-S', N'Trưởng nhóm kinh doanh', 'SALES-S-LEAD', 12000000, 18000000, N'Linh hoạt', 2),
(N'Kinh doanh', N'Miền Nam', 'SALES-S', N'Nhân viên kinh doanh', 'SALES-S-SPEC', 6000000, 9000000, N'Linh hoạt', 3),

(N'Sản xuất', N'Quản lý chung', 'PRD', N'Trưởng phòng Sản xuất', 'PRD-MGR', 30000000, 50000000, N'Hành chính', 1),
(N'Sản xuất', N'Xưởng lắp ráp', 'PRD-ASS', N'Quản đốc/Xưởng trưởng', 'PRD-ASS-MGR', 20000000, 30000000, N'Hành chính', 2),
(N'Sản xuất', N'Xưởng lắp ráp', 'PRD-ASS', N'Tổ trưởng/Ca trưởng', 'PRD-ASS-LEAD', 10000000, 15000000, N'Ca luân phiên', 3),
(N'Sản xuất', N'Xưởng lắp ráp', 'PRD-ASS', N'Công nhân lắp ráp', 'PRD-ASS-SPEC', 5500000, 8000000, N'Ca luân phiên', 4),
(N'Sản xuất', N'Quản lý chất lượng', 'PRD-QA', N'Trưởng nhóm QA/QC', 'PRD-QA-LEAD', 18000000, 28000000, N'Hành chính', 2),
(N'Sản xuất', N'Quản lý chất lượng', 'PRD-QA', N'Nhân viên QA (Quy trình)', 'PRD-QA-SPEC', 10000000, 16000000, N'Hành chính', 3),
(N'Sản xuất', N'Quản lý chất lượng', 'PRD-QA', N'Nhân viên QC (Kiểm hàng)', 'PRD-QC-SPEC', 7000000, 11000000, N'Ca luân phiên', 3),

(N'Hành chính', N'Quản trị viên', 'ADM', N'Nhân viên IT/Admin', 'ADM-IT-ADMIN', 10000000, 20000000, N'Hành chính', 2);

-- 3. Đồng bộ (Cập nhật hoặc Thêm mới) dữ liệu Phòng Ban
MERGE Departments AS T
USING (SELECT DISTINCT DeptCode, CASE WHEN SmallDept = N'Quản lý chung' THEN BigDept ELSE BigDept + ' - ' + SmallDept END as DeptName FROM @PosData) AS S
ON T.DepartmentCode = S.DeptCode
WHEN MATCHED THEN
    UPDATE SET T.DepartmentName = S.DeptName
WHEN NOT MATCHED THEN
    INSERT (OrganizationId, DepartmentName, DepartmentCode, IsActive, CreatedAt)
    VALUES (@OrgId, S.DeptName, S.DeptCode, 1, GETDATE());

-- 4. BỔ SUNG: Xóa các chức vụ cũ / Không nằm trong danh sách mới
-- LƯU Ý MẠNH: Nếu có Nhân viên đang dùng chức vụ cũ, ta gán đỡ họ sang 1 chức vụ mới (Ví dụ: Nhân viên IT/Admin) để tránh lỗi Khóa Ngoại
DECLARE @FallbackPositionId INT;

-- Đảm bảo chức vụ Fallback có tồn tại sẵn trước
IF NOT EXISTS (SELECT 1 FROM Positions WHERE PositionCode = 'ADM-IT-ADMIN')
BEGIN
    INSERT INTO Positions (PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt)
    VALUES (N'Nhân viên IT/Admin', 'ADM-IT-ADMIN', 2, (SELECT TOP 1 Id FROM Departments WHERE DepartmentCode = 'ADM'), 1, GETDATE());
END
SET @FallbackPositionId = (SELECT TOP 1 Id FROM Positions WHERE PositionCode = 'ADM-IT-ADMIN');

-- Chuyển HRMS Employees sang Position Fallback nếu Position hiện tại chuẩn bị bị xóa
UPDATE Employees
SET PositionId = @FallbackPositionId
WHERE PositionId IN (
    SELECT Id FROM Positions WHERE PositionCode NOT IN (SELECT PositionCode FROM @PosData)
);

-- Bây giờ ta an toàn xóa các chức vụ thừa
DELETE FROM Positions WHERE PositionCode NOT IN (SELECT PositionCode FROM @PosData);

-- 5. Đồng bộ (Cập nhật mức lương, đổi ca) cho 29 Chức Vụ hiện tại
MERGE Positions AS T
USING (
    SELECT p.PositionName, p.PositionCode, d.Id as DepartmentId, p.MinSalary, p.MaxSalary, p.ShiftKey, p.Level
    FROM @PosData p
    JOIN Departments d ON p.DeptCode = d.DepartmentCode
) AS S
ON T.PositionCode = S.PositionCode AND T.DepartmentId = S.DepartmentId
WHEN MATCHED THEN
    UPDATE SET 
        T.PositionName = S.PositionName,
        T.BaseSalaryMin = S.MinSalary, 
        T.BaseSalaryMax = S.MaxSalary,
        T.DefaultShiftId = CASE WHEN S.ShiftKey = N'Hành chính' THEN @HC_ShiftId ELSE NULL END
WHEN NOT MATCHED THEN
    INSERT (PositionName, PositionCode, Level, DepartmentId, IsActive, CreatedAt, BaseSalaryMin, BaseSalaryMax, DefaultShiftId)
    VALUES (S.PositionName, S.PositionCode, S.Level, S.DepartmentId, 1, GETDATE(), S.MinSalary, S.MaxSalary, CASE WHEN S.ShiftKey = N'Hành chính' THEN @HC_ShiftId ELSE NULL END);

PRINT N'Hoàn tất Xóa cũ, Tái tạo 29 vị trí chuẩn mực và thiết lập lương cơ bản!';
