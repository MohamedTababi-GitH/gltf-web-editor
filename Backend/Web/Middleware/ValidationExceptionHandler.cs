using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ECAD_Backend.Exceptions;

namespace ECAD_Backend.Middleware
{
    internal sealed class ValidationExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<ValidationExceptionHandler> _logger;

        public ValidationExceptionHandler(ILogger<ValidationExceptionHandler> logger)
        {
            _logger = logger;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            if (exception is not ValidationException validationEx)
                return false;

            _logger.LogWarning(validationEx, "Validation failed: {Message}", validationEx.Message);

            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity, // 422 for validation errors
                Title = "Validation Error",
                Detail = validationEx.Message
            };

            httpContext.Response.StatusCode = problem.Status.Value;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }
    }
}
