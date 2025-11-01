using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Mappers.Interfaces;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for managing 3D model files, including validation and interaction with storage.
/// Orchestrates the validation of model uploads and retrieval of stored models.
/// </summary>
public sealed class ModelService(IModelStorage storage, IModelMapper mapper) : IModelService
{
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

    #region CRUD Operations

    /// <summary>
    /// Returns a paginated list of stored model entries based on filter criteria.
    /// </summary>
    /// <param name="limit">
    /// The maximum number of items to return in this page. Must be between 1 and 100.
    /// </param>
    /// <param name="cursor">
    /// An opaque continuation token returned by a previous call to <see cref="ListAsync"/>.
    /// Pass <c>null</c> to start from the beginning.
    /// </param>
    /// <param name="filterDto">
    /// Optional filter criteria (categories, format, search text, etc.).
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// A <see cref="PageResultDto{T}"/> containing:
    /// <list type="bullet">
    /// <item><description><c>Items</c> – the mapped model entries for this page</description></item>
    /// <item><description><c>NextCursor</c> – a token to request the next page, or <c>null</c> if there are no more results</description></item>
    /// <item><description><c>HasMore</c> – whether another page is available</description></item>
    /// <item><description><c>TotalCount</c> – total number of items that match the filter</description></item>
    /// </list>
    /// </returns>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown if <paramref name="limit"/> is outside the allowed range.
    /// </exception>
    public async Task<PageResultDto<ModelItemDto>> ListAsync(
        int limit, string? cursor, ModelFilterDto filterDto, CancellationToken cancellationToken)
    {
        if (limit <= 0 || limit > 100)
            throw new ArgumentOutOfRangeException(nameof(limit), "The page limit must be between 1 and 100.");

        var (files, next) = await storage.ListPageAsync(limit, cursor, filterDto, cancellationToken);
        var items = files.Select(mapper.ToDto).ToList();

        next = string.IsNullOrWhiteSpace(next) ? null : next;

        // hasMore strictly follows whether we returned a usable nextCursor
        var hasMore = next is not null;
        var total = await storage.CountAsync(filterDto, cancellationToken);

        return new PageResultDto<ModelItemDto>(items, next, hasMore, total);
    }

