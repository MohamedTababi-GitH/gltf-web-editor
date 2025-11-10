namespace ECAD_Backend.Application.DTOs.Forms;

/// <summary>
/// Represents the multipart form data used to upload a new 3D model,
/// including its associated files, metadata, and an optional baseline state.
/// </summary>
public sealed class UploadModelForm
{
    /// <summary>
    /// Gets or sets the list of uploaded files that make up the model package.
    /// The first (or main) file must be a <c>.glb</c> or <c>.gltf</c> file,
    /// while accompanying files (e.g., <c>.bin</c>, textures) are optional.
    /// </summary>
    public List<IFormFile> Files { get; set; } = new();

    /// <summary>
    /// Gets or sets the display name or alias for the model.
    /// This is shown in listings and must consist of letters, numbers, or underscores.
    /// </summary>
    public string FileAlias { get; set; } = default!;

    /// <summary>
    /// Gets or sets the original file name of the main model file
    /// (e.g., <c>SimpleModel.glb</c>). Used to identify the entry point
    /// in the upload request.
    /// </summary>
    public string OriginalFileName { get; set; } = default!;

    /// <summary>
    /// Gets or sets the list of categories to associate with the model.
    /// This field is optional and can be used for filtering and organization.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets or sets an optional free-text description of the model.
    /// Used to provide context or author information in metadata.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the optional baseline state for the model,
    /// expressed as a JSON string. This defines the default or
    /// reference state used for comparisons in the viewer.
    /// </summary>
    public string? BaselineJson { get; set; }
}