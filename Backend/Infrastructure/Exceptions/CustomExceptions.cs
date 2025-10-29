namespace ECAD_Backend.Infrastructure.Exceptions
{
    public sealed class BadRequestException(string message) : Exception(message);

    public sealed class NotFoundException(string message) : Exception(message);

    public sealed class ValidationException(string message) : Exception(message);
}
