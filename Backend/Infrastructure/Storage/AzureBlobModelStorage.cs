using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Options;
using Microsoft.Extensions.Options;

namespace ECAD_Backend.Infrastructure.Storage;

/// <summary>
/// Azure Blob Storage implementation of <see cref="IModelStorage"/>.
/// Provides methods to upload and list model files stored in an Azure Blob Storage container.
/// </summary>
public class AzureBlobModelStorage : IModelStorage
{
    private const string DefaultContentType = "application/octet-stream";
    private const string MetaId = "Id";
    private const string MetaAlias = "alias";
    private const string MetaCategory = "category";
    private const string MetaDescription = "description";
    private const string MetaIsFavourite = "isFavourite";
    private const string MetaAssetId = "assetId";
    private const string MetaUploadedAtUtc = "UploadedAtUtc";
    private const string MetaBasename = "basename";

    #region Initialisation & Constructor

    // Represents a specific blob container within the Azure Storage account
    private readonly BlobContainerClient _container;

    // Cached container URL parts for SAS-preserving links
    private readonly string _baseUri; // https://.../container
    private readonly string _sasQuery; // ?sp=...&sig=...

    public AzureBlobModelStorage(IOptions<BlobOptions> opts)
    {
        var o = opts.Value ?? throw new ArgumentNullException(nameof(opts));
        if (string.IsNullOrWhiteSpace(o.ConnectionString))
            throw new InvalidOperationException("Storage:ConnectionString is missing.");
        if (string.IsNullOrWhiteSpace(o.ContainerModels))
            throw new InvalidOperationException("Storage:ContainerModels is missing.");

        _container = new BlobContainerClient(new Uri(o.ConnectionString));

        // Precompute SAS-preserving base URL pieces
        var containerUriStr = _container.Uri.ToString();
        var parts = containerUriStr.Split('?', 2);
        _baseUri = parts[0].TrimEnd('/'); // https://.../container
        _sasQuery = parts.Length == 2 ? "?" + parts[1] : string.Empty; // ?sp=...&sig=...
    }

    #endregion

    #region CRUD Methods

