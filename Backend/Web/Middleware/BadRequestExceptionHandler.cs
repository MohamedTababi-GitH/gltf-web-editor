using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ECAD_Backend.Exceptions;

namespace ECAD_Backend.Middleware
{
    /// <summary>
    /// Handles <see cref="BadRequestException"/> errors thrown during API execution.
    /// </summary>
    internal sealed class BadRequestExceptionHandler : IExceptionHandler
    {
        private readonly ILogger<BadRequestExceptionHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="BadRequestExceptionHandler"/> class.
        /// </summary>
        /// <param name="logger">The logger used to record bad request exceptions.</param>
        public BadRequestExceptionHandler(ILogger<BadRequestExceptionHandler> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Attempts to handle the exception and generate an HTTP response for <see cref="BadRequestException"/>.
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
            // Only handle BadRequestException
            if (exception is not BadRequestException badRequestException)
                return false;

            _logger.LogWarning(badRequestException, "Bad request: {Message}", badRequestException.Message);

            var problem = new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Bad Request",
                Detail = badRequestException.Message
            };

            httpContext.Response.StatusCode = problem.Status.Value;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

            return true;
        }
    }
}
