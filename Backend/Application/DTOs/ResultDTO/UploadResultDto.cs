namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents the result of an upload operation, containing details about the uploaded content.
/// </summary>
public sealed class UploadResultDto
{
    /// <summary>
    /// Gets the message describing the result of the upload.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Gets the alias associated with the uploaded content.
    /// </summary>
    public required string Alias { get; init; }

    /// <summary>
    /// Gets the name of the blob where the content is stored.
    /// </summary>
    public required string BlobName { get; init; }
}