namespace ECAD_Backend.Application.DTOs.ResultDTO;

public sealed class DeleteBaselineResultDto
{
    public required string Message { get; init; }
    public required string AssetId { get; init; }
}