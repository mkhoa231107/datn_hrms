$content = Get-Content -Raw -Path backend/HRMS.Infrastructure/Services/AttendanceService.cs
$replacement = @"
                ApprovedAt = s.ApprovedAt
            }).ToList();
        }

        public async Task<HRMS.Application.DTOs.Attendance.AttendanceReportSummaryDto> GetAttendanceSummaryReportAsync(string month, int? departmentId, int page, int limit)
        {
            var parts = month.Split('-');
            if (parts.Length != 2 || !int.TryParse(parts[0], out int year) || !int.TryParse(parts[1], out int m))
                throw new ArgumentException("Định dạng tháng không hợp lệ (YYYY-MM)");

            var query = _context.AttendanceSummaries
                .Include(s => s.Employee)
                .ThenInclude(e => e.Department)
                .Include(s => s.Period)
                .Where(s => s.Period.StartDate.Year == year && s.Period.StartDate.Month == m);

            if (departmentId.HasValue && departmentId.Value > 0)
            {
                var targetIds = await GetDepartmentHierarchyIdsAsync(departmentId.Value);
                query = query.Where(s => targetIds.Contains(s.Employee.DepartmentId));
            }

            var totalItems = await query.CountAsync();
            var summaries = await query
                .OrderBy(s => s.Employee.Department.DepartmentName)
                .ThenBy(s => s.Employee.FullName)
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToListAsync();

            var items = summaries.Select(s => {
                decimal expectedDays = s.TotalWorkingDays > 0 ? s.TotalWorkingDays : 1;
                decimal lateEarlyTotal = s.LateDays + s.EarlyLeaveDays;
                decimal onTimePerc = 100m * (1m - (lateEarlyTotal / expectedDays));
                if (onTimePerc < 0) onTimePerc = 0;
                if (onTimePerc > 100) onTimePerc = 100;

                return new HRMS.Application.DTOs.Attendance.AttendanceReportItemDto
                {
                    EmployeeId = s.EmployeeId,
                    EmployeeName = s.Employee?.FullName ?? "",
                    EmployeeCode = s.Employee?.EmployeeCode ?? "",
                    DepartmentId = s.Employee?.DepartmentId ?? 0,
                    DepartmentName = s.Employee?.Department?.DepartmentName ?? "",
                    TotalWorkingDays = s.TotalWorkingDays,
                    ActualWorkingDays = s.AdjustedWorkingDays > 0 ? s.AdjustedWorkingDays : Math.Max(0, s.TotalWorkingDays - s.AbsentDays),
                    TotalOvertimeHours = s.OvertimeHours,
                    TotalLeaveDays = s.AbsentDays,
                    LateOrEarlyCount = s.LateDays + s.EarlyLeaveDays,
                    OnTimePercentage = Math.Round(onTimePerc, 1)
                };
            }).ToList();

            return new HRMS.Application.DTOs.Attendance.AttendanceReportSummaryDto
            {
                Items = items,
                TotalItems = totalItems,
                CurrentPage = page,
                TotalPages = (int)Math.Ceiling(totalItems / (double)limit)
            };
        }
"@
$content = $content -replace '(?s)                ApprovedAt = s\.ApprovedAt\s*}\)\.ToList\(\);\s*}', $replacement
Set-Content -Path backend/HRMS.Infrastructure/Services/AttendanceService.cs -Value $content
