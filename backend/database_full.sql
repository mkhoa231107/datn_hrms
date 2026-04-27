IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [Organizations] (
    [Id] int NOT NULL IDENTITY,
    [OrganizationName] nvarchar(max) NOT NULL,
    [OrganizationCode] nvarchar(max) NOT NULL,
    [TaxCode] nvarchar(max) NOT NULL,
    [Address] nvarchar(max) NOT NULL,
    [Phone] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [Website] nvarchar(max) NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Organizations] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Permissions] (
    [Id] int NOT NULL IDENTITY,
    [PermissionName] nvarchar(max) NOT NULL,
    [Resource] nvarchar(max) NOT NULL,
    [Action] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Permissions] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Roles] (
    [Id] int NOT NULL IDENTITY,
    [RoleName] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Username] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Email] nvarchar(max) NOT NULL,
    [FullName] nvarchar(max) NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [RolePermissions] (
    [RoleId] int NOT NULL,
    [PermissionId] int NOT NULL,
    [GrantedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_RolePermissions] PRIMARY KEY ([RoleId], [PermissionId]),
    CONSTRAINT [FK_RolePermissions_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [Permissions] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [AuditLogs] (
    [Id] int NOT NULL IDENTITY,
    [UserId] int NULL,
    [Action] nvarchar(max) NOT NULL,
    [EntityType] nvarchar(max) NOT NULL,
    [EntityId] int NULL,
    [OldValue] nvarchar(max) NOT NULL,
    [NewValue] nvarchar(max) NOT NULL,
    [IpAddress] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AuditLogs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);
GO

CREATE TABLE [UserRoles] (
    [UserId] int NOT NULL,
    [RoleId] int NOT NULL,
    [AssignedAt] datetime2 NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_UserRoles_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserRoles_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Departments] (
    [Id] int NOT NULL IDENTITY,
    [DepartmentName] nvarchar(max) NOT NULL,
    [DepartmentCode] nvarchar(450) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [OrganizationId] int NOT NULL,
    [ParentDepartmentId] int NULL,
    [ManagerId] int NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Departments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Departments_Departments_ParentDepartmentId] FOREIGN KEY ([ParentDepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Departments_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Positions] (
    [Id] int NOT NULL IDENTITY,
    [PositionName] nvarchar(max) NOT NULL,
    [PositionCode] nvarchar(450) NOT NULL,
    [Level] int NOT NULL,
    [Description] nvarchar(max) NULL,
    [DepartmentId] int NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Positions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Positions_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Employees] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeCode] nvarchar(450) NOT NULL,
    [FullName] nvarchar(max) NOT NULL,
    [DateOfBirth] datetime2 NOT NULL,
    [Gender] nvarchar(max) NOT NULL,
    [IdentityNumber] nvarchar(max) NULL,
    [IdentityDate] datetime2 NULL,
    [IdentityPlace] nvarchar(max) NULL,
    [Email] nvarchar(max) NOT NULL,
    [Phone] nvarchar(max) NOT NULL,
    [Address] nvarchar(max) NOT NULL,
    [CurrentAddress] nvarchar(max) NULL,
    [JoinDate] datetime2 NOT NULL,
    [LeaveDate] datetime2 NULL,
    [Status] int NOT NULL,
    [OrganizationId] int NOT NULL,
    [DepartmentId] int NOT NULL,
    [PositionId] int NOT NULL,
    [ManagerId] int NULL,
    [UserId] int NULL,
    [Avatar] nvarchar(max) NULL,
    [TaxCode] nvarchar(max) NULL,
    [SocialInsuranceNumber] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Employees] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Employees_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Employees_Employees_ManagerId] FOREIGN KEY ([ManagerId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Employees_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Employees_Positions_PositionId] FOREIGN KEY ([PositionId]) REFERENCES [Positions] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Employees_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EmployeeBankAccounts] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [BankName] nvarchar(max) NOT NULL,
    [BankBranch] nvarchar(max) NOT NULL,
    [AccountNumber] nvarchar(max) NOT NULL,
    [AccountHolderName] nvarchar(max) NOT NULL,
    [IsPrimary] bit NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_EmployeeBankAccounts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EmployeeBankAccounts_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [EmployeeContracts] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [ContractNumber] nvarchar(max) NOT NULL,
    [ContractType] int NOT NULL,
    [StartDate] datetime2 NOT NULL,
    [EndDate] datetime2 NULL,
    [BasicSalary] decimal(18,2) NOT NULL,
    [JobDescription] nvarchar(max) NOT NULL,
    [WorkLocation] nvarchar(max) NOT NULL,
    [IsActive] bit NOT NULL,
    [SignedBy] nvarchar(max) NOT NULL,
    [SignedDate] datetime2 NULL,
    [AttachmentUrl] nvarchar(max) NOT NULL,
    [Notes] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_EmployeeContracts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EmployeeContracts_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [EmployeeEmergencyContacts] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [ContactName] nvarchar(max) NOT NULL,
    [Relationship] nvarchar(max) NOT NULL,
    [Phone] nvarchar(max) NOT NULL,
    [Address] nvarchar(max) NOT NULL,
    [IsPrimary] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_EmployeeEmergencyContacts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EmployeeEmergencyContacts_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AuditLogs_UserId] ON [AuditLogs] ([UserId]);
GO

CREATE INDEX [IX_Departments_ManagerId] ON [Departments] ([ManagerId]);
GO

CREATE UNIQUE INDEX [IX_Departments_OrganizationId_DepartmentCode] ON [Departments] ([OrganizationId], [DepartmentCode]);
GO

CREATE INDEX [IX_Departments_ParentDepartmentId] ON [Departments] ([ParentDepartmentId]);
GO

CREATE INDEX [IX_EmployeeBankAccounts_EmployeeId] ON [EmployeeBankAccounts] ([EmployeeId]);
GO

CREATE INDEX [IX_EmployeeContracts_EmployeeId] ON [EmployeeContracts] ([EmployeeId]);
GO

CREATE INDEX [IX_EmployeeEmergencyContacts_EmployeeId] ON [EmployeeEmergencyContacts] ([EmployeeId]);
GO

CREATE INDEX [IX_Employees_DepartmentId] ON [Employees] ([DepartmentId]);
GO

CREATE UNIQUE INDEX [IX_Employees_EmployeeCode] ON [Employees] ([EmployeeCode]);
GO

CREATE INDEX [IX_Employees_ManagerId] ON [Employees] ([ManagerId]);
GO

CREATE INDEX [IX_Employees_OrganizationId] ON [Employees] ([OrganizationId]);
GO

CREATE INDEX [IX_Employees_PositionId] ON [Employees] ([PositionId]);
GO

CREATE UNIQUE INDEX [IX_Employees_UserId] ON [Employees] ([UserId]) WHERE [UserId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Positions_DepartmentId_PositionCode] ON [Positions] ([DepartmentId], [PositionCode]);
GO

CREATE INDEX [IX_RolePermissions_PermissionId] ON [RolePermissions] ([PermissionId]);
GO

CREATE INDEX [IX_UserRoles_RoleId] ON [UserRoles] ([RoleId]);
GO

