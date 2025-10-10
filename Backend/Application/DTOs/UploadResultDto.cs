namespace ECAD_Backend.Application.DTOs;

public sealed class UploadResultDto
{
    public required string Message { get; init; }
    public required string Alias { get; init; }
    public required string BlobName { get; init; }
}