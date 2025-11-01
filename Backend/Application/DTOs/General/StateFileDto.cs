namespace ECAD_Backend.Application.DTOs.General;

public class StateFileDto
{
    public string Version { get; set; } = default!;
    public string Name { get; set; } = default!;
    public Uri Url { get; set; } = default!;
    public long? SizeBytes { get; set; }
    public DateTimeOffset? CreatedOn { get; set; }
    public string? ContentType { get; set; }
}