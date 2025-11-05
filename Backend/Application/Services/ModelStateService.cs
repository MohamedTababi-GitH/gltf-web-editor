using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for saving and versioning editor or runtime state associated with 3D models.
/// Responsible for validating, storing, and tagging JSON-based state snapshots in model storage.
/// 
/// This service does not handle model file uploads or metadata updates —
/// those are managed by <see cref="IModelUploadService"/> and <see cref="IModelService"/> respectively.
/// </summary>
public class ModelStateService(IModelStorage storage) : IModelStateService
{
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

    /// <summary>
    /// Saves editor state (scene configuration, transforms, annotations, etc.) as JSON under the model's asset folder.
    /// </summary>
    /// <param name="requestDto">
    /// The request containing:
    /// <list type="bullet">
    /// <item><description><c>AssetId</c> – the blob folder for this model (the storage identity)</description></item>
    /// <item><description><c>StateJson</c> – the state payload as JSON text</description></item>
    /// <item><description><c>TargetVersion</c> (optional) – if provided, the state is saved as a named snapshot/version</description></item>
    /// </list>
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UpdateStateResultDto"/> containing:
    /// <list type="bullet">
    /// <item><description><c>Message</c> – human-readable status</description></item>
    /// <item><description><c>AssetId</c> – the asset folder the state was written to</description></item>
    /// <item><description><c>Version</c> – the version label used (if any)</description></item>
    /// <item><description><c>BlobName</c> – the blob path where the state was stored</description></item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// Storage layout:
    /// <list type="bullet">
    /// <item><description>
    /// If <c>TargetVersion</c> is <c>null</c> or empty, the state is written (and overwritten) at:
    /// <c>{assetId}/state/state.json</c>.  
    /// This represents the "latest working copy".
    /// </description></item>
    /// <item><description>
    /// If <c>TargetVersion</c> is provided (e.g. "v3"), the state is written to:
    /// <c>{assetId}/state/{TargetVersion}/state.json</c>.  
    /// This acts as an immutable-ish snapshot / checkpoint / named version.
    /// </description></item>
    /// </list>
    ///
    /// Each state blob is tagged with metadata such as:
    /// <c>UploadedAtUtc</c>, <c>assetId</c>, <c>isStateFile=true</c>, and (for snapshots) <c>stateVersion</c>.
    ///
    /// The service validates:
    /// <list type="number">
    /// <item><description>That <c>AssetId</c> is present</description></item>
    /// <item><description>That <c>StateJson</c> is syntactically valid JSON</description></item>
    /// <item><description>That the payload size is within reasonable limits (~1MB)</description></item>
    /// </list>
    /// </remarks>
    /// <exception cref="BadRequestException">
    /// Thrown if the request is missing or malformed.
    /// </exception>
    /// <exception cref="ValidationException">
    /// Thrown if <c>AssetId</c> is missing, <c>StateJson</c> is missing, <c>StateJson</c> is not valid JSON,
    /// or the state exceeds size limits.
    /// </exception>
    public async Task<UpdateStateResultDto> SaveStateAsync(
        UpdateStateRequestDto requestDto,
        CancellationToken cancellationToken)
    {
        if (requestDto is null)
            throw new BadRequestException("The state update requestDto is empty.");

        if (string.IsNullOrWhiteSpace(requestDto.AssetId))
            throw new ValidationException("AssetId is required.");

        if (string.IsNullOrWhiteSpace(requestDto.StateJson))
            throw new ValidationException("StateJson is required.");

        // Enforce valid JSON
        try
        {
            System.Text.Json.JsonDocument.Parse(requestDto.StateJson);
        }
        catch (System.Text.Json.JsonException)
        {
            throw new ValidationException("StateJson must be valid JSON.");
        }

        // 2. Enforce size ceiling (defense-in-depth in case controller attr changes)
        var jsonBytes = System.Text.Encoding.UTF8.GetBytes(requestDto.StateJson);
        if (jsonBytes.Length > 1_000_000) // 1 MB
            throw new ValidationException("StateJson is too large.");

        var basePrefix = string.IsNullOrWhiteSpace(requestDto.TargetVersion)
            ? $"{requestDto.AssetId.Trim()}/state"
            : $"{requestDto.AssetId.Trim()}/state/{requestDto.TargetVersion!.Trim()}";

        var blobName = $"{basePrefix}/state.json";

        using var ms = new MemoryStream(jsonBytes);

        var metadata = new Dictionary<string, string>
        {
            ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O"),
            ["assetId"] = requestDto.AssetId,
            ["isStateFile"] = "true"
        };

        if (!string.IsNullOrWhiteSpace(requestDto.TargetVersion))
            metadata["stateVersion"] = requestDto.TargetVersion!.Trim();

        await storage.UploadOrOverwriteAsync(
            blobName: blobName,
            content: ms,
            contentType: "application/json",
            metadata: metadata,
            ct: cancellationToken);

        return new UpdateStateResultDto
        {
            Message = "Saved successfully.",
            AssetId = requestDto.AssetId,
            Version = requestDto.TargetVersion,
            BlobName = blobName
        };
    }

    public async Task<DeleteStateVersionResultDto> DeleteVersionAsync(
        string assetId,
        string version,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ValidationException("AssetId is required.");
        if (string.IsNullOrWhiteSpace(version))
            throw new ValidationException("Version is required.");

        var trimmedAsset = assetId.Trim();
        var trimmedVersion = version.Trim();
        var deletedCount = await storage.DeleteStateVersionAsync(trimmedAsset, trimmedVersion, cancellationToken);

        if (deletedCount == 0)
        {
            var label = (trimmedVersion.Equals("state", StringComparison.OrdinalIgnoreCase) ||
                         trimmedVersion.Equals("Default", StringComparison.OrdinalIgnoreCase))
                ? "latest working copy"
                : $"version '{trimmedVersion}'";
            throw new NotFoundException($"{label} was not found for asset '{trimmedAsset}'.");
        }

        // Human-friendly message
        var message = (trimmedVersion.Equals("state", StringComparison.OrdinalIgnoreCase) ||
                       trimmedVersion.Equals("latest", StringComparison.OrdinalIgnoreCase))
            ? "Deleted latest working copy."
            : $"Deleted version '{trimmedVersion}'.";

        return new DeleteStateVersionResultDto
        {
            Message = message,
            AssetId = trimmedAsset,
            Version = trimmedVersion,
            DeletedBlobs = deletedCount
        };
    }
    
    public async Task<DeleteBaselineResultDto> DeleteBaselineAsync(
        string assetId,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ValidationException("AssetId is required.");

        var ok = await storage.DeleteBaselineAsync(assetId.Trim(), ct);
        if (!ok)
            throw new NotFoundException($"Baseline was not found for asset '{assetId}'.");

        return new DeleteBaselineResultDto
        {
            Message = "Baseline deleted successfully.",
            AssetId = assetId
        };
    }
}