ALTER TABLE [Departments] ADD CONSTRAINT [FK_Departments_Employees_ManagerId] FOREIGN KEY ([ManagerId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260120094025_InitialWithOrganization', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'Notes');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [Notes] nvarchar(max) NULL;
GO

DECLARE @var1 sysname;
SELECT @var1 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'AttachmentUrl');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var1 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [AttachmentUrl] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260122025618_FixContractNullable', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [JobAssignments] (
    [Id] int NOT NULL IDENTITY,
    [Title] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [EmployeeId] int NOT NULL,
    [ManagerId] int NOT NULL,
    [StartDate] datetime2 NOT NULL,
    [EndDate] datetime2 NOT NULL,
    [Priority] int NOT NULL,
    [Status] int NOT NULL,
    [Weight] int NOT NULL,
    [EvaluationScore] decimal(18,2) NULL,
    [CompletionPercentage] int NOT NULL,
    [InstructionFileUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_JobAssignments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JobAssignments_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_JobAssignments_Employees_ManagerId] FOREIGN KEY ([ManagerId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TaskUpdates] (
    [Id] int NOT NULL IDENTITY,
    [JobAssignmentId] int NOT NULL,
    [UpdateContent] nvarchar(max) NOT NULL,
    [AttachmentUrl] nvarchar(max) NULL,
    [UpdateTime] datetime2 NOT NULL,
    CONSTRAINT [PK_TaskUpdates] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TaskUpdates_JobAssignments_JobAssignmentId] FOREIGN KEY ([JobAssignmentId]) REFERENCES [JobAssignments] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_JobAssignments_EmployeeId] ON [JobAssignments] ([EmployeeId]);
GO

CREATE INDEX [IX_JobAssignments_ManagerId] ON [JobAssignments] ([ManagerId]);
GO

CREATE INDEX [IX_TaskUpdates_JobAssignmentId] ON [TaskUpdates] ([JobAssignmentId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260127055933_AddDeptManagerRole', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [SchedulePeriods] (
    [Id] int NOT NULL IDENTITY,
    [PeriodName] nvarchar(max) NOT NULL,
    [StartDate] datetime2 NOT NULL,
    [EndDate] datetime2 NOT NULL,
    [IsLocked] bit NOT NULL,
    [OrganizationId] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_SchedulePeriods] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SchedulePeriods_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [ShiftTemplates] (
    [Id] int NOT NULL IDENTITY,
    [TemplateName] nvarchar(max) NOT NULL,
    [CycleDays] int NOT NULL,
    [OrganizationId] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_ShiftTemplates] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ShiftTemplates_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkShifts] (
    [Id] int NOT NULL IDENTITY,
    [ShiftName] nvarchar(max) NOT NULL,
    [ShiftCode] nvarchar(max) NOT NULL,
    [StartTime] time NOT NULL,
    [EndTime] time NOT NULL,
    [BreakMinutes] int NOT NULL,
    [IsOvernight] bit NOT NULL,
    [OtMultiplier] decimal(18,2) NOT NULL,
    [OrganizationId] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_WorkShifts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkShifts_Organizations_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [Organizations] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [DepartmentDefaultShifts] (
    [Id] int NOT NULL IDENTITY,
    [DepartmentId] int NOT NULL,
    [WorkShiftId] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_DepartmentDefaultShifts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DepartmentDefaultShifts_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_DepartmentDefaultShifts_WorkShifts_WorkShiftId] FOREIGN KEY ([WorkShiftId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [ShiftTemplateDetails] (
    [Id] int NOT NULL IDENTITY,
    [ShiftTemplateId] int NOT NULL,
    [DayNumber] int NOT NULL,
    [WorkShiftId] int NULL,
    CONSTRAINT [PK_ShiftTemplateDetails] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ShiftTemplateDetails_ShiftTemplates_ShiftTemplateId] FOREIGN KEY ([ShiftTemplateId]) REFERENCES [ShiftTemplates] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftTemplateDetails_WorkShifts_WorkShiftId] FOREIGN KEY ([WorkShiftId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [WorkSchedules] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [WorkShiftId] int NULL,
    [WorkingDate] datetime2 NOT NULL,
    [PeriodId] int NOT NULL,
    [Note] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_WorkSchedules] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_WorkSchedules_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkSchedules_SchedulePeriods_PeriodId] FOREIGN KEY ([PeriodId]) REFERENCES [SchedulePeriods] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_WorkSchedules_WorkShifts_WorkShiftId] FOREIGN KEY ([WorkShiftId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_DepartmentDefaultShifts_DepartmentId] ON [DepartmentDefaultShifts] ([DepartmentId]);
GO

CREATE INDEX [IX_DepartmentDefaultShifts_WorkShiftId] ON [DepartmentDefaultShifts] ([WorkShiftId]);
GO

CREATE INDEX [IX_SchedulePeriods_OrganizationId] ON [SchedulePeriods] ([OrganizationId]);
GO

CREATE INDEX [IX_ShiftTemplateDetails_ShiftTemplateId] ON [ShiftTemplateDetails] ([ShiftTemplateId]);
GO

CREATE INDEX [IX_ShiftTemplateDetails_WorkShiftId] ON [ShiftTemplateDetails] ([WorkShiftId]);
GO

CREATE INDEX [IX_ShiftTemplates_OrganizationId] ON [ShiftTemplates] ([OrganizationId]);
GO

CREATE INDEX [IX_WorkSchedules_EmployeeId] ON [WorkSchedules] ([EmployeeId]);
GO

CREATE INDEX [IX_WorkSchedules_PeriodId] ON [WorkSchedules] ([PeriodId]);
GO

CREATE INDEX [IX_WorkSchedules_WorkShiftId] ON [WorkSchedules] ([WorkShiftId]);
GO

CREATE INDEX [IX_WorkShifts_OrganizationId] ON [WorkShifts] ([OrganizationId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260129120357_AddShiftSchedulingModule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [AttendanceSummaries] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [PeriodId] int NOT NULL,
    [TotalWorkingDays] int NOT NULL,
    [LateDays] int NOT NULL,
    [EarlyLeaveDays] int NOT NULL,
    [AbsentDays] int NOT NULL,
    [TotalWorkingHours] decimal(18,2) NOT NULL,
    [OvertimeHours] decimal(18,2) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_AttendanceSummaries] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AttendanceSummaries_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_AttendanceSummaries_SchedulePeriods_PeriodId] FOREIGN KEY ([PeriodId]) REFERENCES [SchedulePeriods] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TimeAdjustmentRequests] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [RequestedDate] datetime2 NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Reason] nvarchar(max) NOT NULL,
    [OriginalCheckIn] datetime2 NULL,
    [OriginalCheckOut] datetime2 NULL,
    [CorrectedCheckIn] datetime2 NULL,
    [CorrectedCheckOut] datetime2 NULL,
    [Status] nvarchar(max) NOT NULL,
    [ApprovedBy] int NULL,
    [ApprovedAt] datetime2 NULL,
    [ApprovalNote] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_TimeAdjustmentRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TimeAdjustmentRequests_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [TimeAttendanceRecords] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [Timestamp] datetime2 NOT NULL,
    [Type] nvarchar(max) NOT NULL,
    [Location] nvarchar(max) NOT NULL,
    [DeviceInfo] nvarchar(max) NOT NULL,
    [Date] datetime2 NOT NULL,
    [WorkScheduleId] int NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_TimeAttendanceRecords] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_TimeAttendanceRecords_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_TimeAttendanceRecords_WorkSchedules_WorkScheduleId] FOREIGN KEY ([WorkScheduleId]) REFERENCES [WorkSchedules] ([Id]) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX [IX_AttendanceSummaries_EmployeeId_PeriodId] ON [AttendanceSummaries] ([EmployeeId], [PeriodId]);
GO

CREATE INDEX [IX_AttendanceSummaries_PeriodId] ON [AttendanceSummaries] ([PeriodId]);
GO

CREATE INDEX [IX_TimeAdjustmentRequests_EmployeeId] ON [TimeAdjustmentRequests] ([EmployeeId]);
GO

CREATE INDEX [IX_TimeAttendanceRecords_EmployeeId] ON [TimeAttendanceRecords] ([EmployeeId]);
GO

