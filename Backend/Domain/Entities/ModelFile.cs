namespace ECAD_Backend.Domain.Entities;

public class ModelFile
{
    public required string Name { get; init; } 
    public required string Format { get; init; } 
    public long? SizeBytes { get; init; } 
    public required Uri Url { get; init; }
    public DateTimeOffset? CreatedOn { get; init; }
}