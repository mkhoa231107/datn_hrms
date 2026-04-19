using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using AutoMapper;
using HRMS.Application.DTOs.Contract;
using HRMS.Application.DTOs.Contracts;
using HRMS.Application.Interfaces;
using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using MiniSoftware;
using HRMS.Domain.Enums;

namespace HRMS.Infrastructure.Services
{
    public class ContractService : IContractService
    {
        private readonly HRMSDbContext _context;
        private readonly IMapper _mapper;
        private readonly IInsuranceService _insuranceService;
        private readonly IWorkScheduleService _workScheduleService;

        public ContractService(HRMSDbContext context, IMapper mapper, IInsuranceService insuranceService, IWorkScheduleService workScheduleService)
        {
            _context = context;
            _mapper = mapper;
            _insuranceService = insuranceService;
            _workScheduleService = workScheduleService;
        }

        public async Task<int> CreateContractAsync(ContractCreateDto dto)
        {
            if (dto.EndDate.HasValue && dto.EndDate <= dto.StartDate)
            {
                throw new ArgumentException("Ngày kết thúc phải sau ngày bắt đầu.");
            }

            var contract = _mapper.Map<EmployeeContract>(dto);
            
            _context.EmployeeContracts.Add(contract);
            await _context.SaveChangesAsync();
            
            return contract.Id;
        }

        public async Task<(byte[] FileContent, string FileName)> ExportContractToWordAsync(int contractId, string templatePath)
        {
            var contract = await _context.EmployeeContracts
                .Include(c => c.Employee)
                .FirstOrDefaultAsync(c => c.Id == contractId);

            if (contract == null)
            {
                throw new KeyNotFoundException("Không tìm thấy hợp đồng.");
            }

            if (!File.Exists(templatePath))
            {
                throw new FileNotFoundException("Không tìm thấy file mẫu tại: " + templatePath);
            }

            var value = new Dictionary<string, object>
            {
                ["SignedDate"] = contract.SignedDate?.ToString("dd/MM/yyyy") ?? "...",
                ["ContractType"] = GetContractTypeName(contract.ContractType),
                ["ContractNumber"] = contract.ContractNumber,
                ["SignedBy"] = contract.SignedBy ?? "...",
                ["FullName"] = contract.Employee.FullName,
                ["DateOfBirth"] = contract.Employee.DateOfBirth.ToString("dd/MM/yyyy"),
                ["PlaceOfOrigin"] = contract.Employee.PlaceOfOrigin ?? "...",
                ["PlaceOfBirth"] = contract.Employee.PlaceOfBirth ?? "...",
                ["IdentityNumber"] = contract.Employee.IdentityNumber ?? "...",
                ["IdentityDate"] = contract.Employee.IdentityDate?.ToString("dd/MM/yyyy") ?? "...",
                ["IdentityPlace"] = contract.Employee.IdentityPlace ?? "...",
                ["Address"] = contract.Employee.Address ?? "...",
                ["CurrentAddress"] = contract.Employee.CurrentAddress ?? contract.Employee.Address ?? "...",
                ["JobDescription"] = contract.JobDescription ?? "...",
                ["WorkLocation"] = contract.WorkLocation ?? "...",
                ["StartDate"] = contract.StartDate.ToString("dd/MM/yyyy"),
                ["EndDate"] = contract.EndDate?.ToString("dd/MM/yyyy") ?? "Vô thời hạn",
                ["BasicSalary"] = contract.BasicSalary.ToString("N0") + " VNĐ",
                ["MealAllowance"] = contract.MealAllowance.ToString("N0") + " VNĐ",
                ["PhoneAllowance"] = contract.PhoneAllowance.ToString("N0") + " VNĐ",
                ["PetrolAllowance"] = contract.PetrolAllowance.ToString("N0") + " VNĐ",
                ["HousingAllowance"] = contract.HousingAllowance.ToString("N0") + " VNĐ",
                ["Notes"] = contract.Notes ?? "Không có"
            };

            using var memoryStream = new MemoryStream();
            MiniWord.SaveAsByTemplate(memoryStream, templatePath, value);
            
            string fileName = $"HopDong_{contract.Employee.FullName.Replace(" ", "_")}_{contract.ContractNumber.Replace("/", "-")}.docx";
            
            return (memoryStream.ToArray(), fileName);
        }

