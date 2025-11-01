namespace ECAD_Backend.Application.DTOs.ResultDTO;

public class UpdateResultDto
{
    public string Message { get; set; } = default!;
    public string AssetId { get; set; } = default!;
    public string? Version { get; set; }
    public string? BlobName { get; set; } // new main entry blob path if we updated it
}