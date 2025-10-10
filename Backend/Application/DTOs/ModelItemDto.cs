namespace ECAD_Backend.Application.DTOs;

public sealed class ModelItemDto
{
    public required Guid Id { get; init; }
    public required string Name { get; init; }
    public required string Format { get; init; }
    public long? SizeBytes { get; init; }
    public required Uri Url { get; init; }
    public DateTimeOffset? CreatedOn { get; init; }
}