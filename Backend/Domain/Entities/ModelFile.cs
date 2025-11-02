namespace ECAD_Backend.Domain.Entities;

/// <summary>
/// Represents a primary 3D model file stored in the system,
/// along with its metadata, related assets, and state files.
/// </summary>
public class ModelFile
{
    /// <summary>
    /// Gets the unique identifier for the model file.
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the display name of the model file.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the file format or extension (for example, ".glb" or ".gltf").
    /// </summary>
    public required string Format { get; init; }

    /// <summary>
    /// Gets the size of the model file in bytes, if known.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the storage URI where the model file can be accessed.
    /// </summary>
    public required Uri Url { get; init; }

    /// <summary>
    /// Gets the timestamp indicating when the model file was created, if available.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    /// <summary>
    /// Gets or sets the list of categories associated with the model.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets the description or notes about the model.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets the logical asset identifier grouping the model and its related files.
    /// </summary>
    public string? AssetId { get; init; }

    /// <summary>
    /// Gets a value indicating whether the model is marked as a favourite.
    /// </summary>
    public bool IsFavourite { get; init; }

    /// <summary>
    /// Gets a value indicating whether the model is recently uploaded or newly added.
    /// </summary>
    public bool IsNew { get; init; }

    /// <summary>
    /// Gets the collection of additional files related to this model
    /// (for example, textures or binary buffer files).
    /// </summary>
    public List<AdditionalFile>? AdditionalFiles { get; init; }

    /// <summary>
    /// Gets the collection of saved state files associated with this model.
    /// </summary>
    public List<StateFile>? StateFiles { get; init; }
}