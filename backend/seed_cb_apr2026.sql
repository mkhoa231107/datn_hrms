USE HRMS_DATN;
GO

PRINT 'Starting C&B April 2026 Data Seeding (Tổ Lương Thưởng)...';

BEGIN TRY
    BEGIN TRANSACTION;

    -- Lấy danh sách ID của nhân sự phòng Lương Thưởng
    IF OBJECT_ID('tempdb..#CbEmps') IS NOT NULL DROP TABLE #CbEmps;
    SELECT e.Id, e.UserId INTO #CbEmps 
    FROM Employees e
    JOIN Departments d ON e.DepartmentId = d.Id
    WHERE (d.DepartmentName LIKE N'%Lương Thưởng%' OR d.DepartmentName LIKE N'%C&B%');

    IF NOT EXISTS (SELECT 1 FROM #CbEmps)
    BEGIN
        PRINT 'Không tìm thấy nhân viên nào thuộc Tổ Lương Thưởng (C&B). Vui lòng kiểm tra lại dữ liệu Phòng ban.';
        COMMIT TRANSACTION;
        RETURN;
    END

    -- 1. XOÁ DỮ LIỆU CŨ THÁNG 4/2026 CHO TỔ LƯƠNG THƯỞNG ĐỂ LÀM LÁI NGAY TỪ ĐẦU
    PRINT '=> Dọn dẹp dữ liệu cũ (TimeAttendanceRecords, OvertimeRequests, WorkSchedules) tháng 4/2026...';
    
    DELETE FROM TimeAttendanceRecords 
    WHERE WorkScheduleId IN (
        SELECT Id FROM WorkSchedules 
        WHERE EmployeeId IN (SELECT Id FROM #CbEmps) 
          AND WorkingDate >= '2026-04-01' AND WorkingDate <= '2026-04-30'
    );

    DELETE FROM OvertimeRequests 
    WHERE EmployeeId IN (SELECT Id FROM #CbEmps) 
      AND Date >= '2026-04-01' AND Date <= '2026-04-30';

    DELETE FROM WorkSchedules 
    WHERE EmployeeId IN (SELECT Id FROM #CbEmps) 
      AND WorkingDate >= '2026-04-01' AND WorkingDate <= '2026-04-30';

    -- 2. TẠO LỊCH LÀM VIỆC VÀ CHẤM CÔNG THÁNG 4 (GỒM CÁC CASE ĐI TRỄ, VỀ SỚM, TĂNG CA)
    DECLARE @DefaultShiftId INT;
    SELECT TOP 1 @DefaultShiftId = Id FROM WorkShifts WHERE ShiftName LIKE N'%Hành chính%' OR ShiftName LIKE N'%Sáng%';
    IF @DefaultShiftId IS NULL SELECT TOP 1 @DefaultShiftId = Id FROM WorkShifts;

    -- Lấy PeriodId của Tháng 4/2026
    DECLARE @PeriodId INT;
    SELECT TOP 1 @PeriodId = Id FROM SchedulePeriods WHERE StartDate = '2026-04-01';
    
    IF @PeriodId IS NULL
    BEGIN
        DECLARE @OrgId INT;
        SELECT TOP 1 @OrgId = Id FROM Organizations;
        IF @OrgId IS NULL SET @OrgId = 1;

        INSERT INTO SchedulePeriods (PeriodName, StartDate, EndDate, IsLocked, OrganizationId, CreatedAt, UpdatedAt)
        VALUES (N'Kỳ Lương Tháng 04/2026', '2026-04-01', '2026-04-30', 0, @OrgId, GETUTCDATE(), GETUTCDATE());
        SET @PeriodId = SCOPE_IDENTITY();
    END

    DECLARE @EmpId INT, @UserId INT;
    
    -- Xoá cursor nếu còn rớt lại từ lần chạy lỗi trước (do SSMS lưu session)
    IF CURSOR_STATUS('global', 'cb_cursor') >= -1
    BEGIN
        CLOSE cb_cursor;
        DEALLOCATE cb_cursor;
    END

    DECLARE cb_cursor CURSOR FOR SELECT Id, UserId FROM #CbEmps;
    OPEN cb_cursor;
    FETCH NEXT FROM cb_cursor INTO @EmpId, @UserId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @Day INT = 1;
        WHILE @Day <= 30
        BEGIN
            DECLARE @CurDate DATETIME = DATETIMEFROMPARTS(2026, 4, @Day, 0, 0, 0, 0);
            
            -- Chỉ làm việc Thứ 2 - Thứ 6 & Thứ 7
            IF DATEPART(DW, @CurDate) NOT IN (1) 
            BEGIN
                -- 2.1 Tạo Lịch làm việc cho ngày hôm nay
                INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, WorkingDate, PeriodId, CreatedAt, UpdatedAt)
                VALUES (@EmpId, @DefaultShiftId, @CurDate, @PeriodId, GETUTCDATE(), GETUTCDATE());
                
                DECLARE @WorkScheduleId INT = SCOPE_IDENTITY();
                
                -- Khởi tạo giờ mặc định: 07:50 - 17:40 (Bao trùm an toàn để tránh bị chấm đi trễ / về sớm)
                DECLARE @InTime DATETIME = DATEADD(MINUTE, 50, DATEADD(HOUR, 7, @CurDate)); -- 07:50
                DECLARE @OutTime DATETIME = DATEADD(MINUTE, 40, DATEADD(HOUR, 17, @CurDate)); -- 17:40
                DECLARE @HasOT BIT = 0;
                DECLARE @OTHours DECIMAL(18,2) = 0;

                -- 2.2 Tạo kịch bản đi trễ / về sớm / tăng ca luân phiên cho thú vị
                -- Dùng toán học cơ bản tạo randomness
                DECLARE @CaseType INT = (@Day + @EmpId) % 10; 
                
                IF @CaseType = 2 -- ĐI TRỄ
                BEGIN
                    SET @InTime = DATEADD(MINUTE, 10, DATEADD(HOUR, 9, @CurDate)); -- 09:10 (Trễ hẳn so với 8h lẫn 8h30)
                END
                ELSE IF @CaseType = 4 -- VỀ SỚM
                BEGIN
                    SET @OutTime = DATEADD(MINUTE, -40, DATEADD(HOUR, 17, @CurDate)); -- 16:20 (Về sớm)
                END
                ELSE IF @CaseType = 6 -- ĐI TRỄ VÀ VỀ SỚM (Ngày 6, 16, 26)
                BEGIN
                    SET @InTime = DATEADD(MINUTE, 15, DATEADD(HOUR, 9, @CurDate)); -- 09:15 (Trễ)
                    SET @OutTime = DATEADD(MINUTE, -15, DATEADD(HOUR, 17, @CurDate)); -- 16:45 (Về sớm)
                END
                ELSE IF @CaseType = 8 -- TĂNG CA (Ngày 8, 18, 28)
                BEGIN
                    SET @OutTime = DATEADD(MINUTE, 30, DATEADD(HOUR, 19, @CurDate)); -- 19:30 (Check-out lúc 7h30 tối)
                    SET @HasOT = 1;
                    SET @OTHours = 2.0; -- Xin tăng ca 2 tiếng (từ 17h30 đến 19h30)
                END

                -- 2.3 Insert Dữ liệu quẹt thẻ thực tế
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES 
                (@EmpId, @CurDate, @InTime, 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE()),
                (@EmpId, @CurDate, @OutTime, 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());

                -- 2.4 Nếu có tăng ca, tạo ngay 1 đơn xin duyệt OT cho nhân viên này
                IF @HasOT = 1 AND @OTHours > 0
                BEGIN
                    -- Lấy ID của C&B Manager để duyệt luôn
                    DECLARE @DeptHeadId INT;
                    SELECT TOP 1 @DeptHeadId = Id FROM Employees 
                       WHERE DepartmentId IN (SELECT DepartmentId FROM Employees WHERE Id = @EmpId)
                       AND Id != @EmpId; -- Lấy người khác làm sếp duyệt tạm

                    DECLARE @DeptId INT;
                    SELECT @DeptId = DepartmentId FROM Employees WHERE Id = @EmpId;

                    INSERT INTO OvertimeRequests (
                        EmployeeId, DepartmentId, Date, StartTime, EndTime, 
                        Reason, Status, ApprovedById, ApprovedAt, 
                        CreatedAt, CreatedById
                    ) VALUES (
                        @EmpId, @DeptId, @CurDate, 
                        CAST(DATEADD(MINUTE, 30, DATEADD(HOUR, 17, @CurDate)) AS TIME), -- 17:30
                        CAST(DATEADD(MINUTE, 30, DATEADD(HOUR, 19, @CurDate)) AS TIME), -- 19:30
                        N'Tăng ca làm lương cuối tháng', 'Approved', 
                        ISNULL(@DeptHeadId, @EmpId), GETUTCDATE(), GETUTCDATE(), @EmpId
                    );
                END
            END

            SET @Day = @Day + 1;
        END

        FETCH NEXT FROM cb_cursor INTO @EmpId, @UserId;
    END

    CLOSE cb_cursor;
    DEALLOCATE cb_cursor;

    PRINT '=> Bơm xong dữ liệu Tăng ca / Đi trễ / Về sớm (Tháng 4/2026) cho C&B!';
    COMMIT TRANSACTION;

    PRINT '========= HOÀN TẤT =========';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'CÓ LỖI XẢY RA: ' + ERROR_MESSAGE();

    IF CURSOR_STATUS('global', 'cb_cursor') >= -1
    BEGIN
        CLOSE cb_cursor;
        DEALLOCATE cb_cursor;
    END
END CATCH;
GO
