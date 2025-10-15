namespace ECAD_Backend.Application.DTOs;

public sealed class AdditionalFileDto
{
    public required string Name { get; init; }
    public required Uri Url { get; init; }
    public long? SizeBytes { get; init; }
    public string? ContentType { get; init; }
}