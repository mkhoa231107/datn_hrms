using HRMS.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using HRMS.Domain.Enums;

namespace HRMS.Infrastructure.Data
{
    public class HRMSDbContext : DbContext
    {
        public HRMSDbContext(DbContextOptions<HRMSDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Permission> Permissions { get; set; }
        public DbSet<UserRole> UserRoles { get; set; }
        public DbSet<RolePermission> RolePermissions { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        
        // Organization & Employee Management
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<Department> Departments { get; set; }
        public DbSet<Position> Positions { get; set; }
        public DbSet<Employee> Employees { get; set; }
        public DbSet<EmployeeContract> EmployeeContracts { get; set; }
        public DbSet<ContractBatch> ContractBatches { get; set; }
        public DbSet<EmployeeBankAccount> EmployeeBankAccounts { get; set; }
        public DbSet<EmployeeEmergencyContact> EmployeeEmergencyContacts { get; set; }
        public DbSet<EmployeeDocument> EmployeeDocuments { get; set; }
        
        // Scheduling Module
        public DbSet<WorkShift> WorkShifts { get; set; }
        public DbSet<SchedulePeriod> SchedulePeriods { get; set; }
        public DbSet<WorkSchedule> WorkSchedules { get; set; }
        public DbSet<DepartmentDefaultShift> DepartmentDefaultShifts { get; set; }
        public DbSet<ShiftTemplate> ShiftTemplates { get; set; }
        public DbSet<ShiftTemplateDetail> ShiftTemplateDetails { get; set; }
        public DbSet<ShiftChangeRequest> ShiftChangeRequests { get; set; }
        
        // Timekeeping Module
        public DbSet<TimeAttendanceRecord> TimeAttendanceRecords { get; set; }
        public DbSet<AttendanceDetail> AttendanceDetails { get; set; }
        public DbSet<AttendanceSummary> AttendanceSummaries { get; set; }
        public DbSet<TimeAdjustmentRequest> TimeAdjustmentRequests { get; set; }
        public DbSet<OvertimeRequest> OvertimeRequests { get; set; }
        public DbSet<EmployeeOvertime> EmployeeOvertimes { get; set; }
        

        // Leave Module
        public DbSet<LeaveType> LeaveTypes { get; set; }
        public DbSet<LeaveRequest> LeaveRequests { get; set; }
        public DbSet<LeaveBalance> LeaveBalances { get; set; }
        
        // Payroll Module
        public DbSet<PayrollSetting> PayrollSettings { get; set; }
        public DbSet<PayrollPeriod> PayrollPeriods { get; set; }
        public DbSet<PayrollRecord> PayrollRecords { get; set; }
        public DbSet<EmployeeInsurance> EmployeeInsurances { get; set; }
        public DbSet<PasswordResetOTP> PasswordResetOTPs { get; set; }
        
        public DbSet<CompanyNews> CompanyNews { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ShiftSwapRequest> ShiftSwapRequests { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // ============================================
            // AUTH MODULE CONFIGURATIONS
            // ============================================
            
            // UserRole composite key
            modelBuilder.Entity<UserRole>()
                .HasKey(ur => new { ur.UserId, ur.RoleId });
            
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);
            
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            // RolePermission composite key
            modelBuilder.Entity<RolePermission>()
                .HasKey(rp => new { rp.RoleId, rp.PermissionId });
            
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Role)
                .WithMany(r => r.RolePermissions)
                .HasForeignKey(rp => rp.RoleId);
            
            modelBuilder.Entity<RolePermission>()
                .HasOne(rp => rp.Permission)
                .WithMany(p => p.RolePermissions)
                .HasForeignKey(rp => rp.PermissionId);
            
            // ============================================
            // ORGANIZATION MODULE CONFIGURATIONS
            // ============================================
            
            // Department: Self-referencing for multi-level hierarchy
            modelBuilder.Entity<Department>()
                .HasOne(d => d.ParentDepartment)
                .WithMany(d => d.SubDepartments)
                .HasForeignKey(d => d.ParentDepartmentId)
                .OnDelete(DeleteBehavior.Restrict); // Prevent cascade delete
            
            // Department: Manager relationship
            modelBuilder.Entity<Department>()
                .HasOne(d => d.Manager)
                .WithMany(e => e.ManagedDepartments)
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Department: Organization relationship
            modelBuilder.Entity<Department>()
                .HasOne(d => d.Organization)
                .WithMany(o => o.Departments)
                .HasForeignKey(d => d.OrganizationId);
            
            // Department: Unique code within organization
            modelBuilder.Entity<Department>()
                .HasIndex(d => new { d.OrganizationId, d.DepartmentCode })
                .IsUnique();
            
            // Position: Department relationship
            modelBuilder.Entity<Position>()
                .HasOne(p => p.Department)
                .WithMany(d => d.Positions)
                .HasForeignKey(p => p.DepartmentId);
            
            // Position: Unique code within department
            modelBuilder.Entity<Position>()
                .HasIndex(p => new { p.DepartmentId, p.PositionCode })
                .IsUnique();

            // Position: DefaultShift relationship
            modelBuilder.Entity<Position>()
                .HasOne(p => p.DefaultShift)
                .WithMany()
                .HasForeignKey(p => p.DefaultShiftId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<Position>()
                .Property(p => p.BaseSalaryMin)
                .HasColumnType("decimal(18,2)");

            modelBuilder.Entity<Position>()
                .Property(p => p.BaseSalaryMax)
                .HasColumnType("decimal(18,2)");
                
            // Employee: Organization relationship
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Organization)
                .WithMany(o => o.Employees)
                .HasForeignKey(e => e.OrganizationId);
            
            // Employee: Department relationship
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Employee: Position relationship
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Position)
                .WithMany(p => p.Employees)
                .HasForeignKey(e => e.PositionId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Employee: Manager (self-referencing)
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.Manager)
                .WithMany(e => e.Subordinates)
                .HasForeignKey(e => e.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Employee: User account (1:1)
            modelBuilder.Entity<Employee>()
                .HasOne(e => e.User)
                .WithOne(u => u.Employee)
                .HasForeignKey<Employee>(e => e.UserId)
                .OnDelete(DeleteBehavior.Restrict);
            
            // Employee: Unique employee code
            modelBuilder.Entity<Employee>()
                .HasIndex(e => e.EmployeeCode)
                .IsUnique();
            
            modelBuilder.Entity<Employee>()
                .Property(e => e.InsuranceSalary)
                .HasPrecision(18, 2);

            modelBuilder.Entity<Employee>()
                .Property(e => e.BasicSalary)
                .HasPrecision(18, 2);
            
            // EmployeeContract: Employee relationship
            modelBuilder.Entity<EmployeeContract>()
                .HasOne(ec => ec.Employee)
                .WithMany(e => e.Contracts)
                .HasForeignKey(ec => ec.EmployeeId);

            modelBuilder.Entity<EmployeeContract>()
                .HasOne(ec => ec.ContractBatch)
                .WithMany(cb => cb.Contracts)
                .HasForeignKey(ec => ec.ContractBatchId)
                .OnDelete(DeleteBehavior.SetNull);

            modelBuilder.Entity<EmployeeContract>()
                .Property(ec => ec.BasicSalary)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeContract>()
                .Property(ec => ec.HousingAllowance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeContract>()
                .Property(ec => ec.MealAllowance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeContract>()
                .Property(ec => ec.PetrolAllowance)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeContract>()
                .Property(ec => ec.PhoneAllowance)
                .HasPrecision(18, 2);

            // EmployeeContract: WorkShift (ca cố định từ hợp đồng)
            modelBuilder.Entity<EmployeeContract>()
                .HasOne(ec => ec.Shift)
                .WithMany()
                .HasForeignKey(ec => ec.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // ============================================
            // SHIFT CHANGE REQUEST CONFIGURATIONS
            // ============================================

            modelBuilder.Entity<ShiftChangeRequest>()
                .HasOne(scr => scr.Employee)
                .WithMany()
                .HasForeignKey(scr => scr.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftChangeRequest>()
                .HasOne(scr => scr.RequestedShift)
                .WithMany()
                .HasForeignKey(scr => scr.RequestedShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftChangeRequest>()
                .HasOne(scr => scr.CurrentShift)
                .WithMany()
                .HasForeignKey(scr => scr.CurrentShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftChangeRequest>()
                .HasOne(scr => scr.Approver)
                .WithMany()
                .HasForeignKey(scr => scr.ApproverId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<AttendanceSummary>()
                .Property(asum => asum.TotalWorkingHours)
                .HasPrecision(18, 2);

            modelBuilder.Entity<AttendanceSummary>()
                .Property(asum => asum.OvertimeHours)
                .HasPrecision(18, 2);

            modelBuilder.Entity<AttendanceSummary>()
                .Property(asum => asum.AdjustedWorkingDays)
                .HasPrecision(18, 2);
            
            // EmployeeBankAccount: Employee relationship
            modelBuilder.Entity<EmployeeBankAccount>()
                .HasOne(eba => eba.Employee)
                .WithMany(e => e.BankAccounts)
                .HasForeignKey(eba => eba.EmployeeId);
            
            // EmployeeEmergencyContact: Employee relationship
            modelBuilder.Entity<EmployeeEmergencyContact>()
                .HasOne(eec => eec.Employee)
                .WithMany(e => e.EmergencyContacts)
                .HasForeignKey(eec => eec.EmployeeId);



            // ============================================
            // SCHEDULING MODULE CONFIGURATIONS
            // ============================================

            // WorkShift: Organization relationship
            modelBuilder.Entity<WorkShift>()
                .HasOne(ws => ws.Organization)
                .WithMany()
                .HasForeignKey(ws => ws.OrganizationId);

            modelBuilder.Entity<WorkShift>()
                .Property(ws => ws.OtMultiplier)
                .HasPrecision(18, 2);

            // SchedulePeriod: Organization relationship
            modelBuilder.Entity<SchedulePeriod>()
                .HasOne(sp => sp.Organization)
                .WithMany()
                .HasForeignKey(sp => sp.OrganizationId);

            // WorkSchedule: Period relationship
            modelBuilder.Entity<WorkSchedule>()
                .HasOne(ws => ws.Period)
                .WithMany(p => p.WorkSchedules)
                .HasForeignKey(ws => ws.PeriodId)
                .OnDelete(DeleteBehavior.Restrict);

            // WorkSchedule: Employee relationship
            modelBuilder.Entity<WorkSchedule>()
                .HasOne(ws => ws.Employee)
                .WithMany()
                .HasForeignKey(ws => ws.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // WorkSchedule: WorkShift relationship
            modelBuilder.Entity<WorkSchedule>()
                .HasOne(ws => ws.WorkShift)
                .WithMany(s => s.WorkSchedules)
                .HasForeignKey(ws => ws.WorkShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // WorkSchedule: TeamLeader relationship (removed)

            // DepartmentDefaultShift: Department & WorkShift
            modelBuilder.Entity<DepartmentDefaultShift>()
                .HasOne(dds => dds.Department)
                .WithMany()
                .HasForeignKey(dds => dds.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<DepartmentDefaultShift>()
                .HasOne(dds => dds.WorkShift)
                .WithMany(ws => ws.DepartmentDefaultShifts)
                .HasForeignKey(dds => dds.WorkShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // ShiftTemplate: Organization
            modelBuilder.Entity<ShiftTemplate>()
                .HasOne(st => st.Organization)
                .WithMany()
                .HasForeignKey(st => st.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // ShiftTemplateDetail: Template & WorkShift
            modelBuilder.Entity<ShiftTemplateDetail>()
                .HasOne(std => std.ShiftTemplate)
                .WithMany(t => t.Details)
                .HasForeignKey(std => std.ShiftTemplateId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftTemplateDetail>()
                .HasOne(std => std.WorkShift)
                .WithMany()
                .HasForeignKey(std => std.WorkShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // ==========================================
            // TIMEKEEPING MODULE CONFIGURATIONS
            // ==========================================

            // TimeAttendanceRecord: Employee relationship
            modelBuilder.Entity<TimeAttendanceRecord>()
                .HasIndex(t => new { t.EmployeeId, t.Date });


            // TimeAttendanceRecord: Employee relationship
            modelBuilder.Entity<TimeAttendanceRecord>()
                .HasOne(tar => tar.Employee)
                .WithMany()
                .HasForeignKey(tar => tar.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // TimeAttendanceRecord: WorkSchedule relationship (optional)
            modelBuilder.Entity<TimeAttendanceRecord>()
                .HasOne(tar => tar.WorkSchedule)
                .WithMany()
                .HasForeignKey(tar => tar.WorkScheduleId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceDetail: Employee
            modelBuilder.Entity<AttendanceDetail>()
                .HasOne(ad => ad.Employee)
                .WithMany()
                .HasForeignKey(ad => ad.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceDetail: WorkShift
            modelBuilder.Entity<AttendanceDetail>()
                .HasOne(ad => ad.WorkShift)
                .WithMany()
                .HasForeignKey(ad => ad.WorkShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceSummary: Employee relationship
            modelBuilder.Entity<AttendanceSummary>()
                .HasOne(asn => asn.Employee)
                .WithMany()
                .HasForeignKey(asn => asn.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceSummary: Period relationship
            modelBuilder.Entity<AttendanceSummary>()
                .HasOne(asn => asn.Period)
                .WithMany()
                .HasForeignKey(asn => asn.PeriodId)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceSummary: Unique constraint (one summary per employee per period)
            modelBuilder.Entity<AttendanceSummary>()
                .HasIndex(asn => new { asn.EmployeeId, asn.PeriodId })
                .IsUnique();

            // TimeAdjustmentRequest: Employee relationship
            modelBuilder.Entity<TimeAdjustmentRequest>()
                .HasOne(tar => tar.Employee)
                .WithMany()
                .HasForeignKey(tar => tar.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // ==========================================
            // OVERTIME MODULE CONFIGURATIONS
            // ==========================================

            modelBuilder.Entity<EmployeeOvertime>()
                .HasKey(eo => new { eo.OvertimeRequestId, eo.EmployeeId });


            modelBuilder.Entity<OvertimeRequest>()
                .HasOne(or => or.Department)
                .WithMany()
                .HasForeignKey(or => or.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OvertimeRequest>()
                .HasOne(or => or.Employee)
                .WithMany()
                .HasForeignKey(or => or.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<OvertimeRequest>()
                .HasOne(or => or.ApprovedBy)
                .WithMany()
                .HasForeignKey(or => or.ApprovedById)
                .OnDelete(DeleteBehavior.Restrict);

            // AttendanceDetail Precision
            modelBuilder.Entity<AttendanceDetail>()
                .Property(ad => ad.WorkingHours)
                .HasPrecision(18, 2);

            modelBuilder.Entity<AttendanceDetail>()
                .Property(ad => ad.OTHours)
                .HasPrecision(18, 2);

            modelBuilder.Entity<AttendanceDetail>()
                .Property(ad => ad.WorkingDays)
                .HasPrecision(18, 2);

            // ==========================================
            // LEAVE MODULE CONFIGURATIONS
            // ==========================================

            // LeaveRequest: Employee (requester)
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(lr => lr.Employee)
                .WithMany()
                .HasForeignKey(lr => lr.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // LeaveRequest: Employee (approver) - separate relationship
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(lr => lr.Approver)
                .WithMany()
                .HasForeignKey(lr => lr.ApproverId)
                .OnDelete(DeleteBehavior.Restrict);

            // LeaveRequest: LeaveType
            modelBuilder.Entity<LeaveRequest>()
                .HasOne(lr => lr.LeaveType)
                .WithMany(lt => lt.LeaveRequests)
                .HasForeignKey(lr => lr.LeaveTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            // LeaveBalance: Employee
            modelBuilder.Entity<LeaveBalance>()
                .HasOne(lb => lb.Employee)
                .WithMany()
                .HasForeignKey(lb => lb.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // LeaveBalance: LeaveType
            modelBuilder.Entity<LeaveBalance>()
                .HasOne(lb => lb.LeaveType)
                .WithMany(lt => lt.LeaveBalances)
                .HasForeignKey(lb => lb.LeaveTypeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<LeaveBalance>()
                .HasIndex(lb => new { lb.EmployeeId, lb.LeaveTypeId, lb.Year })
                .IsUnique();

            // ContractBatch: Creator relationship
            modelBuilder.Entity<ContractBatch>()
                .HasOne(cb => cb.CreatedBy)
                .WithMany()
                .HasForeignKey(cb => cb.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // EmployeeDocument: Employee relationship
            modelBuilder.Entity<EmployeeDocument>()
                .HasOne(ed => ed.Employee)
                .WithMany(e => e.Documents)
                .HasForeignKey(ed => ed.EmployeeId);

            // ==========================================
            // PAYROLL MODULE CONFIGURATIONS
            // ==========================================

            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.SocialInsuranceRate).HasPrecision(18, 4);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.HealthInsuranceRate).HasPrecision(18, 4);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.UnemploymentInsuranceRate).HasPrecision(18, 4);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.PersonalDeductionAmount).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.DependentDeductionAmount).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.CommonBaseSalary).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollSetting>()
                .Property(ps => ps.RegionBaseSalary).HasPrecision(18, 2);

            modelBuilder.Entity<PayrollPeriod>()
                .HasOne(pp => pp.SchedulePeriod)
                .WithMany()
                .HasForeignKey(pp => pp.SchedulePeriodId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PayrollRecord>()
                .HasOne(pr => pr.PayrollPeriod)
                .WithMany(pp => pp.Records)
                .HasForeignKey(pr => pr.PayrollPeriodId);

            modelBuilder.Entity<PayrollRecord>()
                .HasOne(pr => pr.Employee)
                .WithMany()
                .HasForeignKey(pr => pr.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.BasicSalary).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.ActualWorkingSalary).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.OvertimePay).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.PositionAllowance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.PetrolAllowance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.PhoneAllowance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.OtherAllowance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.SalesSalary).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.Bonus).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.SocialInsurance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.HealthInsurance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.UnemploymentInsurance).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.PersonalIncomeTax).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.OtherDeductions).HasPrecision(18, 2);
            modelBuilder.Entity<PayrollRecord>().Property(pr => pr.NetSalary).HasPrecision(18, 2);
            
            // AttendanceSummary Approval
            modelBuilder.Entity<AttendanceSummary>()
                .HasOne(asum => asum.ApprovedBy)
                .WithMany()
                .HasForeignKey(asum => asum.ApprovedById)
                .OnDelete(DeleteBehavior.Restrict);

            // EmployeeInsurance relationship
            modelBuilder.Entity<EmployeeInsurance>()
                .HasOne(ei => ei.Employee)
                .WithOne()
                .HasForeignKey<EmployeeInsurance>(ei => ei.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EmployeeInsurance>()
                .Property(ei => ei.AdditionalInsuranceAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeInsurance>()
                .Property(ei => ei.HealthcareAmount)
                .HasPrecision(18, 2);

            modelBuilder.Entity<EmployeeInsurance>()
                .Property(ei => ei.LifeInsuranceAmount)
                .HasPrecision(18, 2);

            // PasswordResetOTP configurations
            modelBuilder.Entity<PasswordResetOTP>()
                .HasOne(p => p.User)
                .WithMany()
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            // Notification configurations
            modelBuilder.Entity<Notification>()
                .HasOne(n => n.Employee)
                .WithMany()
                .HasForeignKey(n => n.EmployeeId)
                .OnDelete(DeleteBehavior.Cascade);

            // ==========================================
            // SHIFT SWAP REQUEST CONFIGURATIONS
            // ==========================================

            modelBuilder.Entity<ShiftSwapRequest>()
                .HasOne(s => s.EmployeeA)
                .WithMany()
                .HasForeignKey(s => s.EmployeeAId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftSwapRequest>()
                .HasOne(s => s.EmployeeB)
                .WithMany()
                .HasForeignKey(s => s.EmployeeBId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftSwapRequest>()
                .HasOne(s => s.TargetShift)
                .WithMany()
                .HasForeignKey(s => s.TargetShiftId)
                .OnDelete(DeleteBehavior.Restrict);


            modelBuilder.Entity<ShiftSwapRequest>()
                .HasOne(ssr => ssr.Manager)
                .WithMany()
                .HasForeignKey(ssr => ssr.ManagerId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ShiftSwapRequest>()
                .HasOne(ssr => ssr.HR)
                .WithMany()
                .HasForeignKey(ssr => ssr.HRId)
                .OnDelete(DeleteBehavior.Restrict);
        }
        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
            configurationBuilder.Properties<decimal?>().HavePrecision(18, 2);
        }
    }
}
