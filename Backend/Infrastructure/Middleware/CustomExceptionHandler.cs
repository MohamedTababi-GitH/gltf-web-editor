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
    internal abstract class BaseExceptionHandler<TException>(ILogger logger, int statusCode, string title)
        : IExceptionHandler
        where TException : Exception
    {
        public async ValueTask<bool> TryHandleAsync(
            HttpContext httpContext,
            Exception exception,
            CancellationToken cancellationToken)
        {
            if (exception is not TException typedException)
                return false;

            logger.LogWarning(typedException, "{Title}: {Message}", title, typedException.Message);

            var problem = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = typedException.Message
            };

            httpContext.Response.StatusCode = statusCode;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);

            return true;
        }
    }
}