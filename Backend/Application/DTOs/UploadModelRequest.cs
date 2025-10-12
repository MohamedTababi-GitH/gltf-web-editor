namespace ECAD_Backend.Application.DTOs;

/// <summary>
/// Data Transfer Object (DTO) representing an upload request for a 3D model.
/// Used by the application service layer to process incoming files.
/// </summary>
public sealed class UploadModelRequest
{
    /// <summary>
    /// File content as a stream.
    /// This stream should point to the binary contents of the model file.
    /// </summary>
    public required Stream Content { get; init; }

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
}