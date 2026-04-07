USE HRMS_DATN;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    DECLARE @UserId INT;
    SELECT @UserId = Id FROM Users WHERE Username = 'hr_cb_02';

    IF @UserId IS NOT NULL
    BEGIN
        -- Xóa quyền Trưởng phòng (Nếu có)
        DELETE FROM UserRoles 
        WHERE UserId = @UserId 
          AND RoleId IN (SELECT Id FROM Roles WHERE RoleName IN ('DepartmentHead', 'Manager'));

        -- Đảm bảo có quyền Nhân viên (Employee)
        IF NOT EXISTS (
            SELECT 1 FROM UserRoles 
            WHERE UserId = @UserId 
              AND RoleId IN (SELECT Id FROM Roles WHERE RoleName = 'Employee')
        )
        BEGIN
            DECLARE @EmpRoleId INT;
            SELECT @EmpRoleId = Id FROM Roles WHERE RoleName = 'Employee';
            
            IF @EmpRoleId IS NOT NULL
                INSERT INTO UserRoles (UserId, RoleId) VALUES (@UserId, @EmpRoleId);
        END

        -- Kiểm tra xem bảng Departments có lỡ gán bạn này làm ManagerId không?
        DECLARE @EmpId INT;
        SELECT @EmpId = Id FROM Employees WHERE UserId = @UserId;
        
        IF @EmpId IS NOT NULL
        BEGIN
            UPDATE Departments 
            SET ManagerId = NULL 
            WHERE ManagerId = @EmpId;
        END

        PRINT 'Đã tước quyền Trưởng bộ phận thành công. Giờ hr_cb_02 chỉ là Nhân viên!';
    END
    ELSE
    BEGIN
        PRINT 'Không tìm thấy user hr_cb_02';
    END

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'CÓ LỖI: ' + ERROR_MESSAGE();
END CATCH;
GO
