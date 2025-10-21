namespace ECAD_Backend.Application.DTOs;

public class ModelFilter
{
    // e.g. /api/model?category=chair
    public string? Category { get; init; }

    // e.g. /api/model?isFavourite=true
    public bool? IsFavourite { get; init; }

    // e.g. /api/model?format=glb  (you already limit to .glb/.gltf, but kept for completeness)
    public string? Format { get; init; } // "glb" or "gltf"

    // case-insensitive contains against Name/Alias/Description/Category
    // e.g. /api/model?q=oak
    public string? Q { get; init; }

    // Optional date filters (UTC)
    // e.g. /api/model?createdAfter=2025-01-01T00:00:00Z
    public DateTimeOffset? CreatedAfter { get; init; }
    public DateTimeOffset? CreatedBefore { get; init; }

    // Optional path prefix to narrow scanning by folder
    // e.g. /api/model?prefix=furniture/
    public string? Prefix { get; init; }
}