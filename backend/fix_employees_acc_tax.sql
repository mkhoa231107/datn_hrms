USE HRMS_DATN;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    -- =========================================================
    -- PHẦN 1: TÌM VÀ CHUẨN BỊ XÓA CÁC NHÂN VIÊN EMP-HR-01 TIẾN 06
    -- =========================================================
    PRINT '1. Xóa các dữ liệu ràng buộc (Foregin Keys) của nhân viên EMP-HR...';

    IF OBJECT_ID('tempdb..#EmpIdsToDelete') IS NOT NULL DROP TABLE #EmpIdsToDelete;
    SELECT Id INTO #EmpIdsToDelete FROM Employees 
    WHERE EmployeeCode IN ('EMP-HR-01', 'EMP-HR-02', 'EMP-HR-03', 'EMP-HR-04', 'EMP-HR-05', 'EMP-HR-06');

    IF OBJECT_ID('tempdb..#UserIdsToDelete') IS NOT NULL DROP TABLE #UserIdsToDelete;
    SELECT UserId INTO #UserIdsToDelete FROM Employees 
    WHERE Id IN (SELECT Id FROM #EmpIdsToDelete) AND UserId IS NOT NULL;

    DECLARE @oldAccTaxEmpId INT, @oldUserId INT;
    SELECT @oldAccTaxEmpId = Id, @oldUserId = UserId FROM Employees WHERE EmployeeCode = 'ACC-TAX-01';

    -- XUẤT PHÁT: Giải quyết rễ sâu cấp 3 (WorkSchedules -> TimeAttendanceRecords)
    PRINT '=> Xoá dữ liệu chấm công thật (TimeAttendanceRecords)...';
    IF OBJECT_ID('TimeAttendanceRecords') IS NOT NULL
    BEGIN
        DELETE FROM TimeAttendanceRecords 
        WHERE WorkScheduleId IN (
            SELECT Id FROM WorkSchedules 
            WHERE EmployeeId IN (SELECT Id FROM #EmpIdsToDelete)
               OR EmployeeId = 32
        );
    END

    -- XUẤT PHÁT: Các bảng khác liên quan cấp 2
    IF OBJECT_ID('OvertimeRequests') IS NOT NULL
        DELETE FROM OvertimeRequests WHERE EmployeeId IN (SELECT Id FROM #EmpIdsToDelete) OR CreatedById IN (SELECT UserId FROM #UserIdsToDelete) OR EmployeeId = 32;
    IF OBJECT_ID('TimesheetApprovals') IS NOT NULL
        DELETE FROM TimesheetApprovals WHERE EmployeeId IN (SELECT Id FROM #EmpIdsToDelete) OR DepartmentHeadId IN (SELECT Id FROM #EmpIdsToDelete) OR EmployeeId = 32;

    -- =========================================================
    -- PHẦN 2: TỰ ĐỘNG QUÉT CÁC BẢNG LIÊN QUAN ĐẾN NHÂN VIÊN VÀ USER ĐỂ XỬ LÝ
    -- =========================================================
    DECLARE @fkTable NVARCHAR(255), @fkColumn NVARCHAR(255), @refTable NVARCHAR(255);
    DECLARE @sql NVARCHAR(MAX);

    DECLARE cur CURSOR FOR
    SELECT 
        OBJECT_NAME(fk.parent_object_id) AS TableName,
        c.name AS ColumnName,
        OBJECT_NAME(fk.referenced_object_id) AS RefTableName
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
    INNER JOIN sys.columns c ON fkc.parent_object_id = c.object_id AND fkc.parent_column_id = c.column_id
    WHERE OBJECT_NAME(fk.referenced_object_id) IN ('Employees', 'Users');

    OPEN cur;
    FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;

    -- Vòng lặp thứ nhất: DELETE dữ liệu phụ thuộc của EMP-HR
    WHILE @@FETCH_STATUS = 0
    BEGIN
        IF @refTable = 'Employees'
        BEGIN
            SET @sql = 'DELETE FROM [' + @fkTable + '] WHERE [' + @fkColumn + '] IN (SELECT Id FROM #EmpIdsToDelete)';
            EXEC sp_executesql @sql;
        END
        ELSE IF @refTable = 'Users'
        BEGIN
            SET @sql = 'DELETE FROM [' + @fkTable + '] WHERE [' + @fkColumn + '] IN (SELECT UserId FROM #UserIdsToDelete)';
            EXEC sp_executesql @sql;
        END
        
        FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;
    END

    -- Cuối cùng, xoá tài khoản User (do có bảng liên quan tới bảng User)
    DELETE FROM Employees WHERE Id IN (SELECT Id FROM #EmpIdsToDelete);
    DELETE FROM Users WHERE Id IN (SELECT UserId FROM #UserIdsToDelete);
    PRINT '=> Xóa xong EMP-HR.';

    -- =========================================================
    -- PHẦN 3: DỜI ACC-TAX-01 SANG ID 32
    -- =========================================================
    PRINT '2. Dời ACC-TAX-01 lên ID 32...';

    IF @oldAccTaxEmpId IS NOT NULL AND @oldAccTaxEmpId <> 32
    BEGIN
        -- Xoá dữ liệu phụ thuộc của nhân viên ID 32 cũ nếu có để trống chỗ
        IF EXISTS (SELECT 1 FROM Employees WHERE Id = 32)
        BEGIN
            CLOSE cur; OPEN cur;
            FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;
            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF @refTable = 'Employees'
                BEGIN
                    SET @sql = 'DELETE FROM [' + @fkTable + '] WHERE [' + @fkColumn + '] = 32';
                    EXEC sp_executesql @sql;
                END
                FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;
            END
            DELETE FROM Employees WHERE Id = 32;
        END

        -- Tránh lỗi "Unique Index" trên EmployeeCode và UserId (bị trùng khi chèn ID 32 trong khi cũ vẫn tồn tại)
        -- Ta sẽ đổi tạm mã EmployeeCode thành GUID và hủy liên kết UserId của dòng cũ
        UPDATE Employees SET EmployeeCode = CAST(NEWID() AS NVARCHAR(50)), UserId = NULL WHERE Id = @oldAccTaxEmpId;

        -- Dùng Dynamic SQL để copy tất cả các cột của ACC-TAX-01 sang bản sao mới ID 32
        DECLARE @cols_insert NVARCHAR(MAX);
        DECLARE @cols_select NVARCHAR(MAX);
        
        -- Danh sách cột (chèn)
        SELECT @cols_insert = STUFF((SELECT ', ' + QUOTENAME(c.name) 
                              FROM sys.columns c 
                              WHERE c.object_id = OBJECT_ID('Employees') AND c.name != 'Id' 
                              FOR XML PATH('')), 1, 2, '');
                              
        -- Danh sách dữ liệu (chọn). Ép EmployeeCode thành 'ACC-TAX-01' và nhét cứng UserId vào
        SELECT @cols_select = STUFF((SELECT ', ' + 
                                  CASE WHEN c.name = 'EmployeeCode' THEN '''ACC-TAX-01'''
                                       WHEN c.name = 'UserId' THEN ISNULL(CAST(@oldUserId AS NVARCHAR(20)), 'NULL')
                                       ELSE QUOTENAME(c.name)
                                  END
                              FROM sys.columns c 
                              WHERE c.object_id = OBJECT_ID('Employees') AND c.name != 'Id' 
                              FOR XML PATH('')), 1, 2, '');

        DECLARE @insertSql NVARCHAR(MAX) = '
        SET IDENTITY_INSERT Employees ON;
        INSERT INTO Employees (Id, ' + @cols_insert + ')
        SELECT 32, ' + @cols_select + '
        FROM Employees 
        WHERE Id = @oldId;
        SET IDENTITY_INSERT Employees OFF;
        ';
        EXEC sp_executesql @insertSql, N'@oldId INT', @oldId = @oldAccTaxEmpId;

        -- Cập nhật lại đúng Mã nhân viên cho dòng mới ID 32
        UPDATE Employees SET EmployeeCode = 'ACC-TAX-01' WHERE Id = 32;

        -- UPDATE CÁC BẢNG PHỤ THUỘC (WorkSchedules, v.v...) của ACC-TAX-01 thành ID 32 mới
        CLOSE cur; OPEN cur;
        FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            IF @refTable = 'Employees'
            BEGIN
                SET @sql = 'UPDATE [' + @fkTable + '] SET [' + @fkColumn + '] = 32 WHERE [' + @fkColumn + '] = ' + CAST(@oldAccTaxEmpId AS NVARCHAR(20));
                EXEC sp_executesql @sql;
            END
            FETCH NEXT FROM cur INTO @fkTable, @fkColumn, @refTable;
        END

        -- Xoá Row cũ của ACC-TAX-01 sau khi đã Update xong các liên kết
        DELETE FROM Employees WHERE Id = @oldAccTaxEmpId;
        PRINT '=> Đã dời ACC-TAX-01 sang Id = 32 thành công và cập nhật toàn bộ khoá ngoại!';
    END

    CLOSE cur;
    DEALLOCATE cur;

    COMMIT TRANSACTION;
    PRINT '========= HOÀN TẤT =========';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'CÓ LỖI XẢY RA: ' + ERROR_MESSAGE();
    
    -- Cleanup Cursor nếu lỗi chặn ngang
    IF CURSOR_STATUS('global', 'cur') >= -1
    BEGIN
        CLOSE cur;
        DEALLOCATE cur;
    END
END CATCH;
GO
