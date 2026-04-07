using HRMS.Domain.Entities;
using HRMS.Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HRMS.API.Middleware
{
    /// <summary>
    /// Audit logging middleware - Automatically logs POST/PUT/DELETE requests
    /// Captures: User, Action, EntityType, Request/Response data, IP Address
    /// </summary>
    public class AuditLogMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuditLogMiddleware> _logger;

        public AuditLogMiddleware(RequestDelegate next, ILogger<AuditLogMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context, IServiceProvider serviceProvider)
        {
            // Only log POST/PUT/DELETE requests (state-changing operations)
            var shouldLog = context.Request.Method == "POST" ||
                            context.Request.Method == "PUT" ||
                            context.Request.Method == "DELETE";

            if (!shouldLog)
            {
                await _next(context);
                return;
            }

            // Skip audit logging for auth endpoints (sensitive data and unauthenticated access)
            if (context.Request.Path.StartsWithSegments("/api/auth"))
            {
                await _next(context);
                return;
            }

            // Capture request body
            var requestBody = await GetRequestBodyAsync(context.Request);

            // Execute the request and capture response
            var originalResponseBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            try
            {
                await _next(context);

                // Capture response body if status is 200-299 (success)
                var responseBodyText = string.Empty;
                if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
                {
                    responseBody.Seek(0, SeekOrigin.Begin);
                    responseBodyText = await new StreamReader(responseBody).ReadToEndAsync();
                    responseBody.Seek(0, SeekOrigin.Begin);
                }

                // Ensure we copy the full response regardless of status code
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalResponseBodyStream);

                // Log to database (fire and forget - don't wait)
                var scopeFactory = serviceProvider.GetRequiredService<IServiceScopeFactory>();
                
                // Extract UserID here while context is alive
                string? userIdStr = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                int? userId = null;
                if (int.TryParse(userIdStr, out var parsedId)) userId = parsedId;

                var ip = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
                var method = context.Request.Method;
                var path = context.Request.Path;

                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = scopeFactory.CreateScope();
                        var dbContext = scope.ServiceProvider.GetRequiredService<HRMSDbContext>();
                        await LogToDatabaseInternal(userId, ip, method, path, dbContext, requestBody, responseBodyText);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to write audit log to database in background");
                    }
                });
            }
            finally
            {
                if (context.Response.Body != originalResponseBodyStream)
                {
                    context.Response.Body = originalResponseBodyStream;
                }
            }
        }

        private async Task<string> GetRequestBodyAsync(HttpRequest request)
        {
            request.EnableBuffering();
            using var reader = new StreamReader(request.Body, encoding: Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            request.Body.Position = 0;
            return body;
        }

        private async Task LogToDatabaseInternal(
            int? userId,
            string ipAddress,
            string method,
            PathString pathString,
            HRMSDbContext dbContext,
            string requestBody,
            string responseBody)
        {
            // Extract entity type and ID from path
            var path = pathString.Value ?? "";
            var pathSegments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
            var entityType = pathSegments.Length > 1 ? pathSegments[1] : "Unknown";
            
            int? entityId = null;
            if (pathSegments.Length > 2 && int.TryParse(pathSegments[2], out var parsedEntityId))
            {
                entityId = parsedEntityId;
            }

            // Build action description
            var action = $"{method} {pathString}";

            // Create audit log entry
            var auditLog = new AuditLog
            {
                UserId = userId,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                OldValue = method == "PUT" || method == "DELETE" ? "N/A" : "",
                NewValue = requestBody ?? "",
                IpAddress = ipAddress,
                CreatedAt = DateTime.UtcNow
            };

            dbContext.AuditLogs.Add(auditLog);
            await dbContext.SaveChangesAsync();
        }
    }
}
