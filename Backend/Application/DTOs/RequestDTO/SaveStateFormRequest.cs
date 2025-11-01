namespace ECAD_Backend.Application.DTOs.RequestDTO;

public class SaveStateFormRequest
{
    // assetId will still come from route, not from form
    // so no property for that here

    // Option 1: raw JSON string
    public string? StateJson { get; set; }

    // Option 2: uploaded file
    public IFormFile? StateFile { get; set; }

    // optional version label like "v3"
    public string? TargetVersion { get; set; }
}