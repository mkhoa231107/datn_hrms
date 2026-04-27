using HRMS.Domain.Entities;
using HRMS.Domain.Enums;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    /// <summary>
    /// Creates 81 accounts: 1 Admin, 5 DeptManagers, 5 CnbSpecialists, 10 TeamLeaders, 60 Employees.
    /// Structure: 5 Depts x 2 Teams x (1 TL + 6 Emp) = 70 team members + 5 MGR + 5 CNB + 1 Admin
    /// 
    /// Account summary:
    /// - admin / 123456  (Admin)
    /// - manager_hr / 123456  (DepartmentManager)   x5
    /// - cnb_hr / 123456       (CnbSpecialist)       x5
    /// - tl_hr_01 / tl_hr_02  (TeamLeader)          x10
    /// - hr_01..hr_12          (Employee)            x60
    /// </summary>
    public class OrganizationSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            Console.WriteLine("📋 OrganizationSeeder: Starting...");

            // ============================================
            // STEP 1: ORGANIZATION
            // ============================================
            var organization = await context.Organizations.FirstOrDefaultAsync(o => o.OrganizationCode == "TECHVN");
            if (organization == null)
            {
                organization = new Organization
                {
                    OrganizationName = "Công ty TNHH Công nghệ TechVN",
                    OrganizationCode = "TECHVN",
                    TaxCode = "0123456789",
                    Address = "123 Đường Láng, Q.Đống Đa, Hà Nội",
                    Phone = "024-3333-4444",
                    Email = "contact@techvn.com.vn",
                    Website = "www.techvn.com.vn",
                    IsActive = true
                };
                context.Organizations.Add(organization);
                await context.SaveChangesAsync();
            }

            // Ensure we have a fresh, tracked organization object
            organization = await context.Organizations.AsTracking().FirstOrDefaultAsync(o => o.OrganizationCode == "TECHVN") 
                           ?? throw new Exception("Organization TECHVN not found!");
            Console.WriteLine($"🏢 Target Organization: {organization.OrganizationName} (ID: {organization.Id})");

            // ============================================
            // STEP 2: DEPARTMENTS (5)
            // ============================================
            var deptDefs = new[] {
                ("SALES", "Phòng Kinh doanh", "Phát triển thị trường, bán hàng"),
                ("MKT",   "Phòng Marketing",  "Marketing, truyền thông"),
                ("PRD",   "Phòng Sản xuất",   "Sản xuất, kho bãi, QC"),
            };

            var deptMap = new Dictionary<string, Department>();
            foreach (var (code, name, desc) in deptDefs)
            {
                var dept = await context.Departments.FirstOrDefaultAsync(d => d.DepartmentCode == code);
                if (dept == null)
                {
                    dept = new Department { DepartmentName = name, DepartmentCode = code, Description = desc, Organization = organization, IsActive = true };
                    context.Departments.Add(dept);
                    await context.SaveChangesAsync();
                }
                deptMap[code] = dept;
            }

            Console.WriteLine("✅ OrganizationSeeder done: Organization and Parent Departments seeded.");
            return;
        }
    }
}