CREATE INDEX [IX_TimeAttendanceRecords_WorkScheduleId] ON [TimeAttendanceRecords] ([WorkScheduleId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260203043026_AddTimekeepingModule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [WorkSchedules] ADD [ShiftLeaderId] int NULL;
GO

CREATE INDEX [IX_WorkSchedules_ShiftLeaderId] ON [WorkSchedules] ([ShiftLeaderId]);
GO

ALTER TABLE [WorkSchedules] ADD CONSTRAINT [FK_WorkSchedules_Employees_ShiftLeaderId] FOREIGN KEY ([ShiftLeaderId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260210115558_AddShiftLeaderToWorkSchedule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [LeaveTypes] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NOT NULL,
    [Code] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NULL,
    [IsPaid] bit NOT NULL,
    [DefaultDaysPerYear] int NOT NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_LeaveTypes] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [LeaveBalances] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [LeaveTypeId] int NOT NULL,
    [Year] int NOT NULL,
    [TotalDays] float NOT NULL,
    [UsedDays] float NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_LeaveBalances] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_LeaveBalances_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LeaveBalances_LeaveTypes_LeaveTypeId] FOREIGN KEY ([LeaveTypeId]) REFERENCES [LeaveTypes] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [LeaveRequests] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [LeaveTypeId] int NOT NULL,
    [FromDate] datetime2 NOT NULL,
    [ToDate] datetime2 NOT NULL,
    [TotalDays] float NOT NULL,
    [Reason] nvarchar(max) NULL,
    [Status] int NOT NULL,
    [ApproverId] int NULL,
    [ApproverNote] nvarchar(max) NULL,
    [ApprovedAt] datetime2 NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_LeaveRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_LeaveRequests_Employees_ApproverId] FOREIGN KEY ([ApproverId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LeaveRequests_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_LeaveRequests_LeaveTypes_LeaveTypeId] FOREIGN KEY ([LeaveTypeId]) REFERENCES [LeaveTypes] ([Id]) ON DELETE NO ACTION
);
GO

CREATE UNIQUE INDEX [IX_LeaveBalances_EmployeeId_LeaveTypeId_Year] ON [LeaveBalances] ([EmployeeId], [LeaveTypeId], [Year]);
GO

CREATE INDEX [IX_LeaveBalances_LeaveTypeId] ON [LeaveBalances] ([LeaveTypeId]);
GO

CREATE INDEX [IX_LeaveRequests_ApproverId] ON [LeaveRequests] ([ApproverId]);
GO

CREATE INDEX [IX_LeaveRequests_EmployeeId] ON [LeaveRequests] ([EmployeeId]);
GO

CREATE INDEX [IX_LeaveRequests_LeaveTypeId] ON [LeaveRequests] ([LeaveTypeId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260224032249_AddLeaveModule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] ADD [TeamId] int NULL;
GO

CREATE TABLE [Teams] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(max) NOT NULL,
    [Code] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NULL,
    [DepartmentId] int NOT NULL,
    [TeamLeaderId] int NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_Teams] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Teams_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Teams_Employees_TeamLeaderId] FOREIGN KEY ([TeamLeaderId]) REFERENCES [Employees] ([Id]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_Employees_TeamId] ON [Employees] ([TeamId]);
GO

CREATE INDEX [IX_Teams_DepartmentId] ON [Teams] ([DepartmentId]);
GO

CREATE INDEX [IX_Teams_TeamLeaderId] ON [Teams] ([TeamLeaderId]);
GO

ALTER TABLE [Employees] ADD CONSTRAINT [FK_Employees_Teams_TeamId] FOREIGN KEY ([TeamId]) REFERENCES [Teams] ([Id]) ON DELETE SET NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260224041745_AddTeamAndRenameShiftLeader', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [WorkSchedules] DROP CONSTRAINT [FK_WorkSchedules_Employees_ShiftLeaderId];
GO

EXEC sp_rename N'[WorkSchedules].[ShiftLeaderId]', N'TeamLeaderId', N'COLUMN';
GO

EXEC sp_rename N'[WorkSchedules].[IX_WorkSchedules_ShiftLeaderId]', N'IX_WorkSchedules_TeamLeaderId', N'INDEX';
GO

ALTER TABLE [WorkSchedules] ADD CONSTRAINT [FK_WorkSchedules_Employees_TeamLeaderId] FOREIGN KEY ([TeamLeaderId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260224042046_RefactorShiftLeaderToTeamLeader', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] DROP CONSTRAINT [FK_Employees_Teams_TeamId];
GO

ALTER TABLE [WorkSchedules] DROP CONSTRAINT [FK_WorkSchedules_Employees_TeamLeaderId];
GO

DROP TABLE [Teams];
GO

DROP INDEX [IX_WorkSchedules_TeamLeaderId] ON [WorkSchedules];
GO

DROP INDEX [IX_Employees_TeamId] ON [Employees];
GO

DECLARE @var2 sysname;
SELECT @var2 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[WorkSchedules]') AND [c].[name] = N'TeamLeaderId');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [WorkSchedules] DROP CONSTRAINT [' + @var2 + '];');
ALTER TABLE [WorkSchedules] DROP COLUMN [TeamLeaderId];
GO

DECLARE @var3 sysname;
SELECT @var3 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'TeamId');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var3 + '];');
ALTER TABLE [Employees] DROP COLUMN [TeamId];
GO

CREATE TABLE [EmployeeDocuments] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [DocumentType] nvarchar(max) NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [IssuedBy] nvarchar(max) NULL,
    [IssuedDate] datetime2 NULL,
    [ExpiryDate] datetime2 NULL,
    [FileUrl] nvarchar(max) NULL,
    [Notes] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_EmployeeDocuments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_EmployeeDocuments_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_EmployeeDocuments_EmployeeId] ON [EmployeeDocuments] ([EmployeeId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260307055557_RemoveTeamsAddSubDepts_EmployeeDocuments', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] ADD [FaceDescriptor] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260312083402_Add_FaceDescriptor_To_Employee', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] ADD [Ethnicity] nvarchar(max) NULL;
GO

ALTER TABLE [Employees] ADD [IdentityExpirationDate] datetime2 NULL;
GO

ALTER TABLE [Employees] ADD [PlaceOfOrigin] nvarchar(max) NULL;
GO

ALTER TABLE [Employees] ADD [Religion] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260318154859_AddEmployeeDetails', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] ADD [IsActive] bit NOT NULL DEFAULT CAST(0 AS bit);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260318160819_AddEmployeeIsActive', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [CompanyNews] (
    [Id] int NOT NULL IDENTITY,
    [Title] nvarchar(max) NOT NULL,
    [Content] nvarchar(max) NOT NULL,
    [ImageUrl] nvarchar(max) NULL,
    [IsPublished] bit NOT NULL,
    [PublishedAt] datetime2 NOT NULL,
    [AuthorId] int NOT NULL,
    CONSTRAINT [PK_CompanyNews] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_CompanyNews_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [JobPostings] (
    [Id] int NOT NULL IDENTITY,
    [Title] nvarchar(max) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Requirements] nvarchar(max) NOT NULL,
    [Location] nvarchar(max) NULL,
    [SalaryRange] nvarchar(max) NULL,
    [IsActive] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ClosingDate] datetime2 NULL,
    CONSTRAINT [PK_JobPostings] PRIMARY KEY ([Id])
);
GO

CREATE TABLE [JobApplications] (
    [Id] int NOT NULL IDENTITY,
    [JobPostingId] int NOT NULL,
    [UserId] int NOT NULL,
    [CandidateName] nvarchar(max) NOT NULL,
    [CandidateEmail] nvarchar(max) NOT NULL,
    [CandidatePhone] nvarchar(max) NOT NULL,
    [CVFilePath] nvarchar(max) NOT NULL,
    [CoverLetter] nvarchar(max) NULL,
    [Status] int NOT NULL,
    [AppliedAt] datetime2 NOT NULL,
    [LastUpdated] datetime2 NULL,
    [AIMatchScore] int NULL,
    [AIRecommendation] nvarchar(max) NULL,
    CONSTRAINT [PK_JobApplications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JobApplications_JobPostings_JobPostingId] FOREIGN KEY ([JobPostingId]) REFERENCES [JobPostings] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_JobApplications_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_CompanyNews_AuthorId] ON [CompanyNews] ([AuthorId]);
