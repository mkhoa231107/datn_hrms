using System.Text.Json.Serialization;
using HRMS.Application.Interfaces;
using HRMS.Application.Mappings;
using HRMS.Infrastructure.Data;
using HRMS.Infrastructure.Services;
using HRMS.API.Middleware;
using HRMS.API.Authorization;
using HRMS.API.Workers;
using HRMS.API.Hubs;
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
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        b => b.MigrationsAssembly("HRMS.Infrastructure"));
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.SqlServerEventId.SavepointsDisabledBecauseOfMARS));
});

// ========================================
// AUTOMAPPER CONFIGURATION
// ========================================
builder.Services.AddAutoMapper(typeof(MappingProfile));

// ========================================
// JWT AUTHENTICATION CONFIGURATION
// ========================================
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["SecretKey"] ?? "vBN6pQ8rX2t5v8y/B?E(G+KbPeShVmYq"; 

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
        ClockSkew = TimeSpan.Zero 
    };
    // SignalR needs token from query string because WS can't send headers
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
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
builder.Services.AddScoped<IShiftSwapRequestService, ShiftSwapRequestService>();



// ========================================
// BACKGROUND WORKERS
// ========================================
builder.Services.AddHostedService<ContractStatusWorker>();
builder.Services.AddHostedService<ShiftRestoreWorker>();

// ========================================
// SIGNALR
// ========================================
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// ========================================
// CORS CONFIGURATION
// ========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("https://hrms.io.vn", "http://localhost:5173", "http://localhost:5174") 
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
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
// DATABASE INITIALIZATION & SEEDING
// ========================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<HRMSDbContext>();
        context.Database.Migrate(); // Auto-migration if needed
        await DbInitializer.InitializeAsync(context);
        Console.WriteLine("✅ Database initialized and seeded successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"❌ An error occurred while seeding the database: {ex.Message}");
    }
}

// ========================================
// MIDDLEWARE PIPELINE
// ========================================

app.UseCors("AllowAll");
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Luôn bật Swagger để bạn dễ test trên Host
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "HRMS API v1");
    c.RoutePrefix = "swagger"; 
});

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.UseMiddleware<AuditLogMiddleware>();

app.MapControllers();
app.MapHub<HrmsHub>("/hubs/hrms");

app.Run();