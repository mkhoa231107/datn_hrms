using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace HRMS.API.Middleware
{
    /// <summary>
    /// Global exception handling middleware
    /// Catches all unhandled exceptions and returns standardized JSON error responses
    /// </summary>
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                var fullMessage = ex.Message;
                var currentEx = ex;
                var level = 0;
                var logReport = new StringBuilder();
                
                while (currentEx != null)
                {
                    var indent = new string(' ', level * 2);
                    logReport.AppendLine($"{indent}Level {level}: {currentEx.GetType().Name}");
                    logReport.AppendLine($"{indent}Message: {currentEx.Message}");
                    logReport.AppendLine($"{indent}Stack: {currentEx.StackTrace}");
                    logReport.AppendLine();
                    
                    if (currentEx.InnerException != null)
                    {
                        fullMessage += $" | INNER: {currentEx.InnerException.Message}";
                    }
                    currentEx = currentEx.InnerException;
                    level++;
                }

                try {
                    System.IO.File.WriteAllText("error_latest.txt", logReport.ToString());
                } catch { }

                _logger.LogError(ex, "GLOBAL ERROR: {Message}", fullMessage);
                await HandleExceptionAsync(context, ex);
            }
        }
        
        private async Task<string> GetInnerExceptions(Exception ex)
        {
            var sb = new StringBuilder();
            var current = ex;
            while (current != null)
            {
                sb.AppendLine("Type: " + current.GetType().FullName);
                sb.AppendLine("Message: " + current.Message);
                sb.AppendLine("Stack Trace: " + current.StackTrace);
                sb.AppendLine("-----------------------");
                current = current.InnerException;
            }
            return sb.ToString();
        }

        private Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var statusCode = HttpStatusCode.InternalServerError;
            var message = "An unexpected error occurred";
            var details = exception.Message;

            // Customize response based on exception type
            switch (exception)
            {
                case UnauthorizedAccessException:
                    statusCode = HttpStatusCode.Unauthorized;
                    message = "Unauthorized access";
                    break;
                case InvalidOperationException:
                    statusCode = HttpStatusCode.BadRequest;
                    message = "Invalid operation";
                    break;
                case ArgumentException:
                    statusCode = HttpStatusCode.BadRequest;
                    message = "Invalid argument";
                    break;
                default:
                    // Keep default values
                    break;
            }

            var response = new
            {
                success = false,
                message = exception.Message, // Use the real exception message as the primary message
                details = message, // Put the category (e.g. "Invalid operation") in details
                statusCode = (int)statusCode
            };

            var json = JsonSerializer.Serialize(response);
            
            if (context.Response.HasStarted)
            {
                _logger.LogWarning("The response has already started, the error handler will not be able to write properly.");
                return Task.CompletedTask;
            }

            // Ensure CORS headers are present even in case of error
            // This is critical when UseCors middleware is bypassed or fails
            try
            {
                var origin = context.Request.Headers.Origin.FirstOrDefault();
                if (string.IsNullOrEmpty(origin)) origin = "*";
                
                context.Response.Headers.AccessControlAllowOrigin = origin;
                context.Response.Headers.AccessControlAllowCredentials = "true";
                context.Response.Headers.AccessControlAllowHeaders = "*";
                context.Response.Headers.AccessControlAllowMethods = "*";
            }
            catch (Exception corsEx)
            {
                _logger.LogWarning(corsEx, "Failed to set CORS headers in ExceptionHandler");
            }

            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)statusCode;

            return context.Response.WriteAsync(json);
        }
    }
}
