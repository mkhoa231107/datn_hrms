using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class DataFixSeeder
    {
        public static async Task FixUserRolesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ Starting Role Data Fix...");

            var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
            if (employeeRole == null)
            {
                Console.WriteLine("⚠️ Role 'Employee' not found. Skipping fix.");
                return;
            }

            // Only fix users who have NO role at all — do NOT strip valid roles from Managers/TLs/C&B
            var usersWithNoRole = await context.Users
                .Where(u => !context.UserRoles.Any(ur => ur.UserId == u.Id))
                .ToListAsync();

            foreach (var user in usersWithNoRole)
            {
                context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = employeeRole.Id, AssignedAt = DateTime.UtcNow });
                Console.WriteLine($" -> Assigned Employee role to user with no role: {user.Username}");
            }

            if (context.ChangeTracker.HasChanges())
            {
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Role Data Fix applied successfully.");
            }
            else
            {
                Console.WriteLine("✅ No Role Data Fix needed.");
            }
        }
        /* DISABLED: This was creating redundant 'FIXED' employee records that we now consider junk.
        public static async Task FixAdminEmployeeLinkageAsync(HRMSDbContext context)
        {
            // Logic moved/removed to maintain clean employee list
        }
        */

        public static async Task EnsureAllManagersHaveEmployeesAsync(HRMSDbContext context)
        {
            // Xoá cache để lấy dữ liệu mới nhất
            context.ChangeTracker.Clear();

            Console.WriteLine("🛠️ [SEEDER] Bắt đầu đồng bộ hóa dữ liệu nhân sự và dọn dẹp rác...");

            // 1. NGẮT QUY TRÌNH TỰ TẠO NHÂN VIÊN FIX_ (Để tránh vòng lặp Tạo-Xoá)
            // Chúng ta không tạo thêm các bản ghi FIX_ nữa để giữ danh sách sạch sẽ.

            // 2. ÉP TÁO LẠI hr_cb_01 (LÊ THỊ THẢO) TẠI ID 19 (Cả Users & Employees)
            Console.WriteLine("🔨 [FIX] Đang khôi phục tài khoản Lê Thị Thảo tại ID 19...");
            
            // A. Dọn sạch triệt để nếu ID 19 hoặc Username đã tồn tại để tránh lỗi FK
            // Lấy danh sách ID nhân viên mục tiêu để xoá chính xác
            string targetEmpSubquery = "SELECT Id FROM Employees WHERE Id = 19 OR EmployeeCode = 'HR-CB-01'";
            string targetUserSubquery = "SELECT Id FROM Users WHERE Id = 19 OR Username = 'hr_cb_01'";

            string[] depTables = { 
                "AttendanceDetails", "TimeAttendanceRecords", "TimeAdjustmentRequests", "OvertimeRequests", "WorkSchedules", "AttendanceSummaries", 
                "LeaveRequests", "LeaveBalances", "PayrollRecords", 
                "EmployeeContracts", "EmployeeInsurances", "EmployeeBankAccounts", 
                "EmployeeEmergencyContacts", "EmployeeDocuments", "Notifications",
                "EmployeeOvertimes", "UserRoles", "AuditLogs", "TaskUpdates", "JobAssignments"
            };

            foreach (var tbl in depTables) {
                try {
                    if (tbl == "UserRoles" || tbl == "AuditLogs")
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE UserId = 19 OR UserId IN ({targetUserSubquery})");
                    else if (tbl == "TaskUpdates")
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM TaskUpdates WHERE JobAssignmentId IN (SELECT Id FROM JobAssignments WHERE EmployeeId = 19 OR EmployeeId IN ({targetEmpSubquery}))");
                    else
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE EmployeeId = 19 OR EmployeeId IN ({targetEmpSubquery})");
                } catch (Exception ex) { 
                    // Log nhẹ nếu lỗi không phải là 'Table not found'
                    if (!ex.Message.Contains("Invalid object name"))
                        Console.WriteLine($"   [DEBUG] Không thể dọn dẹp bảng {tbl}: {ex.Message}");
                }
            }

            // Dọn dẹp thêm các bảng liên quan đến User mà chưa có trong danh sách trên
            string[] userDepTables = { "PasswordResetOTPs", "JobApplications" };
            foreach (var tbl in userDepTables) {
                try { await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE UserId = 19 OR UserId IN ({targetUserSubquery})"); } catch {}
            }

            // Giải phóng ManagerId/ApproverId đang trỏ vào ID 19 hoặc code HR-CB-01
            await context.Database.ExecuteSqlRawAsync($"UPDATE Departments SET ManagerId = NULL WHERE ManagerId = 19 OR ManagerId IN ({targetEmpSubquery})");
            await context.Database.ExecuteSqlRawAsync($"UPDATE Employees SET ManagerId = NULL WHERE ManagerId = 19 OR ManagerId IN ({targetEmpSubquery})");
            await context.Database.ExecuteSqlRawAsync($@"
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'ApproverId') 
                EXEC('UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId = 19 OR ApproverId IN ({targetEmpSubquery.Replace("'", "''")})')");

            // Xoá chính chủ
            await context.Database.ExecuteSqlRawAsync($"DELETE FROM Employees WHERE Id = 19 OR EmployeeCode = 'HR-CB-01'");
            await context.Database.ExecuteSqlRawAsync($"DELETE FROM Users WHERE Id = 19 OR Username = 'hr_cb_01'");
            
            var hashValue = BCrypt.Net.BCrypt.HashPassword("123456");
            var headRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
            var dhRoleId = headRole?.Id ?? 3; // Mặc định ID 3 nếu không tìm thấy

            // B. Chèn vào bảng Users (ID 19)
            await context.Database.ExecuteSqlRawAsync($"SET IDENTITY_INSERT Users ON; INSERT INTO Users (Id, Username, PasswordHash, Email, FullName, IsActive, CreatedAt) VALUES (19, 'hr_cb_01', '{hashValue}', 'hr_cb_01@techvn.com', N'Lê Thị Thảo', 1, GETUTCDATE()); SET IDENTITY_INSERT Users OFF;");

            // C. Chèn vào bảng Employees (ID 19) - Gán DepartmentId = 7 (Tổ Lương Thưởng)
            await context.Database.ExecuteSqlRawAsync($@"
                DECLARE @OrgId INT; SELECT @OrgId = Id FROM Organizations WHERE OrganizationCode = 'TECHVN' OR Id = 1;
                DECLARE @PosId INT; SELECT @PosId = Id FROM Positions WHERE PositionCode = 'HR-CB-HEAD' OR PositionCode = 'HR_MGR' OR Id = 1;
                SET IDENTITY_INSERT Employees ON;
                INSERT INTO Employees (Id, EmployeeCode, FullName, DateOfBirth, Gender, IdentityNumber, IdentityDate, IdentityPlace, Email, PersonalEmail, Phone, Address, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
                VALUES (19, 'HR-CB-01', N'Lê Thị Thảo', '1990-05-12', N'Nữ', '001090012345', '2015-05-12', N'Cục Cảnh sát QLHC về TTXH', 'hr_cb_01@techvn.com', 'thaolt@techvn.com', '0912345678', N'Hà Nội', GETUTCDATE(), 2, ISNULL(@OrgId, 1), 7, ISNULL(@PosId, 1), 19, GETUTCDATE());
                SET IDENTITY_INSERT Employees OFF;");

            // D. Gán Quyền và Trưởng phòng
            await context.Database.ExecuteSqlRawAsync($"INSERT INTO UserRoles (UserId, RoleId, AssignedAt, CreatedAt) VALUES (19, {dhRoleId}, GETUTCDATE(), GETUTCDATE())");
            await context.Database.ExecuteSqlRawAsync("UPDATE Departments SET ManagerId = 19 WHERE Id = 7");
            
            // Đảm bảo trạng thái Đang làm việc (Active = 2, IsActive = 1)
            await context.Database.ExecuteSqlRawAsync("UPDATE Employees SET Status = 2, IsActive = 1 WHERE EmployeeCode = 'HR-CB-01'");
            await context.Database.ExecuteSqlRawAsync("UPDATE Users SET IsActive = 1 WHERE Username = 'hr_cb_01'");
            
            Console.WriteLine("   -> ✅ Đã khôi phục Lê Thị Thảo (hr_cb_01) tại ID 19 thành công.");
            context.ChangeTracker.Clear();

            // 3. DỌN DEP NHÂN VIÊN RÁC BẰNG SQL NGUYÊN BẢN (TRÁNH LỖI CONCURRENCY)
            var codesToCleanup = new[] { 
                "CNB_01", "TT_01", "NV_01", "NV_02", "NV_03", 
                "HR_ADMIN_FIXED", "ADMIN_FIXED", "FIX_ADMIN", "FIX_HR_ADMIN", "FIX_MANAGER_HR", "FIX_CNB_HR" 
            };

            // Lấy ID của các nhân viên cần xoá (Và User liên quan)
            var junkData = await context.Employees
                .Where(e => codesToCleanup.Contains(e.EmployeeCode) || e.EmployeeCode.StartsWith("FIX_"))
                .Select(e => new { EmpId = e.Id, UserId = e.UserId })
                .ToListAsync();

            if (junkData.Any())
            {
                Console.WriteLine($"🗑️ [CLEANUP] Đang xoá bỏ {junkData.Count} nhân sự rác bằng SQL trực tiếp...");
                foreach (var data in junkData)
                {
                    var eid = data.EmpId;
                    
                    // A. NGẮT CÁC RÀNG BUỘC (Constraints)
                    await context.Database.ExecuteSqlRawAsync($"UPDATE Departments SET ManagerId = NULL WHERE ManagerId = {eid}");
                    await context.Database.ExecuteSqlRawAsync($"UPDATE Employees SET ManagerId = NULL WHERE ManagerId = {eid}");
                    await context.Database.ExecuteSqlRawAsync($@"
                        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'ApproverId')
                        EXEC('UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId = {eid}')");

                    // B. XOÁ DỮ LIỆU PHỤ THUỘC (EmployeeId)
                    string[] empTables = { 
                        "AttendanceDetails", "TimeAttendanceRecords", "TimeAdjustmentRequests", "OvertimeRequests", "WorkSchedules", "AttendanceSummaries",  
                        "LeaveRequests", "LeaveBalances", "PayrollRecords", 
                        "EmployeeContracts", "EmployeeInsurances", "EmployeeBankAccounts", 
                        "EmployeeEmergencyContacts", "EmployeeDocuments", "Notifications",
                        "EmployeeOvertimes"
                    };
                    foreach (var tbl in empTables) {
                        try { await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE EmployeeId = {eid}"); } catch {}
                    }
                    
                    // TaskUpdates qua JobAssignment
                    try {
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM TaskUpdates WHERE JobAssignmentId IN (SELECT Id FROM JobAssignments WHERE EmployeeId = {eid})");
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM JobAssignments WHERE EmployeeId = {eid}");
                    } catch {}

                    // C. XOÁ DỮ LIỆU PHỤ THUỘC (UserId)
                    if (data.UserId.HasValue) {
                        var uid = data.UserId.Value;
                        string[] userTables = { "AuditLogs", "UserRoles", "PasswordResetOTPs", "JobApplications", "CompanyNews" };
                        foreach (var tbl in userTables) {
                            try { 
                                if (tbl == "CompanyNews") await context.Database.ExecuteSqlRawAsync($"DELETE FROM CompanyNews WHERE AuthorId = {uid}");
                                else await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE UserId = {uid}");
                            } catch {}
                        }
                    }

                    // D. XOÁ CHÍNH CHỦ
                    await context.Database.ExecuteSqlRawAsync($"DELETE FROM Employees WHERE Id = {eid}");
                    if (data.UserId.HasValue) {
                        await context.Database.ExecuteSqlRawAsync($"DELETE FROM Users WHERE Id = {data.UserId.Value}");
                    }
                }
                Console.WriteLine("✅ [CLEANUP] Hệ thống đã được dọn dẹp sạch sẽ.");
            }

            // 4. ESTABLISH HIERARCHY & ADDITIONAL SEEDING
            Console.WriteLine("🛠️ [HIERARCHY] Đang thiết lập cấu trúc phòng ban cha-con & nhân sự mới...");
            
            var hrDept = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "HR");
            if (hrDept != null)
            {
                // Link 'Tổ Lương Thưởng' (ID 7) to HR parent
                var cbTeam = await context.Departments.FindAsync(7);
                if (cbTeam != null) {
                    cbTeam.ParentDepartmentId = hrDept.Id;
                    cbTeam.DepartmentName = "Tổ Lương Thưởng (C&B)";
                }

                // Create 'Tổ Tuyển dụng' if not exists
                var recTeam = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "HR-REC");
                if (recTeam == null)
                {
                    recTeam = new Department { 
                        DepartmentName = "Tổ Tuyển dụng", 
                        DepartmentCode = "HR-REC", 
                        ParentDepartmentId = hrDept.Id, 
                        OrganizationId = hrDept.OrganizationId,
                        IsActive = true 
                    };
                    context.Departments.Add(recTeam);
                    await context.SaveChangesAsync();
                }

                // Seed 6 regular employees across these teams
                int recId = recTeam.Id;
                int cbId = (cbTeam?.Id) ?? 7;
                var posId = (await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "HR_SPEC"))?.Id ?? 1;

                var newEmployees = new[] {
                    (Code: "EMP-HR-01", Name: "Nguyễn Văn An", Dept: recId),
                    (Code: "EMP-HR-02", Name: "Trần Thị Bình", Dept: recId),
                    (Code: "EMP-HR-03", Name: "Lê Văn Cường", Dept: recId),
                    (Code: "EMP-HR-04", Name: "Hoàng Thị Dung", Dept: cbId),
                    (Code: "EMP-HR-05", Name: "Đỗ Minh Đức", Dept: cbId),
                    (Code: "EMP-HR-06", Name: "Vũ Văn Giang", Dept: cbId)
                };

                foreach (var empData in newEmployees)
                {
                    if (!await context.Employees.AnyAsync(e => e.EmployeeCode == empData.Code))
                    {
                        var emp = new Employee {
                            EmployeeCode = empData.Code,
                            FullName = empData.Name,
                            DepartmentId = empData.Dept,
                            PositionId = posId,
                            OrganizationId = hrDept.OrganizationId,
                            Email = empData.Code.ToLower() + "@techvn.com",
                            Phone = "0987112233",
                            Address = "Hà Nội",
                            Status = Domain.Enums.EmployeeStatus.Active,
                            JoinDate = DateTime.UtcNow.AddYears(-1)
                        };
                        context.Employees.Add(emp);
                        await context.SaveChangesAsync();

                        // Add an active contract so they show up in payroll calculation
                        context.EmployeeContracts.Add(new EmployeeContract {
                            EmployeeId = emp.Id,
                            ContractNumber = "CT-" + empData.Code,
                            ContractType = Domain.Enums.ContractType.FixedTerm,
                            BasicSalary = 10000000m + (new Random().Next(10) * 500000m),
                            JobDescription = "Chuyên viên nhân sự",
                            WorkLocation = "Hà Nội",
                            StartDate = DateTime.UtcNow.AddYears(-1),
                            IsActive = true,
                            Status = Domain.Enums.ContractStatus.Active,
                            SignedBy = "CEO"
                        });
                    }
                }
                await context.SaveChangesAsync();
                Console.WriteLine("   -> ✅ Đã hoàn tất thiết lập phân cấp và thêm 6 nhân sự mẫu!");
            }
        }

        public static async Task ClearLeaveHistoryAsync(HRMSDbContext context)
        {
            // Xoá cache để thấy ID 19 mới tạo
            context.ChangeTracker.Clear();

            Console.WriteLine("🧹 [CLEANUP] Đang xoá sạch toàn bộ lịch sử đơn từ...");
            try
            {
                // Sử dụng SQL Raw để xoá nhanh và triệt để
                await context.Database.ExecuteSqlRawAsync("DELETE FROM LeaveRequests");
                Console.WriteLine("✅ [CLEANUP] Đã xoá toàn bộ bản ghi trong bảng LeaveRequests.");

                // 5. TẠO LẠI DỮ LIỆU KIỂM THỬ SẠCH CHO QUY TRÌNH 3 NGÀY
                var recUser = await context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Username == "hr_rec_02");
                var headUser = await context.Users.Include(u => u.Employee).FirstOrDefaultAsync(u => u.Username == "hr_cb_01");
                var leaveType = await context.LeaveTypes.FirstOrDefaultAsync();

                if (recUser?.Employee != null && headUser?.Employee != null && leaveType != null)
                {
                    // Đảm bảo tên đúng như yêu cầu
                    recUser.Employee.FullName = "Hoàng Anh Hồng";
                    headUser.Employee.FullName = "Lê Thị Thảo";

                    // Đơn 1: Nhân viên Hoàng Anh Hồng xin nghỉ 4 ngày -> Trưởng phòng duyệt
                    context.LeaveRequests.Add(new Domain.Entities.LeaveRequest
                    {
                        EmployeeId = recUser.Employee.Id,
                        LeaveTypeId = leaveType.Id,
                        FromDate = DateTime.Now.AddDays(10),
                        ToDate = DateTime.Now.AddDays(14),
                        TotalDays = 4,
                        Reason = "Nhân viên Hoàng Anh Hồng xin nghỉ 4 ngày (Trường phòng duyệt)",
                        Status = Domain.Enums.LeaveStatus.Pending,
                        CreatedAt = DateTime.Now
                    });

                    // Đơn 2: Tổ trưởng Lê Thị Thảo xin nghỉ 1 ngày -> Trưởng phòng duyệt
                    context.LeaveRequests.Add(new Domain.Entities.LeaveRequest
                    {
                        EmployeeId = headUser.Employee.Id,
                        LeaveTypeId = leaveType.Id,
                        FromDate = DateTime.Now.AddDays(5),
                        ToDate = DateTime.Now.AddDays(6),
                        TotalDays = 1,
                        Reason = "Tổ trưởng Lê Thị Thảo xin nghỉ 1 ngày (Trường phòng duyệt)",
                        Status = Domain.Enums.LeaveStatus.Pending,
                        CreatedAt = DateTime.Now
                    });

                    await context.SaveChangesAsync();
                    Console.WriteLine("✅ [DỮ LIỆU KIỂM THỬ] Đã tạo đơn cho Lê Thị Thảo & Hoàng Anh Hồng.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [LỖI CLEANUP] {ex.Message}");
            }
        }

        public static async Task EnsureSchedulesForTestingAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ Đang đảm bảo lịch làm việc cho tất cả nhân viên để kiểm tra...");
            
            var today = DateTime.Today;
            var tomorrow = today.AddDays(1);
            
            var employees = await context.Employees.ToListAsync();
            var hcShift = await context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftCode == "HC")
                          ?? await context.WorkShifts.FirstOrDefaultAsync();
            
            var todayPeriod = await context.SchedulePeriods
                .FirstOrDefaultAsync(p => today >= p.StartDate && today <= p.EndDate);
            
            var tomorrowPeriod = await context.SchedulePeriods
                .FirstOrDefaultAsync(p => tomorrow >= p.StartDate && tomorrow <= p.EndDate);

            if (hcShift == null || todayPeriod == null)
            {
                Console.WriteLine("⚠️ Thiếu ca HC hoặc kỳ công. Không thể tạo lịch làm việc.");
                return;
            }

            foreach (var emp in employees)
            {
                // Hôm nay
                if (!await context.WorkSchedules.AnyAsync(ws => ws.EmployeeId == emp.Id && ws.WorkingDate == today))
                {
                    context.WorkSchedules.Add(new WorkSchedule
                    {
                        EmployeeId = emp.Id,
                        WorkingDate = today,
                        WorkShiftId = hcShift.Id,
                        PeriodId = todayPeriod.Id,
                        Note = "Tự động tạo để kiểm tra",
                        CreatedAt = DateTime.UtcNow
                    });
                }

                // Ngày mai
                if (tomorrowPeriod != null && !await context.WorkSchedules.AnyAsync(ws => ws.EmployeeId == emp.Id && ws.WorkingDate == tomorrow))
                {
                    context.WorkSchedules.Add(new WorkSchedule
                    {
                        EmployeeId = emp.Id,
                        WorkingDate = tomorrow,
                        WorkShiftId = hcShift.Id,
                        PeriodId = tomorrowPeriod.Id,
                        Note = "Tự động tạo để kiểm tra",
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            if (context.ChangeTracker.HasChanges())
            {
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Đã tạo lịch làm việc thành công cho tất cả nhân viên.");
            }
        }

        public static async Task SeedAttendanceForMarch2026Async(HRMSDbContext context)
        {
            Console.WriteLine("📅 [SEEDER] Đang tạo dữ liệu chấm công, hợp đồng và tổng hợp công mẫu cho tháng 03/2026...");
            
            var marchPeriod = await context.SchedulePeriods
                .FirstOrDefaultAsync(p => p.PeriodName.Contains("03/2026"));
            
            if (marchPeriod == null)
            {
                Console.WriteLine("⚠️ Không tìm thấy kỳ công tháng 03/2026. Bỏ qua seeding.");
                return;
            }

            var employees = await context.Employees.Include(e => e.Contracts).ToListAsync();
            var startDate = new DateTime(2026, 3, 1);
            var endDate = new DateTime(2026, 3, 31);

            foreach (var emp in employees)
            {
                // 1. Đảm bảo có hợp đồng hoạt động (Lương cơ bản)
                if (!emp.Contracts.Any(c => c.IsActive))
                {
                    context.EmployeeContracts.Add(new EmployeeContract {
                        EmployeeId = emp.Id,
                        ContractNumber = "SEED-CT-" + emp.EmployeeCode,
                        ContractType = Domain.Enums.ContractType.FixedTerm,
                        BasicSalary = 12000000m + (new Random().Next(10) * 1000000m),
                        StartDate = DateTime.UtcNow.AddYears(-1),
                        IsActive = true,
                        Status = Domain.Enums.ContractStatus.Active,
                        SignedBy = "System Seed"
                    });
                }

                // 2. Tạo dữ liệu quét vân tay (TimeAttendanceRecords) nếu chưa có
                if (!await context.TimeAttendanceRecords.AnyAsync(r => r.EmployeeId == emp.Id && r.Date == startDate))
                {
                    for (var date = startDate; date <= endDate; date = date.AddDays(1))
                    {
                        if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                        context.TimeAttendanceRecords.Add(new TimeAttendanceRecord {
                            EmployeeId = emp.Id, Date = date, Timestamp = date.AddHours(8), Type = "CheckIn",
                            Location = "Office", DeviceInfo = "Seed", CreatedAt = DateTime.UtcNow
                        });
                        context.TimeAttendanceRecords.Add(new TimeAttendanceRecord {
                            EmployeeId = emp.Id, Date = date, Timestamp = date.AddHours(17), Type = "CheckOut",
                            Location = "Office", DeviceInfo = "Seed", CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                // 3. Tạo AttendanceSummary mẫu NẾU CHƯA TỒN TẠI
                // KHÔNG ghi đè bản ghi cũ để tránh reset khi test
                var summary = await context.AttendanceSummaries
                    .FirstOrDefaultAsync(s => s.EmployeeId == emp.Id && s.PeriodId == marchPeriod.Id);
                
                if (summary == null)
                {
                    summary = new AttendanceSummary {
                        EmployeeId = emp.Id,
                        PeriodId = marchPeriod.Id,
                        Status = Domain.Enums.TimesheetStatus.Approved,
                        TotalWorkingDays = 22, // Mặc định 22 ngày công
                        OvertimeHours = 0,
                        ApprovedAt = DateTime.UtcNow
                    };
                    context.AttendanceSummaries.Add(summary);
                }
                // else: Giữ nguyên Status hiện tại — không ghi đè khi test
            }

            await context.SaveChangesAsync();
            Console.WriteLine("✅ Đã hoàn tất seeding dữ liệu mẫu (Hợp đồng, Điểm danh, Tổng hợp công) cho tháng 03/2026.");
        }

        public static async Task SeedAccountingDeptMarch2026Async(HRMSDbContext context)
        {
            Console.WriteLine("🚀 [SEEDER] Đang tạo dữ liệu đặc thù cho Phòng Kế toán - Tháng 03/2026...");
            
            var dept = await context.Departments
                .FirstOrDefaultAsync(d => d.DepartmentName.Contains("Kế toán") || d.DepartmentCode == "ACC");

            if (dept == null) return;

            var marchPeriod = await context.SchedulePeriods
                .FirstOrDefaultAsync(p => p.PeriodName.Contains("03/2026"));
            
            if (marchPeriod == null) return;

            var employees = await context.Employees
                .Include(e => e.Contracts)
                .Where(e => e.DepartmentId == dept.Id)
                .ToListAsync();

            foreach (var emp in employees)
            {
                // 1. Tăng ca (Overtime) - Grant 10 hours of OT for accounting during month-end
                var summary = await context.AttendanceSummaries
                    .FirstOrDefaultAsync(s => s.EmployeeId == emp.Id && s.PeriodId == marchPeriod.Id);
                
                if (summary != null)
                {
                    summary.OvertimeHours = 10;
                    summary.Status = Domain.Enums.TimesheetStatus.Approved;
                    summary.TotalWorkingDays = Math.Max(summary.TotalWorkingDays, 22);
                    summary.ApprovedAt = DateTime.UtcNow;
                }

                // 2. Ensure high-salary contracts for accounting if needed
                var contract = emp.Contracts.FirstOrDefault(c => c.IsActive);
                if (contract != null && contract.BasicSalary < 15000000m)
                {
                    contract.BasicSalary = 18000000m + (new Random().Next(5) * 1000000m);
                }
            }

            await context.SaveChangesAsync();
            Console.WriteLine("✅ Đã hoàn tất tạo dữ liệu tăng ca và lương cho phòng Kế toán.");
        }

        public static async Task SeedMissingPhotosAsync(HRMSDbContext context)
        {
            Console.WriteLine("📸 [SEEDER] Đang kiểm tra và bổ sung ảnh hồ sơ còn thiếu...");
            
            var employeesMissingPhoto = await context.Employees
                .Where(e => string.IsNullOrEmpty(e.Avatar))
                .ToListAsync();

            if (!employeesMissingPhoto.Any())
            {
                Console.WriteLine("✅ Tất cả nhân viên đều đã có ảnh hồ sơ.");
                return;
            }

            Console.WriteLine($"🔍 Phát hiện {employeesMissingPhoto.Count} nhân viên chưa có ảnh. Đang gán ảnh mẫu...");

            foreach (var emp in employeesMissingPhoto)
            {
                // Sử dụng pravatar.cc với EmployeeCode để tạo ảnh ngẫu nhiên nhưng cố định cho mỗi nhân viên
                emp.Avatar = $"https://i.pravatar.cc/100?u={emp.EmployeeCode}";
            }

            await context.SaveChangesAsync();
            Console.WriteLine($"✅ Đã cập nhật xong ảnh hồ sơ cho {employeesMissingPhoto.Count} nhân viên.");
        }

        public static async Task FixDeptHeadRolesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [SEEDER] Đang cấu hình lại phân quyền Trưởng bộ phận cho các tài khoản '01'...");
            
            var headRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
            var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
            
            if (headRole == null) {
                Console.WriteLine("⚠️ Không tìm thấy Role 'DepartmentHead'. Bỏ qua.");
                return;
            }

            // Tìm tất cả User có Username kết thúc bằng '01'
            var accounts01 = await context.Users
                .Where(u => u.Username.EndsWith("01"))
                .ToListAsync();

            // Tìm tất cả Employee có chức danh 'Trưởng bộ phận' (Dành cho acc_int_01 v.v.)
            var employeesWithHeadTitle = await context.Employees
                .Where(e => e.Position.PositionName.Contains("Trưởng bộ phận") || e.EmployeeCode.EndsWith("01"))
                .Select(e => e.UserId)
                .Where(uid => uid.HasValue)
                .ToListAsync();

            var targetUserIds = accounts01.Select(u => u.Id)
                .Concat(employeesWithHeadTitle.Cast<int>())
                .Distinct()
                .ToList();

            int updatedCount = 0;
            foreach (var userId in targetUserIds)
            {
                var user = await context.Users.FindAsync(userId);
                if (user == null) continue;

                var currentRoles = await context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
                
                // Nếu chưa có role DepartmentHead thì thêm vào
                if (!currentRoles.Any(ur => ur.RoleId == headRole.Id))
                {
                    // Xoá role Employee cũ để tránh gây nhầm lẫn trên UI (UI ưu tiên role đầu tiên tìm thấy)
                    var oldRole = currentRoles.FirstOrDefault(ur => ur.RoleId == (employeeRole?.Id ?? 1));
                    if (oldRole != null) context.UserRoles.Remove(oldRole);

                    context.UserRoles.Add(new UserRole { 
                        UserId = userId, 
                        RoleId = headRole.Id, 
                        AssignedAt = DateTime.UtcNow 
                    });
                    
                    Console.WriteLine($"   -> 👑 Đã nâng cấp code/tài khoản {user.Username} lên Trưởng bộ phận.");
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Đã cập nhật phân quyền cho {updatedCount} Trưởng bộ phận.");
            } else {
                Console.WriteLine("✅ Các Trưởng bộ phận đều đã có phân quyền chính xác.");
            }
        }
        public static async Task CleanupCBApril2026Async(HRMSDbContext context)
        {
            Console.WriteLine("🧹 [CLEANUP] Đang xoá dữ liệu bảng lương và ngày công tháng 4 tổ C&B...");
            
            var cbEmployeeIds = await context.Employees
                .Where(e => e.DepartmentId == 7)
                .Select(e => e.Id)
                .ToListAsync();

            var schedulePeriodId = await context.SchedulePeriods
                .Where(p => p.PeriodName.Contains("04/2026") || p.PeriodName.Contains("4/2026"))
                .Select(p => p.Id)
                .FirstOrDefaultAsync();

            var payrollPeriodId = await context.PayrollPeriods
                .Where(p => p.Name.Contains("04/2026") || p.Name.Contains("4/2026"))
                .Select(p => p.Id)
                .FirstOrDefaultAsync();

            if (cbEmployeeIds.Any())
            {
                // Xoá PayrollRecords
                if (payrollPeriodId > 0)
                {
                    var prToDelete = await context.PayrollRecords
                        .Where(pr => pr.PayrollPeriodId == payrollPeriodId && cbEmployeeIds.Contains(pr.EmployeeId))
                        .ToListAsync();
                    context.PayrollRecords.RemoveRange(prToDelete);
                    Console.WriteLine($"   -> ✅ Đã xoá {prToDelete.Count} bản ghi lương.");
                }

                // Xoá AttendanceSummaries
                if (schedulePeriodId > 0)
                {
                    var asToDelete = await context.AttendanceSummaries
                        .Where(asum => asum.PeriodId == schedulePeriodId && cbEmployeeIds.Contains(asum.EmployeeId))
                        .ToListAsync();
                    context.AttendanceSummaries.RemoveRange(asToDelete);
                    Console.WriteLine($"   -> ✅ Đã xoá {asToDelete.Count} bản ghi tổng hợp công.");
                }

                // Xoá AttendanceDetails tháng 4
                var startDate = new DateTime(2026, 4, 1);
                var endDate = new DateTime(2026, 4, 30);
                var adToDelete = await context.AttendanceDetails
                    .Where(ad => cbEmployeeIds.Contains(ad.EmployeeId) && ad.Date >= startDate && ad.Date <= endDate)
                    .ToListAsync();
                context.AttendanceDetails.RemoveRange(adToDelete);
                Console.WriteLine($"   -> ✅ Đã xoá {adToDelete.Count} bản ghi công chi tiết.");

                await context.SaveChangesAsync();
                Console.WriteLine("✅ Hoàn tất dọn dẹp dữ liệu tổ C&B tháng 4/2026.");
            }
        }
    }
}
