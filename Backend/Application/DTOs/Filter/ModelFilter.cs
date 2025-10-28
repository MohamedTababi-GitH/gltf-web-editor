namespace ECAD_Backend.Application.DTOs.Filter;

public sealed class ModelFilter
{
    public List<string>? Categories { get; set; }

    // e.g. /api/model?isFavourite=true
    public bool? IsFavourite { get; init; }

    // e.g. /api/model?format=glb  (you already limit to .glb/.gltf, but kept for completeness)
    public string? Format { get; init; } // "glb" or "gltf"

    // case-insensitive contains against Name/Alias/Description/Category
    // e.g. /api/model?q=oak
    public string? Q { get; init; }
    
    // Optional path prefix to narrow scanning by folder
    // e.g. /api/model?prefix=furniture/
    public string? Prefix { get; init; }
}