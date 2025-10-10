namespace ECAD_Backend.Application.DTOs;

public sealed class UploadModelRequest
{
    public required Stream Content { get; init; }
    public required string OriginalFileName { get; init; }
    public required string Alias {get; init; }
}