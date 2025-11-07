namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents the result returned after a state version has been successfully deleted.
/// </summary>
/// <remarks>
/// This DTO provides details about the deleted state version, including the related asset ID,
/// version identifier, and the number of deleted blob objects.
/// </remarks>
public sealed class DeleteStateVersionResultDto
{
    /// <summary>
    /// Gets or sets a confirmation message indicating that the state version was deleted successfully.
    /// </summary>
    public string Message { get; set; } = "Deleted.";

    /// <summary>
    /// Gets or sets the unique identifier of the asset associated with the deleted state version.
    /// </summary>
    /// <example>c9b1a07a-8e5f-4e7b-aac8-3c2d09b3d812</example>
    public string AssetId { get; set; } = default!;

    /// <summary>
    /// Gets or sets the version identifier of the deleted state.
    /// </summary>
    /// <example>v1.3.2</example>
    public string Version { get; set; } = default!;

    /// <summary>
    /// Gets or sets the number of blob objects that were deleted as part of the operation.
    /// </summary>
    /// <example>1</example>
    public int DeletedBlobs { get; set; }
}