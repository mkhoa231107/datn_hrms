using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class StructureResetSeeder
    {
        private static readonly string[] Surnames = { "Nguyễn", "Trần", "Lê", "Phạm", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô" };
        private static readonly string[] MiddleNames = { "Văn", "Công", "Minh", "Đức", "Thành", "Quốc", "Hữu", "Đình", "Quang", "Trọng", "Thế", "Thị", "Ngọc", "Thu" };
        private static readonly string[] FirstNames = { "Nam", "Hùng", "Dũng", "Tuấn", "Anh", "Sơn", "Tùng", "Thắng", "Hải", "Long", "Trung", "Kiên", "Hoàng", "Hoa", "Lan", "Mai", "Trang", "Linh", "Nga" };

        private static string GenerateName(int i)
        {
            return $"{Surnames[i % Surnames.Length]} {MiddleNames[i % MiddleNames.Length]} {FirstNames[i % FirstNames.Length]}";
        }

        public static async Task SeedAsync(HRMSDbContext context)
        {
            Console.WriteLine("🌱 Starting StructureResetSeeder...");
            var orgId = await context.Organizations.Select(o => o.Id).FirstOrDefaultAsync();
            if (orgId == 0) throw new Exception("Organization not found.");

            var role = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
            var shiftHc = await context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftCode == "HC");
            var shiftC1 = await context.WorkShifts.FirstOrDefaultAsync(s => s.ShiftCode == "C1");

            int roleId = role?.Id ?? 0;
            int hcShiftId = shiftHc?.Id ?? 0;
            int c1ShiftId = shiftC1?.Id ?? hcShiftId;

            string hash = BCrypt.Net.BCrypt.HashPassword("123456");

            var depts = await context.Departments.ToDictionaryAsync(d => d.Id);

            var seedConfigs = new List<SeedConfig>
            {
                // Phòng Kinh doanh (Id 1)
                new SeedConfig(1, 1, 1, "sales_mgr", "SALES-MGR", "Trưởng phòng Kinh doanh", 30000000, hcShiftId),
                // Miền Bắc (Id 5)
                new SeedConfig(5, 5, 1, "sales_n_tl", "SALES-N-TL", "Trưởng nhóm KD Bắc", 20000000, hcShiftId),
                new SeedConfig(5, 6, 10, "sales_n_staff", "SALES-N", "Nhân viên KD Bắc", 10000000, hcShiftId),
                // Miền Nam (Id 6)
                new SeedConfig(6, 7, 1, "sales_s_tl", "SALES-S-TL", "Trưởng nhóm KD Nam", 20000000, hcShiftId),
                new SeedConfig(6, 8, 10, "sales_s_staff", "SALES-S", "Nhân viên KD Nam", 10000000, hcShiftId),

                // Phòng Marketing (Id 2)
                new SeedConfig(2, 2, 1, "mkt_mgr", "MKT-MGR", "Trưởng phòng Marketing", 30000000, hcShiftId),
                // Digital (Id 7)
                new SeedConfig(7, 9, 1, "mkt_dig_tl", "MKT-DIG-TL", "Trưởng nhóm Digital", 20000000, hcShiftId),
                new SeedConfig(7, 10, 10, "mkt_dig_staff", "MKT-DIG", "Chuyên viên Digital", 12000000, hcShiftId),
                // Sự kiện (Id 8)
                new SeedConfig(8, 11, 1, "mkt_evt_tl", "MKT-EVT-TL", "Trưởng nhóm Sự kiện", 20000000, hcShiftId),
                new SeedConfig(8, 12, 10, "mkt_evt_staff", "MKT-EVT", "Nhân viên Sự kiện", 10000000, hcShiftId),

                // Phòng Sản xuất (Id 3)
                new SeedConfig(3, 3, 1, "prd_mgr", "PRD-MGR", "Trưởng phòng Sản xuất", 30000000, hcShiftId),
                // QA/QC (Id 9)
                new SeedConfig(9, 13, 1, "prd_qa_tl", "PRD-QA-TL", "Trưởng nhóm QA/QC", 18000000, hcShiftId),
                new SeedConfig(9, 14, 10, "prd_qa_staff", "PRD-QA", "Nhân viên QA", 12000000, hcShiftId),
                new SeedConfig(9, 15, 10, "prd_qc_staff", "PRD-QC", "Nhân viên QC", 10000000, hcShiftId),
                // Xưởng lắp ráp (Id 10)
                new SeedConfig(10, 16, 1, "prd_ass_mgr", "PRD-ASS-MGR", "Xưởng trưởng", 25000000, hcShiftId),
                new SeedConfig(10, 18, 150, "prd_ass_w", "PRD-ASS-W", "Công nhân xưởng", 8000000, c1ShiftId)
            };

            int globalCounter = 1;
            using var trans = await context.Database.BeginTransactionAsync();
            try
            {
                foreach (var config in seedConfigs)
                {
                    for (int i = 1; i <= config.Count; i++)
                    {
                        string usernameSuffix = config.Count > 1 ? $"_{i:D2}" : "";
                        string codeSuffix = config.Count > 1 ? $"-{i:D3}" : "";
                        
                        string username = $"{config.UsernamePrefix}{usernameSuffix}";
                        string code = $"{config.CodePrefix}{codeSuffix}";
                        string email = $"{username}@techvn.com";
                        string fullName = GenerateName(globalCounter);

                        var user = new User
                        {
                            Username = username,
                            PasswordHash = hash,
                            Email = email,
                            FullName = fullName,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        context.Users.Add(user);
                        await context.SaveChangesAsync();

                        if (roleId > 0)
                        {
                            context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId, AssignedAt = DateTime.UtcNow });
                        }

                        var emp = new Employee
                        {
                            EmployeeCode = code,
                            FullName = fullName,
                            Gender = (globalCounter % 2 == 0) ? "Nữ" : "Nam",
                            Email = email,
                            JoinDate = new DateTime(2025, 1, 1),
                            Status = Domain.Enums.EmployeeStatus.Active,
                            OrganizationId = orgId,
                            DepartmentId = config.DepartmentId,
                            PositionId = config.PositionId,
                            UserId = user.Id,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true,
                            DateOfBirth = new DateTime(1990 + (globalCounter % 10), (globalCounter % 12) + 1, (globalCounter % 28) + 1),
                            PlaceOfBirth = "Hà Nội",
                            PlaceOfOrigin = "Hà Nội"
                        };
                        context.Employees.Add(emp);
                        await context.SaveChangesAsync();

                        var contract = new EmployeeContract
                        {
                            EmployeeId = emp.Id,
                            ContractNumber = $"HDLD/2026/{code}",
                            ContractType = Domain.Enums.ContractType.FixedTerm,
                            StartDate = new DateTime(2025, 1, 1),
                            BasicSalary = config.Salary,
                            IsActive = true,
                            Status = Domain.Enums.ContractStatus.Active,
                            CreatedAt = DateTime.UtcNow,
                            ShiftId = config.DefaultShiftId,
                            TargetDepartmentId = config.DepartmentId,
                            TargetPositionId = config.PositionId
                        };
                        context.EmployeeContracts.Add(contract);

                        if (config.Count == 1 && depts.TryGetValue(config.DepartmentId, out var dept))
                        {
                            dept.ManagerId = emp.Id;
                        }

                        globalCounter++;
                    }
                    Console.WriteLine($"✅ Seeded {config.Count} employees for {config.UsernamePrefix}");
                }
                
                await context.SaveChangesAsync();
                await trans.CommitAsync();
                Console.WriteLine($"🎉 Seeding complete! Total employees added: {globalCounter - 1}");
            }
            catch (Exception ex)
            {
                await trans.RollbackAsync();
                Console.WriteLine($"❌ Seeding failed: {ex.Message}");
                throw;
            }
        }
    }

    public class SeedConfig
    {
        public int DepartmentId { get; set; }
        public int PositionId { get; set; }
        public int Count { get; set; }
        public string UsernamePrefix { get; set; }
        public string CodePrefix { get; set; }
        public string Title { get; set; }
        public decimal Salary { get; set; }
        public int DefaultShiftId { get; set; }

        public SeedConfig(int deptId, int posId, int count, string usernamePrefix, string codePrefix, string title, decimal salary, int shiftId)
        {
            DepartmentId = deptId;
            PositionId = posId;
            Count = count;
            UsernamePrefix = usernamePrefix;
            CodePrefix = codePrefix;
            Title = title;
            Salary = salary;
            DefaultShiftId = shiftId;
        }
    }
}
