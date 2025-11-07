namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents the result of a state update operation for an asset.
/// </summary>
public sealed class UpdateStateResultDto
{
    /// <summary>
    /// Gets or sets the status message describing the result of the state update operation.
    /// </summary>
    public string Message { get; set; } = default!;

    /// <summary>
    /// Gets or sets the identifier of the asset whose state was updated.
    /// </summary>
    public string AssetId { get; set; } = default!;

    /// <summary>
    /// Gets or sets the version identifier of the state update.
    /// </summary>
    public string? Version { get; set; }

    /// <summary>
    /// Gets or sets the name of the blob where the state data was stored.
    /// </summary>
    public string? BlobName { get; set; }
}