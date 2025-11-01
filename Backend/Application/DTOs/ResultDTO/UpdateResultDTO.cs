namespace ECAD_Backend.Application.DTOs.ResultDTO;

public class UpdateResultDto
{
    public string Message { get; set; } = default!;
    public string AssetId { get; set; } = default!;
    public string? Version { get; set; }
    public string? BlobName { get; set; } // path to saved state.json if we want to return it
}