namespace ECAD_Backend.Domain.Entities;

/// <summary>
/// Represents a saved state snapshot associated with a 3D model,
/// typically containing serialized editor or runtime configuration data.
/// </summary>
public class StateFile
{
    /// <summary>
    /// Gets the version label or identifier of the saved state (for example, "v1" or "latest").
    /// </summary>
    public string Version { get; init; } = default!;

    /// <summary>
    /// Gets the name of the state file.
    /// </summary>
    public string Name { get; init; } = default!;

    /// <summary>
    /// Gets the storage URI where the state file is located.
    /// </summary>
    public Uri Url { get; init; } = default!;

    /// <summary>
    /// Gets the file size in bytes, if available.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the timestamp indicating when the state file was created, if available.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    /// <summary>
    /// Gets the MIME content type of the state file (for example, "application/json").
    /// </summary>
    public string? ContentType { get; init; }
}