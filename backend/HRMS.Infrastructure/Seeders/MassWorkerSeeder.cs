using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    public static class MassWorkerSeeder
    {
        private static readonly string[] Surnames = { "Nguyễn", "Trần", "Lê", "Phạm", "Phan", "Vũ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô" };
        private static readonly string[] MiddleNames = { "Văn", "Công", "Minh", "Đức", "Thành", "Quốc", "Hữu", "Đình", "Quang", "Trọng", "Thế" };
        private static readonly string[] FirstNames = { "Nam", "Hùng", "Dũng", "Tuấn", "Anh", "Sơn", "Tùng", "Thắng", "Hải", "Long", "Trung", "Kiên", "Hoàng" };

        public static async Task SeedAsync(HRMSDbContext context, string connectionString)
        {
            Console.WriteLine("🏭 Starting Mass Seeding (PRD-ASS-001 to 151)...");

            // 1. Get Prerequisites (Check or Create)
            var orgId = await context.Organizations.Select(o => o.Id).FirstOrDefaultAsync();
            var dept = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "PRD-ASS");
            if (dept == null)
            {
                var prdParent = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "PRD");
                dept = new Department { 
                    DepartmentName = "Xưởng lắp ráp (PRD-ASS)", 
                    DepartmentCode = "PRD-ASS", 
                    OrganizationId = orgId,
                    ParentDepartmentId = prdParent?.Id,
                    IsActive = true
                };
                context.Departments.Add(dept);
                await context.SaveChangesAsync();
            }
            int deptId = dept.Id;

            // Ensure Positions exist
            var posMgr = await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "PRD-MGR");
            if (posMgr == null) {
                posMgr = new Position { PositionName = "Trưởng phòng sản xuất", PositionCode = "PRD-MGR", DepartmentId = deptId, IsActive = true };
                context.Positions.Add(posMgr);
            }
            var posWorker = await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "PRD-ASS-W");
            if (posWorker == null) {
                posWorker = new Position { PositionName = "Công nhân xưởng lắp ráp", PositionCode = "PRD-ASS-W", DepartmentId = deptId, IsActive = true };
                context.Positions.Add(posWorker);
            }
            await context.SaveChangesAsync();
            
            int mgrPosId = posMgr.Id;
            int workerPosId = posWorker.Id;

            var shifts = await context.WorkShifts.ToListAsync();
            int s1 = shifts.FirstOrDefault(s => s.ShiftCode == "S1")?.Id ?? 0;
            int c1 = shifts.FirstOrDefault(s => s.ShiftCode == "C1")?.Id ?? 0;
            int d1 = shifts.FirstOrDefault(s => s.ShiftCode == "D1")?.Id ?? 0;
            
            if (s1 == 0 || c1 == 0 || d1 == 0)
            {
                Console.WriteLine("⚠️ WorkShifts (S1, C1, D1) not found. Skipping Mass Seed.");
                return;
            }

            // 2. Skip seeding if data already exists to preserve testing data
            if (await context.Employees.AnyAsync(e => e.EmployeeCode == "PRD-ASS-001"))
            {
                Console.WriteLine("⏩ PRD-ASS workers already exist. Skipping seeding to preserve your test data.");
                return;
            }

            // 2. Fetch prerequisites (No cleanup to preserve persistence)
            context.ChangeTracker.Clear();
            dept = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == "PRD-ASS");
            if (dept == null) return; // Should not happen if cleanup is correct
            orgId = await context.Organizations.Select(o => o.Id).FirstOrDefaultAsync();
            mgrPosId = (await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "PRD-MGR"))?.Id ?? 0;
            workerPosId = (await context.Positions.FirstOrDefaultAsync(p => p.PositionCode == "PRD-ASS-W"))?.Id ?? 0;
            shifts = await context.WorkShifts.ToListAsync();
            s1 = shifts.FirstOrDefault(s => s.ShiftCode == "S1")?.Id ?? 0;
            c1 = shifts.FirstOrDefault(s => s.ShiftCode == "C1")?.Id ?? 0;
            d1 = shifts.FirstOrDefault(s => s.ShiftCode == "D1")?.Id ?? 0;
            
            if (s1 == 0 || c1 == 0 || d1 == 0) return;

            // 3. Seed 151 Personnel (001: Mgr, 002-151: Workers)
            string hash = BCrypt.Net.BCrypt.HashPassword("123456");
            using (var trans = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    var employeeRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Employee");
                    
                    for (int i = 1; i <= 151; i++)
                    {
                        string code = $"PRD-ASS-{i:D3}";
                        string username = $"prd_ass_{i:D2}";
                        string email = $"{username}@techvn.com";
                        // Use index i for deterministic names instead of Random
                        string fullName = $"{Surnames[i % Surnames.Length]} {MiddleNames[i % MiddleNames.Length]} {FirstNames[i % FirstNames.Length]}";
                        
                        int currentPosId = (i == 1) ? mgrPosId : workerPosId;
                        decimal salary = (i == 1) ? 22000000 : 7000000;
                        DateTime dob = new DateTime(1985 + (i % 20), (i % 12) + 1, (i % 27) + 1);

                        // 1. Create User
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

                        // 2. Assign Role
                        if (employeeRole != null)
                        {
                            context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = employeeRole.Id, AssignedAt = DateTime.UtcNow });
                        }

                        // 3. Create Employee
                        var emp = new Employee
                        {
                            EmployeeCode = code,
                            FullName = fullName,
                            Gender = "Nam",
                            Email = email,
                            JoinDate = new DateTime(2026, 1, 1),
                            Status = Domain.Enums.EmployeeStatus.Active,
                            OrganizationId = orgId,
                            DepartmentId = deptId,
                            PositionId = currentPosId,
                            UserId = user.Id,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = true,
                            DateOfBirth = dob,
                            PlaceOfBirth = "Hà Nội",
                            PlaceOfOrigin = "Hà Nội",
                            UpdatedAt = DateTime.UtcNow
                        };
                        context.Employees.Add(emp);
                        await context.SaveChangesAsync();

                        // 4. Create Contract
                        var contract = new EmployeeContract
                        {
                            EmployeeId = emp.Id,
                            ContractNumber = $"HDLD/2026/{code}",
                            ContractType = Domain.Enums.ContractType.FixedTerm,
                            StartDate = new DateTime(2026, 1, 1),
                            EndDate = new DateTime(2027, 1, 1),
                            BasicSalary = salary,
                            IsActive = true,
                            Status = Domain.Enums.ContractStatus.Active,
                            CreatedAt = DateTime.UtcNow,
                            ShiftId = s1,
                            TargetDepartmentId = deptId,
                            TargetPositionId = currentPosId,
                            UpdatedAt = DateTime.UtcNow
                        };
                        context.EmployeeContracts.Add(contract);

                        if (i == 1) // Set as Dept Manager
                        {
                            dept.ManagerId = emp.Id;
                        }

                        if (i % 20 == 0) Console.WriteLine($"   -> Processed {i}/151...");
                    }
                    await context.SaveChangesAsync();
                    await trans.CommitAsync();
                    Console.WriteLine("✅ 151 Personnel created and committed.");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ Error seeding personnel: {ex.Message}");
                    if (ex.InnerException != null) Console.WriteLine($"   Inner: {ex.InnerException.Message}");
                    await trans.RollbackAsync();
                    throw;
                }
            }

            // 4. Generate Rotating Schedules (Full Year 2026)
            Console.WriteLine("📅 Generating Weekly Rotating Schedules for PRD-ASS workers (Full Year 2026)...");
            context.ChangeTracker.Clear();
            
            var periods2026 = await context.SchedulePeriods.AsNoTracking()
                .Where(p => p.StartDate.Year == 2026)
                .OrderBy(p => p.StartDate)
                .ToListAsync();

            if (!periods2026.Any()) return;

            var allEmployees = await context.Employees.AsNoTracking()
                .Include(e => e.Position)
                .Where(e => e.EmployeeCode.StartsWith("PRD-ASS-") || e.EmployeeCode.StartsWith("CN-"))
                .OrderBy(e => e.EmployeeCode)
                .ToListAsync();

            using (var trans = await context.Database.BeginTransactionAsync())
            {
                try
                {
                    int[] shiftIds = { s1, c1, d1 }; // S1, C1, D1
                    var hcShiftId = await context.WorkShifts.Where(s => s.ShiftCode == "HC").Select(s => s.Id).FirstOrDefaultAsync();
                    int count = 0;

                    foreach (var emp in allEmployees)
                    {
                        bool isWorker = emp.EmployeeCode.StartsWith("PRD-ASS-") && emp.EmployeeCode != "PRD-ASS-001";
                        int initialGroup = 0;
                        
                        if (isWorker)
                        {
                            string numPart = emp.EmployeeCode.Replace("PRD-ASS-", "");
                            if (int.TryParse(numPart, out int workerNum))
                            {
                                initialGroup = ((workerNum - 2) / 50) % 3; // Group 0 (002-051), 1 (052-101), 2 (102-151)
                            }
                        }

                        var schedulesToInsert = new List<WorkSchedule>();
                        foreach (var period in periods2026)
                        {
                            for (DateTime date = period.StartDate; date <= period.EndDate; date = date.AddDays(1))
                            {
                                if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                                int assignedShiftId;
                                string note;

                                if (isWorker)
                                {
                                    int weekNum = System.Globalization.ISOWeek.GetWeekOfYear(date);
                                    int shiftIndex = (initialGroup + weekNum - 1) % 3;
                                    assignedShiftId = shiftIds[shiftIndex];
                                    note = $"Xoay ca tự động (Nhóm {initialGroup + 1}, Tuần {weekNum})";
                                }
                                else
                                {
                                    assignedShiftId = emp.Position?.DefaultShiftId ?? hcShiftId;
                                    note = "Lịch làm việc cố định";
                                }

                                schedulesToInsert.Add(new WorkSchedule
                                {
                                    EmployeeId = emp.Id,
                                    WorkingDate = date,
                                    WorkShiftId = assignedShiftId,
                                    PeriodId = period.Id,
                                    Note = note,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                });
                            }
                        }

                        // Batch insert schedules for this employee
                        if (schedulesToInsert.Any())
                        {
                            context.WorkSchedules.AddRange(schedulesToInsert);
                            await context.SaveChangesAsync();
                            context.ChangeTracker.Clear(); // Clear memory
                        }

                        count++;
                        if (count % 20 == 0) Console.WriteLine($"   -> Scheduled {count}/{allEmployees.Count} personnel...");
                    }
                    await trans.CommitAsync();
                }
                catch (Exception ex) 
                { 
                    Console.WriteLine($"❌ Error in scheduling loop: {ex.Message}");
                    await trans.RollbackAsync(); 
                    throw; 
                }
            }
            Console.WriteLine($"✅ Full Year 2026 Schedule generated for {allEmployees.Count} personnel!");
        }
    }
}
