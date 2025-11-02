namespace ECAD_Backend.Application.DTOs.Forms;

/// <summary>
/// Represents a form request for saving state information.
/// The assetId is provided through the route, not through this form.
/// </summary>
public class SaveStateFormDto
{
    /// <summary>
    /// Gets or sets the state information as a raw JSON string.
    /// This is one of two possible ways to provide the state (Option 1).
    /// </summary>
    public string? StateJson { get; set; }

    /// <summary>
    /// Gets or sets the state information as an uploaded file.
    /// This is one of two possible ways to provide the state (Option 2).
    /// </summary>
    public IFormFile? StateFile { get; set; }

    /// <summary>
    /// Gets or sets the optional version label for the state (e.g., "v3").
    /// </summary>
    public string? TargetVersion { get; set; }
}