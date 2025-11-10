namespace ECAD_Backend.Application.DTOs.RequestDTO;

/// <summary>
/// Represents an internal request object used by the service layer
/// to handle the upload of a 3D model and its associated files.
/// </summary>
/// <remarks>
/// This DTO is typically constructed by the controller after parsing
/// multipart form data (<see cref="UploadModelForm"/>) and passed into
/// the application service for processing and storage.
/// </remarks>
public sealed class UploadModelRequestDto
{
    /// <summary>
    /// Gets the collection of files included in the upload request.
    /// For <c>.glb</c> models, this usually contains a single file.
    /// For <c>.gltf</c> models, it can include a main <c>.gltf</c> file
    /// along with companion <c>.bin</c> and texture files.
    /// </summary>
    public required IReadOnlyList<(string FileName, Stream Content)> Files { get; init; }

    /// <summary>
    /// Gets the original file name provided by the client
    /// (for example, <c>scene.gltf</c> or <c>model.glb</c>).
    /// This is used to infer the model format and determine the storage blob name.
    /// </summary>
    public required string OriginalFileName { get; init; }

    /// <summary>
    /// Gets the human-readable alias for the model, as specified by the user.
    /// This alias is subject to validation rules (letters, numbers, and underscores only)
    /// and appears in the UI and metadata listings.
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Gets or sets the list of categories assigned to the model.
    /// Categories are optional and can be used to group or filter models.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets the optional free-text description of the model.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the optional JSON string representing the model’s baseline configuration.
    /// If provided, it is stored as <c>baseline/baseline.json</c> alongside the model files.
    /// </summary>
    public string? BaselineJson { get; init; }
}