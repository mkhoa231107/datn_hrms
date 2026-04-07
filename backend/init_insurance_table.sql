USE [HRMS_DATN]
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[EmployeeInsurances]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[EmployeeInsurances] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [EmployeeId] int NOT NULL,
        [IsSocialEnabled] bit NOT NULL DEFAULT 0,
        [IsHealthEnabled] bit NOT NULL DEFAULT 0,
        [IsUnemploymentEnabled] bit NOT NULL DEFAULT 0,
        [IsHealthcareEnabled] bit NOT NULL DEFAULT 0,
        [HealthcareAmount] decimal(18,2) NOT NULL DEFAULT 0,
        [IsLifeInsuranceEnabled] bit NOT NULL DEFAULT 0,
        [LifeInsuranceAmount] decimal(18,2) NOT NULL DEFAULT 0,
        [AdditionalInsuranceAmount] decimal(18,2) NOT NULL DEFAULT 0,
        [Note] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT (GETUTCDATE()),
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_EmployeeInsurances] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmployeeInsurances_Employees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [dbo].[Employees] ([Id]) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX [IX_EmployeeInsurances_EmployeeId] ON [dbo].[EmployeeInsurances] ([EmployeeId]);
END
GO
