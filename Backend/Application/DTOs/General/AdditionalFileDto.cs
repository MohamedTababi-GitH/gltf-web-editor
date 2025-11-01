namespace ECAD_Backend.Application.DTOs.General;

/// <summary>
/// Represents a data transfer object for additional file information.
/// </summary>
public sealed class AdditionalFileDto
{
    /// <summary>
    /// Gets the name of the file.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the URL where the file can be accessed.
    /// </summary>
    public required Uri Url { get; init; }

    /// <summary>
    /// Gets the size of the file in bytes.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the creation date and time of the file.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    /// <summary>
    /// Gets the MIME content type of the file.
    /// </summary>
    public string? ContentType { get; init; }
}