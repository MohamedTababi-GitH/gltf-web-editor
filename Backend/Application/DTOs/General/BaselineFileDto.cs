namespace ECAD_Backend.Application.DTOs.General;

public sealed class BaselineFileDto
{
    public string Name { get; set; } = "baseline.json";
    public Uri Url { get; set; } = default!;
    public long? SizeBytes { get; set; }
    public DateTimeOffset? CreatedOn { get; set; }
    public string? ContentType { get; set; }
}