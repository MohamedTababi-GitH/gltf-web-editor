using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Web.Middleware
{
    /// <summary>
    /// Global fallback exception handler for unhandled or unexpected errors.
    /// </summary>
    internal sealed class GlobalExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<GlobalExceptionHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="GlobalExceptionHandler"/> class.
        /// </summary>
        /// <param name="logger">The logger used to record server-side exceptions.</param>
        public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Handles unhandled exceptions and returns a standardized 500 Internal Server Error response.
        /// </summary>
        /// <param name="httpContext">The current HTTP context.</param>
        /// <param name="exception">The thrown exception instance.</param>
        /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
        /// <returns><c>true</c> to indicate the exception was handled.</returns>
        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            _logger.LogError(exception, "Unhandled exception occurred: {Message}", exception.Message);

            var problemDetails = new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "Internal Server Error",
                Detail = "An unexpected error occurred while processing your request."
            };

            httpContext.Response.StatusCode = problemDetails.Status.Value;
            await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

            return true;
        }
    }
}
