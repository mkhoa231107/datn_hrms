using System.Text.Json.Serialization;
using HRMS.Application.Interfaces;
using HRMS.Application.Mappings;
using HRMS.Infrastructure.Data;
using HRMS.Infrastructure.Services;
using HRMS.API.Middleware;
using HRMS.API.Authorization;
using HRMS.API.Workers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add HttpClient for external requests (Proxy)
builder.Services.AddHttpClient();

// ========================================
// DATABASE CONFIGURATION
// ========================================
builder.Services.AddDbContext<HRMSDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("HRMS.Infrastructure")));

// ========================================
// AUTOMAPPER CONFIGURATION
// ========================================
builder.Services.AddAutoMapper(typeof(MappingProfile));

// ========================================
// JWT AUTHENTICATION CONFIGURATION
// ========================================
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? "vBN6pQ8rX2t5v8y/B?E(G+KbPeShVmYq"; // Ensure fallback

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "HRMS_API",
        ValidAudience = jwtSettings["Audience"] ?? "HRMS_Client",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero // Remove default 5 minute clock skew
    };
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("DepartmentScope", policy => policy.Requirements.Add(new DepartmentScopeRequirement()));
});

builder.Services.AddScoped<IAuthorizationHandler, DepartmentScopeHandler>();

// DEPENDENCY INJECTION - SERVICE LAYER
// ========================================
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<IJobService, JobService>();
builder.Services.AddScoped<IEmployeeService, EmployeeService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<IWorkShiftService, WorkShiftService>();
builder.Services.AddScoped<IWorkScheduleService, WorkScheduleService>();
builder.Services.AddScoped<IAttendanceService, AttendanceService>();
builder.Services.AddScoped<ILeaveService, LeaveService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IPayrollService, PayrollService>();
builder.Services.AddScoped<IPositionService, PositionService>();
builder.Services.AddScoped<IInsuranceService, InsuranceService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IShiftChangeRequestService, ShiftChangeRequestService>();

// Recruitment Services
builder.Services.AddScoped<HRMS.Application.Interfaces.Recruitment.IJobPostingService, HRMS.Infrastructure.Services.Recruitment.JobPostingService>();
builder.Services.AddScoped<HRMS.Application.Interfaces.Recruitment.IJobApplicationService, HRMS.Infrastructure.Services.Recruitment.JobApplicationService>();
builder.Services.AddScoped<HRMS.Application.Interfaces.Recruitment.IJobCriteriaService, HRMS.Infrastructure.Services.Recruitment.JobCriteriaService>();
builder.Services.AddScoped<HRMS.Application.Interfaces.Recruitment.IAICvScreeningService, HRMS.Infrastructure.Services.Recruitment.AICvScreeningService>();
builder.Services.AddScoped<HRMS.Application.Interfaces.Recruitment.ICompanyNewsService, HRMS.Infrastructure.Services.Recruitment.CompanyNewsService>();

// ========================================
// BACKGROUND WORKERS
// ========================================
builder.Services.AddHostedService<ContractStatusWorker>();

// ========================================
// CORS CONFIGURATION
// ========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// ========================================
// API CONTROLLERS & SWAGGER
// ========================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "HRMS API",
        Version = "v1",
        Description = "Human Resource Management System API"
    });

    // Configure JWT in Swagger
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] { }
        }
    });
});

var app = builder.Build();

// ========================================
// MIDDLEWARE PIPELINE
// ========================================

// 1. CORS (MUST BE FIRST TO APPLY HEADERS TO ALL RESPONSES INCLUDING ERRORS)
app.UseCors("AllowAll");

// 2. GLOBAL EXCEPTION HANDLING (Second, so CORS headers are already set)
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "HRMS API v1");
        c.RoutePrefix = "swagger"; // Set Swagger UI at /swagger
    });
}

app.UseHttpsRedirection();

// Serve static files (uploaded employee photos, etc.)
app.UseStaticFiles();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Audit logging (after authentication so we can capture user info)
app.UseMiddleware<AuditLogMiddleware>();

app.MapControllers();