GO

CREATE INDEX [IX_JobApplications_JobPostingId] ON [JobApplications] ([JobPostingId]);
GO

CREATE INDEX [IX_JobApplications_UserId] ON [JobApplications] ([UserId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260323044318_AddRecruitmentModule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_Positions_DepartmentId_PositionCode] ON [Positions];
GO

DROP INDEX [IX_Employees_EmployeeCode] ON [Employees];
GO

DROP INDEX [IX_Departments_OrganizationId_DepartmentCode] ON [Departments];
GO

EXEC sp_rename N'[PayrollRecords].[TotalAllowances]', N'SalesSalary', N'COLUMN';
GO

DECLARE @var4 sysname;
SELECT @var4 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[WorkShifts]') AND [c].[name] = N'ShiftName');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [WorkShifts] DROP CONSTRAINT [' + @var4 + '];');
ALTER TABLE [WorkShifts] ALTER COLUMN [ShiftName] nvarchar(max) NULL;
GO

DECLARE @var5 sysname;
SELECT @var5 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[WorkShifts]') AND [c].[name] = N'ShiftCode');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [WorkShifts] DROP CONSTRAINT [' + @var5 + '];');
ALTER TABLE [WorkShifts] ALTER COLUMN [ShiftCode] nvarchar(max) NULL;
GO

DECLARE @var6 sysname;
SELECT @var6 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[WorkSchedules]') AND [c].[name] = N'Note');
IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [WorkSchedules] DROP CONSTRAINT [' + @var6 + '];');
ALTER TABLE [WorkSchedules] ALTER COLUMN [Note] nvarchar(max) NULL;
GO

DECLARE @var7 sysname;
SELECT @var7 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'Username');
IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var7 + '];');
ALTER TABLE [Users] ALTER COLUMN [Username] nvarchar(max) NULL;
GO

DECLARE @var8 sysname;
SELECT @var8 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'PasswordHash');
IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var8 + '];');
ALTER TABLE [Users] ALTER COLUMN [PasswordHash] nvarchar(max) NULL;
GO

DECLARE @var9 sysname;
SELECT @var9 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'FullName');
IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var9 + '];');
ALTER TABLE [Users] ALTER COLUMN [FullName] nvarchar(max) NULL;
GO

DECLARE @var10 sysname;
SELECT @var10 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'Email');
IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var10 + '];');
ALTER TABLE [Users] ALTER COLUMN [Email] nvarchar(max) NULL;
GO

DECLARE @var11 sysname;
SELECT @var11 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAttendanceRecords]') AND [c].[name] = N'Type');
IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [TimeAttendanceRecords] DROP CONSTRAINT [' + @var11 + '];');
ALTER TABLE [TimeAttendanceRecords] ALTER COLUMN [Type] nvarchar(max) NULL;
GO

DECLARE @var12 sysname;
SELECT @var12 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAttendanceRecords]') AND [c].[name] = N'Location');
IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [TimeAttendanceRecords] DROP CONSTRAINT [' + @var12 + '];');
ALTER TABLE [TimeAttendanceRecords] ALTER COLUMN [Location] nvarchar(max) NULL;
GO

DECLARE @var13 sysname;
SELECT @var13 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAttendanceRecords]') AND [c].[name] = N'DeviceInfo');
IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [TimeAttendanceRecords] DROP CONSTRAINT [' + @var13 + '];');
ALTER TABLE [TimeAttendanceRecords] ALTER COLUMN [DeviceInfo] nvarchar(max) NULL;
GO

DECLARE @var14 sysname;
SELECT @var14 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAdjustmentRequests]') AND [c].[name] = N'Type');
IF @var14 IS NOT NULL EXEC(N'ALTER TABLE [TimeAdjustmentRequests] DROP CONSTRAINT [' + @var14 + '];');
ALTER TABLE [TimeAdjustmentRequests] ALTER COLUMN [Type] nvarchar(max) NULL;
GO

DECLARE @var15 sysname;
SELECT @var15 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAdjustmentRequests]') AND [c].[name] = N'Status');
IF @var15 IS NOT NULL EXEC(N'ALTER TABLE [TimeAdjustmentRequests] DROP CONSTRAINT [' + @var15 + '];');
ALTER TABLE [TimeAdjustmentRequests] ALTER COLUMN [Status] nvarchar(max) NULL;
GO

DECLARE @var16 sysname;
SELECT @var16 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAdjustmentRequests]') AND [c].[name] = N'Reason');
IF @var16 IS NOT NULL EXEC(N'ALTER TABLE [TimeAdjustmentRequests] DROP CONSTRAINT [' + @var16 + '];');
ALTER TABLE [TimeAdjustmentRequests] ALTER COLUMN [Reason] nvarchar(max) NULL;
GO

DECLARE @var17 sysname;
SELECT @var17 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TimeAdjustmentRequests]') AND [c].[name] = N'ApprovalNote');
IF @var17 IS NOT NULL EXEC(N'ALTER TABLE [TimeAdjustmentRequests] DROP CONSTRAINT [' + @var17 + '];');
ALTER TABLE [TimeAdjustmentRequests] ALTER COLUMN [ApprovalNote] nvarchar(max) NULL;
GO

DECLARE @var18 sysname;
SELECT @var18 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[TaskUpdates]') AND [c].[name] = N'UpdateContent');
IF @var18 IS NOT NULL EXEC(N'ALTER TABLE [TaskUpdates] DROP CONSTRAINT [' + @var18 + '];');
ALTER TABLE [TaskUpdates] ALTER COLUMN [UpdateContent] nvarchar(max) NULL;
GO

DECLARE @var19 sysname;
SELECT @var19 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ShiftTemplates]') AND [c].[name] = N'TemplateName');
IF @var19 IS NOT NULL EXEC(N'ALTER TABLE [ShiftTemplates] DROP CONSTRAINT [' + @var19 + '];');
ALTER TABLE [ShiftTemplates] ALTER COLUMN [TemplateName] nvarchar(max) NULL;
GO

DECLARE @var20 sysname;
SELECT @var20 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[SchedulePeriods]') AND [c].[name] = N'PeriodName');
IF @var20 IS NOT NULL EXEC(N'ALTER TABLE [SchedulePeriods] DROP CONSTRAINT [' + @var20 + '];');
ALTER TABLE [SchedulePeriods] ALTER COLUMN [PeriodName] nvarchar(max) NULL;
GO

DECLARE @var21 sysname;
SELECT @var21 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Roles]') AND [c].[name] = N'RoleName');
IF @var21 IS NOT NULL EXEC(N'ALTER TABLE [Roles] DROP CONSTRAINT [' + @var21 + '];');
ALTER TABLE [Roles] ALTER COLUMN [RoleName] nvarchar(max) NULL;
GO

DECLARE @var22 sysname;
SELECT @var22 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Roles]') AND [c].[name] = N'Description');
IF @var22 IS NOT NULL EXEC(N'ALTER TABLE [Roles] DROP CONSTRAINT [' + @var22 + '];');
ALTER TABLE [Roles] ALTER COLUMN [Description] nvarchar(max) NULL;
GO

DECLARE @var23 sysname;
SELECT @var23 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Positions]') AND [c].[name] = N'PositionName');
IF @var23 IS NOT NULL EXEC(N'ALTER TABLE [Positions] DROP CONSTRAINT [' + @var23 + '];');
ALTER TABLE [Positions] ALTER COLUMN [PositionName] nvarchar(max) NULL;
GO

