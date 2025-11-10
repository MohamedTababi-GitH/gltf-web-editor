namespace ECAD_Backend.Application.DTOs.ResultDTO;

public sealed class UpdateBaselineResultDto
{
    public required string Message { get; init; }
    public required string AssetId { get; init; }
    public required string BlobName { get; init; }
}