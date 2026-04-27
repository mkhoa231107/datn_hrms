using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace HRMS.API.Authorization
{
    public class DepartmentScopeRequirement : IAuthorizationRequirement { }

    public class DepartmentScopeHandler : AuthorizationHandler<DepartmentScopeRequirement>
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DepartmentScopeHandler(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, DepartmentScopeRequirement requirement)
        {
            // Admins bypass
            if (context.User.IsInRole("Admin") || context.User.IsInRole("HrAdmin") || context.User.IsInRole("CnbSpecialist"))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }

            // Must be DepartmentManager or DepartmentHead
            if (!context.User.IsInRole("DepartmentManager") && !context.User.IsInRole("DepartmentHead"))
            {
                return Task.CompletedTask;
            }

            var deptIdClaim = context.User.FindFirst("DepartmentId")?.Value;
            if (string.IsNullOrEmpty(deptIdClaim))
            {
                return Task.CompletedTask;
            }

            var routeData = _httpContextAccessor.HttpContext?.GetRouteData();
            if (routeData != null && routeData.Values.TryGetValue("departmentId", out var deptIdObj))
            {
                if (deptIdObj?.ToString() == deptIdClaim)
                {
                    context.Succeed(requirement);
                }
            }
            else
            {
                 context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
