namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents the result of a model details update operation.
/// </summary>
public sealed class UpdateDetailsResultDto
{
    /// <summary>
    /// Gets the status message describing the result of the update operation.
    /// </summary>
    public required string Message { get; init; }
}