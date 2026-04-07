USE HRMS_DATN;
GO

DECLARE @EmpId INT;
-- Chọn nhân viên có tài khoản hr_rec_12 để test (fallback qua hr_rec_02 nếu không có)
SELECT TOP 1 @EmpId = e.Id 
FROM Employees e
JOIN Users u ON e.UserId = u.Id
WHERE u.Username = 'hr_rec_12' OR u.Username = 'hr_rec_02'
ORDER BY u.Username DESC; -- Ưu tiên hr_rec_12

IF @EmpId IS NOT NULL
BEGIN
    DECLARE @WorkScheduleId INT;
    -- Lấy một WorkScheduleId hợp lệ của nhân viên này trong tháng 4
    SELECT TOP 1 @WorkScheduleId = Id FROM WorkSchedules WHERE EmployeeId = @EmpId ORDER BY WorkingDate DESC;

    -- Xoá dữ liệu cũ của ngày 2, 3, 4 tháng 4 để insert lại từ đầu
    DELETE FROM TimeAttendanceRecords WHERE EmployeeId = @EmpId AND Date IN ('2026-04-02', '2026-04-03', '2026-04-04');

    -- Ngày 2/4/2026: Đi trễ (Checkin 8h15)
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-02', '2026-04-02 08:15:00', 'CheckIn', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-02', '2026-04-02 17:05:00', 'CheckOut', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());

    -- Ngày 3/4/2026: Về sớm (Checkout 16h30)
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-03', '2026-04-03 07:55:00', 'CheckIn', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-03', '2026-04-03 16:30:00', 'CheckOut', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());

    -- Ngày 4/4/2026: Vừa trễ vừa sớm (Checkin 8h20, Checkout 16h40)
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-04', '2026-04-04 08:20:00', 'CheckIn', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-04', '2026-04-04 16:40:00', 'CheckOut', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());

    -- Ngày 5/4/2026: Bấm nhầm nhiều lần
    -- Mốc CheckIn đúng: 07:55. Bấm nhầm thêm 08:05.
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-05', '2026-04-05 07:55:00', 'CheckIn', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-05', '2026-04-05 08:05:00', 'CheckIn', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    -- Mốc CheckOut nhầm: 16:30. Bấm đúng lại: 17:05.
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-05', '2026-04-05 16:30:00', 'CheckOut', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());
    INSERT INTO TimeAttendanceRecords (EmployeeId, Date, Timestamp, Type, Location, DeviceInfo, WorkScheduleId, CreatedAt)
    VALUES (@EmpId, '2026-04-05', '2026-04-05 17:05:00', 'CheckOut', 'Mock', 'Test', @WorkScheduleId, GETUTCDATE());

    -- Xoá summary và details để chốt công lại từ đầu
    DELETE FROM AttendanceDetails WHERE EmployeeId = @EmpId;
    DELETE FROM AttendanceSummaries WHERE EmployeeId = @EmpId;
    DELETE FROM PayrollRecords WHERE EmployeeId = @EmpId;

    DECLARE @EmpCode NVARCHAR(100), @EmpName NVARCHAR(MAX);
    SELECT @EmpCode = EmployeeCode, @EmpName = FullName FROM Employees WHERE Id = @EmpId;

    PRINT '✅ Đã TẠO MỚI bản ghi giả lập Đi trễ/Về sớm cho nhân viên ' + @EmpName + ' (' + @EmpCode + ') trong Tháng 04/2026.';
END
ELSE
BEGIN
    PRINT '❌ Không tìm thấy nhân viên nào có tài khoản hr_rec_12 (hoặc hr_rec_02).';
END
GO
