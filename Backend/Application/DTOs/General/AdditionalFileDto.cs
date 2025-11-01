namespace ECAD_Backend.Application.DTOs.General;

public sealed class AdditionalFileDto
{
    public required string Name { get; init; }
    public required Uri Url { get; init; }
    public long? SizeBytes { get; init; }
    
    public DateTimeOffset? CreatedOn { get; init; }
    public string? ContentType { get; init; }
}