DECLARE @var24 sysname;
SELECT @var24 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Positions]') AND [c].[name] = N'PositionCode');
IF @var24 IS NOT NULL EXEC(N'ALTER TABLE [Positions] DROP CONSTRAINT [' + @var24 + '];');
ALTER TABLE [Positions] ALTER COLUMN [PositionCode] nvarchar(450) NULL;
GO

DECLARE @var25 sysname;
SELECT @var25 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Permissions]') AND [c].[name] = N'Resource');
IF @var25 IS NOT NULL EXEC(N'ALTER TABLE [Permissions] DROP CONSTRAINT [' + @var25 + '];');
ALTER TABLE [Permissions] ALTER COLUMN [Resource] nvarchar(max) NULL;
GO

DECLARE @var26 sysname;
SELECT @var26 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Permissions]') AND [c].[name] = N'PermissionName');
IF @var26 IS NOT NULL EXEC(N'ALTER TABLE [Permissions] DROP CONSTRAINT [' + @var26 + '];');
ALTER TABLE [Permissions] ALTER COLUMN [PermissionName] nvarchar(max) NULL;
GO

DECLARE @var27 sysname;
SELECT @var27 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Permissions]') AND [c].[name] = N'Description');
IF @var27 IS NOT NULL EXEC(N'ALTER TABLE [Permissions] DROP CONSTRAINT [' + @var27 + '];');
ALTER TABLE [Permissions] ALTER COLUMN [Description] nvarchar(max) NULL;
GO

DECLARE @var28 sysname;
SELECT @var28 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Permissions]') AND [c].[name] = N'Action');
IF @var28 IS NOT NULL EXEC(N'ALTER TABLE [Permissions] DROP CONSTRAINT [' + @var28 + '];');
ALTER TABLE [Permissions] ALTER COLUMN [Action] nvarchar(max) NULL;
GO

ALTER TABLE [PayrollRecords] ADD [OtherAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [PetrolAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [PhoneAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [PositionAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

DECLARE @var29 sysname;
SELECT @var29 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[PayrollPeriods]') AND [c].[name] = N'Name');
IF @var29 IS NOT NULL EXEC(N'ALTER TABLE [PayrollPeriods] DROP CONSTRAINT [' + @var29 + '];');
ALTER TABLE [PayrollPeriods] ALTER COLUMN [Name] nvarchar(max) NULL;
GO

DECLARE @var30 sysname;
SELECT @var30 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[PasswordResetOTPs]') AND [c].[name] = N'OTPCode');
IF @var30 IS NOT NULL EXEC(N'ALTER TABLE [PasswordResetOTPs] DROP CONSTRAINT [' + @var30 + '];');
ALTER TABLE [PasswordResetOTPs] ALTER COLUMN [OTPCode] nvarchar(max) NULL;
GO

DECLARE @var31 sysname;
SELECT @var31 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'Website');
IF @var31 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var31 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [Website] nvarchar(max) NULL;
GO

DECLARE @var32 sysname;
SELECT @var32 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'TaxCode');
IF @var32 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var32 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [TaxCode] nvarchar(max) NULL;
GO

DECLARE @var33 sysname;
SELECT @var33 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'Phone');
IF @var33 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var33 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [Phone] nvarchar(max) NULL;
GO

DECLARE @var34 sysname;
SELECT @var34 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'OrganizationName');
IF @var34 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var34 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [OrganizationName] nvarchar(max) NULL;
GO

DECLARE @var35 sysname;
SELECT @var35 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'OrganizationCode');
IF @var35 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var35 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [OrganizationCode] nvarchar(max) NULL;
GO

DECLARE @var36 sysname;
SELECT @var36 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'Email');
IF @var36 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var36 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [Email] nvarchar(max) NULL;
GO

DECLARE @var37 sysname;
SELECT @var37 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Organizations]') AND [c].[name] = N'Address');
IF @var37 IS NOT NULL EXEC(N'ALTER TABLE [Organizations] DROP CONSTRAINT [' + @var37 + '];');
ALTER TABLE [Organizations] ALTER COLUMN [Address] nvarchar(max) NULL;
GO

DECLARE @var38 sysname;
SELECT @var38 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[LeaveTypes]') AND [c].[name] = N'Name');
IF @var38 IS NOT NULL EXEC(N'ALTER TABLE [LeaveTypes] DROP CONSTRAINT [' + @var38 + '];');
ALTER TABLE [LeaveTypes] ALTER COLUMN [Name] nvarchar(max) NULL;
GO

DECLARE @var39 sysname;
SELECT @var39 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[LeaveTypes]') AND [c].[name] = N'Code');
IF @var39 IS NOT NULL EXEC(N'ALTER TABLE [LeaveTypes] DROP CONSTRAINT [' + @var39 + '];');
ALTER TABLE [LeaveTypes] ALTER COLUMN [Code] nvarchar(max) NULL;
GO

DECLARE @var40 sysname;
SELECT @var40 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobPostings]') AND [c].[name] = N'Title');
IF @var40 IS NOT NULL EXEC(N'ALTER TABLE [JobPostings] DROP CONSTRAINT [' + @var40 + '];');
ALTER TABLE [JobPostings] ALTER COLUMN [Title] nvarchar(max) NULL;
GO

DECLARE @var41 sysname;
SELECT @var41 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobPostings]') AND [c].[name] = N'Requirements');
IF @var41 IS NOT NULL EXEC(N'ALTER TABLE [JobPostings] DROP CONSTRAINT [' + @var41 + '];');
ALTER TABLE [JobPostings] ALTER COLUMN [Requirements] nvarchar(max) NULL;
GO

DECLARE @var42 sysname;
SELECT @var42 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobPostings]') AND [c].[name] = N'Description');
IF @var42 IS NOT NULL EXEC(N'ALTER TABLE [JobPostings] DROP CONSTRAINT [' + @var42 + '];');
ALTER TABLE [JobPostings] ALTER COLUMN [Description] nvarchar(max) NULL;
GO

DECLARE @var43 sysname;
SELECT @var43 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobAssignments]') AND [c].[name] = N'Title');
IF @var43 IS NOT NULL EXEC(N'ALTER TABLE [JobAssignments] DROP CONSTRAINT [' + @var43 + '];');
ALTER TABLE [JobAssignments] ALTER COLUMN [Title] nvarchar(max) NULL;
GO

DECLARE @var44 sysname;
SELECT @var44 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobAssignments]') AND [c].[name] = N'Description');
IF @var44 IS NOT NULL EXEC(N'ALTER TABLE [JobAssignments] DROP CONSTRAINT [' + @var44 + '];');
ALTER TABLE [JobAssignments] ALTER COLUMN [Description] nvarchar(max) NULL;
GO

DECLARE @var45 sysname;
SELECT @var45 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobApplications]') AND [c].[name] = N'UserId');
IF @var45 IS NOT NULL EXEC(N'ALTER TABLE [JobApplications] DROP CONSTRAINT [' + @var45 + '];');
ALTER TABLE [JobApplications] ALTER COLUMN [UserId] int NULL;
GO

DECLARE @var46 sysname;
SELECT @var46 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobApplications]') AND [c].[name] = N'CandidatePhone');
IF @var46 IS NOT NULL EXEC(N'ALTER TABLE [JobApplications] DROP CONSTRAINT [' + @var46 + '];');
ALTER TABLE [JobApplications] ALTER COLUMN [CandidatePhone] nvarchar(max) NULL;
GO

DECLARE @var47 sysname;
SELECT @var47 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobApplications]') AND [c].[name] = N'CandidateName');
IF @var47 IS NOT NULL EXEC(N'ALTER TABLE [JobApplications] DROP CONSTRAINT [' + @var47 + '];');
ALTER TABLE [JobApplications] ALTER COLUMN [CandidateName] nvarchar(max) NULL;
GO

DECLARE @var48 sysname;
SELECT @var48 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobApplications]') AND [c].[name] = N'CandidateEmail');
IF @var48 IS NOT NULL EXEC(N'ALTER TABLE [JobApplications] DROP CONSTRAINT [' + @var48 + '];');
ALTER TABLE [JobApplications] ALTER COLUMN [CandidateEmail] nvarchar(max) NULL;
GO

