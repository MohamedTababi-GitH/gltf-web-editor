namespace ECAD_Backend.Application.DTOs;

public class UpdateModelDetailsRequest
{
    public required string? NewAlias { get; init; }
    public required string? Category { get; init; }
    public required string? Description { get; init; }
    public required bool? IsFavourite { get; init; }  // null if no change , true/false to set
}