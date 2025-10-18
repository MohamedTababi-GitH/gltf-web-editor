using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
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

    public async Task<IReadOnlyList<ModelFile>> ListAsync(CancellationToken ct = default)
    {
        var result = new List<ModelFile>();

        await foreach (var blob in _container.GetBlobsAsync(
                           traits: BlobTraits.Metadata,
                           states: BlobStates.None,
                           cancellationToken: ct))
        {
            var name = blob.Name;
            var format = GetFormatOrNull(name);
            if (format is null) continue; // only entry .glb/.gltf

            // Build SAS-preserving URL for entry file
            var fileUri = BuildBlobUri(name);

            // Id
            var id = TryGetGuidMetadata(blob.Metadata, MetaId) ?? Guid.NewGuid();

            // Alias/Category/Description/Favourite
            var alias = ReadStringMetadataOrDefault(blob.Metadata, MetaAlias, "Model");
            var category = ReadStringMetadataOrNull(blob.Metadata, MetaCategory);
            var description = ReadStringMetadataOrNull(blob.Metadata, MetaDescription);
            var isFavourite = ParseBoolMetadata(blob.Metadata, MetaIsFavourite);

            // Determine assetId
            var assetId = ReadStringMetadataOrNull(blob.Metadata, MetaAssetId);
            if (string.IsNullOrWhiteSpace(assetId))
            {
                // fallback to first virtual folder segment
                assetId = name.Split('/', 2)[0];
            }

            // Collect additional files under the same folder (skip entry)
            var additional = await EnumerateAdditionalFilesAsync(assetId!, name, ct);

            result.Add(new ModelFile
            {
                Id = id,
                Name = alias,
                Format = format,
                SizeBytes = blob.Properties.ContentLength,
                CreatedOn = blob.Properties.CreatedOn,
                Url = fileUri,
                Category = category,
                Description = description,
                AssetId = assetId,
                AdditionalFiles = additional,
                IsFavourite = isFavourite
            });
        }

        return result;
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