        public async Task SubmitContractAsync(int contractId)
        {
            var contract = await _context.EmployeeContracts.FindAsync(contractId);
            if (contract == null) throw new KeyNotFoundException("Không tìm thấy hợp đồng.");
            
            if (contract.Status != ContractStatus.Draft)
                throw new InvalidOperationException("Chỉ có thể gửi duyệt hợp đồng ở trạng thái Nháp.");
                
            contract.Status = ContractStatus.WaitingSign; // Chuyển thẳng tới trạng thái chờ ký (bỏ qua Admin duyệt)
            await _context.SaveChangesAsync();
            Console.WriteLine($"🔔 NOTIFICATION: Employee {contract.EmployeeId} has received a new contract ({contract.ContractNumber}) for signing.");
        }

        public async Task ApproveContractAsync(int contractId, int approverId, string role, string? note = null)
        {
            var contract = await _context.EmployeeContracts.FindAsync(contractId);
            if (contract == null) throw new KeyNotFoundException("Không tìm thấy hợp đồng.");

            if ((role == "Admin" || role == "DepartmentManager") && contract.Status == ContractStatus.PendingAdmin)
            {
                contract.Status = ContractStatus.WaitingSign;
                contract.AdminApprovedById = approverId;
                contract.AdminApprovedAt = DateTime.UtcNow;
            }
            else
            {
                throw new InvalidOperationException("Bạn không có quyền duyệt hợp đồng này ở trạng thái hiện tại.");
            }

            if (!string.IsNullOrEmpty(note))
            {
                contract.Notes = string.IsNullOrEmpty(contract.Notes) ? note : contract.Notes + "\n" + note;
            }

            contract.RejectReason = null;
            await _context.SaveChangesAsync();
            Console.WriteLine($"🔔 NOTIFICATION: Employee {contract.EmployeeId} has received the contract ({contract.ContractNumber}) for signing.");
        }

        public async Task RejectContractAsync(int contractId, int rejectorId, string role, string reason)
        {
            var contract = await _context.EmployeeContracts.FindAsync(contractId);
            if (contract == null) throw new KeyNotFoundException("Không tìm thấy hợp đồng.");

            if ((role == "Admin" || role == "DepartmentManager") && contract.Status == ContractStatus.PendingAdmin)
            {
                contract.Status = ContractStatus.Draft; // Trả về nháp
                contract.RejectReason = $"[{role}] {reason}";
                await _context.SaveChangesAsync();
                Console.WriteLine($"🔔 NOTIFICATION: The creator of contract ({contract.ContractNumber}) has received a rejection notice. Reason: {reason}");
            }
            else
            {
                throw new InvalidOperationException("Bạn không có quyền từ chối hợp đồng này ở trạng thái hiện tại.");
            }
        }

