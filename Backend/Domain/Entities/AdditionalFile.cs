namespace ECAD_Backend.Domain.Entities;

public class AdditionalFile
{
    public required string Name { get; init; }
    public required Uri Url { get; init; }
    public long? SizeBytes { get; init; }
    public DateTimeOffset? CreatedOn { get; init; }
    public string? ContentType { get; init; }
}