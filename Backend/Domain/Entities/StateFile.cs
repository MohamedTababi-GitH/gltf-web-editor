namespace ECAD_Backend.Domain.Entities;

public class StateFile
{
    public string Version { get; init; } = default!;
    public string Name { get; init; } = default!;
    public Uri Url { get; init; } = default!;
    public long? SizeBytes { get; init; }
    public DateTimeOffset? CreatedOn { get; init; }
    public string? ContentType { get; init; }
}