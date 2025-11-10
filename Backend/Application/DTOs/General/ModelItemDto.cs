namespace ECAD_Backend.Application.DTOs.General;

/// <summary>
/// Data Transfer Object (DTO) representing a stored model file.
/// Used for returning model metadata from the service layer to the API.
/// </summary>
public sealed class ModelItemDto
{
    /// <summary>
    /// Gets the unique identifier of the model file (GUID).
    /// </summary>
    public required Guid Id { get; init; }

    /// <summary>
    /// Gets the display name or alias of the model.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Gets the file format of the model (e.g., "glb" or "gltf").
    /// </summary>
    public required string Format { get; init; }

    /// <summary>
    /// Gets the size of the file in bytes.
    /// </summary>
    public long? SizeBytes { get; init; }

    /// <summary>
    /// Gets the public URL where the model file can be accessed.
    /// </summary>
    public required Uri Url { get; init; }

    /// <summary>
    /// Gets the timestamp (UTC) when the model was created in storage, if available.
    /// </summary>
    public DateTimeOffset? CreatedOn { get; init; }

    /// <summary>
    /// Gets the asset identifier associated with the model.
    /// </summary>
    public string? AssetId { get; init; }

    /// <summary>
    /// Gets or sets the list of categories associated with the model.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets the description of the model.
    /// </summary>
    public string? Description { get; init; }

    /// <summary>
    /// Gets a value indicating whether the model is marked as favorite.
    /// </summary>
    public bool IsFavourite { get; init; }

    /// <summary>
    /// Gets a value indicating whether the model is marked as new.
    /// </summary>
    public bool IsNew { get; init; }

    /// <summary>
    /// Gets the list of additional files associated with the model.
    /// </summary>
    public List<AdditionalFileDto>? AdditionalFiles { get; init; }

    /// <summary>
    /// Gets the collection of saved state snapshots for this model.
    /// Each state represents a versioned configuration of the model.
    /// </summary>
    public List<StateFileDto>? StateFiles { get; init; }

    /// <summary>
    /// Gets or sets the baseline file associated with this model.
    /// The baseline represents the reference or default configuration used for comparison.
    /// </summary>
    public BaselineFileDto? Baseline { get; set; }
}