DECLARE @var49 sysname;
SELECT @var49 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[JobApplications]') AND [c].[name] = N'CVFilePath');
IF @var49 IS NOT NULL EXEC(N'ALTER TABLE [JobApplications] DROP CONSTRAINT [' + @var49 + '];');
ALTER TABLE [JobApplications] ALTER COLUMN [CVFilePath] nvarchar(max) NULL;
GO

DECLARE @var50 sysname;
SELECT @var50 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'Phone');
IF @var50 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var50 + '];');
ALTER TABLE [Employees] ALTER COLUMN [Phone] nvarchar(max) NULL;
GO

DECLARE @var51 sysname;
SELECT @var51 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'Gender');
IF @var51 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var51 + '];');
ALTER TABLE [Employees] ALTER COLUMN [Gender] nvarchar(max) NULL;
GO

DECLARE @var52 sysname;
SELECT @var52 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'FullName');
IF @var52 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var52 + '];');
ALTER TABLE [Employees] ALTER COLUMN [FullName] nvarchar(max) NULL;
GO

DECLARE @var53 sysname;
SELECT @var53 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'EmployeeCode');
IF @var53 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var53 + '];');
ALTER TABLE [Employees] ALTER COLUMN [EmployeeCode] nvarchar(450) NULL;
GO

DECLARE @var54 sysname;
SELECT @var54 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'Email');
IF @var54 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var54 + '];');
ALTER TABLE [Employees] ALTER COLUMN [Email] nvarchar(max) NULL;
GO

DECLARE @var55 sysname;
SELECT @var55 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Employees]') AND [c].[name] = N'Address');
IF @var55 IS NOT NULL EXEC(N'ALTER TABLE [Employees] DROP CONSTRAINT [' + @var55 + '];');
ALTER TABLE [Employees] ALTER COLUMN [Address] nvarchar(max) NULL;
GO

DECLARE @var56 sysname;
SELECT @var56 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeEmergencyContacts]') AND [c].[name] = N'Relationship');
IF @var56 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeEmergencyContacts] DROP CONSTRAINT [' + @var56 + '];');
ALTER TABLE [EmployeeEmergencyContacts] ALTER COLUMN [Relationship] nvarchar(max) NULL;
GO

DECLARE @var57 sysname;
SELECT @var57 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeEmergencyContacts]') AND [c].[name] = N'Phone');
IF @var57 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeEmergencyContacts] DROP CONSTRAINT [' + @var57 + '];');
ALTER TABLE [EmployeeEmergencyContacts] ALTER COLUMN [Phone] nvarchar(max) NULL;
GO

DECLARE @var58 sysname;
SELECT @var58 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeEmergencyContacts]') AND [c].[name] = N'ContactName');
IF @var58 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeEmergencyContacts] DROP CONSTRAINT [' + @var58 + '];');
ALTER TABLE [EmployeeEmergencyContacts] ALTER COLUMN [ContactName] nvarchar(max) NULL;
GO

DECLARE @var59 sysname;
SELECT @var59 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeEmergencyContacts]') AND [c].[name] = N'Address');
IF @var59 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeEmergencyContacts] DROP CONSTRAINT [' + @var59 + '];');
ALTER TABLE [EmployeeEmergencyContacts] ALTER COLUMN [Address] nvarchar(max) NULL;
GO

DECLARE @var60 sysname;
SELECT @var60 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeDocuments]') AND [c].[name] = N'Title');
IF @var60 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeDocuments] DROP CONSTRAINT [' + @var60 + '];');
ALTER TABLE [EmployeeDocuments] ALTER COLUMN [Title] nvarchar(max) NULL;
GO

DECLARE @var61 sysname;
SELECT @var61 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeDocuments]') AND [c].[name] = N'DocumentType');
IF @var61 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeDocuments] DROP CONSTRAINT [' + @var61 + '];');
ALTER TABLE [EmployeeDocuments] ALTER COLUMN [DocumentType] nvarchar(max) NULL;
GO

DECLARE @var62 sysname;
SELECT @var62 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'WorkLocation');
IF @var62 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var62 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [WorkLocation] nvarchar(max) NULL;
GO

DECLARE @var63 sysname;
SELECT @var63 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'SignedBy');
IF @var63 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var63 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [SignedBy] nvarchar(max) NULL;
GO

DECLARE @var64 sysname;
SELECT @var64 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'JobDescription');
IF @var64 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var64 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [JobDescription] nvarchar(max) NULL;
GO

DECLARE @var65 sysname;
SELECT @var65 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeContracts]') AND [c].[name] = N'ContractNumber');
IF @var65 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeContracts] DROP CONSTRAINT [' + @var65 + '];');
ALTER TABLE [EmployeeContracts] ALTER COLUMN [ContractNumber] nvarchar(max) NULL;
GO

DECLARE @var66 sysname;
SELECT @var66 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeBankAccounts]') AND [c].[name] = N'BankName');
IF @var66 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeBankAccounts] DROP CONSTRAINT [' + @var66 + '];');
ALTER TABLE [EmployeeBankAccounts] ALTER COLUMN [BankName] nvarchar(max) NULL;
GO

DECLARE @var67 sysname;
SELECT @var67 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeBankAccounts]') AND [c].[name] = N'BankBranch');
IF @var67 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeBankAccounts] DROP CONSTRAINT [' + @var67 + '];');
ALTER TABLE [EmployeeBankAccounts] ALTER COLUMN [BankBranch] nvarchar(max) NULL;
GO

DECLARE @var68 sysname;
SELECT @var68 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeBankAccounts]') AND [c].[name] = N'AccountNumber');
IF @var68 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeBankAccounts] DROP CONSTRAINT [' + @var68 + '];');
ALTER TABLE [EmployeeBankAccounts] ALTER COLUMN [AccountNumber] nvarchar(max) NULL;
GO

DECLARE @var69 sysname;
SELECT @var69 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[EmployeeBankAccounts]') AND [c].[name] = N'AccountHolderName');
IF @var69 IS NOT NULL EXEC(N'ALTER TABLE [EmployeeBankAccounts] DROP CONSTRAINT [' + @var69 + '];');
ALTER TABLE [EmployeeBankAccounts] ALTER COLUMN [AccountHolderName] nvarchar(max) NULL;
GO

DECLARE @var70 sysname;
SELECT @var70 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Departments]') AND [c].[name] = N'Description');
IF @var70 IS NOT NULL EXEC(N'ALTER TABLE [Departments] DROP CONSTRAINT [' + @var70 + '];');
ALTER TABLE [Departments] ALTER COLUMN [Description] nvarchar(max) NULL;
GO

DECLARE @var71 sysname;
SELECT @var71 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Departments]') AND [c].[name] = N'DepartmentName');
IF @var71 IS NOT NULL EXEC(N'ALTER TABLE [Departments] DROP CONSTRAINT [' + @var71 + '];');
ALTER TABLE [Departments] ALTER COLUMN [DepartmentName] nvarchar(max) NULL;
GO

DECLARE @var72 sysname;
SELECT @var72 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Departments]') AND [c].[name] = N'DepartmentCode');
IF @var72 IS NOT NULL EXEC(N'ALTER TABLE [Departments] DROP CONSTRAINT [' + @var72 + '];');
ALTER TABLE [Departments] ALTER COLUMN [DepartmentCode] nvarchar(450) NULL;
GO

DECLARE @var73 sysname;
SELECT @var73 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ContractBatches]') AND [c].[name] = N'BatchName');
IF @var73 IS NOT NULL EXEC(N'ALTER TABLE [ContractBatches] DROP CONSTRAINT [' + @var73 + '];');
ALTER TABLE [ContractBatches] ALTER COLUMN [BatchName] nvarchar(max) NULL;
GO

