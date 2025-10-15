namespace ECAD_Backend.Application.DTOs;

public class UpdateModelDetailsRequest
{
    public string? NewAlias { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
}