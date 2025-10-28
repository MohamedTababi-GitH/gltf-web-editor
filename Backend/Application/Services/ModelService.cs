using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for managing 3D model files, including validation and interaction with storage.
/// Orchestrates the validation of model uploads and retrieval of stored models.
/// </summary>
public sealed class ModelService(IModelStorage storage) : IModelService
{
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

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
        Categories = f.Categories,
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

    /// <summary>
    /// Retrieves a list of all stored model items.
    /// </summary>
    /// <param name="cursor"></param>
    /// <param name="filter"></param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <param name="limit"></param>
    /// <returns>A read-only list of <see cref="ModelItemDto"/> representing the stored models.</returns>
    public async Task<PageResult<ModelItemDto>> ListAsync(
        int limit, string? cursor, ModelFilter filter, CancellationToken cancellationToken)
    {
        if (limit <= 0 || limit > 100)
            throw new ArgumentOutOfRangeException(nameof(limit), "limit must be 1..100");

        var (files, next) = await storage.ListPageAsync(limit, cursor, filter, cancellationToken);
        var items = files.Select(Map).ToList();

        next = string.IsNullOrWhiteSpace(next) ? null : next;

        // hasMore strictly follows whether we returned a usable nextCursor
        var hasMore = next is not null;
        var total = await storage.CountAsync(filter,cancellationToken);

        return new PageResult<ModelItemDto>(items, next, hasMore, total);
    }

    /// <summary>
    /// Validates and uploads a 3D model file and its related files according to the specified request.
    /// </summary>
    /// <param name="request">The upload request containing file content, original file name, and alias.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An <see cref="UploadResultDto"/> containing the result of the upload operation.</returns>
    /// <exception cref="BadRequestException">
    /// Thrown when the request or its file contents are missing or inconsistent.
    /// </exception>
    /// <exception cref="ValidationException">
    /// Thrown when input validation fails (e.g., alias, file type, or file naming rules).
    /// </exception>
    public async Task<UploadResultDto> UploadAsync(UploadModelRequest request, CancellationToken cancellationToken)
    {
        if (request is null)
            throw new BadRequestException("Upload request cannot be null.");

        if (request.Files is null || request.Files.Count == 0)
            throw new BadRequestException("No files provided in the upload request.");

        // Validate alias once (applies only to an entry file)
        if (string.IsNullOrWhiteSpace(request.Alias))
            throw new ValidationException("Alias is required.");
        if (!AliasRegex.IsMatch(request.Alias))
            throw new ValidationException("Alias must contain only letters, digits, or underscores.");

        // Validate the entry file name
        if (string.IsNullOrWhiteSpace(request.OriginalFileName))
            throw new ValidationException("Original file name is required.");

        var entryFileName = Path.GetFileName(request.OriginalFileName);
        var entryExt = Path.GetExtension(entryFileName).ToLowerInvariant();

        if (entryExt != ".glb" && entryExt != ".gltf")
            throw new ValidationException("Original file must be a .glb or .gltf file.");

        // Ensure the entry file is present in Files
        var entryTuple = request.Files.FirstOrDefault(f =>
            string.Equals(Path.GetFileName(f.FileName), entryFileName, StringComparison.OrdinalIgnoreCase));

        if (entryTuple.FileName is null)
            throw new BadRequestException($"Entry file '{entryFileName}' was not included in the request files.");

        var safeBase = Sanitize(Path.GetFileNameWithoutExtension(entryFileName));
        var assetId = Guid.NewGuid().ToString("N");

        // Upload all files under the same {assetId}/ folder
        foreach (var (fileNameRaw, content) in request.Files)
        {
            if (content is null)
                throw new BadRequestException($"File stream for '{fileNameRaw}' was null.");

            var fileName = Path.GetFileName(fileNameRaw);
            var ext = Path.GetExtension(fileName).ToLowerInvariant();

            // Allow only specific companion files
            bool isEntry = string.Equals(fileName, entryFileName, StringComparison.OrdinalIgnoreCase);
            bool isAllowed = isEntry || ext is ".bin" or ".png" or ".jpg" or ".jpeg" or ".webp" or ".ktx2";

            if (!isAllowed)
                throw new ValidationException($"Unsupported file type: {fileName}");

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

                if (request.Categories is { Count: > 0 })
                    metadata["categories"] = string.Join(",", request.Categories.Select(c => c.Trim()));

                if (!string.IsNullOrWhiteSpace(request.Description))
                    metadata["description"] = request.Description.Trim();

                metadata["isFavourite"] = "false";
            }

            await storage.UploadAsync(blobName, content, contentType, metadata, cancellationToken);
        }

        return new UploadResultDto
        {
            Message = "Uploaded successfully.",
            Alias = request.Alias,
            BlobName = $"{assetId}/{safeBase}{entryExt}"
        };
    }

    /// <summary>
    /// Deletes a model entry and its related files by ID.
    /// </summary>
    /// <param name="id">The unique identifier of the model to delete.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>True if deletion succeeded, otherwise false.</returns>
    /// <exception cref="ValidationException">Thrown when the provided ID is invalid.</exception>
    /// <exception cref="NotFoundException">Thrown when no model with the specified ID exists.</exception>
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("Invalid model ID.");

        var deleted = await storage.DeleteByIdAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException($"Model with ID '{id}' not found.");

        return true;
    }

    /// <summary>
    /// Updates metadata details for a stored model (alias, category, description, or favourite status).
    /// </summary>
    /// <param name="id">The unique identifier of the model to update.</param>
    /// <param name="newAlias">The new alias to assign, or null to remove it.</param>
    /// <param name="category">The new category to assign, or null to remove it.</param>
    /// <param name="description">The new description to assign, or null to remove it.</param>
    /// <param name="isFavourite">Whether the model is marked as a favourite.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>True if the update succeeded.</returns>
    /// <exception cref="ValidationException">Thrown when the provided ID or alias is invalid.</exception>
    /// <exception cref="NotFoundException">Thrown when no model with the specified ID exists.</exception>
    public async Task<bool> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("Invalid model ID.");

        // Normalize whitespace-only strings to null (treat as deletion)
        string? Normalize(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        List<string>? NormalizeList(List<string>? list) =>
            list is null ? null : list.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList();
        var normalizedCategories = NormalizeList(categories);
        Normalize(description);
        var alias = Normalize(newAlias);

        // Validate alias only if it's being set (not deleted)
        if (alias is not null && !AliasRegex.IsMatch(alias))
            throw new ValidationException("Alias format is invalid.");

        var updated = await storage.UpdateDetailsAsync(
            id, alias, normalizedCategories, Normalize(description), isFavourite, cancellationToken);

        if (!updated)
            throw new NotFoundException($"Model with ID '{id}' not found.");

        return true;
    }
}