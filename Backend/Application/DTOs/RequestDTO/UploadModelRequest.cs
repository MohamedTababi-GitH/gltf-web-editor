namespace ECAD_Backend.Application.DTOs.RequestDTO;

/// <summary>
/// Data Transfer Object (DTO) representing an upload request for a 3D model.
/// Used by the application service layer to process incoming files.
/// </summary>
public sealed class UploadModelRequest
{
    /// <summary>
    /// All files to upload. For .glb this is typically just one file.
    /// For .gltf this may include .gltf (entry), .bin and textures.
    /// </summary>
    public required IReadOnlyList<(string FileName, Stream Content)> Files { get; init; }

    /// <summary>
    /// The original file name provided by the client (e.g., "scene.gltf" or "model.glb").
    /// Used for determining file extension and generating the storage blob name.
    /// </summary>
    public required string OriginalFileName { get; init; }

    /// <summary>
    /// A human-readable alias for the model, supplied by the client.
    /// Must conform to validation rules (e.g., alphanumeric and underscores only).
    /// </summary>
    public required string Alias { get; init; }

    public List<string>? Categories { get; set; }
    public string? Description { get; init; }
}