        public async Task SignContractAsync(int contractId, string signature)
        {
            var contract = await _context.EmployeeContracts.FindAsync(contractId);
            if (contract == null) throw new KeyNotFoundException("Không tìm thấy hợp đồng.");

            if (contract.Status != ContractStatus.WaitingSign)
                throw new InvalidOperationException("Hợp đồng chưa sẵn sàng để ký.");

            contract.EmployeeSignature = signature;
            contract.EmployeeSignedAt = DateTime.UtcNow;

            // Chuyển sang Active ngay khi ký xong để hoàn tất quy trình 3 bước
            contract.Status = ContractStatus.Active;

            // Tự động hủy các hợp đồng khác đang chờ ký của nhân viên này để tránh thông báo rác
            var otherPending = await _context.EmployeeContracts
                .Where(c => c.EmployeeId == contract.EmployeeId 
                         && c.Id != contractId 
                         && c.Status == ContractStatus.WaitingSign)
                .ToListAsync();
            
            foreach (var other in otherPending)
            {
                other.Status = ContractStatus.Terminated;
                other.Notes = (other.Notes ?? "") + "\n[Auto-Cancelled] Đã ký hợp đồng khác (#" + contract.ContractNumber + ")";
            }

            await _context.SaveChangesAsync();

            // Cập nhật thông tin Phòng ban & Chức danh mới cho nhân viên
            if (contract.TargetDepartmentId.HasValue || contract.TargetPositionId.HasValue)
            {
                var employee = await _context.Employees.FindAsync(contract.EmployeeId);
                if (employee != null)
                {
                    if (contract.TargetDepartmentId.HasValue) 
                        employee.DepartmentId = contract.TargetDepartmentId.Value;
                    if (contract.TargetPositionId.HasValue) 
                        employee.PositionId = contract.TargetPositionId.Value;
                    
                    // Sync Shift and Salary
                    employee.BasicSalary = contract.BasicSalary;
                    if (contract.ShiftId.HasValue)
                        employee.ShiftId = contract.ShiftId.Value;

                    await _context.SaveChangesAsync();
                }
            }

            // Tự động đăng ký bảo hiểm bắt buộc
            try
            {
                await _insuranceService.RegisterMandatoryInsuranceAsync(contract.EmployeeId);
            }
            catch (Exception ex)
            {
                // Log error but don't break the signing process
                Console.WriteLine($"Error registering mandatory insurance for employee {contract.EmployeeId}: {ex.Message}");
            }

            // ────────────────────────────────────────────────────────────────
            // Tự động sinh lịch làm việc từ ca trong hợp đồng (cho năm hiện tại)
            // Nếu StartDate thuộc năm sau, sinh cho năm đó luôn.
            // ────────────────────────────────────────────────────────────────
            if (contract.ShiftId.HasValue)
            {
                try
                {
                    var contractYear = contract.StartDate.Year;
                    await _workScheduleService.GenerateFromContractAsync(contract.EmployeeId, contractYear, overwrite: false);
                    Console.WriteLine($"✅ Auto-generated work schedule for employee {contract.EmployeeId} for year {contractYear}.");
                }
                catch (Exception ex)
                {
                    // Schedule generation failure should NOT block contract signing
                    Console.WriteLine($"[ContractService] Warning: Could not auto-generate schedule for employee {contract.EmployeeId}: {ex.Message}");
                }
            }
        }

