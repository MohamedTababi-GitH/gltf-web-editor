namespace ECAD_Backend.Application.DTOs.RequestDTO;

public class UpdateModelRequest
{
    // required: tells us WHICH asset folder we're updating
    public string AssetId { get; set; } = default!;

    // optional but future-proof: later introduce versions,
    // frontend can start sending "v2", "v3", etc.
    public string? TargetVersion { get; set; }

    // same idea as create:
    // list of incoming files to upload
    public List<(string FileName, Stream Content)> Files { get; set; } = default!;

    // Optional metadata updates. Choose to apply these only
    // if they are provided.
    public string? Alias { get; set; }
    public List<string>? Categories { get; set; }
    public string? Description { get; set; }

    // optional, but nice: which file is the "entry" after this update?
    // lets caller say "scene_optimized.glb is now the main file"
    public string? NewEntryFileName { get; set; }
}