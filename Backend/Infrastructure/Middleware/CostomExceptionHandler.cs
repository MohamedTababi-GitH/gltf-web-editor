using ECAD_Backend.Infrastructure.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Infrastructure.Middleware
{
    internal sealed class BadRequestExceptionHandler(ILogger<BadRequestExceptionHandler> logger)
        : BaseExceptionHandler<BadRequestException>(logger, StatusCodes.Status400BadRequest, "Bad Request");

    internal sealed class NotFoundExceptionHandler(ILogger<NotFoundExceptionHandler> logger)
        : BaseExceptionHandler<NotFoundException>(logger, StatusCodes.Status404NotFound, "Not Found");

    internal sealed class ValidationExceptionHandler(ILogger<ValidationExceptionHandler> logger)
        : BaseExceptionHandler<ValidationException>(logger, StatusCodes.Status422UnprocessableEntity,
            "Validation Error");

    /// <summary>
    /// Base handler to reduce repetition for all specific exception handlers.
    /// </summary>
    internal abstract class BaseExceptionHandler<TException> : IExceptionHandler where TException : Exception
    {
        private readonly ILogger _logger;
        private readonly int _statusCode;
        private readonly string _title;

        protected BaseExceptionHandler(ILogger logger, int statusCode, string title)
        {
            _logger = logger;
            _statusCode = statusCode;
            _title = title;
        }

        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            if (exception is not TException typedException)
                return false;

            _logger.LogWarning(typedException, "{Title}: {Message}", _title, typedException.Message);

            var problem = new ProblemDetails
            {
                Status = _statusCode,
                Title = _title,
                Detail = typedException.Message
            };

            httpContext.Response.StatusCode = _statusCode;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

            return true;
        }
    }
}