        public async Task BulkCreateContractsAsync(BulkContractCreateDto dto)
        {
            foreach (var empId in dto.EmployeeIds)
            {
                var contract = new EmployeeContract
                {
                    EmployeeId = empId,
                    ContractType = (ContractType)dto.ContractTypeId,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    BasicSalary = dto.BasicSalary,
                    JobDescription = dto.JobDescription,
                    WorkLocation = dto.WorkLocation,
                    SignedBy = dto.SignedBy,
                    SignedDate = dto.SignedDate,
                    Notes = dto.Notes,
                    Status = ContractStatus.WaitingSign, // Tạo xong cho ký luôn
                    CreatedAt = DateTime.UtcNow,
                    // Sinh mã hợp đồng tự động hđ-emp-date
                    ContractNumber = $"HĐ-{empId}-{DateTime.Now:yyyyMMddHHmm}"
                };
                _context.EmployeeContracts.Add(contract);
            }
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<HRMS.Application.DTOs.Employees.EmployeeContractDto>> GetContractsAsync(int? employeeId = null, int? departmentId = null, ContractStatus? status = null)
        {
            var query = _context.EmployeeContracts
                .Include(c => c.Employee)
                    .ThenInclude(e => e.Department)
                .Include(c => c.Employee)
                    .ThenInclude(e => e.Position)
                .AsQueryable();

            if (employeeId.HasValue)
                query = query.Where(c => c.EmployeeId == employeeId.Value);

            if (departmentId.HasValue)
                query = query.Where(c => c.Employee.DepartmentId == departmentId.Value);

            if (status.HasValue)
                query = query.Where(c => c.Status == status.Value);

            var contracts = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
            
            // Reusing EmployeeContractDto for query result, or we can create a specific ContractDto
            return _mapper.Map<IEnumerable<HRMS.Application.DTOs.Employees.EmployeeContractDto>>(contracts);
        }

        public async Task UpdateContractAsync(int id, ContractCreateDto dto)
        {
            var existing = await _context.EmployeeContracts.FindAsync(id);
            if (existing == null) throw new KeyNotFoundException("Không tìm thấy hợp đồng.");

            // Update fields
            existing.ContractType = (ContractType)dto.ContractTypeId;
            existing.StartDate = dto.StartDate;
            existing.EndDate = dto.EndDate;
            existing.BasicSalary = dto.BasicSalary;
            existing.JobDescription = dto.JobDescription;
            existing.WorkLocation = dto.WorkLocation;
            existing.SignedBy = dto.SignedBy;
            existing.SignedDate = dto.SignedDate;
            existing.Notes = dto.Notes;
            existing.ShiftId = dto.ShiftId;
            existing.TargetDepartmentId = dto.DepartmentId;
            existing.TargetPositionId = dto.PositionId;
            
            existing.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        private string GetContractTypeName(HRMS.Domain.Enums.ContractType type)
        {
            return type switch
            {
                HRMS.Domain.Enums.ContractType.Probation => "Thử việc",
                HRMS.Domain.Enums.ContractType.FixedTerm => "Xác định thời hạn",
                HRMS.Domain.Enums.ContractType.Indefinite => "Không xác định thời hạn",
                HRMS.Domain.Enums.ContractType.Seasonal => "Thời vụ",
                HRMS.Domain.Enums.ContractType.PartTime => "Bán thời gian",
                _ => type.ToString()
            };
        }

        // BATCH OPERATIONS
        public async Task<int> CreateBatchAsync(ContractBatchCreateDto dto, int creatorId)
        {
            var batch = _mapper.Map<ContractBatch>(dto);
            batch.CreatedById = creatorId;
            batch.CreatedAt = DateTime.UtcNow;
            batch.Status = ContractBatchStatus.Draft;

            _context.ContractBatches.Add(batch);
            await _context.SaveChangesAsync();
            return batch.Id;
        }

        public async Task<ContractBatchDetailDto> GetBatchDetailsAsync(int batchId)
        {
            var batch = await _context.ContractBatches
                .Include(b => b.CreatedBy)
                .Include(b => b.Contracts)
                    .ThenInclude(c => c.Employee)
                        .ThenInclude(e => e.Department)
                .FirstOrDefaultAsync(b => b.Id == batchId);

            if (batch == null) throw new KeyNotFoundException("Không tìm thấy đợt hợp đồng.");

            return _mapper.Map<ContractBatchDetailDto>(batch);
        }

        public async Task UpdateBatchContractsAsync(int batchId, List<BatchContractItemUpdateDto> contracts)
        {
            var batch = await _context.ContractBatches
                .Include(b => b.Contracts)
                .FirstOrDefaultAsync(b => b.Id == batchId);

            if (batch == null) throw new KeyNotFoundException("Không tìm thấy đợt hợp đồng.");
            if (batch.Status != ContractBatchStatus.Draft)
                throw new InvalidOperationException("Chỉ có thể chỉnh sửa đợt ở trạng thái Nháp.");

            // Clear old ones or update? For simplicity, if they send the whole list, we sync.
            // But usually we just add/update.
            
            foreach (var item in contracts)
            {
                if (item.EndDate.HasValue && item.EndDate <= item.StartDate)
                {
                    throw new ArgumentException($"Nhân viên ID {item.EmployeeId}: Ngày kết thúc phải sau ngày bắt đầu.");
                }

                var existing = batch.Contracts.FirstOrDefault(c => c.EmployeeId == item.EmployeeId);
                if (existing != null)
                {
                    // Update
                    existing.ContractType = (ContractType)item.ContractTypeId;
                    existing.BasicSalary = item.BasicSalary;
                    existing.StartDate = item.StartDate;
                    existing.EndDate = item.EndDate;
                    existing.JobDescription = item.JobDescription ?? string.Empty;
                    existing.WorkLocation = item.WorkLocation ?? string.Empty;
                    existing.Notes = item.Notes;
                    existing.AttachmentUrl = item.AttachmentUrl;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    // Add new
                    var newContract = new EmployeeContract
                    {
                        EmployeeId = item.EmployeeId,
                        ContractBatchId = batchId,
                        ContractType = (ContractType)item.ContractTypeId,
                        BasicSalary = item.BasicSalary,
                        StartDate = item.StartDate,
                        EndDate = item.EndDate,
                        JobDescription = item.JobDescription ?? string.Empty,
                        WorkLocation = item.WorkLocation ?? string.Empty,
                        Notes = item.Notes,
                        AttachmentUrl = item.AttachmentUrl,
                        Status = ContractStatus.Draft,
                        ContractNumber = $"HĐ-{item.EmployeeId}-{DateTime.Now:yyyyMMddHHmm}",
                        SignedBy = "Giám đốc Nhân sự" // Default
                    };
                    _context.EmployeeContracts.Add(newContract);
                }
            }

            try 
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex)
            {
                // Re-throw with more detail if possible
                var innerMsg = ex.InnerException?.Message ?? ex.Message;
                if (innerMsg.Contains("Invalid column name 'ContractBatchId'"))
                {
                    throw new InvalidOperationException("Cơ sở dữ liệu chưa được cập nhật. Vui lòng chạy script 'update_db_batch.sql' để bổ sung cột ContractBatchId.", ex);
                }
                throw new InvalidOperationException($"Lỗi lưu database: {innerMsg}", ex);
            }
        }

        public async Task SubmitBatchAsync(int batchId)
        {
            var batch = await _context.ContractBatches
                .Include(b => b.Contracts)
                .FirstOrDefaultAsync(b => b.Id == batchId);

            if (batch == null) throw new KeyNotFoundException("Không tìm thấy đợt hợp đồng.");
            
            foreach (var contract in batch.Contracts)
            {
                if (contract.Status == ContractStatus.Draft)
                {
                    contract.Status = ContractStatus.WaitingSign;
                }
            }

            batch.Status = ContractBatchStatus.Pending;
            batch.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<ContractBatchDto>> GetBatchesAsync()
        {
            var batches = await _context.ContractBatches
                .Include(b => b.CreatedBy)
                .Include(b => b.Contracts)
                .OrderByDescending(b => b.CreatedAt)
                .ToListAsync();

            return _mapper.Map<IEnumerable<ContractBatchDto>>(batches);
        }

        public async Task<int> RenewAllContractsAsync(int creatorId)
        {
            var nextYear = DateTime.Now.Year + 1;
            var batch = new ContractBatch
            {
                BatchName = $"Đợt gia hạn Hợp đồng lao động năm {nextYear}",
                Month = 1,
                Year = nextYear,
                CreatedById = creatorId,
                CreatedAt = DateTime.UtcNow,
                Status = ContractBatchStatus.Draft
            };

            _context.ContractBatches.Add(batch);
            await _context.SaveChangesAsync();

            // Find all employees with an ACTIVE contract
            var activeContracts = await _context.EmployeeContracts
                .Include(c => c.Employee)
                .Where(c => c.Status == ContractStatus.Active)
                .ToListAsync();

            var newContracts = new List<EmployeeContract>();
            foreach (var oldContract in activeContracts)
            {
                var startDate = oldContract.EndDate?.AddDays(1) ?? new DateTime(nextYear, 1, 1);
                var endDate = oldContract.ContractType == ContractType.FixedTerm 
                    ? startDate.AddYears(1).AddDays(-1) 
                    : (DateTime?)null;

                var newContract = new EmployeeContract
                {
                    EmployeeId = oldContract.EmployeeId,
                    ContractBatchId = batch.Id,
                    ContractType = oldContract.ContractType,
                    ContractNumber = $"HĐ-{oldContract.Employee.EmployeeCode}-{nextYear}",
                    StartDate = startDate,
                    EndDate = endDate,
                    BasicSalary = oldContract.BasicSalary,
                    JobDescription = oldContract.JobDescription,
                    WorkLocation = oldContract.WorkLocation,
                    SignedBy = oldContract.SignedBy,
                    Status = ContractStatus.Draft,
                    ShiftId = oldContract.ShiftId,
                    TargetDepartmentId = oldContract.Employee.DepartmentId,
                    TargetPositionId = oldContract.Employee.PositionId,
                    CreatedAt = DateTime.UtcNow
                };
                newContracts.Add(newContract);
            }

            if (newContracts.Any())
            {
                _context.EmployeeContracts.AddRange(newContracts);
                await _context.SaveChangesAsync();
            }

            return batch.Id;
        }
    }
}
