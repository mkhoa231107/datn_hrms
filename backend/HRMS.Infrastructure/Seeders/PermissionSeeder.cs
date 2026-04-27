using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace HRMS.Infrastructure.Seeders
{
    /// <summary>
    /// Seeds permissions for the HRMS system
    /// Permissions follow the pattern: resource.action
    /// </summary>
    public static class PermissionSeeder
    {
        public static async Task SeedAsync(HRMSDbContext context)
        {
            var permissionsToSeed = new List<(string Name, string Resource, string Action, string Description)>
            {
                // ===== Module 1: Lương & Thu nhập (Payroll) =====
                ("payroll.setup",         "Payroll", "Setup",        "Thiết lập chính sách lương"),
                ("payroll.calculate",     "Payroll", "Calculate",    "Tính toán lương (theo phòng ban)"),
                ("payroll.export_report", "Payroll", "ExportReport", "Xuất báo cáo lương"),
                ("payroll.view_all",      "Payroll", "ViewAll",      "Xem phiếu lương toàn bộ"),
                ("payroll.view_own",      "Payroll", "ViewOwn",      "Xem phiếu lương cá nhân"),
                ("payroll.finalize",      "Payroll", "Finalize",     "Chốt bảng lương tháng"),

                // ===== Module 2: Hồ sơ & Tổ chức (HRM Core) =====
                ("employee.create",            "Employee", "Create",          "Tạo mới nhân viên"),
                ("employee.update",            "Employee", "Update",          "Cập nhật hồ sơ nhân viên"),
                ("employee.delete",            "Employee", "Delete",          "Xóa/vô hiệu hóa nhân viên"),
                ("employee.view_all",          "Employee", "ViewAll",         "Xem toàn bộ nhân viên"),
                ("employee.view_department",   "Employee", "ViewDepartment",  "Xem danh sách NV phòng ban"),
                ("employee.view_team",         "Employee", "ViewTeam",        "Xem danh sách NV trong tổ"),
                ("employee.view_own",          "Employee", "ViewOwn",         "Xem thông tin cá nhân"),
                ("employee.update_own",        "Employee", "UpdateOwn",       "Cập nhật thông tin cá nhân"),
                ("department.manage",          "Department", "Manage",        "Quản lý phòng ban (CRUD)"),
                ("position.manage",            "Position",   "Manage",        "Quản lý chức vụ (CRUD)"),
                ("contract.manage",            "Contract",   "Manage",        "Quản lý hợp đồng (CRUD)"),
                ("team.manage",                "Team",       "Manage",        "Quản lý tổ (CRUD)"),

                // ===== Module 3: Chấm công & Nghỉ phép (Time & Attendance) =====
                ("attendance.checkinout",        "Attendance", "CheckInOut",      "Check-in / Check-out"),
                ("attendance.view_own",          "Attendance", "ViewOwn",         "Xem chấm công cá nhân"),
                ("attendance.view_team",         "Attendance", "ViewTeam",        "Xem chấm công tổ (Tổ trưởng)"),
                ("attendance.view_department",   "Attendance", "ViewDepartment",  "Xem chấm công phòng ban"),
                ("attendance.view_all",          "Attendance", "ViewAll",         "Xem chấm công toàn bộ"),
                ("attendance.finalize",          "Attendance", "Finalize",        "Chốt công tháng (Trưởng phòng)"),
                ("attendance.export",            "Attendance", "Export",          "Xuất bảng công (Excel)"),

                // Đơn từ (Leave / OT / Shift Swap)
                ("leave.create",               "Leave", "Create",           "Viết đơn (nghỉ phép, tăng ca, hoán ca,...)"),
                ("leave.approve_team",         "Leave", "ApproveTeam",      "Duyệt đơn ngắn hạn (<= 3 ngày) – Tổ trưởng"),
                ("leave.approve_department",   "Leave", "ApproveDepartment","Duyệt đơn dài hạn – Trưởng phòng"),
                ("leave.approve_all",          "Leave", "ApproveAll",       "Duyệt đơn toàn công ty"),

                // ===== Module 4: Xếp ca & Lịch làm (Scheduling) =====
                ("schedule.manage_shift",  "Schedule", "ManageShift", "Tạo/Sửa/Xóa ca làm việc"),
                ("schedule.assign_shift",  "Schedule", "AssignShift", "Xếp ca cho nhân viên"),
                ("schedule.view_all",      "Schedule", "ViewAll",     "Xem lịch ca toàn bộ"),
                ("schedule.view_own",      "Schedule", "ViewOwn",     "Xem lịch ca cá nhân"),

                // ===== Module 5: Hệ thống & Phân quyền (System Admin) =====
                ("system.manage_roles",    "System", "ManageRoles",  "Quản lý Role & Permission"),
                ("system.manage_users",    "System", "ManageUsers",  "Quản lý User tài khoản"),
                ("system.configure",       "System", "Configure",    "Cấu hình hệ thống"),
                ("system.view_audit_log",  "System", "ViewAuditLog", "Xem Audit Log"),
            };

            foreach (var (name, resource, action, description) in permissionsToSeed)
            {
                if (!await context.Permissions.AnyAsync(p => p.PermissionName == name))
                {
                    context.Permissions.Add(new Permission
                    {
                        PermissionName = name,
                        Resource = resource,
                        Action = action,
                        Description = description
                    });
                }
            }

            if (context.ChangeTracker.HasChanges())
                await context.SaveChangesAsync();
        }
    }
}
