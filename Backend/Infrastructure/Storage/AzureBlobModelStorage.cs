using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Cursor;
using ECAD_Backend.Infrastructure.Options;
using FuzzySharp;
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
    private const string MetaCategories = "categories";
    private const string MetaDescription = "description";
    private const string MetaIsFavourite = "isFavourite";
    private const string MetaIsNew = "isNew";

    private const string MetaAssetId = "assetId";
    // private const string MetaUploadedAtUtc = "UploadedAtUtc";
    // private const string MetaBasename = "basename";

    #region Initialisation & Constructor

    // Represents a specific blob container within the Azure Storage account
    private readonly BlobContainerClient _container;
    private readonly ICursorSerializer _cursor;

    // Cached container URL parts for SAS-preserving links
    // private readonly string? _baseUri; // https://.../container
    // private readonly string? _sasQuery; // ?sp=...&sig=...

    public AzureBlobModelStorage(IOptions<BlobOptions> opts, ICursorSerializer cursor)
    {
        _cursor = cursor;
        var o = opts.Value;

        if (string.IsNullOrWhiteSpace(o.ConnectionString))
            throw new InvalidOperationException(
                "The storage connection string is missing. Please configure it in the application settings.");

        // If SAS URL to a container: construct from Uri
        if (o.ConnectionString.TrimStart().StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            _container = new BlobContainerClient(new Uri(o.ConnectionString));
        }
        else
        {
            // Account connection string: use container name
            var container = string.IsNullOrWhiteSpace(o.ContainerModels) ? "data" : o.ContainerModels;
            var service = new BlobServiceClient(o.ConnectionString);
            _container = service.GetBlobContainerClient(container);
        }
    }

    #endregion

    #region CRUD Methods

    public async Task<(IReadOnlyList<ModelFile> Items, string? NextCursor)> ListPageAsync(
        int limit, string? cursorRaw, ModelFilterDto filterDto, CancellationToken ct = default)
    {
        var items = new List<ModelFile>(limit);

        // Parse incoming cursor (opaque or legacy)
        _ = _cursor.TryDeserialize(cursorRaw, out var cur);
        var azureCt = cur.AzureCt; // maybe null
        var resumeAfter = cur.LastName; // maybe null

        AsyncPageable<BlobItem> pageable = string.IsNullOrWhiteSpace(filterDto.Prefix)
            ? _container.GetBlobsAsync(BlobTraits.Metadata, cancellationToken: ct)
            : _container.GetBlobsAsync(BlobTraits.Metadata, prefix: filterDto.Prefix,
                cancellationToken: ct);

        var pageSizeHint = Math.Clamp(limit, 1, 500);

        // cross-page skip until strictly after `resumeAfter`
        bool skipping = !string.IsNullOrEmpty(resumeAfter);

        await foreach (var page in pageable.AsPages(azureCt, pageSizeHint).WithCancellation(ct))
        {
            var nextAzureCt = string.IsNullOrWhiteSpace(page.ContinuationToken) ? null : page.ContinuationToken;

            foreach (var blob in page.Values)
            {
                if (skipping)
                {
                    if (string.CompareOrdinal(blob.Name, resumeAfter) <= 0) continue;
                    skipping = false; // first > resumeAfter reached
                }

                var md = blob.Metadata ?? new Dictionary<string, string>();
                if (!Matches(filterDto, blob, md)) continue;

                var model = await BuildModelFileAsync(blob, md, ct);

                items.Add(model);

                var lastEmittedName = blob.Name;

                if (items.Count >= limit)
                {
                    // Check if there are more eligible items on this current Azure page.
                    bool moreInCurrentPage =
                        HasAnotherEligibleInCurrentPage(page.Values, blob.Name, resumeAfter, filterDto);

                    // Case 1: More items exist on the CURRENT page.
                    if (moreInCurrentPage)
                    {
                        var outCursor = _cursor.Serialize(new PaginationCursor(azureCt, lastEmittedName));
                        return (items, outCursor);
                    }

                    // Case 2: No more items on this page, but there is a NEXT Azure page.
                    if (nextAzureCt is not null)
                    {
                        var outCursor = _cursor.Serialize(new PaginationCursor(nextAzureCt, lastEmittedName));
                        return (items, outCursor);
                    }

                    // Case 3: End of this page AND no next page. 
                    return (items, null);
                }
            }

            azureCt = nextAzureCt;
            if (azureCt is null) break; // no more server pages
        }

        // Exhausted everything
        return (items, null);
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

        // Ensure a metadata dictionary exists and stamp internal GUID if missing
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

            // Delete it by prefix to be safe if assetId exists
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
            // intentionally no "break" to handle the unlikely case of multiple blobs with the same I'd
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
        List<string>? categories,
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
            if (categories is { Count: > 0 })
                metadata[MetaCategories] = string.Join(",", categories.Select(c => c.Trim()));
            else
                metadata.Remove(MetaCategories);
            SetOrRemove(MetaDescription, description);

            if (isFavourite.HasValue)
                metadata[MetaIsFavourite] = isFavourite.Value ? "true" : "false";
            else
                metadata.Remove(MetaIsFavourite);

            metadata[MetaIsNew] = "false";
            // If you want to set the value for isNew:
            // if(isNew.HasValue)
            //     metadata[MetaIsNew] = isNew.Value ? "true" : "false";
            // else
            //     metadata.Remove(MetaIsNew);

            await client.SetMetadataAsync(metadata, cancellationToken: ct);
            updated = true;
        }

        return updated;
    }

    public async Task UploadOrOverwriteAsync(
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

        metadata ??= new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (!metadata.ContainsKey(MetaId))
            metadata[MetaId] = Guid.NewGuid().ToString("N");

        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrEmpty(contentType)
                    ? DefaultContentType
                    : contentType
            },
            Metadata = metadata
            // NOTE: no BlobRequestConditions -> this WILL overwrite
        };

        await blobClient.UploadAsync(content, options, ct);
    }

    public async Task<bool> UpdateIsNewAsync(Guid id, CancellationToken ct = default)
    {
        await foreach (var blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, cancellationToken: ct))
        {
            if (blob.Metadata == null) continue;
            if (!TryMatchesId(blob.Metadata, id)) continue;

            var ext = Path.GetExtension(blob.Name).ToLowerInvariant();
            if (ext != ".glb" && ext != ".gltf") continue;

            var client = _container.GetBlobClient(blob.Name);
            var properties = await client.GetPropertiesAsync(cancellationToken: ct);
            var metadata = properties.Value.Metadata;

            metadata[MetaIsNew] = "false";

            await client.SetMetadataAsync(metadata, cancellationToken: ct);
        }

        return true;
    }

    public async Task<ModelFile?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        await foreach (var blob in _container.GetBlobsAsync(BlobTraits.Metadata, cancellationToken: ct))
        {
            var md = blob.Metadata ?? new Dictionary<string, string>();

            var metaId = TryGetGuidMetadata(md, MetaId);
            if (metaId.HasValue && metaId.Value == id)
            {
                return await BuildModelFileAsync(blob, md, ct);
            }
        }

        return null;
    }

    #endregion

    public async Task<int> DeleteStateVersionAsync(string assetId, string version, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ArgumentException("AssetId cannot be empty.", nameof(assetId));
        if (string.IsNullOrWhiteSpace(version))
            throw new ArgumentException("Version cannot be empty.", nameof(version));

        var asset = assetId.Trim().TrimEnd('/');
        var ver = version.Trim();

        // Allow deleting the "latest" working copy:
        // Accept both "state" and "latest" as aliases for the working copy.
        if (string.Equals(ver, "state", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(ver, "Default", StringComparison.OrdinalIgnoreCase))
        {
            var blobName = $"{asset}/state/state.json";
            var client = _container.GetBlobClient(blobName);
            var resp = await client.DeleteIfExistsAsync(
                DeleteSnapshotsOption.IncludeSnapshots,
                conditions: null,
                cancellationToken: ct);
            
            return resp.Value ? 1 : 0;
        }

        // Otherwise delete all blobs under the named version folder: {assetId}/state/{version}/
        var prefix = $"{asset}/state/{ver.TrimEnd('/')}/";
        var deleted = 0;

        await foreach (var blob in _container.GetBlobsAsync(
                           traits: BlobTraits.None,
                           states: BlobStates.None,
                           prefix: prefix,
                           cancellationToken: ct))
        {
            var client = _container.GetBlobClient(blob.Name);
            var resp = await client.DeleteIfExistsAsync(
                DeleteSnapshotsOption.IncludeSnapshots,
                conditions: null,
                cancellationToken: ct);

            if (resp.Value) deleted++;
        }

        return deleted;
    }

    #region Private Helpers

    private static string? GetFormatOrNull(string blobName)
    {
        if (blobName.EndsWith(".glb", StringComparison.OrdinalIgnoreCase)) return "glb";
        if (blobName.EndsWith(".gltf", StringComparison.OrdinalIgnoreCase)) return "gltf";
        return null;
    }

    private bool HasAnotherEligibleInCurrentPage(
        IEnumerable<BlobItem> values, string currentName, string? resume, ModelFilterDto f)
    {
        bool localSkipping = !string.IsNullOrEmpty(resume);

        foreach (var b in values)
        {
            // only consider items strictly AFTER the currentName
            if (string.CompareOrdinal(b.Name, currentName) <= 0) continue;

            if (localSkipping)
            {
                if (string.CompareOrdinal(b.Name, resume) <= 0) continue;
                localSkipping = false;
            }

            // Use the same filtering logic as the main loop
            var md = b.Metadata ?? new Dictionary<string, string>();
            if (Matches(f, b, md)) return true;
        }

        return false;
    }

    private Uri BuildBlobUri(string blobName)
    {
        if (string.IsNullOrWhiteSpace(blobName))
            throw new ArgumentNullException(nameof(blobName));

        blobName = blobName.TrimStart('/'); // avoid leading slash = different blob name
        return _container.GetBlobClient(blobName).Uri; // includes SAS if the container client has it
    }

    private static Guid? TryGetGuidMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var idStr) && Guid.TryParse(idStr, out var g) ? g : null;

    private static string? ReadStringMetadataOrNull(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v : null;

    private static string ReadStringMetadataOrDefault(IDictionary<string, string> metadata, string key, string @default)
        => ReadStringMetadataOrNull(metadata, key) ?? @default;

    private static bool ParseBoolMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var s) && bool.TryParse(s, out var b) && b;

    private static bool TryMatchesId(IDictionary<string, string> metadata, Guid id)
        => metadata.TryGetValue(MetaId, out var idStr)
           && Guid.TryParse(idStr, out var metaId)
           && metaId == id;

    private async Task<(List<AdditionalFile> additional, List<StateFile> state)> EnumerateFilesAsync(
        string assetId,
        string entryBlobName,
        CancellationToken ct)
    {
        var additionalFiles = new List<AdditionalFile>();
        var stateFiles = new List<StateFile>();

        var prefix = assetId.TrimEnd('/') + "/";

        // We need metadata here, not just properties, so use BlobTraits.Metadata
        await foreach (var sub in _container.GetBlobsAsync(
                           traits: BlobTraits.Metadata,
                           states: BlobStates.None,
                           prefix: prefix,
                           cancellationToken: ct))
        {
            // skip the main model file
            if (string.Equals(sub.Name, entryBlobName, StringComparison.OrdinalIgnoreCase))
                continue;

            var subUri = BuildBlobUri(sub.Name);

            // Extract timestamp:
            // Priority: custom metadata["UploadedAtUtc"] we wrote in SaveStateAsync
            // Fallback: blob.Properties.CreatedOn
            DateTimeOffset? createdAt = null;
            if (sub.Metadata != null &&
                sub.Metadata.TryGetValue("UploadedAtUtc", out var uploadedAtRaw) &&
                DateTimeOffset.TryParse(uploadedAtRaw, out var dto))
            {
                createdAt = dto;
            }
            else
            {
                createdAt = sub.Properties.CreatedOn;
            }

            // Detect if this is a state snapshot
            // State blobs always live under {assetId}/state/.../state.json
            bool isStateBlob = sub.Name.Contains("/state/", StringComparison.OrdinalIgnoreCase)
                               && sub.Name.EndsWith("state.json", StringComparison.OrdinalIgnoreCase);

            if (isStateBlob)
            {
                // figure out the version name
                // examples:
                //   "{assetId}/state/state.json"           -> "latest"
                //   "{assetId}/state/v2/state.json"        -> "v2"
                //   "{assetId}/state/Whatever/state.json"  -> "Whatever"
                var version = ExtractVersionFromStatePath(sub.Name);

                stateFiles.Add(new StateFile
                {
                    Version = version,
                    Name = Path.GetFileName(sub.Name), // probably "state.json"
                    Url = subUri,
                    SizeBytes = sub.Properties.ContentLength,
                    CreatedOn = createdAt,
                    ContentType = sub.Properties.ContentType
                });
            }
            else
            {
                additionalFiles.Add(new AdditionalFile
                {
                    Name = Path.GetFileName(sub.Name),
                    Url = subUri,
                    SizeBytes = sub.Properties.ContentLength,
                    CreatedOn = createdAt,
                    ContentType = sub.Properties.ContentType
                });
            }
        }

        return (additionalFiles, stateFiles);
    }

    private static string ExtractVersionFromStatePath(string blobName)
    {
        // blobName examples:
        //   "0c00fb4d3f8f4ec7bf720e125ae91289/state/state.json"
        //   "0c00fb4d3f8f4ec7bf720e125ae91289/state/v2/state.json"
        //   "0c00fb4d3f8f4ec7bf720e125ae91289/state/WhateverName_I_Like/state.json"

        var parts = blobName.Split('/', StringSplitOptions.RemoveEmptyEntries);

        // find "state" in path
        var idx = Array.IndexOf(parts, "state");
        if (idx == -1)
            return "unknown";

        // case 1: .../state/state.json  → "latest"
        // after "state", next is "state.json"? then it's latest
        if (idx + 1 < parts.Length && parts[idx + 1].Equals("state.json", StringComparison.OrdinalIgnoreCase))
            return "Default";

        // case 2: .../state/v2/state.json → take parts[idx+1] ("v2")
        if (idx + 2 < parts.Length && parts[^1].Equals("state.json", StringComparison.OrdinalIgnoreCase))
            return parts[idx + 1];

        // fallback
        return "Default";
    }

    private static bool Matches(ModelFilterDto filterDto, BlobItem blob, IDictionary<string, string> md)
    {
        var format = GetFormatOrNull(blob.Name);
        if (format is null) return false;

        // FORMAT
        if (!string.IsNullOrWhiteSpace(filterDto.Format) &&
            !string.Equals(format, filterDto.Format, StringComparison.OrdinalIgnoreCase))
            return false;

        // METADATA
        var alias = ReadStringMetadataOrDefault(md, MetaAlias, "Model");
        var categoriesStr = ReadStringMetadataOrNull(md, MetaCategories);
        var categories =
            categoriesStr?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList() ?? [];
        var description = ReadStringMetadataOrNull(md, MetaDescription);
        var fav = ParseBoolMetadata(md, MetaIsFavourite);
        var isNew = ParseBoolMetadata(md, MetaIsNew);

        // IS NEW?
        if (filterDto.IsNew is not null && isNew != filterDto.IsNew.Value)
            return false;

        // IS FAVOURITE?
        if (filterDto.IsFavourite is not null && fav != filterDto.IsFavourite.Value)
            return false;

        // CATEGORY
        if (filterDto.Categories is { Count: > 0 })
        {
            // Require any overlap between filterDto.Categories and blob categories
            if (!categories.Any(c => filterDto.Categories.Contains(c, StringComparer.OrdinalIgnoreCase)))
                return false;
        }

        // QUERY (fuzzy or partial)
        if (!string.IsNullOrWhiteSpace(filterDto.Q))
        {
            var q = filterDto.Q.Trim();
            bool matches =
                Fuzz.PartialRatio(q, alias) > 70 ||
                Fuzz.PartialRatio(q, string.Join(" ", categories)) > 70 ||
                Fuzz.PartialRatio(q, description ?? "") > 70;

            if (!matches) return false;
        }

        return true;
    }

    public async Task<int> CountAsync(ModelFilterDto filterDto, CancellationToken ct = default)
    {
        int count = 0;

        AsyncPageable<BlobItem> pageable = string.IsNullOrWhiteSpace(filterDto.Prefix)
            ? _container.GetBlobsAsync(BlobTraits.Metadata, cancellationToken: ct)
            : _container.GetBlobsAsync(BlobTraits.Metadata, prefix: filterDto.Prefix,
                cancellationToken: ct);

        await foreach (var blob in pageable.WithCancellation(ct))
        {
            var md = blob.Metadata ?? new Dictionary<string, string>();
            if (Matches(filterDto, blob, md))
                count++;
        }

        return count;
    }

    private async Task<ModelFile> BuildModelFileAsync(
        BlobItem blob,
        IDictionary<string, string> md,
        CancellationToken ct)
    {
        var id = TryGetGuidMetadata(md, MetaId) ?? Guid.NewGuid();
        var fileUri = BuildBlobUri(blob.Name);
        var assetId = ReadStringMetadataOrNull(md, MetaAssetId) ?? blob.Name.Split('/', 2)[0];
        var (additional, stateFiles) = await EnumerateFilesAsync(assetId, blob.Name, ct);

        var format = GetFormatOrNull(blob.Name)!;
        var alias = ReadStringMetadataOrDefault(md, MetaAlias, "Model");

        var categoriesStr = ReadStringMetadataOrNull(md, MetaCategories);
        var categories = categoriesStr?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        var description = ReadStringMetadataOrNull(md, MetaDescription);
        var fav = ParseBoolMetadata(md, MetaIsFavourite);
        var isNew = ParseBoolMetadata(md, MetaIsNew);

        return new ModelFile
        {
            Id = id,
            Name = alias,
            Format = format,
            SizeBytes = blob.Properties.ContentLength,
            CreatedOn = blob.Properties.CreatedOn,
            Url = fileUri,
            Categories = categories,
            Description = description,
            AssetId = assetId,
            AdditionalFiles = additional,
            StateFiles = stateFiles,
            IsFavourite = fav,
            IsNew = isNew
        };
    }

    #endregion
}