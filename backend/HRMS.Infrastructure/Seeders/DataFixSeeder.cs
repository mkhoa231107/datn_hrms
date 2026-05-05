using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
#pragma warning disable EF1002
using System;
using System.Linq;
using System.Text;
using System.Globalization;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace HRMS.Infrastructure.Seeders
{
    public static class DataFixSeeder
    {
        public static async Task FixUserRolesAsync(HRMSDbContext context)
        {
            context.ChangeTracker.Clear();
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

            // After generic fix, apply specific overrides for management accounts
            await FixSpecificManagerRolesAsync(context);
            await FixDeptHeadRolesAsync(context);
        }

        public static async Task FixSpecificManagerRolesAsync(HRMSDbContext context)
        {
            context.ChangeTracker.Clear();
            Console.WriteLine("🛠️ [FIX] Standardizing Manager vs Admin permissions...");

            var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Admin");
            var managerRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentManager");
            var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");

            if (adminRole == null || managerRole == null) return;

            // Target all manager accounts (manager_hr, manager_acc, etc.)
            var managers = await context.Users
                .Where(u => u.Username.StartsWith("manager_") || u.Email.StartsWith("manager_"))
                .ToListAsync();

            foreach (var manager in managers)
            {
                var currentRoles = await context.UserRoles.Where(ur => ur.UserId == manager.Id).ToListAsync();
                
                // 1. Ensure they have DepartmentManager role
                if (!currentRoles.Any(ur => ur.RoleId == managerRole.Id) && 
                    !context.UserRoles.Local.Any(ur => ur.UserId == manager.Id && ur.RoleId == managerRole.Id))
                {
                    context.UserRoles.Add(new UserRole { UserId = manager.Id, RoleId = managerRole.Id, AssignedAt = DateTime.UtcNow });
                    Console.WriteLine($"   -> 👑 Assigned DepartmentManager role to {manager.Username}");
                }
                
                // 2. EXPLICITLY REMOVE Admin role (Only 'admin' account should have it)
                var adminRoleMapping = currentRoles.FirstOrDefault(ur => ur.RoleId == adminRole.Id);
                if (adminRoleMapping != null && manager.Username != "admin")
                {
                    context.UserRoles.Remove(adminRoleMapping);
                    Console.WriteLine($"   -> 🛡️ Removed Admin role from {manager.Username} (Managers should not be Admins)");
                }

                // 3. Remove Employee role to prevent UI confusion
                var empRoleMapping = currentRoles.FirstOrDefault(ur => ur.RoleId == employeeRole?.Id);
                if (empRoleMapping != null)
                {
                    context.UserRoles.Remove(empRoleMapping);
                    Console.WriteLine($"   -> 🗑️ Removed Employee role from {manager.Username} for UI clarity.");
                }
            }

            await context.SaveChangesAsync();
        }

        public static async Task FixPositionCoefficientsAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Standardizing Position DefaultCoefficients...");
            
            // 1. Update Coefficients for key positions
            var positions = await context.Positions.ToListAsync();
            
            foreach (var pos in positions)
            {
                if (pos.PositionCode.EndsWith("-MGR")) pos.DefaultCoefficient = 1.6m;
                else if (pos.PositionCode.EndsWith("-DIR")) pos.DefaultCoefficient = 2.0m;
                else if (pos.PositionCode.EndsWith("-TL")) pos.DefaultCoefficient = 1.3m;
                else if (pos.PositionCode.Contains("-W-")) pos.DefaultCoefficient = 1.0m;
                else if (pos.PositionCode == "PRD-ASS-W") pos.DefaultCoefficient = 1.0m;
                else if (pos.PositionCode == "HR-SPEC") pos.DefaultCoefficient = 1.2m;
                else if (pos.DefaultCoefficient <= 0) pos.DefaultCoefficient = 1.0m;
                
                pos.UpdatedAt = DateTime.UtcNow;
            }

            await context.SaveChangesAsync();
        }

        public static async Task FixContractSalariesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Recalculating all Contract Salaries based on formula...");
            
            var settings = await context.PayrollSettings.FirstOrDefaultAsync(s => s.IsActive);
            if (settings == null) {
                Console.WriteLine("⚠️ No active PayrollSettings found. Skipping salary fix.");
                return;
            }

            var contracts = await context.EmployeeContracts
                .Include(c => c.Employee)
                    .ThenInclude(e => e.Position)
                .Where(c => c.IsActive && c.Status == HRMS.Domain.Enums.ContractStatus.Active)
                .ToListAsync();

            int updatedCount = 0;
            foreach (var contract in contracts)
            {
                decimal coefficient = contract.Employee.Coefficient > 0 
                    ? contract.Employee.Coefficient 
                    : (contract.Employee.Position?.DefaultCoefficient ?? 1.0m);
                
                // Formula: (RegionBaseSalary / 26) * Coefficient * 26
                decimal newSalary = Math.Round((settings.RegionBaseSalary / 26m) * coefficient * 26m);
                
                if (contract.BasicSalary != newSalary || contract.Employee.BasicSalary != newSalary)
                {
                    contract.BasicSalary = newSalary;
                    contract.Employee.BasicSalary = newSalary;
                    updatedCount++;
                }
            }

            await context.SaveChangesAsync();
            Console.WriteLine($"✅ Updated salaries for {updatedCount} contracts based on Region Minimum {settings.RegionBaseSalary:N0} VNĐ.");
        }

        public static async Task FixManagerPositionsAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Đang cập nhật chức vụ cho các Trưởng bộ phận & Tổ trưởng...");

            // 1. Lấy danh sách các vị trí Lead/Manager để gán
            var positions = await context.Positions.ToListAsync();
            var leadPos = positions.FirstOrDefault(p => p.PositionCode == "TRUONGNHOMKINHDOANH") ?? positions.FirstOrDefault(p => p.PositionName.Contains("Trưởng nhóm"));
            var shopMgrPos = positions.FirstOrDefault(p => p.PositionCode == "PRD-ASS-MGR") ?? positions.FirstOrDefault(p => p.PositionName.Contains("Xưởng trưởng"));
            var deptHeadPos = positions.FirstOrDefault(p => p.PositionName.Contains("Trưởng bộ phận")) ?? positions.FirstOrDefault(p => p.PositionName.Contains("Trưởng phòng"));

            if (leadPos == null || shopMgrPos == null) return;

            // 2. Tìm nhân viên có ROLE là DepartmentHead hoặc DepartmentManager
            var managerRoleIds = await context.Roles
                .Where(r => r.RoleName == "DepartmentHead" || r.RoleName == "DepartmentManager")
                .Select(r => r.Id)
                .ToListAsync();

            // 3. Tìm các ManagerId trong bảng Departments
            var deptManagers = await context.Departments
                .Where(d => d.ManagerId.HasValue)
                .Select(d => d.ManagerId.Value)
                .ToListAsync();

            // 4. Danh sách các nhân viên THỰC SỰ cần nâng cấp chức danh
            var employeesToUpgrade = await context.Employees
                .Include(e => e.Position)
                .Where(e => 
                    // Dựa trên mã nhân viên (MGR, TL) - Loại trừ mã công nhân W
                    (e.EmployeeCode.EndsWith("-MGR") || e.EmployeeCode.EndsWith("-TL"))
                    // Hoặc được gán là manager của phòng ban
                    || deptManagers.Contains(e.Id)
                    // Hoặc có role quản lý
                    || (e.UserId.HasValue && context.UserRoles.Any(ur => ur.UserId == e.UserId && managerRoleIds.Contains(ur.RoleId)))
                    // Hoặc cụ thể là tài khoản SALES-N-010 của anh Hoàng đã xác nhận trước đó
                    || e.EmployeeCode == "SALES-N-010"
                )
                .Where(e => e.Position == null || e.Position.DefaultCoefficient <= 1.0m)
                .ToListAsync();

            int updatedCount = 0;
            foreach (var emp in employeesToUpgrade)
            {
                if (emp.DepartmentId == 10) emp.PositionId = shopMgrPos.Id;
                else if (emp.EmployeeCode.Contains("SALES")) emp.PositionId = leadPos.Id;
                else emp.PositionId = deptHeadPos?.Id ?? leadPos.Id;
                updatedCount++;
            }

            // 5. ĐẶC BIỆT: Hạ cấp các nhân sự bị gán nhầm là quản lý (như PRD-ASS-W-001)
            var workerPos = positions.FirstOrDefault(p => p.PositionCode == "PRD-ASS-W") ?? positions.FirstOrDefault(p => p.PositionName.Contains("Công nhân"));
            var workersToRevert = await context.Employees
                .Where(e => e.EmployeeCode.StartsWith("PRD-ASS-W-") 
                            && e.PositionId == shopMgrPos.Id
                            && !deptManagers.Contains(e.Id))
                .ToListAsync();

            foreach (var emp in workersToRevert)
            {
                emp.PositionId = workerPos?.Id ?? emp.PositionId;
                updatedCount++;
            }

            if (updatedCount > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Đã điều chỉnh chức danh cho {updatedCount} nhân sự.");
            }
        }

        public static async Task FixAdminEmployeeLinkageAsync(HRMSDbContext context)
        {
            await SyncAllUserEmployeeLinkagesAsync(context);
        }

        public static async Task SyncAllUserEmployeeLinkagesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Đồng bộ liên kết User-Employee bằng SQL Raw...");

            try 
            {
                // 1. Gán UserId cho các Employee dựa trên mã nhân viên linh hoạt
                // Hỗ trợ: prd_ass_XX, prd-ass-XXX, prd-ass-XX
                var sqlSync = @"
                    -- Bước A: Đồng bộ dữ liệu dựa trên các quy tắc đặt tên (Ưu tiên định dạng prd_ass_XX)
                    -- Nhóm 1: Ưu tiên prd_ass_2 (Gạch dưới, không bắt buộc đệm số 0)
                    UPDATE e
                    SET e.UserId = u.Id
                    FROM Employees e
                    INNER JOIN Users u ON (u.Username LIKE 'prd_ass_%' AND ISNUMERIC(REPLACE(u.Username, 'prd_ass_', '')) = 1 AND e.EmployeeCode = 'PRD-ASS-' + RIGHT('000' + CAST(REPLACE(u.Username, 'prd_ass_', '') AS INT), 3))
                    WHERE e.UserId IS NULL OR e.UserId <> u.Id;

                    -- Nhóm 2: Nếu sau bước 1 vẫn chưa có UserId, thử với prd-ass-002 (Gạch ngang)
                    UPDATE e
                    SET e.UserId = u.Id
                    FROM Employees e
                    INNER JOIN Users u ON (u.Username LIKE 'prd-ass-%' AND e.EmployeeCode = UPPER(u.Username))
                    WHERE e.UserId IS NULL;

                    -- Nhóm 3: Các trường hợp còn lại (admin, email)
                    UPDATE e
                    SET e.UserId = u.Id
                    FROM Employees e
                    INNER JOIN Users u ON (
                        (u.Username = 'admin' AND e.EmployeeCode = 'ADMIN_01')
                        OR (u.Email = e.Email AND u.Email IS NOT NULL AND u.Email <> '')
                    )
                    WHERE e.UserId IS NULL;

                    -- Bước B: Dọn dẹp tài khoản trùng lặp (Nếu prd_ass_02 đã chiếm Employee, thì prd-ass-002 là tài khoản thừa)
                    -- Chỉ xóa nếu tài khoản thừa không có dữ liệu quan trọng (hoặc đơn giản là gán lại để tránh tranh chấp)
                    -- Ở đây chúng ta sẽ đảm bảo UserId trong Employees luôn trỏ về đúng tài khoản người dùng đang dùng.

                    -- Bước B: Đảm bảo Admin luôn có hồ sơ
                    DECLARE @AdminUserId INT = (SELECT TOP 1 Id FROM Users WHERE Username = 'admin');
                    
                    IF @AdminUserId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM Employees WHERE UserId = @AdminUserId)
                    BEGIN
                        DECLARE @OrgId INT = (SELECT TOP 1 Id FROM Organizations);
                        DECLARE @DeptId INT = (SELECT TOP 1 Id FROM Departments WHERE DepartmentCode = 'ADM');
                        DECLARE @PosId INT = (SELECT TOP 1 Id FROM Positions WHERE PositionCode = 'ADM-SYS');

                        IF @OrgId IS NOT NULL AND @DeptId IS NOT NULL AND @PosId IS NOT NULL
                        BEGIN
                            INSERT INTO Employees (EmployeeCode, FullName, Email, Phone, Address, JoinDate, DateOfBirth, Gender, [Status], IsActive, OrganizationId, DepartmentId, PositionId, UserId, CreatedAt)
                            VALUES ('ADMIN_01', 'System Administrator', 'admin@hrms.local', '0000000000', 'System', GETUTCDATE(), '1990-01-01', 'Other', 2, 1, @OrgId, @DeptId, @PosId, @AdminUserId, GETUTCDATE());
                        END
                    END
                ";

                await context.Database.ExecuteSqlRawAsync(sqlSync);
                Console.WriteLine("✅ Đã hoàn tất đồng bộ hóa liên kết bằng SQL Raw.");
                
                // Cập nhật chữ ký mẫu cho tất cả nhân viên chưa có chữ ký
                await FixEmployeeSignaturesAsync(context);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Lỗi khi đồng bộ SQL Raw: {ex.Message}");
            }
        }

        public static async Task FixEmployeeSignaturesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Đang khởi tạo chữ ký mẫu cho nhân viên...");
            
            var employeesWithNoSignature = await context.Employees
                .Where(e => string.IsNullOrEmpty(e.Signature))
                .ToListAsync();

            if (!employeesWithNoSignature.Any())
            {
                Console.WriteLine("✅ Tất cả nhân viên đều đã có chữ ký.");
                return;
            }

            foreach (var emp in employeesWithNoSignature)
            {
                // Sử dụng một placeholder signature image (Base64)
                // Đây là ảnh chữ ký "Electronic Signature" dạng viết tay giả lập
                emp.Signature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqNX6DAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5AgKCQ8zP987XAAAAfBJREFUeNrqmE1uwyAQhf9S96p7E78L7ZPoLvo2uo0uo6+is+iqSRWvOnYVvwreBfYSXG3S9CTW7pTdqWrvKqaY3/vDzDAECCH9yL8/CXk3CKAAALUAmAL7yJvOAmNg7Wf/DJgFw8DfPwCmoZ8eApPArPH7GbgA1i9v+guYAZuXN/10v96o+v1E6v1M6j8s2WMk9VqS+h3U969U339J9ZOSvjtIfUukvg38esQr8fyJX+L5E7/U6r1/v+dYf3+Y+pxJn95Jn6l30mfqnfaZaien76/+e7/+Z78K9Y8e9Y8e9Y8e9Y8e9Y8e9Y8e9Y8e9Y8e9Y8e9Y/eX/+9v0C9BfVfS/27Kfq+S/3vL9S7UP89UO9B/Z9P8v976H//v7f87/93Xv7/X9L//9///38A6AcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNoAbfELWKl/R6u9yP9NfXoAAAAASUVK_"; // This is a tiny dummy PNG
                // Actually, I'll use a slightly more realistic looking Base64 if possible
                // But for now, let's use a standard "Sign" placeholder.
            }

            await context.SaveChangesAsync();
            Console.WriteLine($"✅ Đã khởi tạo chữ ký mẫu cho {employeesWithNoSignature.Count} nhân viên.");
        }

        public static async Task EnsureAllManagersHaveEmployeesAsync(HRMSDbContext context)
        {
            // Xoá cache để lấy dữ liệu mới nhất
            context.ChangeTracker.Clear();

            Console.WriteLine("🛠️ [SEEDER] Bắt đầu đồng bộ hóa dữ liệu nhân sự và dọn dẹp rác...");

            // 1. NGẮT QUY TRÌNH TỰ TẠO NHÂN VIÊN FIX_ (Để tránh vòng lặp Tạo-Xoá)
            // Chúng ta không tạo thêm các bản ghi FIX_ nữa để giữ danh sách sạch sẽ.

            // 2. ÉP TẠO LẠI hr_cb_01 (LÊ THỊ THẢO) TẠI ID 19 (Cả Users & Employees)
            // Đã BỎ QUA việc xoá và tạo lại account này mỗi khi khởi động để bảo toàn dữ liệu test (Ví dụ: ShiftSwapRequests)
            Console.WriteLine("🔨 [FIX] Bỏ qua khôi phục tài khoản Lê Thị Thảo để giữ nguyên dữ liệu test.");
            context.ChangeTracker.Clear();

            // 3. DỌN DEP NHÂN VIÊN RÁC BẰNG SQL NGUYÊN BẢN (TRÁNH LỖI CONCURRENCY)
            var codesToCleanup = new[] { 
                "TT_01", "NV_01", "NV_02", "NV_03", 
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
                    


                    // C. XOÁ DỮ LIỆU PHỤ THUỘC (UserId)
                    if (data.UserId.HasValue) {
                        var uid = data.UserId.Value;
                        string[] userTables = { "AuditLogs", "UserRoles", "PasswordResetOTPs", "CompanyNews" };
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
            
            // 5. CLEANUP JUNK EMPLOYEES (KT_01, TP_01, PRD-ASS-001..150)
            await CleanupJunkEmployeesAsync(context);
        }

        public static async Task CleanupJunkEmployeesAsync(HRMSDbContext context)
        {
            Console.WriteLine("🧹 [CLEANUP] Đang xoá nhân sự rác (KT_01, TP_01, PRD-ASS-001..150)...");
            
            // 1. Tìm các nhân sự rác
            var junkEmployees = await context.Employees
                .Where(e => e.EmployeeCode == "KT_01" || e.EmployeeCode == "TP_01" || (e.EmployeeCode.StartsWith("PRD-ASS-") && !e.EmployeeCode.Contains("-W-")))
                .Select(e => new { e.Id, e.UserId })
                .ToListAsync();

            if (!junkEmployees.Any())
            {
                Console.WriteLine("✅ Không tìm thấy nhân sự rác nào cần xoá.");
                return;
            }

            Console.WriteLine($"🗑️ Phát hiện {junkEmployees.Count} nhân sự rác. Đang dọn dẹp...");

            foreach (var emp in junkEmployees)
            {
                var eid = emp.Id;

                // A. Ngắt ràng buộc
                await context.Database.ExecuteSqlRawAsync($"UPDATE Departments SET ManagerId = NULL WHERE ManagerId = {eid}");
                await context.Database.ExecuteSqlRawAsync($"UPDATE Employees SET ManagerId = NULL WHERE ManagerId = {eid}");
                
                try {
                    await context.Database.ExecuteSqlRawAsync($@"
                        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('LeaveRequests') AND name = 'ApproverId')
                        EXEC('UPDATE LeaveRequests SET ApproverId = NULL WHERE ApproverId = {eid}')");
                } catch {}

                // B. Xoá dữ liệu phụ thuộc (EmployeeId)
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

                // C. Xoá dữ liệu phụ thuộc (UserId)
                if (emp.UserId.HasValue) {
                    var uid = emp.UserId.Value;
                    string[] userTables = { "AuditLogs", "UserRoles", "PasswordResetOTPs", "CompanyNews" };
                    foreach (var tbl in userTables) {
                        try { 
                            if (tbl == "CompanyNews") await context.Database.ExecuteSqlRawAsync($"DELETE FROM CompanyNews WHERE AuthorId = {uid}");
                            else await context.Database.ExecuteSqlRawAsync($"DELETE FROM {tbl} WHERE UserId = {uid}");
                        } catch {}
                    }
                }

                // D. Xoá chính chủ
                await context.Database.ExecuteSqlRawAsync($"DELETE FROM Employees WHERE Id = {eid}");
                if (emp.UserId.HasValue) {
                    await context.Database.ExecuteSqlRawAsync($"DELETE FROM Users WHERE Id = {emp.UserId.Value}");
                }
            }

            Console.WriteLine($"✅ Đã dọn dẹp xong {junkEmployees.Count} nhân sự.");
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
            context.ChangeTracker.Clear();
            Console.WriteLine("🛠️ [SEEDER] Đang cấu hình lại phân quyền Trưởng bộ phận cho các tài khoản '01'...");
            
            var headRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "DepartmentHead");
            var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
            
            if (headRole == null) {
                Console.WriteLine("⚠️ Không tìm thấy Role 'DepartmentHead'. Bỏ qua.");
                return;
            }

            // Tìm tất cả User có Username kết thúc bằng '01', loại trừ công nhân/nhân viên
            var accounts01 = await context.Users
                .Where(u => u.Username.EndsWith("01") && !u.Username.Contains("_w_") && !u.Username.Contains("_staff_"))
                .ToListAsync();

            // Tìm tất cả Employee có chức danh 'Trưởng bộ phận' 
            var employeesWithHeadTitle = await context.Employees
                .Where(e => e.Position.PositionName.Contains("Trưởng bộ phận"))
                .Select(e => e.UserId)
                .Where(uid => uid.HasValue)
                .ToListAsync();

            var targetUserIds = accounts01.Select(u => u.Id)
                .Concat(employeesWithHeadTitle.Cast<int>())
                .Distinct()
                .ToList();

            var accountantRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Accountant");

            int updatedCount = 0;
            foreach (var userId in targetUserIds)
            {
                var user = await context.Users.FindAsync(userId);
                if (user == null || user.Username == "ketoan") continue;

                var currentRoles = await context.UserRoles.Where(ur => ur.UserId == userId).ToListAsync();
                
                // Skip if user already has Accountant role (they should keep their specialized role)
                if (accountantRole != null && currentRoles.Any(ur => ur.RoleId == accountantRole.Id))
                    continue;

                // Nếu chưa có role DepartmentHead thì thêm vào
                if (!currentRoles.Any(ur => ur.RoleId == headRole.Id))
                {
                    // Xoá role Employee cũ để tránh gây nhầm lẫn trên UI (UI ưu tiên role đầu tiên tìm thấy)
                    var oldRole = currentRoles.FirstOrDefault(ur => ur.RoleId == (employeeRole?.Id ?? 1));
                    if (oldRole != null) context.UserRoles.Remove(oldRole);

                    // Ensure we are not already tracking this role in the Local collection to avoid conflict
                    if (!context.UserRoles.Local.Any(ur => ur.UserId == userId && ur.RoleId == headRole.Id))
                    {
                        context.UserRoles.Add(new UserRole { 
                            UserId = userId, 
                            RoleId = headRole.Id, 
                            AssignedAt = DateTime.UtcNow 
                        });
                    }
                    
                    Console.WriteLine($"   -> 👑 Đã nâng cấp code/tài khoản {user.Username} lên Trưởng bộ phận.");
                    updatedCount++;
                }
            }

            // [CLEANUP] Hạ quyền những nhân viên bị gán nhầm role DepartmentHead (ví dụ prd_ass_w_01)
            var wronglyPromoted = await context.UserRoles
                .Where(ur => ur.RoleId == headRole.Id)
                .Where(ur => ur.User.Username.Contains("_w_") || ur.User.Username.Contains("_staff_") || ur.User.Username.Contains("nhanvien"))
                .ToListAsync();

            if (wronglyPromoted.Any())
            {
                Console.WriteLine($"   -> ⚠️ Phát hiện {wronglyPromoted.Count} tài khoản bị gán nhầm quyền Head. Đang hạ cấp...");
                foreach (var ur in wronglyPromoted)
                {
                    context.UserRoles.Remove(ur);
                    if (employeeRole != null && !context.UserRoles.Local.Any(x => x.UserId == ur.UserId && x.RoleId == employeeRole.Id))
                    {
                        context.UserRoles.Add(new UserRole { UserId = ur.UserId, RoleId = employeeRole.Id, AssignedAt = DateTime.UtcNow });
                    }
                }
                updatedCount += wronglyPromoted.Count;
            }

            if (updatedCount > 0) {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Đã cập nhật/sửa lỗi phân quyền cho {updatedCount} tài khoản.");
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

        public static async Task FixOvertimeSchemaAsync(HRMSDbContext context)
        {
            // Removed: OvertimePlans and OvertimeAssignments have been decommissioned.
            await Task.CompletedTask;
        }

        public static string GenerateWorkEmail(string fullName, string employeeCode)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "employee@gmail.com";
            if (string.IsNullOrWhiteSpace(employeeCode)) employeeCode = "emp";

            // 1. Remove diacritics
            string normalizedString = fullName.Normalize(NormalizationForm.FormD);
            StringBuilder stringBuilder = new StringBuilder();

            foreach (char c in normalizedString)
            {
                UnicodeCategory unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            string noDiacritics = stringBuilder.ToString().Normalize(NormalizationForm.FormC).ToLower();
            noDiacritics = noDiacritics.Replace('đ', 'd');

            // 2. Split into parts
            var parts = noDiacritics.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return $"{employeeCode.ToLower()}@gmail.com";

            // Last part is First Name (Tên)
            string firstName = parts.Last();
            
            // Initials for work email
            string initials = "";
            for (int i = 0; i < parts.Length - 1; i++)
            {
                if (parts[i].Length > 0)
                    initials += parts[i][0];
            }

            // Work Pattern: [FirstName][Initials][Code]@gmail.com
            return $"{firstName}{initials}{employeeCode.ToLower()}@gmail.com";
        }

        public static string GeneratePersonalEmail(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "employee@gmail.com";

            // 1. Remove diacritics
            string normalizedString = fullName.Normalize(NormalizationForm.FormD);
            StringBuilder stringBuilder = new StringBuilder();

            foreach (char c in normalizedString)
            {
                UnicodeCategory unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }
            string noDiacritics = stringBuilder.ToString().Normalize(NormalizationForm.FormC).ToLower();
            noDiacritics = noDiacritics.Replace('đ', 'd');

            // 2. Split into parts
            var parts = noDiacritics.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) return "employee@gmail.com";

            // Pattern: [FirstName][Surname][MiddleNames]@gmail.com
            // Example: Nguyễn Văn Tùng -> tungnguyenvan@gmail.com
            string firstName = parts.Last();
            string restOfName = "";
            for (int i = 0; i < parts.Length - 1; i++)
            {
                restOfName += parts[i];
            }
            
            return $"{firstName}{restOfName}@gmail.com";
        }

        public static async Task FixEmployeeEmailsAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Updating employee emails...");
            
            var employees = await context.Employees.Include(e => e.User).ToListAsync();
            int count = 0;

            foreach (var emp in employees)
            {
                string workEmail = GenerateWorkEmail(emp.FullName, emp.EmployeeCode);
                string personalEmail = GeneratePersonalEmail(emp.FullName);
                
                bool changed = false;
                if (emp.Email != workEmail)
                {
                    emp.Email = workEmail;
                    changed = true;
                }

                if (emp.PersonalEmail != personalEmail)
                {
                    emp.PersonalEmail = personalEmail;
                    changed = true;
                }

                if (emp.User != null && emp.User.Email != workEmail)
                {
                    emp.User.Email = workEmail;
                    changed = true;
                }

                if (changed) count++;
            }

            if (count > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Updated emails for {count} employees.");
            }
        }

        public static async Task FixMissingEmployeeInfoAsync(HRMSDbContext context)
        {
            Console.WriteLine("🛠️ [FIX] Populating missing employee information...");
            
            var employees = await context.Employees.ToListAsync();
            int count = 0;
            var rand = new Random();

            foreach (var emp in employees)
            {
                bool changed = false;

                if (string.IsNullOrWhiteSpace(emp.Phone) || emp.Phone == "0000000000")
                {
                    emp.Phone = "09" + rand.Next(10000000, 99999999).ToString();
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.IdentityNumber))
                {
                    emp.IdentityNumber = "0" + rand.Next(10000000, 99999999).ToString().PadRight(11, (char)('0' + rand.Next(10)));
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.IdentityPlace))
                {
                    emp.IdentityPlace = "Cục Cảnh sát QLHC về TTXH";
                    changed = true;
                }

                if (!emp.IdentityDate.HasValue)
                {
                    emp.IdentityDate = new DateTime(2021, 1, 1).AddDays(rand.Next(1000));
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.Ethnicity))
                {
                    emp.Ethnicity = "Kinh";
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.Religion))
                {
                    emp.Religion = "Không";
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.PlaceOfOrigin) || emp.PlaceOfOrigin == "Hà Nội")
                {
                    string[] provinces = { "Hà Nội", "Hải Phòng", "Đà Nẵng", "TP. Hồ Chí Minh", "Cần Thơ", "Nghệ An", "Thanh Hóa", "Hà Tĩnh", "Quảng Ninh", "Bắc Ninh" };
                    emp.PlaceOfOrigin = provinces[rand.Next(provinces.Length)];
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.PlaceOfBirth))
                {
                    emp.PlaceOfBirth = emp.PlaceOfOrigin;
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.Address) || emp.Address == "HQ" || emp.Address == "System")
                {
                    emp.Address = $"Số {rand.Next(1, 200)}, Phố {emp.PlaceOfOrigin}, Việt Nam";
                    changed = true;
                }

                if (string.IsNullOrWhiteSpace(emp.CurrentAddress))
                {
                    emp.CurrentAddress = emp.Address;
                    changed = true;
                }

                if (changed) count++;
            }

            if (count > 0)
            {
                await context.SaveChangesAsync();
                Console.WriteLine($"✅ Populated missing info for {count} employees.");
            }
        }
    }
}
