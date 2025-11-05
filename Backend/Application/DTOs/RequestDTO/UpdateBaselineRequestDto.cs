namespace ECAD_Backend.Application.DTOs.RequestDTO;

public sealed class UpdateBaselineRequestDto
{
    public required string AssetId { get; init; }
    public required string BaselineJson { get; init; }
}