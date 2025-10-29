namespace ECAD_Backend.Application.DTOs.RequestDTO;

public class UpdateModelDetailsRequest
{
    public required string? NewAlias { get; init; }
    public List<string>? Categories { get; set; }
    public required string? Description { get; init; }
    public required bool? IsFavourite { get; init; }  // null if no change , true/false to set
}