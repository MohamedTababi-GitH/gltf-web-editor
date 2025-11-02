namespace ECAD_Backend.Domain.Entities;

/// <summary>
/// Represents an auxiliary file associated with a 3D model asset,
/// such as textures, binary buffers, or other related resources.
/// </summary>
public class AdditionalFile
{
    /// <summary>
    /// Gets the name of the file (including extension).
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the accessible URI of the file in storage.
    /// </summary>
    public required Uri Url { get; init; }

    /// <summary>
    /// Gets the file size in bytes, if available.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the creation timestamp of the file, if known.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    /// <summary>
    /// Gets the MIME content type of the file (e.g., "image/png").
    /// </summary>
    public string? ContentType { get; init; }
}