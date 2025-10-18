using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ECAD_Backend.Exceptions;

namespace ECAD_Backend.Middleware
{
    /// <summary>
    /// Handles <see cref="NotFoundException"/> errors thrown during API execution.
    /// </summary>
    internal sealed class NotFoundExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<NotFoundExceptionHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="NotFoundExceptionHandler"/> class.
        /// </summary>
        /// <param name="logger">The logger used to record not found exceptions.</param>
        public NotFoundExceptionHandler(ILogger<NotFoundExceptionHandler> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Attempts to handle the exception and generate an HTTP response for <see cref="NotFoundException"/>.
        /// </summary>
        /// <param name="httpContext">The current HTTP context.</param>
        /// <param name="exception">The thrown exception instance.</param>
        /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
        /// <returns><c>true</c> if the exception was handled; otherwise, <c>false</c>.</returns>
        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            // Only handle NotFoundException
            if (exception is not NotFoundException notFoundException)
                return false;

            _logger.LogWarning(notFoundException, "Not found: {Message}", notFoundException.Message);

            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Not Found",
                Detail = notFoundException.Message
            };

            httpContext.Response.StatusCode = problem.Status.Value;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

            return true;
        }
    }
}