    /// <summary>
    /// Validates and uploads a new 3D model (and its companion assets) into blob storage.
    /// </summary>
    /// <param name="requestDto">
    /// The upload request containing:
    /// <list type="bullet">
    /// <item><description><c>Alias</c> – user-facing name of the model (validated)</description></item>
    /// <item><description><c>OriginalFileName</c> – the main .glb/.gltf filename used as the "entry" file</description></item>
    /// <item><description><c>Files</c> – the entry model plus any referenced resources (bin, textures, etc.)</description></item>
    /// <item><description><c>Categories</c>, <c>Description</c> – optional metadata for discoverability</description></item>
    /// </list>
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UploadResultDto"/> including:
    /// <list type="bullet">
    /// <item><description><c>Message</c> – human-readable status</description></item>
    /// <item><description><c>Alias</c> – the alias that was applied</description></item>
    /// <item><description><c>BlobName</c> – the fully qualified blob path of the main entry file</description></item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// Behavior:
    /// <list type="number">
    /// <item><description>Generates a new <c>assetId</c> (a folder prefix) for this upload.</description></item>
    /// <item><description>Ensures the entry file is .glb or .gltf, and if it's .gltf, validates that all referenced external files are present.</description></item>
    /// <item><description>Uploads all provided files to <c>{assetId}/</c> with appropriate content types and blob metadata.</description></item>
    /// <item><description>Marks the "entry" file with alias, categories, description, and flags it as <c>isNew=true</c> and <c>isFavourite=false</c>.</description></item>
    /// </list>
    /// </remarks>
    /// <exception cref="BadRequestException">
    /// Thrown when the request is missing required files or the main entry file can't be found in the upload batch.
    /// </exception>
    /// <exception cref="ValidationException">
    /// Thrown when business rules fail (invalid alias, unsupported extension, missing dependencies for .gltf, etc.).
    /// </exception>
    public async Task<UploadResultDto> UploadAsync(UploadModelRequestDto requestDto,
        CancellationToken cancellationToken)
    {
        if (requestDto is null)
            throw new BadRequestException("The upload requestDto is empty. Please provide a valid requestDto.");

        if (requestDto.Files is null || requestDto.Files.Count == 0)
            throw new BadRequestException(
                "No files were provided in the upload requestDto. Please select a file to upload.");

        // Validate alias once (applies only to an entry file)
        if (string.IsNullOrWhiteSpace(requestDto.Alias))
            throw new ValidationException("A name for the model is required. Please provide one.");
        if (!AliasRegex.IsMatch(requestDto.Alias))
            throw new ValidationException(
                "The name can only contain letters, numbers, and underscores. Please choose a different Name.");

        // Validate the entry file name
        if (string.IsNullOrWhiteSpace(requestDto.OriginalFileName))
            throw new ValidationException("The original file name is missing. Please ensure the file has a name.");

        var entryFileName = Path.GetFileName(requestDto.OriginalFileName);
        var entryExt = Path.GetExtension(entryFileName).ToLowerInvariant();

        if (entryExt != ".glb" && entryExt != ".gltf")
            throw new ValidationException("Original file must be a .glb or .gltf file.");

        // Ensure the entry file is present in Files
        var entryTuple = requestDto.Files.FirstOrDefault(f =>
            string.Equals(Path.GetFileName(f.FileName), entryFileName, StringComparison.OrdinalIgnoreCase));

        if (entryTuple.FileName is null)
            throw new BadRequestException(
                $"The main model file '{entryFileName}' is missing from the uploaded files. Please include it and try again.");

        // Extra validation ONLY for .gltf models: ensure required external files exist
        if (entryExt == ".gltf")
        {
            // 1. Read the .gltf content into memory so we can inspect references
            string gltfText;
            using (var reader = new StreamReader(entryTuple.Content, leaveOpen: true))
            {
                gltfText = await reader.ReadToEndAsync(cancellationToken);
            }

            entryTuple.Content.Position = 0; // rewind after reading so we can still upload it later

            // 2. Very light/rough dependency scan:
            //    - look for "uri": "something.bin"
            //    - look for "uri": "textures/diffuse.png"
            // We’ll grab anything that looks like an external file.
            var referencedFiles = ExtractReferencedUrisFromGltfJson(gltfText);

            // 3. Check that each referenced file name is present in requestDto.Files
            var uploadedFileNames = requestDto.Files
                .Select(f => Path.GetFileName(f.FileName))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missing = referencedFiles
                .Where(refFile => !uploadedFileNames.Contains(Path.GetFileName(refFile)))
                .ToList();

            if (missing.Count > 0)
            {
                throw new BadRequestException(
                    $"The uploaded .gltf file references external resources that were not provided: {string.Join(", ", missing)}. " +
                    "Please include all required .bin/texture files and try again.");
            }
        }

        var safeBase = Sanitize(Path.GetFileNameWithoutExtension(entryFileName));
        var assetId = Guid.NewGuid().ToString("N");

        // Upload all files under the same {assetId}/ folder
        foreach (var (fileNameRaw, content) in requestDto.Files)
        {
            if (content is null)
                throw new BadRequestException(
                    $"The content of the file '{fileNameRaw}' is empty. Please provide a valid file.");

            var fileName = Path.GetFileName(fileNameRaw);
            var ext = Path.GetExtension(fileName).ToLowerInvariant();

            // Allow only specific companion files
            bool isEntry = string.Equals(fileName, entryFileName, StringComparison.OrdinalIgnoreCase);
            bool isAllowed = isEntry || ext is ".bin" or ".png" or ".jpg" or ".jpeg" or ".webp" or ".ktx2";

            if (!isAllowed)
                throw new ValidationException(
                    $"The file type of '{fileName}' is not supported. Please upload a valid file type.");

            var blobName = $"{assetId}/{fileName}";
            var contentType = ext switch
            {
                ".glb" => "model/gltf-binary",
                ".gltf" => "model/gltf+json",
                ".bin" => "application/octet-stream",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                ".ktx2" => "image/ktx2",
                _ => "application/octet-stream"
            };

            // Metadata: alias ONLY on the entry .glb/.gltf
            var metadata = new Dictionary<string, string>
            {
                ["basename"] = fileName,
                ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O"),
                ["assetId"] = assetId
            };

            if (isEntry)
            {
                metadata["alias"] = requestDto.Alias;

                if (requestDto.Categories is { Count: > 0 })
                    metadata["categories"] = string.Join(",", requestDto.Categories.Select(c => c.Trim()));

                if (!string.IsNullOrWhiteSpace(requestDto.Description))
                    metadata["description"] = requestDto.Description.Trim();

                metadata["isFavourite"] = "false";
                metadata["isNew"] = "true";
            }

            await storage.UploadAsync(blobName, content, contentType, metadata, cancellationToken);
        }

        return new UploadResultDto
        {
            Message = "Uploaded successfully.",
            Alias = requestDto.Alias,
            BlobName = $"{assetId}/{safeBase}{entryExt}"
        };
    }

    /// <summary>
    /// Deletes an existing model (and all of its associated blobs) by logical model ID.
    /// </summary>
    /// <param name="id">
    /// The model's <c>Id</c> (not the <c>assetId</c> / blob folder name).
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// <c>true</c> if the model was found and deleted; otherwise throws.
    /// </returns>
    /// <remarks>
    /// This is a logical delete that delegates to the storage layer.
    /// The storage layer is responsible for locating all blobs belonging to the model and removing them.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if the supplied <paramref name="id"/> is empty.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with that ID exists.
    /// </exception>
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");

