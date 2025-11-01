namespace ECAD_Backend.Application.DTOs.General;

/// <summary>
/// Represents a data transfer object for state file information.
/// </summary>
public class StateFileDto
{
    /// <summary>
    /// Gets or sets the version of the state file.
    /// </summary>
    public string Version { get; set; } = default!;

    /// <summary>
    /// Gets or sets the name of the state file.
    /// </summary>
    public string Name { get; set; } = default!;

    /// <summary>
    /// Gets or sets the URL where the state file can be accessed.
    /// </summary>
    public Uri Url { get; set; } = default!;

    /// <summary>
    /// Gets or sets the size of the state file in bytes.
    /// </summary>
    public long? SizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the creation date and time of the state file.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; set; }

    /// <summary>
    /// Gets or sets the MIME content type of the state file.
    /// </summary>
    public string? ContentType { get; set; }
}