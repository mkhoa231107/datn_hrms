USE HRMS_DATN;
GO

PRINT 'Starting HR April 2026 Data Seeding...';

-- 1. Xoá mọi chi tiết chấm công/summaries/lương của phòng Nhân sự/Tuyển dụng trong tháng 04/2026
DELETE a
FROM AttendanceDetails a
JOIN Employees e ON a.EmployeeId = e.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE (d.DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%')
  AND a.Date >= '2026-04-01' AND a.Date <= '2026-04-30';

DELETE a
FROM AttendanceSummaries a
JOIN Employees e ON a.EmployeeId = e.Id
JOIN SchedulePeriods sp ON a.PeriodId = sp.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE (d.DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%')
  AND sp.StartDate = '2026-04-01';

DELETE pr
FROM PayrollRecords pr
JOIN Employees e ON pr.EmployeeId = e.Id
JOIN PayrollPeriods pp ON pr.PayrollPeriodId = pp.Id
JOIN SchedulePeriods sp ON pp.SchedulePeriodId = sp.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE (d.DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%')
  AND sp.StartDate = '2026-04-01';

DELETE t
FROM TimeAttendanceRecords t
JOIN Employees e ON t.EmployeeId = e.Id
JOIN Departments d ON e.DepartmentId = d.Id
WHERE (d.DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%')
  AND t.Date >= '2026-04-01' AND t.Date <= '2026-04-30';

-- 2. Đảm bảo nhân viên có WorkSchedule tháng 4
DECLARE @DefaultShiftId INT;
SELECT TOP 1 @DefaultShiftId = Id FROM WorkShifts WHERE ShiftName LIKE N'%Hành chính%' OR ShiftName LIKE N'%Sáng%';

IF @DefaultShiftId IS NULL
BEGIN
    SELECT TOP 1 @DefaultShiftId = Id FROM WorkShifts;
END

-- Lặp qua từng nhân viên trong phòng ban
DECLARE @EmpId INT;
DECLARE @WorkScheduleId INT;

DECLARE emp_cursor CURSOR FOR
    SELECT e.Id
    FROM Employees e
    JOIN Departments d ON e.DepartmentId = d.Id
    WHERE (d.DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%');

OPEN emp_cursor;
FETCH NEXT FROM emp_cursor INTO @EmpId;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Check if WorkSchedule exists for April
    SELECT TOP 1 @WorkScheduleId = Id FROM WorkSchedules WHERE EmployeeId = @EmpId AND WorkingDate >= '2026-04-01' AND WorkingDate <= '2026-04-30';
    
    IF @WorkScheduleId IS NULL
    BEGIN
        INSERT INTO WorkSchedules (EmployeeId, WorkShiftId, WorkingDate, CreatedAt, UpdatedAt)
        VALUES (@EmpId, @DefaultShiftId, '2026-04-01', GETUTCDATE(), GETUTCDATE());
        SET @WorkScheduleId = SCOPE_IDENTITY();
    END

    -- Các ngày còn lại: Đa dạng hóa trường hợp theo "Hồ sơ nhân viên"
    DECLARE @Day INT = 1;
    WHILE @Day <= 30
    BEGIN
        DECLARE @CurDate DATETIME = DATETIMEFROMPARTS(2026, 4, @Day, 0, 0, 0, 0);
        
        -- Chỉ tính ngày làm việc (Thứ 2 - Thứ 7), bỏ qua Chủ Nhật (1)
        IF DATEPART(DW, @CurDate) NOT IN (1) 
        BEGIN
            -- Xác định "Hồ sơ (Profile)" dựa trên @EmpId để tạo sự khác biệt giữa các nhân viên
            DECLARE @Profile INT = @EmpId % 5; 
            -- 0: Gương mẫu (Luôn đúng giờ)
            -- 1: Hay đi muộn (Frequent late)
            -- 2: Hay về sớm (Frequent early out)
            -- 3: Thất thường (Mixed + Quên check-out)
            -- 4: Ham làm (Làm sớm về muộn + OT)

            -- Tạo biến ngẫu nhiên nhẹ dựa trên @Day để không ngày nào giống ngày nào
            DECLARE @RandMin INT = (@Day * 7 + @EmpId * 3) % 15;
            DECLARE @InTime DATETIME;
            DECLARE @OutTime DATETIME;
            
            IF @Profile = 0 -- Gương mẫu
            BEGIN
                SET @InTime = DATEADD(MINUTE, -10 - @RandMin, DATEADD(HOUR, 8, @CurDate)); -- 07:35 -> 07:50
                SET @OutTime = DATEADD(MINUTE, 5 + @RandMin, DATEADD(HOUR, 17, @CurDate)); -- 17:05 -> 17:20
                
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @InTime, 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @OutTime, 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
            END
            ELSE IF @Profile = 1 -- Hay đi muộn
            BEGIN
                -- 70% đi muộn, 30% đúng giờ
                IF @Day % 3 > 0 
                    SET @InTime = DATEADD(MINUTE, 5 + @RandMin, DATEADD(HOUR, 8, @CurDate)); -- 08:05 -> 08:20
                ELSE
                    SET @InTime = DATEADD(MINUTE, -2, DATEADD(HOUR, 8, @CurDate)); -- 07:58
                
                SET @OutTime = DATEADD(MINUTE, 10, DATEADD(HOUR, 17, @CurDate)); 
                
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @InTime, 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @OutTime, 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
            END
            ELSE IF @Profile = 2 -- Hay về sớm
            BEGIN
                SET @InTime = DATEADD(MINUTE, -5, DATEADD(HOUR, 8, @CurDate)); 
                -- 80% về sớm
                IF @Day % 4 > 0
                    SET @OutTime = DATEADD(MINUTE, -10 - @RandMin, DATEADD(HOUR, 17, @CurDate)); -- 16:35 -> 16:50
                ELSE
                    SET @OutTime = DATEADD(MINUTE, 5, DATEADD(HOUR, 17, @CurDate)); -- 17:05
                
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @InTime, 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @OutTime, 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
            END
            ELSE IF @Profile = 3 -- Thất thường
            BEGIN
                -- Random nhiều trường hợp: trễ, sớm, hoặc quên
                DECLARE @SubCase INT = (@Day * @EmpId) % 5;
                IF @SubCase = 0 -- Quên checkout
                BEGIN
                    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                    VALUES (@EmpId, @CurDate, DATEADD(MINUTE, -5, DATEADD(HOUR, 8, @CurDate)), 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                END
                ELSE IF @SubCase = 1 -- Đi trễ + Về sớm (0 công)
                BEGIN
                    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                    VALUES (@EmpId, @CurDate, DATEADD(MINUTE, 30, DATEADD(HOUR, 8, @CurDate)), 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                    VALUES (@EmpId, @CurDate, DATEADD(MINUTE, -30, DATEADD(HOUR, 17, @CurDate)), 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                END
                ELSE -- Đúng giờ
                BEGIN
                    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                    VALUES (@EmpId, @CurDate, DATEADD(MINUTE, -5, DATEADD(HOUR, 8, @CurDate)), 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                    VALUES (@EmpId, @CurDate, DATEADD(MINUTE, 5, DATEADD(HOUR, 17, @CurDate)), 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                END
            END
            ELSE -- Ham làm (OT thường xuyên)
            BEGIN
                SET @InTime = DATEADD(MINUTE, -20 - @RandMin, DATEADD(HOUR, 8, @CurDate)); -- 07:25
                SET @OutTime = DATEADD(MINUTE, 60 + @RandMin * 2, DATEADD(HOUR, 17, @CurDate)); -- 18:00 -> 18:30
                
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @InTime, 'CheckIn', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
                INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
                VALUES (@EmpId, @CurDate, @OutTime, 'CheckOut', 'Office', 'Fingerprint', @WorkScheduleId, GETUTCDATE());
            END
        END
        SET @Day = @Day + 1;
    END

    FETCH NEXT FROM emp_cursor INTO @EmpId;
END

CLOSE emp_cursor;
DEALLOCATE emp_cursor;

-- 3. Tạo dữ liệu Tăng ca (Overtime) mẫu cho tháng 4
PRINT 'Seeding OT Test Cases for HR Department...';

-- Tìm người tạo (Trưởng bộ phận Tuyển dụng ID=7, hoặc bất kỳ Quản lý nào trong HR)
DECLARE @CreatorId INT;
SELECT TOP 1 @CreatorId = ManagerId FROM Departments WHERE (DepartmentCode LIKE 'HR%' OR DepartmentName LIKE N'%Nhân sự%') AND ManagerId IS NOT NULL;
IF @CreatorId IS NULL SET @CreatorId = 7; -- Fallback to Bùi Thu Hồng

-- Tìm các phòng ban HR để gán OT
DECLARE @HrDeptIds TABLE (Id INT);
INSERT INTO @HrDeptIds (Id)
SELECT Id FROM Departments WHERE (DepartmentName LIKE N'%Nhân sự%' OR d.DepartmentName LIKE N'%Tuyển dụng%');

-- Xoá dữ liệu OT cũ của HR trong tháng 4 để tránh trùng
DELETE FROM EmployeeOvertimes WHERE OvertimeRequestId IN (SELECT Id FROM OvertimeRequests WHERE DepartmentId IN (SELECT Id FROM @HrDeptIds) AND [Date] >= '2026-04-01');
DELETE FROM OvertimeRequests WHERE DepartmentId IN (SELECT Id FROM @HrDeptIds) AND [Date] >= '2026-04-01';

-- Tạo các đợt tăng ca mẫu
DECLARE @OtDay1 DATE = '2026-04-06';
DECLARE @OtDay2 DATE = '2026-04-10';
DECLARE @OtDay3 DATE = '2026-04-15';

INSERT INTO OvertimeRequests ([Date], StartTime, EndTime, Reason, [Status], DepartmentId, CreatedById, CreatedAt)
SELECT @OtDay1, '17:30:00', '19:30:00', N'Xử lý hồ sơ nhân sự tồn đọng', 'Scheduled', Id, @CreatorId, GETUTCDATE() FROM @HrDeptIds;

INSERT INTO OvertimeRequests ([Date], StartTime, EndTime, Reason, [Status], DepartmentId, CreatedById, CreatedAt)
SELECT @OtDay2, '17:30:00', '19:00:00', N'Họp tổng kết tuần', 'Scheduled', Id, @CreatorId, GETUTCDATE() FROM @HrDeptIds;

INSERT INTO OvertimeRequests ([Date], StartTime, EndTime, Reason, [Status], DepartmentId, CreatedById, CreatedAt)
SELECT @OtDay3, '18:00:00', '21:00:00', N'Rà soát bảng lương tháng 4', 'Scheduled', Id, @CreatorId, GETUTCDATE() FROM @HrDeptIds;

-- Gán nhân viên vào các đợt tăng ca
INSERT INTO EmployeeOvertimes (EmployeeId, OvertimeRequestId)
SELECT e.Id, req.Id
FROM Employees e
JOIN OvertimeRequests req ON e.DepartmentId = req.DepartmentId
WHERE e.DepartmentId IN (SELECT Id FROM @HrDeptIds)
  AND req.[Date] >= '2026-04-01';

PRINT '✅ Done Seeding HR April 2026 data + Overtime test cases! Records ready for Approval workflow.';
PRINT 'Hãy thực hiện [TỔNG HỢP DỮ LIỆU] để xem kết quả OT tại cột TANG CA.';
GO
