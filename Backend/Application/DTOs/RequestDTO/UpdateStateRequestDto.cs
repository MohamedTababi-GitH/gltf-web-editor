namespace ECAD_Backend.Application.DTOs.RequestDTO;

/// <summary>
/// Represents a request to update the state information for a model.
/// </summary>
public class UpdateStateRequestDto
{
    /// <summary>
    /// Gets or sets the asset identifier representing the existing blob folder where the state will be saved.
    /// </summary>
    public string AssetId { get; set; } = default!;

    /// <summary>
    /// Gets or sets the logical version for the state file.
    /// When specified, the state will be saved to {assetId}/state/{TargetVersion}/state.json.
    /// When null or empty, the state will be saved to {assetId}/state/state.json.
    /// </summary>
    public string? TargetVersion { get; set; }

    /// <summary>
    /// Gets or sets the state data as a JSON string.
    /// This can be provided either as a form field or as an uploaded JSON file,
    /// which will be normalized into this string property.
    /// </summary>
    public string StateJson { get; set; } = default!;
}