        var deleted = await storage.DeleteByIdAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return true;
    }

    /// <summary>
    /// Updates mutable metadata on a stored model entry (alias, categories, description, favourite flag).
    /// </summary>
    /// <param name="id">
    /// The logical model ID whose metadata should be updated.
    /// </param>
    /// <param name="newAlias">
    /// New alias to assign to the model, or <c>null</c> to clear the alias. If provided, it must match the allowed pattern.
    /// </param>
    /// <param name="categories">
    /// New category list for the model. Whitespace-only values are dropped. Pass <c>null</c> to clear categories.
    /// </param>
    /// <param name="description">
    /// New description for the model. Whitespace-only becomes <c>null</c>, which clears the description.
    /// </param>
    /// <param name="isFavourite">
    /// Whether to mark or unmark this model as a favourite. Pass <c>null</c> to leave unchanged.
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UpdateDetailsResultDto"/> with a human-readable status message.
    /// </returns>
    /// <remarks>
    /// This does <b>not</b> modify the underlying 3D binary.  
    /// It updates blob metadata (e.g. "alias", "description", "categories", "isFavourite") on the relevant entry blob.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if <paramref name="id"/> is invalid or if <paramref name="newAlias"/> is provided but does not match the required pattern.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with the given ID exists.
    /// </exception>
    public async Task<UpdateDetailsResultDto> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");

        // Normalize whitespace-only strings to null (treat as deletion)
        string? Normalize(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        List<string>? NormalizeList(List<string>? list) =>
            list is null ? null : list.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList();

        var normalizedCategories = NormalizeList(categories);
        Normalize(description);
        var alias = Normalize(newAlias);

        // Validate alias only if it's being set (not deleted)
        if (alias is not null && !AliasRegex.IsMatch(alias))
            throw new ValidationException(
                "The alias format is invalid. It can only contain letters, numbers, and underscores.");

        var updated = await storage.UpdateDetailsAsync(
            id, alias, normalizedCategories, Normalize(description), isFavourite, cancellationToken);

        if (!updated)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return new UpdateDetailsResultDto
        {
            Message = "Updated successfully."
        };
    }

    /// <summary>
    /// Clears or updates the <c>isNew</c> flag for a model so that it no longer appears as "new" in the UI.
    /// </summary>
    /// <param name="id">The logical model ID to update.</param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UpdateDetailsResultDto"/> indicating success.
    /// </returns>
    /// <remarks>
    /// This is typically called after the model has been surfaced to the user,
    /// to stop highlighting it as a newly uploaded asset.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if <paramref name="id"/> is invalid.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with that ID exists.
    /// </exception>
    public async Task<UpdateDetailsResultDto> UpdateIsNewAsync(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");

        var updated = await storage.UpdateIsNewAsync(id, cancellationToken);

        if (!updated)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return new UpdateDetailsResultDto
        {
            Message = ""
        };
    }

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
            Message = "State saved successfully.",
            AssetId = requestDto.AssetId,
            Version = requestDto.TargetVersion,
            BlobName = blobName
        };
    }

    #endregion

    #region Helpers

    private static List<string> ExtractReferencedUrisFromGltfJson(string gltfJson)
    {
        var uris = new List<string>();

        // very lightweight scan
        using var doc = System.Text.Json.JsonDocument.Parse(gltfJson);

        // 1. buffers[*].uri
        if (doc.RootElement.TryGetProperty("buffers", out var buffersElem) &&
            buffersElem.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var b in buffersElem.EnumerateArray())
            {
                if (b.TryGetProperty("uri", out var uriProp) &&
                    uriProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var uriVal = uriProp.GetString();
                    if (!string.IsNullOrWhiteSpace(uriVal) &&
                        !uriVal.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                        uris.Add(uriVal);
                }
            }
        }

        // 2. images[*].uri
        if (doc.RootElement.TryGetProperty("images", out var imagesElem) &&
            imagesElem.ValueKind == System.Text.Json.JsonValueKind.Array)
        {
            foreach (var img in imagesElem.EnumerateArray())
            {
                if (img.TryGetProperty("uri", out var uriProp) &&
                    uriProp.ValueKind == System.Text.Json.JsonValueKind.String)
                {
                    var uriVal = uriProp.GetString();
                    if (!string.IsNullOrWhiteSpace(uriVal) &&
                        !uriVal.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                        uris.Add(uriVal);
                }
            }
        }

        return uris;
    }

    /// <summary>
    /// Sanitizes a file name by removing directory parts and limiting its length.
    /// </summary>
    /// <param name="s">The input string to sanitize.</param>
    /// <returns>A cleaned and safe file name string.</returns>
    static string Sanitize(string s)
    {
        s = s.Replace("/", "").Replace("\\", "").Trim();
        s = s.Replace("..", "");
        return s.Length > 120 ? s[..120] : s;
    }

    #endregion
    
}