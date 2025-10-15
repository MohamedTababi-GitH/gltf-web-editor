namespace ECAD_Backend.Application.DTOs;

/// <summary>
/// Data Transfer Object (DTO) representing a stored model file.
/// Used for returning model metadata from the service layer to the API.
/// </summary>
public sealed class ModelItemDto
{
    /// Unique identifier of the model file (GUID).
    public required Guid Id { get; init; }

    /// Display name or alias of the model.
    public required string Name { get; init; }

    /// File format of the model (e.g., "glb" or "gltf").
    public required string Format { get; init; }

    /// Size of the file in bytes, if known.
    public long? SizeBytes { get; init; }

    /// Public URL where the model file can be accessed.
    public required Uri Url { get; init; }

    /// Timestamp (UTC) when the model was created in storage, if available.
    public DateTimeOffset? CreatedOn { get; init; }

    public string? Category { get; init; }
    public string? Description { get; init; }
    public List<AdditionalFileDto>? AdditionalFiles { get; init; }
}