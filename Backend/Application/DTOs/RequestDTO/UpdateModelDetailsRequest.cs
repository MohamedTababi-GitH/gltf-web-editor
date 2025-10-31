namespace ECAD_Backend.Application.DTOs.RequestDTO;

public class UpdateModelDetailsRequest
{
    public string? NewAlias { get; init; }
    public List<string>? Categories { get; set; }
    public string? Description { get; init; }
    public bool? IsFavourite { get; init; }  // null if no change , true/false to set
    public bool? IsNew { get; init; } // true/false to set
}