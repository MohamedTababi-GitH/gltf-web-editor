namespace ECAD_Backend.Application.DTOs.RequestDTO;

public class UpdateStateRequest
{
    // The existing blob folder we’re saving state for
    public string AssetId { get; set; } = default!;

    // Future-proof: optional logical version, maps to {assetId}/state/{TargetVersion}/state.json
    // If null or empty, we just use {assetId}/state/state.json
    public string? TargetVersion { get; set; }

    // The actual state JSON payload from frontend.
    // Frontend can either POST it as a form field or upload a tiny .json file;
    // we'll normalize it into this string.
    public string StateJson { get; set; } = default!;
}