DECLARE @var74 sysname;
SELECT @var74 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CompanyNews]') AND [c].[name] = N'Title');
IF @var74 IS NOT NULL EXEC(N'ALTER TABLE [CompanyNews] DROP CONSTRAINT [' + @var74 + '];');
ALTER TABLE [CompanyNews] ALTER COLUMN [Title] nvarchar(max) NULL;
GO

DECLARE @var75 sysname;
SELECT @var75 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[CompanyNews]') AND [c].[name] = N'Content');
IF @var75 IS NOT NULL EXEC(N'ALTER TABLE [CompanyNews] DROP CONSTRAINT [' + @var75 + '];');
ALTER TABLE [CompanyNews] ALTER COLUMN [Content] nvarchar(max) NULL;
GO

DECLARE @var76 sysname;
SELECT @var76 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditLogs]') AND [c].[name] = N'OldValue');
IF @var76 IS NOT NULL EXEC(N'ALTER TABLE [AuditLogs] DROP CONSTRAINT [' + @var76 + '];');
ALTER TABLE [AuditLogs] ALTER COLUMN [OldValue] nvarchar(max) NULL;
GO

DECLARE @var77 sysname;
SELECT @var77 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditLogs]') AND [c].[name] = N'NewValue');
IF @var77 IS NOT NULL EXEC(N'ALTER TABLE [AuditLogs] DROP CONSTRAINT [' + @var77 + '];');
ALTER TABLE [AuditLogs] ALTER COLUMN [NewValue] nvarchar(max) NULL;
GO

DECLARE @var78 sysname;
SELECT @var78 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditLogs]') AND [c].[name] = N'IpAddress');
IF @var78 IS NOT NULL EXEC(N'ALTER TABLE [AuditLogs] DROP CONSTRAINT [' + @var78 + '];');
ALTER TABLE [AuditLogs] ALTER COLUMN [IpAddress] nvarchar(max) NULL;
GO

DECLARE @var79 sysname;
SELECT @var79 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditLogs]') AND [c].[name] = N'EntityType');
IF @var79 IS NOT NULL EXEC(N'ALTER TABLE [AuditLogs] DROP CONSTRAINT [' + @var79 + '];');
ALTER TABLE [AuditLogs] ALTER COLUMN [EntityType] nvarchar(max) NULL;
GO

DECLARE @var80 sysname;
SELECT @var80 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[AuditLogs]') AND [c].[name] = N'Action');
IF @var80 IS NOT NULL EXEC(N'ALTER TABLE [AuditLogs] DROP CONSTRAINT [' + @var80 + '];');
ALTER TABLE [AuditLogs] ALTER COLUMN [Action] nvarchar(max) NULL;
GO

CREATE TABLE [JobCriteria] (
    [Id] int NOT NULL IDENTITY,
    [JobPostingId] int NOT NULL,
    [MustHaveSkills] nvarchar(max) NULL,
    [NiceToHaveSkills] nvarchar(max) NULL,
    [MinYearsOfExperience] int NULL,
    [OtherRequirements] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_JobCriteria] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_JobCriteria_JobPostings_JobPostingId] FOREIGN KEY ([JobPostingId]) REFERENCES [JobPostings] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [Notifications] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeId] int NOT NULL,
    [Title] nvarchar(max) NULL,
    [Message] nvarchar(max) NULL,
    [Type] nvarchar(max) NULL,
    [Status] nvarchar(max) NULL,
    [RelatedId] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [ReadAt] datetime2 NULL,
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notifications_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE
);
GO

CREATE TABLE [OvertimeRequests] (
    [Id] int NOT NULL IDENTITY,
    [Date] datetime2 NOT NULL,
    [StartTime] time NOT NULL,
    [EndTime] time NOT NULL,
    [Reason] nvarchar(max) NULL,
    [DepartmentId] int NOT NULL,
    [CreatedById] int NOT NULL,
    [Status] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_OvertimeRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OvertimeRequests_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OvertimeRequests_Employees_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [EmployeeOvertimes] (
    [OvertimeRequestId] int NOT NULL,
    [EmployeeId] int NOT NULL,
    CONSTRAINT [PK_EmployeeOvertimes] PRIMARY KEY ([OvertimeRequestId], [EmployeeId]),
    CONSTRAINT [FK_EmployeeOvertimes_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_EmployeeOvertimes_OvertimeRequests_OvertimeRequestId] FOREIGN KEY ([OvertimeRequestId]) REFERENCES [OvertimeRequests] ([Id]) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX [IX_Positions_DepartmentId_PositionCode] ON [Positions] ([DepartmentId], [PositionCode]) WHERE [PositionCode] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Employees_EmployeeCode] ON [Employees] ([EmployeeCode]) WHERE [EmployeeCode] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Departments_OrganizationId_DepartmentCode] ON [Departments] ([OrganizationId], [DepartmentCode]) WHERE [DepartmentCode] IS NOT NULL;
GO

CREATE INDEX [IX_EmployeeOvertimes_EmployeeId] ON [EmployeeOvertimes] ([EmployeeId]);
GO

CREATE UNIQUE INDEX [IX_JobCriteria_JobPostingId] ON [JobCriteria] ([JobPostingId]);
GO

CREATE INDEX [IX_Notifications_EmployeeId] ON [Notifications] ([EmployeeId]);
GO

CREATE INDEX [IX_OvertimeRequests_CreatedById] ON [OvertimeRequests] ([CreatedById]);
GO

CREATE INDEX [IX_OvertimeRequests_DepartmentId] ON [OvertimeRequests] ([DepartmentId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260331164512_AddPayrollAllowances', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [LeaveRequests] ADD [Address] nvarchar(max) NULL;
GO

ALTER TABLE [LeaveRequests] ADD [ApproverSignature] nvarchar(max) NULL;
GO

ALTER TABLE [LeaveRequests] ADD [JobTitle] nvarchar(max) NULL;
GO

ALTER TABLE [LeaveRequests] ADD [Phone] nvarchar(max) NULL;
GO

ALTER TABLE [LeaveRequests] ADD [RequesterSignature] nvarchar(max) NULL;
GO

ALTER TABLE [AttendanceDetails] ADD [UpdatedAt] datetime2 NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260415134410_AddLeaveSignatures', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Employees] ADD [Signature] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260415141531_AddEmployeeSignature', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [LeaveRequests] ADD [AttachmentUrl] nvarchar(max) NULL;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260415161221_AddLeaveAttachment', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [CompanyNews] DROP CONSTRAINT [FK_CompanyNews_Users_AuthorId];
GO

DROP TABLE [JobApplications];
GO

DROP TABLE [JobCriteria];
GO

DROP TABLE [JobPostings];
GO

ALTER TABLE [CompanyNews] ADD CONSTRAINT [FK_CompanyNews_Users_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260415162357_RefinePrecisionAndRemoveRecruitment', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

DROP INDEX [IX_TimeAttendanceRecords_EmployeeId] ON [TimeAttendanceRecords];
GO

CREATE TABLE [OvertimePlans] (
    [Id] int NOT NULL IDENTITY,
    [DepartmentId] int NOT NULL,
    [Month] int NOT NULL,
    [Year] int NOT NULL,
    [TotalBudgetHours] decimal(18,2) NOT NULL,
    [Status] nvarchar(max) NULL,
    [CreatedById] int NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_OvertimePlans] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OvertimePlans_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OvertimePlans_Employees_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION
);
GO

CREATE TABLE [OvertimeAssignments] (
    [Id] int NOT NULL IDENTITY,
    [OvertimePlanId] int NULL,
    [EmployeeId] int NOT NULL,
    [Date] datetime2 NOT NULL,
    [AssignedMaxHours] decimal(18,2) NOT NULL,
    [AssignedById] int NOT NULL,
    [IsNotified] bit NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_OvertimeAssignments] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_OvertimeAssignments_Employees_AssignedById] FOREIGN KEY ([AssignedById]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_OvertimeAssignments_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [Employees] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_OvertimeAssignments_OvertimePlans_OvertimePlanId] FOREIGN KEY ([OvertimePlanId]) REFERENCES [OvertimePlans] ([Id]) ON DELETE SET NULL
);
GO

