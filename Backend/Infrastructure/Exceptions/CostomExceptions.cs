namespace ECAD_Backend.Exceptions
{
    public sealed class BadRequestException : Exception
    {
        public BadRequestException(string message) : base(message) { }
    }

    public sealed class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }

    public sealed class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }
}
