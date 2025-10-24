using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for managing 3D model files, including validation and interaction with storage.
/// Orchestrates the validation of model uploads and retrieval of stored models.
/// </summary>
public sealed class ModelService : IModelService
{
    private readonly IModelStorage _storage;
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);
    public ModelService(IModelStorage storage) => _storage = storage;

    /// <summary>
    /// Maps a <see cref="ModelFile"/> entity to a <see cref="ModelItemDto"/> data transfer object.
    /// </summary>
    /// <param name="f">The model file entity to map.</param>
    /// <returns>A <see cref="ModelItemDto"/> representing the model file.</returns>
    private static ModelItemDto Map(ModelFile f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        Format = f.Format,
        SizeBytes = f.SizeBytes,
        Url = f.Url,
        CreatedOn = f.CreatedOn,
        Category = f.Category,
        Description = f.Description,
        IsFavourite = f.IsFavourite,
        AdditionalFiles = f.AdditionalFiles?.Select(x => new AdditionalFileDto
        {
            Name = x.Name,
            Url = x.Url,
            SizeBytes = x.SizeBytes,
            ContentType = x.ContentType
        }).ToList()
    };

    static string Sanitize(string s)
    {
        s = s.Replace("/", "").Replace("\\", "").Trim();
        s = s.Replace("..", "");
        return s.Length > 120 ? s[..120] : s;
    }

    /// <summary>
    /// Retrieves a list of all stored model items.
    /// </summary>
    /// <param name="cursor"></param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <param name="limit"></param>
    /// <returns>A read-only list of <see cref="ModelItemDto"/> representing the stored models.</returns>
    public async Task<PageResult<ModelItemDto>> ListAsync(
        int limit, string? cursor, ModelFilter filter, CancellationToken cancellationToken)
    {
        if (limit <= 0 || limit > 100)
            throw new ArgumentOutOfRangeException(nameof(limit), "limit must be 1..100");

        var (files, next) = await _storage.ListPageAsync(limit, cursor, filter, cancellationToken);
        var items = files.Select(Map).ToList();

        next = string.IsNullOrWhiteSpace(next) ? null : next;

        // hasMore strictly follows whether we returned a usable nextCursor
        var hasMore = next is not null;
        var total = await _storage.CountAsync(filter,cancellationToken);

        return new PageResult<ModelItemDto>(items, next, hasMore, total);
    }

    /// <summary>
    /// Validates and uploads a 3D model file and relevant files according to the specified request.
    /// </summary>
    /// <param name="request">The upload request containing file content, original file name, and alias.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An <see cref="UploadResultDto"/> containing the result of the upload operation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when the <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when the request content is null, original file name or alias is missing,
    /// alias does not match required pattern, or file extension is invalid.
    /// </exception>
    public async Task<UploadResultDto> UploadAsync(UploadModelRequest request, CancellationToken cancellationToken)
    {
        if (request is null) throw new ArgumentNullException(nameof(request));
        if (request.Files is null || request.Files.Count == 0)
            throw new ArgumentException("No files provided.", nameof(request.Files));

        // Validate alias once (only applied to entry file)
        if (string.IsNullOrWhiteSpace(request.Alias))
            throw new ArgumentException("Alias required.", nameof(request.Alias));
        if (!AliasRegex.IsMatch(request.Alias))
            throw new ArgumentException("Alias not valid.", nameof(request.Alias));

        // Validate the entry file name
        if (string.IsNullOrWhiteSpace(request.OriginalFileName))
            throw new ArgumentException("Original file name required.", nameof(request.OriginalFileName));

        var entryFileName = Path.GetFileName(request.OriginalFileName); // strips any path parts
        var entryExt = Path.GetExtension(entryFileName).ToLowerInvariant();
        if (entryExt != ".glb" && entryExt != ".gltf")
            throw new ArgumentException("Original file must be .glb or .gltf.", nameof(request.OriginalFileName));

        // Ensure the entry file is present in Files (basic consistency)
        var entryTuple = request.Files.FirstOrDefault(f =>
            string.Equals(Path.GetFileName(f.FileName), entryFileName, StringComparison.OrdinalIgnoreCase));
        if (entryTuple.FileName is null)
            throw new ArgumentException($"Entry file '{entryFileName}' was not included in Files.",
                nameof(request.Files));

        var safeBase = Sanitize(Path.GetFileNameWithoutExtension(entryFileName));
        var assetId = Guid.NewGuid().ToString("N");

        // Upload all files under the same {assetId}/ folder
        foreach (var (fileNameRaw, content) in request.Files)
        {
            if (content is null) throw new ArgumentException("A file stream was null.", nameof(request.Files));

            var fileName = Path.GetFileName(fileNameRaw); // drop any directory parts
            var ext = Path.GetExtension(fileName).ToLowerInvariant();

            // Keep it simple: allow common companions for glTF
            bool isEntry = string.Equals(fileName, entryFileName, StringComparison.OrdinalIgnoreCase);
            bool isAllowed =
                isEntry ||
                ext is ".bin" or ".png" or ".jpg" or ".jpeg" or ".webp" or ".ktx2";

            if (!isAllowed)
                throw new ArgumentException($"Unsupported file type: {fileName}");

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
                metadata["alias"] = request.Alias;

                if (!string.IsNullOrWhiteSpace(request.Category))
                    metadata["category"] = request.Category.Trim();

                if (!string.IsNullOrWhiteSpace(request.Description))
                    metadata["description"] = request.Description.Trim();

                metadata["isFavourite"] = "false";
            }

            await _storage.UploadAsync(blobName, content, contentType, metadata, cancellationToken);
        }

        return new UploadResultDto
        {
            Message = "Uploaded successfully.",
            Alias = request.Alias,
            BlobName = $"{assetId}/{safeBase}{entryExt}" // path of the entry file
        };
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) throw new ArgumentException("Invalid id.", nameof(id));
        var deleted = await _storage.DeleteByIdAsync(id, cancellationToken);
        return deleted;
    }

    public async Task<bool> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        string? category,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) throw new ArgumentException("Invalid id.", nameof(id));

        // Normalize whitespace-only to null (treat as delete)
        string? Normalize(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        var cat = Normalize(category);
        var desc = Normalize(description);
        var alias = Normalize(newAlias);

        // Validate alias only if it's being set (not deleted)
        if (alias is not null && !AliasRegex.IsMatch(alias))
            throw new ArgumentException("Alias not valid.", nameof(newAlias));

        // NOTE: For PUT we DO allow all nulls (deletes all metadata)
        return await _storage.UpdateDetailsAsync(id, alias, cat, desc, isFavourite, cancellationToken);
    }
}