CREATE INDEX [IX_TimeAttendanceRecords_EmployeeId_Date] ON [TimeAttendanceRecords] ([EmployeeId], [Date]);
GO

CREATE INDEX [IX_OvertimeAssignments_AssignedById] ON [OvertimeAssignments] ([AssignedById]);
GO

CREATE INDEX [IX_OvertimeAssignments_EmployeeId] ON [OvertimeAssignments] ([EmployeeId]);
GO

CREATE INDEX [IX_OvertimeAssignments_OvertimePlanId] ON [OvertimeAssignments] ([OvertimePlanId]);
GO

CREATE INDEX [IX_OvertimePlans_CreatedById] ON [OvertimePlans] ([CreatedById]);
GO

CREATE INDEX [IX_OvertimePlans_DepartmentId] ON [OvertimePlans] ([DepartmentId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260416112327_AddOvertimeManagement', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

CREATE TABLE [ShiftSwapRequests] (
    [Id] int NOT NULL IDENTITY,
    [EmployeeAId] int NOT NULL,
    [EmployeeBId] int NOT NULL,
    [DateA] datetime2 NOT NULL,
    [ShiftAId] int NOT NULL,
    [DateB] datetime2 NOT NULL,
    [ShiftBId] int NOT NULL,
    [Reason] nvarchar(max) NULL,
    [PhoneNumber] nvarchar(max) NULL,
    [Address] nvarchar(max) NULL,
    [Status] int NOT NULL,
    [SignatureA] nvarchar(max) NULL,
    [SignedAtA] datetime2 NULL,
    [SignatureB] nvarchar(max) NULL,
    [SignedAtB] datetime2 NULL,
    [ManagerId] int NULL,
    [SignatureManager] nvarchar(max) NULL,
    [SignedAtManager] datetime2 NULL,
    [HRId] int NULL,
    [SignatureHR] nvarchar(max) NULL,
    [SignedAtHR] datetime2 NULL,
    [RejectReason] nvarchar(max) NULL,
    [PdfUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL,
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_ShiftSwapRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ShiftSwapRequests_Employees_EmployeeAId] FOREIGN KEY ([EmployeeAId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftSwapRequests_Employees_EmployeeBId] FOREIGN KEY ([EmployeeBId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftSwapRequests_Employees_HRId] FOREIGN KEY ([HRId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftSwapRequests_Employees_ManagerId] FOREIGN KEY ([ManagerId]) REFERENCES [Employees] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftSwapRequests_WorkShifts_ShiftAId] FOREIGN KEY ([ShiftAId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_ShiftSwapRequests_WorkShifts_ShiftBId] FOREIGN KEY ([ShiftBId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION
);
GO

CREATE INDEX [IX_ShiftSwapRequests_EmployeeAId] ON [ShiftSwapRequests] ([EmployeeAId]);
GO

CREATE INDEX [IX_ShiftSwapRequests_EmployeeBId] ON [ShiftSwapRequests] ([EmployeeBId]);
GO

CREATE INDEX [IX_ShiftSwapRequests_HRId] ON [ShiftSwapRequests] ([HRId]);
GO

CREATE INDEX [IX_ShiftSwapRequests_ManagerId] ON [ShiftSwapRequests] ([ManagerId]);
GO

CREATE INDEX [IX_ShiftSwapRequests_ShiftAId] ON [ShiftSwapRequests] ([ShiftAId]);
GO

CREATE INDEX [IX_ShiftSwapRequests_ShiftBId] ON [ShiftSwapRequests] ([ShiftBId]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260417154335_AddShiftSwapModule', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ShiftSwapRequests] DROP CONSTRAINT [FK_ShiftSwapRequests_WorkShifts_ShiftAId];
GO

ALTER TABLE [ShiftSwapRequests] DROP CONSTRAINT [FK_ShiftSwapRequests_WorkShifts_ShiftBId];
GO

DROP INDEX [IX_ShiftSwapRequests_ShiftAId] ON [ShiftSwapRequests];
GO

DROP INDEX [IX_ShiftSwapRequests_ShiftBId] ON [ShiftSwapRequests];
GO

DECLARE @var81 sysname;
SELECT @var81 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ShiftSwapRequests]') AND [c].[name] = N'ShiftAId');
IF @var81 IS NOT NULL EXEC(N'ALTER TABLE [ShiftSwapRequests] DROP CONSTRAINT [' + @var81 + '];');
ALTER TABLE [ShiftSwapRequests] DROP COLUMN [ShiftAId];
GO

DECLARE @var82 sysname;
SELECT @var82 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[ShiftSwapRequests]') AND [c].[name] = N'ShiftBId');
IF @var82 IS NOT NULL EXEC(N'ALTER TABLE [ShiftSwapRequests] DROP CONSTRAINT [' + @var82 + '];');
ALTER TABLE [ShiftSwapRequests] DROP COLUMN [ShiftBId];
GO

EXEC sp_rename N'[ShiftSwapRequests].[DateB]', N'StartDate', N'COLUMN';
GO

EXEC sp_rename N'[ShiftSwapRequests].[DateA]', N'EndDate', N'COLUMN';
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260418022727_UpdateShiftSwapToDateRange', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [ShiftSwapRequests] ADD [TargetShiftId] int NULL;
GO

CREATE INDEX [IX_ShiftSwapRequests_TargetShiftId] ON [ShiftSwapRequests] ([TargetShiftId]);
GO

ALTER TABLE [ShiftSwapRequests] ADD CONSTRAINT [FK_ShiftSwapRequests_WorkShifts_TargetShiftId] FOREIGN KEY ([TargetShiftId]) REFERENCES [WorkShifts] ([Id]) ON DELETE NO ACTION;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260418030504_UpdateShiftSwapTargetShift', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Positions] DROP CONSTRAINT [FK_Positions_Departments_DepartmentId];
GO

DROP INDEX [IX_Positions_DepartmentId_PositionCode] ON [Positions];
GO

DECLARE @var83 sysname;
SELECT @var83 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Positions]') AND [c].[name] = N'DepartmentId');
IF @var83 IS NOT NULL EXEC(N'ALTER TABLE [Positions] DROP CONSTRAINT [' + @var83 + '];');
ALTER TABLE [Positions] ALTER COLUMN [DepartmentId] int NULL;
GO

ALTER TABLE [Positions] ADD [DefaultCoefficient] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [HousingAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [MealAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [PayrollRecords] ADD [MealDeduction] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Employees] ADD [Coefficient] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [AttendanceSummaries] ADD [PaidLeaveDays] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [AttendanceSummaries] ADD [UnpaidLeaveDays] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

CREATE UNIQUE INDEX [IX_Positions_DepartmentId_PositionCode] ON [Positions] ([DepartmentId], [PositionCode]) WHERE [DepartmentId] IS NOT NULL AND [PositionCode] IS NOT NULL;
GO

ALTER TABLE [Positions] ADD CONSTRAINT [FK_Positions_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]);
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260423134729_AddAccountantFields', N'8.0.0');
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

ALTER TABLE [Positions] ADD [DefaultHousingAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Positions] ADD [DefaultMealAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Positions] ADD [DefaultPetrolAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

ALTER TABLE [Positions] ADD [DefaultPhoneAllowance] decimal(18,2) NOT NULL DEFAULT 0.0;
GO

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260423145947_AddPositionAllowances', N'8.0.0');
GO

COMMIT;
GO

