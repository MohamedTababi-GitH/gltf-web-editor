namespace ECAD_Backend.Application.DTOs.RequestDTO;

/// <summary>
/// Represents a request to update the details of a model.
/// </summary>
public class UpdateModelDetailsRequestDto
{
    /// <summary>
    /// Gets the new alias (name) to be assigned to the model.
    /// </summary>
    public required string? NewAlias { get; init; }

    /// <summary>
    /// Gets or sets the list of categories to be associated with the model.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets the new description to be assigned to the model.
    /// </summary>
    public required string? Description { get; init; }

    /// <summary>
    /// Gets the favorite status to be set for the model.
    /// Null indicates no change, true/false to set the status explicitly.
    /// </summary>
    public required bool? IsFavourite { get; init; }
}