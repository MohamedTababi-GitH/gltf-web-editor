namespace ECAD_Backend.Domain.Entities;

/// <summary>
/// Represents a model file stored in the system.
/// </summary>
public class ModelFile
{
    /// <summary>
    /// Gets the unique identifier for the model file.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the name of the model file.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the file format or extension of the model file.
    /// </summary>
    public required string Format { get; init; }

    /// <summary>
    /// Gets the size of the model file in bytes, if known.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the URI where the model file is stored.
    /// </summary>
    public required Uri Url { get; init; }

    /// <summary>
    /// Gets the date and time when the model file was created, if available.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    public List<string>? Categories { get; set; }
    public string? Description { get; init; }

    public string? AssetId { get; init; }
    
    public bool IsFavourite { get; init; }
    public bool IsNew { get; init; }
    public List<AdditionalFile>? AdditionalFiles { get; init; }
}