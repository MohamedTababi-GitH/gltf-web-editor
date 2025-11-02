namespace ECAD_Backend.Application.DTOs.Filter;

/// <summary>
/// Represents a filter for model queries.
/// </summary>
public sealed class ModelFilterDto
{
    /// <summary>
    /// Gets or sets the list of categories to filter by.
    /// </summary>
    public List<string>? Categories { get; set; }

    /// <summary>
    /// Gets a value indicating whether to filter for new models.
    /// </summary>
    /// <example>/api/model?isNew=true</example>
    public bool? IsNew { get; init; }

    /// <summary>
    /// Gets a value indicating whether to filter for favourite models.
    /// </summary>
    /// <example>/api/model?isFavourite=true</example>
    public bool? IsFavourite { get; init; }

    /// <summary>
    /// Gets the format to filter models by. Valid values are "glb" or "gltf".
    /// </summary>
    /// <example>/api/model?format=glb</example>
    public string? Format { get; init; }

    /// <summary>
    /// Gets the search query string. Performs a case-insensitive search against Name, Alias, Description, and Category.
    /// </summary>
    /// <example>/api/model?q=oak</example>
    public string? Q { get; init; }

    /// <summary>
    /// Gets the optional path prefix to narrow scanning by folder.
    /// </summary>
    /// <example>/api/model?prefix=furniture/</example>
    public string? Prefix { get; init; }
}