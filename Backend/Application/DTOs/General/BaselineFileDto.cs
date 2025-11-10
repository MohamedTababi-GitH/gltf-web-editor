namespace ECAD_Backend.Application.DTOs.General;

/// <summary>
/// Represents the baseline file associated with a model.
/// The baseline defines the reference or initial state of a 3D model
/// used for comparison, versioning, or reset operations.
/// </summary>
public sealed class BaselineFileDto
{
    /// <summary>
    /// Gets or sets the name of the baseline file.
    /// Defaults to <c>baseline.json</c>.
    /// </summary>
    public string Name { get; set; } = "baseline.json";

    /// <summary>
    /// Gets or sets the publicly accessible URI for downloading the baseline file.
    /// </summary>
    public Uri Url { get; set; } = default!;

    /// <summary>
    /// Gets or sets the size of the baseline file in bytes, if available.
    /// </summary>
    public long? SizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when the baseline file was created or last uploaded.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; set; }

    /// <summary>
    /// Gets or sets the MIME content type of the baseline file.
    /// Typically <c>application/json</c>.
    /// </summary>
    public string? ContentType { get; set; }
}