    public async Task<(IReadOnlyList<ModelFile> Items, string? NextCursor)> ListPageAsync(
        int limit, string? cursor, ModelFilter filter, CancellationToken ct = default)
    {
        var items = new List<ModelFile>(limit);
        string? nextCursor = cursor;

        // Build async pageable with optional prefix optimization
        AsyncPageable<BlobItem> pageable = string.IsNullOrWhiteSpace(filter.Prefix)
            ? _container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None, cancellationToken: ct)
            : _container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None, prefix: filter.Prefix, cancellationToken: ct);

        // var pageSizeHint = Math.Clamp(limit, 10, 500); // Azure recommends 10-500, need to implemt ct Cursor support
        var pageSizeHint = limit;
        await foreach (var page in pageable.AsPages(cursor, pageSizeHint).WithCancellation(ct))
        {
            foreach (var blob in page.Values)
            {
                // Entry files only
                var format = GetFormatOrNull(blob.Name);
                if (format is null) continue;

                // Quick format filter
                if (!string.IsNullOrWhiteSpace(filter.Format) &&
                    !string.Equals(format, filter.Format, StringComparison.OrdinalIgnoreCase))
                    continue;

                // Read metadata fields used by filters
                var md = blob.Metadata ?? new Dictionary<string, string>();
                var alias = ReadStringMetadataOrDefault(md, MetaAlias, "Model");
                var category = ReadStringMetadataOrNull(md, MetaCategory);
                var description = ReadStringMetadataOrNull(md, MetaDescription);
                var fav = ParseBoolMetadata(md, MetaIsFavourite);

                // Date filters (use Properties.CreatedOn if present; otherwise skip date filtering)
                var created = blob.Properties.CreatedOn;

                if (filter.IsFavourite is not null && fav != filter.IsFavourite.Value)
                    continue;

                if (!string.IsNullOrWhiteSpace(filter.Category) &&
                    !string.Equals(category, filter.Category, StringComparison.OrdinalIgnoreCase))
                    continue;

                if (filter.CreatedAfter is not null && created is not null && created < filter.CreatedAfter)
                    continue;

                if (filter.CreatedBefore is not null && created is not null && created >= filter.CreatedBefore)
                    continue;

                if (!string.IsNullOrWhiteSpace(filter.Q))
                {
                    var q = filter.Q.Trim();
                    bool matches =
                        (alias?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                        (category?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                        (description?.Contains(q, StringComparison.OrdinalIgnoreCase) ?? false) ||
                        blob.Name.Contains(q, StringComparison.OrdinalIgnoreCase);

                    if (!matches) continue;
                }

                // Passed filters → now build ModelFile (do the heavier work after filtering)
                var id = TryGetGuidMetadata(md, MetaId) ?? Guid.NewGuid();
                var fileUri = BuildBlobUri(blob.Name);
                var assetId = ReadStringMetadataOrNull(md, MetaAssetId);
                if (string.IsNullOrWhiteSpace(assetId))
                    assetId = blob.Name.Split('/', 2)[0];

                var additional = await EnumerateAdditionalFilesAsync(assetId!, blob.Name, ct);

                items.Add(new ModelFile
                {
                    Id = id,
                    Name = alias,
                    Format = format,
                    SizeBytes = blob.Properties.ContentLength,
                    CreatedOn = created,
                    Url = fileUri,
                    Category = category,
                    Description = description,
                    AssetId = assetId,
                    AdditionalFiles = additional,
                    IsFavourite = fav
                });

                if (items.Count >= limit) break;
            }

            // If we filled the page, return keeping Azure's continuation token for the *next* server page.
            if (items.Count >= limit)
            {
                return (items, page.ContinuationToken);
            }

            // Otherwise, continue to next Azure page.
            nextCursor = page.ContinuationToken;

            // If Azure has no more pages, we're done.
            if (nextCursor is null)
                break;
        }

        return (items, nextCursor);
    }

    public async Task UploadAsync(
        string blobName,
        Stream content,
        string contentType,
        IDictionary<string, string>? metadata = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(blobName))
            throw new ArgumentException("Blob name cannot be empty.", nameof(blobName));
        if (content == null)
            throw new ArgumentNullException(nameof(content));

        var blobClient = _container.GetBlobClient(blobName);

        // Ensure metadata dictionary exists and stamp internal GUID if missing
        metadata ??= new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!metadata.ContainsKey(MetaId))
            metadata[MetaId] = Guid.NewGuid().ToString("N");

        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrEmpty(contentType) ? DefaultContentType : contentType
            },
            Metadata = metadata,
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All } // No overwrites
        };

        await blobClient.UploadAsync(content, options, ct);
    }

    public async Task<bool> DeleteByIdAsync(
        Guid id,
        CancellationToken ct = default)
    {
        var anyDeleted = false;

        await foreach (var blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None,
                           cancellationToken: ct))
        {
            if (!TryMatchesId(blob.Metadata, id)) continue;

            // Delete by prefix to be safe if assetId exists
            if (blob.Metadata.TryGetValue(MetaAssetId, out var assetId) && !string.IsNullOrWhiteSpace(assetId))
            {
                await DeleteByAssetIdAsync(assetId, ct);
                anyDeleted = true;
            }
            else
            {
                var client = _container.GetBlobClient(blob.Name);
                var resp = await client.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, conditions: null,
                    cancellationToken: ct);
                if (resp.Value) anyDeleted = true;
            }
            // intentionally no "break" to handle the unlikely case of multiple blobs with same Id
        }

        return anyDeleted;
    }

    public async Task<int> DeleteByAssetIdAsync(
        string assetId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ArgumentException("Asset id required.", nameof(assetId));

        var prefix = assetId.TrimEnd('/') + "/";
        int count = 0;

        await foreach (var blob in _container.GetBlobsAsync(prefix: prefix, cancellationToken: ct))
        {
            var client = _container.GetBlobClient(blob.Name);
            var resp = await client.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, conditions: null,
                cancellationToken: ct);
            if (resp.Value) count++;
        }

        return count;
    }

    public async Task<bool> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        string? category,
        string? description,
        bool? isFavourite,
        CancellationToken ct = default)
    {
        var updated = false;

        await foreach (var blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, cancellationToken: ct))
        {
            if (blob.Metadata == null) continue;
            if (!TryMatchesId(blob.Metadata, id)) continue;

            var ext = Path.GetExtension(blob.Name).ToLowerInvariant();
            if (ext != ".glb" && ext != ".gltf") continue;

            var client = _container.GetBlobClient(blob.Name);
            var metadata = new Dictionary<string, string>(blob.Metadata, StringComparer.OrdinalIgnoreCase);

            // Helper local to set or remove
            void SetOrRemove(string key, string? value)
            {
                if (value is null)
                    metadata.Remove(key);
                else
                    metadata[key] = value;
            }

            SetOrRemove(MetaAlias, newAlias);
            SetOrRemove(MetaCategory, category);
            SetOrRemove(MetaDescription, description);

            if (isFavourite.HasValue)
                metadata[MetaIsFavourite] = isFavourite.Value ? "true" : "false";
            else
                metadata.Remove(MetaIsFavourite);

            await client.SetMetadataAsync(metadata, cancellationToken: ct);
            updated = true;
        }

        return updated;
    }

    #endregion

    #region Private Helpers

    private static string? GetFormatOrNull(string blobName)
    {
        if (blobName.EndsWith(".glb", StringComparison.OrdinalIgnoreCase)) return "glb";
        if (blobName.EndsWith(".gltf", StringComparison.OrdinalIgnoreCase)) return "gltf";
        return null;
    }

    private Uri BuildBlobUri(string blobName)
        => new($"{_baseUri}/{Uri.EscapeDataString(blobName)}{_sasQuery}");

    private static Guid? TryGetGuidMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var idStr) && Guid.TryParse(idStr, out var g) ? g : null;

    private static string? ReadStringMetadataOrNull(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v : null;

    private static string ReadStringMetadataOrDefault(IDictionary<string, string> metadata, string key, string @default)
        => ReadStringMetadataOrNull(metadata, key) ?? @default;

    private static bool ParseBoolMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var s) && bool.TryParse(s, out var b) && b;

    private static bool TryMatchesId(IDictionary<string, string> metadata, Guid id)
        => metadata != null
           && metadata.TryGetValue(MetaId, out var idStr)
           && Guid.TryParse(idStr, out var metaId)
           && metaId == id;

    private async Task<List<AdditionalFile>> EnumerateAdditionalFilesAsync(
        string assetId, string entryBlobName, CancellationToken ct)
    {
        var additional = new List<AdditionalFile>();
        var prefix = assetId.TrimEnd('/') + "/";

        await foreach (var sub in _container.GetBlobsAsync(
                           traits: BlobTraits.None,
                           states: BlobStates.None,
                           prefix: prefix,
                           cancellationToken: ct))
        {
            if (string.Equals(sub.Name, entryBlobName, StringComparison.OrdinalIgnoreCase))
                continue;

            var subUri = BuildBlobUri(sub.Name);

            additional.Add(new AdditionalFile
            {
                Name = Path.GetFileName(sub.Name),
                Url = subUri,
                SizeBytes = sub.Properties.ContentLength,
                ContentType = sub.Properties.ContentType
            });
        }

        return additional;
    }

    #endregion
}