// ========================================
// DATABASE MIGRATION & SEEDING
// ========================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        // Self-heal Step 1: Ensure critical table columns exist BEFORE EF Core initializes Context metadata
        // We use direct ADO.NET to avoid EF model validation issues while schema is out of sync
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        var ensureColumnsSql = @"
            -- OvertimeRequests Table (Refactor check using sys.columns for maximum reliability)
            IF OBJECT_ID('[OvertimeRequests]') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[OvertimeRequests]') AND name = 'EmployeeId')
                    ALTER TABLE [OvertimeRequests] ADD [EmployeeId] int NOT NULL DEFAULT 0;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[OvertimeRequests]') AND name = 'Note')
                    ALTER TABLE [OvertimeRequests] ADD [Note] nvarchar(max) NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[OvertimeRequests]') AND name = 'ApprovedById')
                    ALTER TABLE [OvertimeRequests] ADD [ApprovedById] int NULL;
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[OvertimeRequests]') AND name = 'ApprovedAt')
                    ALTER TABLE [OvertimeRequests] ADD [ApprovedAt] datetime2 NULL;
            END

            -- Employees Table
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'Status')
                ALTER TABLE [Employees] ADD [Status] int NOT NULL DEFAULT 1;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'FaceDescriptor')
                ALTER TABLE [Employees] ADD [FaceDescriptor] nvarchar(max) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'NumberOfDependents')
                ALTER TABLE [Employees] ADD [NumberOfDependents] int NOT NULL DEFAULT 0;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'InsuranceSalary')
                ALTER TABLE [Employees] ADD [InsuranceSalary] decimal(18,2) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'PlaceOfOrigin')
                ALTER TABLE [Employees] ADD [PlaceOfOrigin] nvarchar(max) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'PlaceOfBirth')
                ALTER TABLE [Employees] ADD [PlaceOfBirth] nvarchar(max) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'BasicSalary')
                ALTER TABLE [Employees] ADD [BasicSalary] decimal(18,2) NOT NULL DEFAULT 0;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Employees]') AND name = 'ShiftId')
                ALTER TABLE [Employees] ADD [ShiftId] int NULL CONSTRAINT FK_Employees_ShiftId_WorkShifts FOREIGN KEY REFERENCES [WorkShifts](Id);

            -- Seed sample data for PlaceOfBirth and PlaceOfOrigin if they are empty
            EXEC(N'UPDATE [Employees] SET [PlaceOfBirth] = N''Hà Nội'' WHERE [PlaceOfBirth] IS NULL');
            EXEC(N'UPDATE [Employees] SET [PlaceOfOrigin] = N''Hà Nội, Việt Nam'' WHERE [PlaceOfOrigin] IS NULL');

            -- Synchronize existing Active contracts data to Employees table
            EXEC(N'
                UPDATE E
                SET 
                    E.[BasicSalary] = C.[BasicSalary],
                    E.[ShiftId] = C.[ShiftId]
                FROM [Employees] E
                INNER JOIN [EmployeeContracts] C ON E.[Id] = C.[EmployeeId]
                WHERE C.[Status] = 2 -- ContractStatus.Active
            ');

            -- EmployeeContracts Table
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'Status')
                ALTER TABLE [EmployeeContracts] ADD [Status] int NOT NULL DEFAULT 0;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'MealAllowance')
                ALTER TABLE [EmployeeContracts] ADD [MealAllowance] decimal(18,2) NOT NULL DEFAULT 730000;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'PhoneAllowance')
                ALTER TABLE [EmployeeContracts] ADD [PhoneAllowance] decimal(18,2) NOT NULL DEFAULT 300000;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'PetrolAllowance')
                ALTER TABLE [EmployeeContracts] ADD [PetrolAllowance] decimal(18,2) NOT NULL DEFAULT 600000;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'HousingAllowance')
                ALTER TABLE [EmployeeContracts] ADD [HousingAllowance] decimal(18,2) NOT NULL DEFAULT 700000;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'HrApprovedById')
                ALTER TABLE [EmployeeContracts] ADD [HrApprovedById] int NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'DeptHeadApprovedById')
                ALTER TABLE [EmployeeContracts] ADD [DeptHeadApprovedById] int NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'AdminApprovedById')
                ALTER TABLE [EmployeeContracts] ADD [AdminApprovedById] int NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'ShiftId')
                ALTER TABLE [EmployeeContracts] ADD [ShiftId] int NULL CONSTRAINT FK_EmployeeContracts_ShiftId_WorkShifts FOREIGN KEY REFERENCES [WorkShifts](Id);

            -- ShiftChangeRequests Table
            IF OBJECT_ID('[ShiftChangeRequests]') IS NULL
            BEGIN
                CREATE TABLE [ShiftChangeRequests] (
                    [Id]               INT          PRIMARY KEY IDENTITY,
                    [EmployeeId]       INT          NOT NULL REFERENCES [Employees](Id),
                    [RequestedShiftId] INT          NOT NULL REFERENCES [WorkShifts](Id),
                    [CurrentShiftId]   INT          NULL     REFERENCES [WorkShifts](Id),
                    [StartDate]        DATE         NOT NULL,
                    [EndDate]          DATE         NOT NULL,
                    [Reason]           NVARCHAR(MAX) NULL,
                    [Status]           INT          NOT NULL DEFAULT 0,
                    [ApproverId]       INT          NULL     REFERENCES [Employees](Id),
                    [ApprovedAt]       DATETIME2    NULL,
                    [RejectReason]     NVARCHAR(500) NULL,
                    [CreatedAt]        DATETIME2    NOT NULL DEFAULT GETUTCDATE(),
                    [UpdatedAt]        DATETIME2    NULL
                );
            END

            -- AttendanceSummary Approval
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[AttendanceSummaries]') AND name = 'Status')
                ALTER TABLE [AttendanceSummaries] ADD [Status] int NOT NULL DEFAULT 1;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[AttendanceSummaries]') AND name = 'ApprovedById')
                ALTER TABLE [AttendanceSummaries] ADD [ApprovedById] int NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[AttendanceSummaries]') AND name = 'ApprovedAt')
                ALTER TABLE [AttendanceSummaries] ADD [ApprovedAt] datetime2 NULL;

            -- New Table for Attendance Details (Simplified)
            IF OBJECT_ID('[AttendanceDetails]') IS NULL
            BEGIN
                CREATE TABLE [AttendanceDetails] (
                    [Id] int PRIMARY KEY IDENTITY,
                    [EmployeeId] int NOT NULL,
                    [Date] datetime2 NOT NULL,
                    [WorkShiftId] int NULL,
                    [WorkingHours] decimal(18,2) NOT NULL,
                    [OTHours] decimal(18,2) NOT NULL,
                    [Status] nvarchar(max) NOT NULL,
                    [CreatedAt] datetime2 NOT NULL
                );
            END

            -- Ensure JobApplications.UserId is nullable
            IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'JobApplications' AND COLUMN_NAME = 'UserId' AND IS_NULLABLE = 'NO')
            BEGIN
                ALTER TABLE JobApplications ALTER COLUMN UserId INT NULL;
            END

            -- Positions Table Default Salaries
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'BaseSalaryMin')
                ALTER TABLE [Positions] ADD [BaseSalaryMin] decimal(18,2) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'BaseSalaryMax')
                ALTER TABLE [Positions] ADD [BaseSalaryMax] decimal(18,2) NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Positions]') AND name = 'DefaultShiftId')
                ALTER TABLE [Positions] ADD [DefaultShiftId] int NULL CONSTRAINT FK_Positions_DefaultShiftId_WorkShifts FOREIGN KEY REFERENCES [WorkShifts](Id);

            -- EmployeeContracts Target Fields
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'TargetDepartmentId')
                ALTER TABLE [EmployeeContracts] ADD [TargetDepartmentId] int NULL;
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[EmployeeContracts]') AND name = 'TargetPositionId')
                ALTER TABLE [EmployeeContracts] ADD [TargetPositionId] int NULL;
        ";

        using (var connection = new Microsoft.Data.SqlClient.SqlConnection(connectionString))
        {
            await connection.OpenAsync();
            using (var command = new Microsoft.Data.SqlClient.SqlCommand(ensureColumnsSql, connection))
            {
                await command.ExecuteNonQueryAsync();
            }
        }
        Console.WriteLine("✅ Database schema self-heal applied.");

        try 
        {
            Console.WriteLine("🔄 Starting database initialization...");
            var context = services.GetRequiredService<HRMSDbContext>();

            // Self-heal Step 2: Apply migrations
            context.Database.Migrate();
            Console.WriteLine("✅ Migrations applied successfully.");

            Console.WriteLine("🌱 Starting data seeding...");
            await DbInitializer.InitializeAsync(context); // Seed data
            Console.WriteLine("✅ Database initialized successfully.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ DATABASE INITIALIZATION FAILED: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "❌ An error occurred while migrating or seeding the database.");
        Console.WriteLine($"❌ SEEDING ERROR: {ex.Message}");
        Console.WriteLine($"Stack Trace: {ex.StackTrace}");
        if (ex.InnerException != null)
        {
            Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
        }
    }
}

app.Run();
