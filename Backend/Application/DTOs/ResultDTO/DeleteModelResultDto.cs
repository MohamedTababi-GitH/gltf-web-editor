namespace ECAD_Backend.Application.DTOs.ResultDTO;

/// <summary>
/// Represents the result returned after a model has been successfully deleted.
/// </summary>
/// <remarks>
/// This DTO is used to communicate a confirmation message back to the client
/// indicating that the delete operation completed successfully.
/// </remarks>
public sealed class DeleteModelResultDto
{
    /// <summary>
    /// Gets the message confirming that the model was deleted successfully.
    /// </summary>
    /// <example>Model 'b3e1c7e5-2c8f-45a2-b58b-d69ff0a9d4c5' was deleted successfully.</example>
    public required string Message { get; init; }
}