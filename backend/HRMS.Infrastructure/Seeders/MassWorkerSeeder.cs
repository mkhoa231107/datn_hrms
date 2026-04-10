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

            // 1. Get Prerequisites
            var deptId = await context.Departments.Where(d => d.DepartmentCode == "PRD-ASS").Select(d => d.Id).FirstOrDefaultAsync();
            var workerPosId = await context.Positions.Where(p => p.PositionCode == "PRD-ASS-STAFF").Select(p => p.Id).FirstOrDefaultAsync();
            var mgrPosId = await context.Positions.Where(p => p.PositionCode == "PRD-ASS-MGR").Select(p => p.Id).FirstOrDefaultAsync();
            var orgId = await context.Organizations.Select(o => o.Id).FirstOrDefaultAsync();
            var s1 = await context.WorkShifts.Where(s => s.ShiftCode == "S1").Select(s => s.Id).FirstOrDefaultAsync();
            var c1 = await context.WorkShifts.Where(s => s.ShiftCode == "C1").Select(s => s.Id).FirstOrDefaultAsync();
            var d1 = await context.WorkShifts.Where(s => s.ShiftCode == "D1").Select(s => s.Id).FirstOrDefaultAsync();

            if (deptId == 0 || workerPosId == 0 || mgrPosId == 0 || s1 == 0 || c1 == 0 || d1 == 0) return;

            // 2. Comprehensive Cleanup (CN- and PRD-ASS- junk)
            Console.WriteLine("🧹 Cleaning up BOTH CN- and PRD-ASS- junk data... (Timeout: 5m)");
            using (var conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();
                var cleanupSql = @"
                    CREATE TABLE #T (EId INT, UId INT);
                    INSERT INTO #T (EId, UId)
                    SELECT e.Id, e.UserId FROM Employees e 
                    WHERE e.EmployeeCode LIKE 'CN-%' 
                       OR e.EmployeeCode LIKE 'PRD-ASS-0%' 
                       OR e.EmployeeCode LIKE 'PRD-ASS-1[0-5]%';

                    DELETE FROM WorkSchedules WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM EmployeeContracts WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM LeaveBalances WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM LeaveRequests WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM AttendanceSummaries WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM AttendanceDetails WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM PayrollRecords WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM EmployeeInsurances WHERE EmployeeId IN (SELECT EId FROM #T);
                    DELETE FROM EmployeeBankAccounts WHERE EmployeeId IN (SELECT EId FROM #T);
                    
                    UPDATE Departments SET ManagerId = NULL WHERE ManagerId IN (SELECT EId FROM #T);
                    UPDATE Employees SET ManagerId = NULL WHERE ManagerId IN (SELECT EId FROM #T);

                    DELETE FROM Employees WHERE Id IN (SELECT EId FROM #T);
                    DELETE FROM UserRoles WHERE UserId IN (SELECT UId FROM #T WHERE UId IS NOT NULL) OR UserId IN (SELECT Id FROM Users WHERE Username LIKE 'worker_%');
                    DELETE FROM Users WHERE Id IN (SELECT UId FROM #T WHERE UId IS NOT NULL) OR Username LIKE 'worker_%';

                    DECLARE @MU INT = ISNULL((SELECT MAX(Id) FROM Users), 0); DBCC CHECKIDENT ('Users', RESeed, @MU);
                    DECLARE @ME INT = ISNULL((SELECT MAX(Id) FROM Employees), 0); DBCC CHECKIDENT ('Employees', RESeed, @ME);
                    DROP TABLE #T;";
                using (var cmd = new SqlCommand(cleanupSql, conn)) 
                {
                    cmd.CommandTimeout = 300;
                    await cmd.ExecuteNonQueryAsync();
                }
            }

            // 3. Seed 151 Personnel (001: Mgr, 002-151: Workers)
            Console.WriteLine("🔍 Seeding 151 PRD-ASS personnel... (This may take a minute)");
            string hash = BCrypt.Net.BCrypt.HashPassword("123456");
            Random rng = new Random();

            using (var conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();
                using (var trans = conn.BeginTransaction())
                {
                    try
                    {
                        for (int i = 1; i <= 151; i++)
                        {
                            string code = $"PRD-ASS-{i:D3}";
                            string username = $"worker_ass_{i:D3}";
                            string fullName = $"{Surnames[rng.Next(Surnames.Length)]} {MiddleNames[rng.Next(MiddleNames.Length)]} {FirstNames[rng.Next(FirstNames.Length)]}";
                            int currentPosId = (i == 1) ? mgrPosId : workerPosId;
                            decimal salary = (i == 1) ? 22000000 : 7000000;
                            DateTime dob = new DateTime(rng.Next(1980, 2005), rng.Next(1, 13), rng.Next(1, 28));

                            // User
                            var uCmd = new SqlCommand(@"INSERT INTO Users (Username, PasswordHash, Email, FullName, IsActive, CreatedAt) VALUES (@u, @p, @e, @f, 1, GETUTCDATE()); SELECT SCOPE_IDENTITY();", conn, trans);
                            uCmd.CommandTimeout = 300;
                            uCmd.Parameters.AddWithValue("@u", username); uCmd.Parameters.AddWithValue("@p", hash); uCmd.Parameters.AddWithValue("@e", $"{username}@techvn.com"); uCmd.Parameters.AddWithValue("@f", fullName);
                            var uid = Convert.ToInt32(await uCmd.ExecuteScalarAsync());

                            // Employee
                            var eCmd = new SqlCommand(@"INSERT INTO Employees (EmployeeCode, FullName, Gender, Email, JoinDate, [Status], OrganizationId, DepartmentId, PositionId, UserId, CreatedAt, IsActive, DateOfBirth, PlaceOfBirth, PlaceOfOrigin, UpdatedAt)
                                VALUES (@c, @f, N'Nam', @e, '2026-01-01', 2, @oid, @did, @pid, @uid, GETUTCDATE(), 1, @dob, N'Hà Nội', N'Hà Nội', GETUTCDATE()); SELECT SCOPE_IDENTITY();", conn, trans);
                            eCmd.CommandTimeout = 300;
                            eCmd.Parameters.AddWithValue("@c", code); eCmd.Parameters.AddWithValue("@f", fullName); eCmd.Parameters.AddWithValue("@e", $"{username}@techvn.com"); eCmd.Parameters.AddWithValue("@oid", orgId);
                            eCmd.Parameters.AddWithValue("@did", deptId); eCmd.Parameters.AddWithValue("@pid", currentPosId); eCmd.Parameters.AddWithValue("@uid", uid); eCmd.Parameters.AddWithValue("@dob", dob);
                            var eid = Convert.ToInt32(await eCmd.ExecuteScalarAsync());

                            // Contract
                            var cCmd = new SqlCommand(@"INSERT INTO EmployeeContracts (EmployeeId, ContractNumber, ContractType, StartDate, EndDate, BasicSalary, IsActive, Status, CreatedAt, ShiftId, TargetDepartmentId, TargetPositionId, UpdatedAt)
                                VALUES (@eid, @cn, 2, '2026-01-01', '2027-01-01', @sal, 1, 5, GETUTCDATE(), @sid, @did, @pid, GETUTCDATE())", conn, trans);
                            cCmd.CommandTimeout = 300;
                            cCmd.Parameters.AddWithValue("@eid", eid); cCmd.Parameters.AddWithValue("@cn", $"HDLD/2026/{code}"); cCmd.Parameters.AddWithValue("@sal", salary); 
                            cCmd.Parameters.AddWithValue("@sid", s1); cCmd.Parameters.AddWithValue("@did", deptId); cCmd.Parameters.AddWithValue("@pid", currentPosId);
                            await cCmd.ExecuteNonQueryAsync();

                            if (i == 1) // Set as Dept Manager
                            {
                                var mCmd = new SqlCommand("UPDATE Departments SET ManagerId = @eid WHERE Id = @did", conn, trans);
                                mCmd.CommandTimeout = 300;
                                mCmd.Parameters.AddWithValue("@eid", eid); mCmd.Parameters.AddWithValue("@did", deptId);
                                await mCmd.ExecuteNonQueryAsync();
                            }

                            if (i % 20 == 0) Console.WriteLine($"   -> Processed {i}/151...");
                        }
                        trans.Commit();
                        Console.WriteLine("✅ 151 Personnel created and committed.");
                    }
                    catch { trans.Rollback(); throw; }
                }
            }

            // 4. Generate Rotating Schedules (April 2026)
            Console.WriteLine("📅 Generating Weekly Rotating Schedules for PRD-ASS workers...");
            context.ChangeTracker.Clear();
            
            var periodApril = await context.SchedulePeriods.AsNoTracking().FirstOrDefaultAsync(p => p.PeriodName.Contains("04/2026"));
            if (periodApril == null) return;

            var workers = await context.Employees.AsNoTracking()
                .Where(e => e.EmployeeCode.StartsWith("PRD-ASS-") && e.EmployeeCode != "PRD-ASS-001")
                .OrderBy(e => e.EmployeeCode)
                .ToListAsync();

            using (var conn = new SqlConnection(connectionString))
            {
                await conn.OpenAsync();
                using (var trans = conn.BeginTransaction())
                {
                    try
                    {
                        int[] shiftIds = { s1, c1, d1 };
                        int count = 0;

                        foreach (var emp in workers)
                        {
                            if (!emp.EmployeeCode.StartsWith("PRD-ASS-")) continue;
                            
                            string numPart = emp.EmployeeCode.Replace("PRD-ASS-", "");
                            if (!int.TryParse(numPart, out int workerNum)) continue;
                            
                            int initialGroup = ((workerNum - 2) / 50) % 3;

                            for (DateTime date = periodApril.StartDate; date <= periodApril.EndDate; date = date.AddDays(1))
                            {
                                if (date.DayOfWeek == DayOfWeek.Sunday) continue;
                                int weekNum = (date.DayOfYear + 6) / 7;
                                int shiftIndex = (initialGroup + weekNum) % 3;
                                
                                using (var insCmd = new SqlCommand(@"INSERT INTO WorkSchedules (EmployeeId, WorkingDate, WorkShiftId, PeriodId, Note, CreatedAt, UpdatedAt)
                                    VALUES (@eid, @d, @sid, @pid, N'Xoay ca tự động', GETUTCDATE(), GETUTCDATE())", conn, trans))
                                {
                                    insCmd.CommandTimeout = 300;
                                    insCmd.Parameters.AddWithValue("@eid", emp.Id); insCmd.Parameters.AddWithValue("@d", date);
                                    insCmd.Parameters.AddWithValue("@sid", shiftIds[shiftIndex]); insCmd.Parameters.AddWithValue("@pid", periodApril.Id);
                                    await insCmd.ExecuteNonQueryAsync();
                                }
                            }
                            count++;
                            if (count % 30 == 0) Console.WriteLine($"   -> Scheduled {count}/{workers.Count} workers...");
                        }
                        trans.Commit();
                    }
                    catch { trans.Rollback(); throw; }
                }
            }
            Console.WriteLine("✅ Mass Seeding complete for 151 PRD-ASS personnel (1 Manager + 150 Workers)!");
        }
    }
}
