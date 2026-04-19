using AutoMapper;
using HRMS.Application.DTOs.Auth;
using HRMS.Application.DTOs.Contract;
using HRMS.Application.DTOs.Contracts;
using HRMS.Application.DTOs.Jobs;
using HRMS.Application.DTOs.Employees;
using HRMS.Application.DTOs.Departments;
using HRMS.Application.DTOs.Scheduling;
using HRMS.Application.DTOs.Leave;
using HRMS.Application.DTOs.Payroll;
using HRMS.Domain.Entities;
using System;
using System.Linq;

namespace HRMS.Application.Mappings
{
    public class MappingProfile : Profile
    {
        public MappingProfile()
        {
            // USER & AUTH MAPPINGS
            CreateMap<User, UserDto>()
                .ForMember(dest => dest.Roles,
                    opt => opt.MapFrom(src => src.UserRoles.Select(ur => ur.Role.RoleName).ToArray()))
                .ForMember(dest => dest.DepartmentId, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.DepartmentId : (int?)null))
                .ForMember(dest => dest.DepartmentCode, opt => opt.MapFrom(src => (src.Employee != null && src.Employee.Department != null) ? src.Employee.Department.DepartmentCode : null))
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => (src.Employee != null && src.Employee.Department != null) ? src.Employee.Department.DepartmentName : null))
                .ForMember(dest => dest.EmployeeId, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.Id : (int?)null))
                .ForMember(dest => dest.EmployeeCode, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.EmployeeCode : null))
                .ForMember(dest => dest.PositionName, opt => opt.MapFrom(src => (src.Employee != null && src.Employee.Position != null) ? src.Employee.Position.PositionName : null))
                .ForMember(dest => dest.Phone, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.Phone : null))
                .ForMember(dest => dest.Signature, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.Signature : null));

            // CONTRACT MAPPINGS
            CreateMap<ContractCreateDto, EmployeeContract>()
                .ForMember(dest => dest.ContractType, opt => opt.MapFrom(src => (HRMS.Domain.Enums.ContractType)src.ContractTypeId))
                .ForMember(dest => dest.TargetDepartmentId, opt => opt.MapFrom(src => src.DepartmentId))
                .ForMember(dest => dest.TargetPositionId, opt => opt.MapFrom(src => src.PositionId));

            CreateMap<ContractBatch, ContractBatchDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.CreatorName, opt => opt.MapFrom(src => src.CreatedBy != null ? src.CreatedBy.FullName : "System"))
                .ForMember(dest => dest.ContractCount, opt => opt.MapFrom(src => src.Contracts != null ? src.Contracts.Count : 0));

            CreateMap<ContractBatch, ContractBatchDetailDto>()
                .IncludeBase<ContractBatch, ContractBatchDto>()
                .ForMember(dest => dest.Contracts, opt => opt.MapFrom(src => src.Contracts));

            CreateMap<ContractBatchCreateDto, ContractBatch>();

            // JOB MAPPINGS
            CreateMap<JobCreateDto, JobAssignment>();
            CreateMap<JobAssignment, JobResponseDto>()
                .ForMember(dest => dest.EmployeeName, opt => opt.MapFrom(src => src.Employee.FullName))
                .ForMember(dest => dest.ManagerName, opt => opt.MapFrom(src => src.Manager.FullName))
                .ForMember(dest => dest.Updates, opt => opt.MapFrom(src => src.Updates));
            CreateMap<TaskUpdate, TaskUpdateDto>();

            // EMPLOYEE MAPPINGS
            CreateMap<Employee, EmployeeProfileDto>()
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => src.Department.DepartmentName))
                .ForMember(dest => dest.PositionName, opt => opt.MapFrom(src => src.Position.PositionName))
                .ForMember(dest => dest.PositionBaseSalaryMin, opt => opt.MapFrom(src => src.Position.BaseSalaryMin))
                .ForMember(dest => dest.PositionBaseSalaryMax, opt => opt.MapFrom(src => src.Position.BaseSalaryMax))
                .ForMember(dest => dest.PositionDefaultShiftId, opt => opt.MapFrom(src => src.Position.DefaultShiftId))
                .ForMember(dest => dest.ShiftName, opt => opt.MapFrom(src => src.Shift != null ? src.Shift.ShiftName : null))
                .ForMember(dest => dest.Signature, opt => opt.MapFrom(src => src.Signature))
                .ForMember(dest => dest.CurrentContract, opt => opt.Ignore()); // Sẽ được xử lý trong Service nếu cần

            CreateMap<EmployeeContract, EmployeeContractDto>()
                .ForMember(dest => dest.ContractType, opt => opt.MapFrom(src => src.ContractType.ToString()))
                .ForMember(dest => dest.ContractTypeId, opt => opt.MapFrom(src => (int)src.ContractType))
                .ForMember(dest => dest.EmployeeId, opt => opt.MapFrom(src => src.EmployeeId))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.EmployeeName, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.FullName : string.Empty))
                .ForMember(dest => dest.MealAllowance, opt => opt.MapFrom(src => src.MealAllowance))
                .ForMember(dest => dest.PhoneAllowance, opt => opt.MapFrom(src => src.PhoneAllowance))
                .ForMember(dest => dest.PetrolAllowance, opt => opt.MapFrom(src => src.PetrolAllowance))
                .ForMember(dest => dest.HousingAllowance, opt => opt.MapFrom(src => src.HousingAllowance))
                .ForMember(dest => dest.EmployeeCode, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.EmployeeCode : string.Empty))
                .ForMember(dest => dest.DepartmentName, opt => opt.MapFrom(src => (src.Employee != null && src.Employee.Department != null) ? src.Employee.Department.DepartmentName : string.Empty))
                .ForMember(dest => dest.IdentityNumber, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.IdentityNumber : string.Empty))
                .ForMember(dest => dest.DateOfBirth, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.DateOfBirth : DateTime.MinValue))
                .ForMember(dest => dest.Address, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.Address : string.Empty))
                .ForMember(dest => dest.CurrentAddress, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.CurrentAddress : string.Empty))
                .ForMember(dest => dest.IdentityDate, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.IdentityDate : null))
                .ForMember(dest => dest.IdentityPlace, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.IdentityPlace : string.Empty))
                .ForMember(dest => dest.PlaceOfOrigin, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.PlaceOfOrigin : string.Empty))
                .ForMember(dest => dest.PlaceOfBirth, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.PlaceOfBirth : string.Empty))
                .ForMember(dest => dest.PositionName, opt => opt.MapFrom(src => src.Employee != null && src.Employee.Position != null ? src.Employee.Position.PositionName : string.Empty))
                .ForMember(dest => dest.JobDescription, opt => opt.MapFrom(src => src.JobDescription))
                .ForMember(dest => dest.WorkLocation, opt => opt.MapFrom(src => src.WorkLocation))
                .ForMember(dest => dest.EmployeeSignature, opt => opt.MapFrom(src => src.EmployeeSignature))
                .ForMember(dest => dest.EmployeeSignedAt, opt => opt.MapFrom(src => src.EmployeeSignedAt))
                .ForMember(dest => dest.SignedBy, opt => opt.MapFrom(src => src.SignedBy))
                .ForMember(dest => dest.ContractBatchId, opt => opt.MapFrom(src => src.ContractBatchId))
                .ForMember(dest => dest.ShiftId, opt => opt.MapFrom(src => src.ShiftId))
                .ForMember(dest => dest.ShiftName, opt => opt.MapFrom(src => src.Shift != null ? src.Shift.ShiftName : null))
                .ForMember(dest => dest.ShiftCode, opt => opt.MapFrom(src => src.Shift != null ? src.Shift.ShiftCode : null))
                .ForMember(dest => dest.ShiftTime, opt => opt.MapFrom(src => src.Shift != null
                    ? $"{src.Shift.StartTime:hh\\:mm} - {src.Shift.EndTime:hh\\:mm}"
                    : null));
            
            CreateMap<EmployeeBankAccount, EmployeeBankAccountDto>();
            CreateMap<EmployeeEmergencyContact, EmergencyContactDto>();

            // DEPARTMENT MAPPINGS
            CreateMap<DepartmentCreateDto, Department>();
            CreateMap<Department, DepartmentDto>()
                .ForMember(dest => dest.ManagerName, opt => opt.MapFrom(src => src.Manager != null ? src.Manager.FullName : null))
                .ForMember(dest => dest.ParentDepartmentName, opt => opt.MapFrom(src => src.ParentDepartment != null ? src.ParentDepartment.DepartmentName : null));
            CreateMap<DepartmentUpdateDto, Department>()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
            CreateMap<EmployeeUpdateDto, Employee>()
                .ForAllMembers(opts => opts.Condition((src, dest, srcMember) => srcMember != null));
            CreateMap<EmployeeCreateDto, Employee>();

            // SCHEDULING MAPPINGS
            CreateMap<WorkShift, WorkShiftDto>()
                .ForMember(dest => dest.StartTime, opt => opt.MapFrom(src => src.StartTime.ToString(@"hh\:mm")))
                .ForMember(dest => dest.EndTime, opt => opt.MapFrom(src => src.EndTime.ToString(@"hh\:mm")));
            
            CreateMap<WorkShiftCreateDto, WorkShift>()
                .ForMember(dest => dest.StartTime, opt => opt.MapFrom(src => TimeSpan.Parse(src.StartTime)))
                .ForMember(dest => dest.EndTime, opt => opt.MapFrom(src => TimeSpan.Parse(src.EndTime)));

            CreateMap<SchedulePeriod, SchedulePeriodDto>();
            CreateMap<SchedulePeriodCreateDto, SchedulePeriod>();

            CreateMap<WorkSchedule, WorkScheduleDto>()
                .ForMember(dest => dest.EmployeeFullName, opt => opt.MapFrom(src => src.Employee.FullName))
                .ForMember(dest => dest.EmployeeCode, opt => opt.MapFrom(src => src.Employee.EmployeeCode))
                .ForMember(dest => dest.ShiftCode, opt => opt.MapFrom(src => src.WorkShift != null ? src.WorkShift.ShiftCode : "OFF"));

            CreateMap<LeaveRequest, LeaveRequestDto>()
                .ForMember(dest => dest.LeaveTypeName, opt => opt.MapFrom(src => src.LeaveType.Name))
                .ForMember(dest => dest.EmployeeName, opt => opt.MapFrom(src => src.Employee.FullName))
                .ForMember(dest => dest.EmployeePositionName, opt => opt.MapFrom(src => src.Employee.Position.PositionName));

            CreateMap<ShiftTemplate, ShiftTemplateDto>();
            CreateMap<ShiftTemplateDetail, ShiftTemplateDetailDto>()
                .ForMember(dest => dest.ShiftCode, opt => opt.MapFrom(src => src.WorkShift != null ? src.WorkShift.ShiftCode : "OFF"));

            // PAYROLL MAPPINGS
            CreateMap<PayrollSetting, PayrollSettingDto>();
            CreateMap<PayrollPeriod, PayrollPeriodDto>()
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()))
                .ForMember(dest => dest.SchedulePeriodName, opt => opt.MapFrom(src => src.SchedulePeriod != null ? src.SchedulePeriod.PeriodName : "N/A"))
                .ForMember(dest => dest.ProcessedByName, opt => opt.MapFrom(src => src.ProcessedBy != null ? src.ProcessedBy.FullName : null))
                .ForMember(dest => dest.ReviewedByName, opt => opt.MapFrom(src => src.ReviewedBy != null ? src.ReviewedBy.FullName : null))
                .ForMember(dest => dest.ApprovedByName, opt => opt.MapFrom(src => src.ApprovedBy != null ? src.ApprovedBy.FullName : null));
            
            CreateMap<PayrollRecord, PayrollRecordDto>()
                .ForMember(dest => dest.EmployeeName, opt => opt.MapFrom(src => src.Employee != null ? src.Employee.FullName : "N/A"));

            CreateMap<Position, HRMS.Application.DTOs.Employees.PositionDto>();
        }
    }
}
