using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Cursor;
using ECAD_Backend.Infrastructure.Options;
using FuzzySharp;
using Microsoft.Extensions.Options;

namespace ECAD_Backend.Infrastructure.Storage;

/// <summary>
/// Provides a concrete implementation of <see cref="IModelStorage"/> backed by Azure Blob Storage.
/// </summary>
/// <remarks>
/// This class encapsulates all data-access logic related to 3D model storage and retrieval
/// using Azure Blob Storage.  
/// It supports reading, writing, listing, and deleting model files, along with associated
/// metadata, state files, and baselines.  
/// <para>
/// The class is initialized with a <see cref="BlobContainerClient"/> pointing to the configured container,
/// created either from a full SAS URL or from a standard Azure Storage connection string.
/// </para>
/// </remarks>
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

    #region Initialisation & Constructor

    /// <summary>
    /// Represents the Azure Blob container client used to perform all blob operations.
    /// </summary>
    private readonly BlobContainerClient _container;

    /// <summary>
    /// Provides utilities for serializing and deserializing opaque pagination cursors.
    /// </summary>
    private readonly ICursorSerializer _cursor;

    /// <summary>
    /// Initializes a new instance of the <see cref="AzureBlobModelStorage"/> class
    /// using the provided storage configuration and cursor serializer.
    /// </summary>
    /// <param name="opts">The strongly typed blob storage configuration options.</param>
    /// <param name="cursor">The service responsible for encoding and decoding pagination cursors.</param>
    /// <exception cref="InvalidOperationException">
    /// Thrown when the connection string is missing or invalid in the configuration.
    /// </exception>
    /// <remarks>
    /// The constructor supports both SAS URLs (read/write access via shared access signatures)
    /// and standard Azure Storage connection strings.
    /// When a SAS URL is provided, it is used directly to instantiate the <see cref="BlobContainerClient"/>.
    /// </remarks>
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

    /// <summary>
    /// Lists stored model entries with server-side pagination, applying the provided filter,
    /// and returns an opaque cursor for subsequent pages.
    /// </summary>
    /// <param name="limit">Maximum number of items to return (1–500 recommended).</param>
    /// <param name="cursorRaw">
    /// Optional opaque cursor produced by a previous call; resumes scanning after the last emitted item.
    /// </param>
    /// <param name="filterDto">Filter criteria (format, categories, favourites, prefix, search, etc.).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A tuple containing the current page of <see cref="ModelFile"/> items and the next page cursor (or <c>null</c>).
    /// </returns>
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

    /// <summary>
    /// Uploads a blob to Azure Storage at the specified path with metadata and content type,
    /// enforcing no-overwrite semantics.
    /// </summary>
    /// <param name="blobName">The destination blob name (e.g., <c>{assetId}/model.glb</c>).</param>
    /// <param name="content">The content stream to upload (caller owns lifetime).</param>
    /// <param name="contentType">The MIME type to set on the blob (falls back to <c>application/octet-stream</c>).</param>
    /// <param name="metadata">
    /// Optional metadata to associate with the blob. An internal <c>Id</c> will be stamped if missing.
    /// </param>
    /// <param name="ct">Cancellation token.</param>
    /// <exception cref="ArgumentException">Thrown when <paramref name="blobName"/> is null or whitespace.</exception>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="content"/> is null.</exception>
    /// <remarks>
    /// Uses an <see cref="ETag"/> precondition (<c>If-None-Match: *</c>) to prevent overwriting existing blobs.
    /// </remarks>
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

    /// <summary>
    /// Deletes an entire model by its unique <c>Id</c>, removing the whole
    /// <c>{assetId}/</c> folder when available, or the individual blob otherwise.
    /// </summary>
    /// <param name="id">The model GUID stored in metadata (<c>Id</c>).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// <see langword="true"/> if any blob was deleted; otherwise <see langword="false"/> if no matching model was found.
    /// </returns>
    /// <remarks>
    /// Scans blobs (including metadata) to locate a match. If the entry blob contains an <c>assetId</c>,
    /// <see cref="DeleteByAssetIdAsync"/> is invoked to delete the entire virtual folder.
    /// </remarks>
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

    /// <summary>
    /// Deletes all blobs under the virtual folder <c>{assetId}/</c>.
    /// </summary>
    /// <param name="assetId">The asset folder key (prefix) to delete.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The number of blobs that were deleted.</returns>
    /// <exception cref="ArgumentException">Thrown when <paramref name="assetId"/> is null or whitespace.</exception>
    /// <remarks>
    /// This operation removes the model entry, baseline, state versions, and any additional files under the prefix.
    /// </remarks>
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

    /// <summary>
    /// Updates entry-blob metadata (alias, categories, description, favourite flag) and marks the model as not new.
    /// </summary>
    /// <param name="id">The model GUID stored in blob metadata (<c>Id</c>).</param>
    /// <param name="newAlias">New alias or <c>null</c> to remove.</param>
    /// <param name="categories">New categories or <c>null</c> to remove.</param>
    /// <param name="description">New description or <c>null</c> to remove.</param>
    /// <param name="isFavourite">New favourite flag, or <c>null</c> to remove.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// <see langword="true"/> if at least one matching entry blob was updated; otherwise <see langword="false"/>.
    /// </returns>
    /// <remarks>
    /// Only the entry model blob (<c>.glb</c> or <c>.gltf</c>) is updated.  
    /// Sets <c>isNew=false</c> to indicate the model has been opened/edited.
    /// </remarks>
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

            await client.SetMetadataAsync(metadata, cancellationToken: ct);
            updated = true;
        }

        return updated;
    }

    /// <summary>
    /// Retrieves a single model by its unique identifier, including related files (states, baseline, additional).
    /// </summary>
    /// <param name="id">The model GUID stored in metadata (<c>Id</c>).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A populated <see cref="ModelFile"/> if found; otherwise <c>null</c>.
    /// </returns>
    /// <remarks>
    /// Scans blobs with metadata to locate the entry, then builds a full <see cref="ModelFile"/> using helpers
    /// (e.g., <c>BuildModelFileAsync</c> which augments with state files and baseline).
    /// </remarks>
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

    #region Metadata Operations

    /// <summary>
    /// Marks a model as no longer new (<c>isNew = false</c>) in its blob metadata.
    /// </summary>
    /// <param name="id">The unique identifier (<c>Id</c>) of the model to update.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// Always returns <see langword="true"/> once the update operation completes successfully.
    /// </returns>
    /// <remarks>
    /// This method scans all blobs in the container for one matching the specified model ID
    /// (from blob metadata).  
    /// When a matching model entry file (<c>.glb</c> or <c>.gltf</c>) is found, it updates its metadata
    /// to set <c>isNew</c> to <c>false</c>.  
    /// This is typically called when a model is first opened or modified, ensuring that it no longer
    /// appears as “new” in client-facing lists.
    /// </remarks>
    /// <example>
    /// Typical usage:
    /// <code>
    /// await storage.UpdateIsNewAsync(modelId, cancellationToken);
    /// </code>
    /// </example>
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

    #endregion

    #region State Files

    /// <summary>
    /// Uploads a state or baseline file to Azure Blob Storage, overwriting any existing blob at the same path.
    /// </summary>
    /// <param name="blobName">The full blob name (e.g., <c>{assetId}/state/v1/state.json</c> or <c>{assetId}/baseline/baseline.json</c>).</param>
    /// <param name="content">The stream containing the JSON state data to upload.</param>
    /// <param name="contentType">
    /// The MIME type of the uploaded content.  
    /// Defaults to <c>application/octet-stream</c> if not provided.
    /// </param>
    /// <param name="metadata">
    /// Optional blob metadata to attach.  
    /// If no <c>Id</c> field is provided, a new GUID is automatically assigned.
    /// </param>
    /// <param name="ct">Cancellation token.</param>
    /// <remarks>
    /// Unlike <see cref="UploadAsync"/>, this method **allows overwriting** by design.  
    /// It is typically used for saving user workspace states or baseline snapshots
    /// that may be updated over time.
    /// </remarks>
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

    /// <summary>
    /// Deletes a specific saved state version for a given asset.
    /// </summary>
    /// <param name="assetId">The unique identifier (prefix) of the asset folder.</param>
    /// <param name="version">
    /// The name of the version folder (e.g., <c>v2</c>, <c>test4</c>),  
    /// or <c>state</c>/<c>Default</c> for the latest working copy.
    /// </param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// The number of deleted blobs (returns <c>0</c> if the version folder was empty or missing).
    /// </returns>
    /// <remarks>
    /// - When <paramref name="version"/> equals <c>state</c> or <c>Default</c>,  
    ///   the method deletes the working copy file located at <c>{assetId}/state/state.json</c>.  
    /// - Otherwise, it deletes the entire virtual folder under <c>{assetId}/state/{version}/</c>.  
    /// This allows clients to manage multiple saved state snapshots per model.
    /// </remarks>
    public async Task<int> DeleteStateVersionAsync(string assetId, string version, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ArgumentException("AssetId cannot be empty.", nameof(assetId));
        if (string.IsNullOrWhiteSpace(version))
            throw new ArgumentException("Version cannot be empty.", nameof(version));

        var asset = assetId.Trim().TrimEnd('/');
        var ver = version.Trim().TrimEnd('/');

        // Delete all blobs under the named version folder: {assetId}/state/{version}/
        var prefix = $"{asset}/state/{ver}/";
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

    #endregion

    #region Private Helpers

    /// <summary>
    /// Determines the file format from the blob name based on its file extension.
    /// </summary>
    /// <param name="blobName">The blob name or path (e.g., <c>models/myModel.glb</c>).</param>
    /// <returns>
    /// The file format (<c>"glb"</c> or <c>"gltf"</c>), or <c>null</c> if the extension is unrecognized.
    /// </returns>
    private static string? GetFormatOrNull(string blobName)
    {
        if (blobName.EndsWith(".glb", StringComparison.OrdinalIgnoreCase)) return "glb";
        if (blobName.EndsWith(".gltf", StringComparison.OrdinalIgnoreCase)) return "gltf";
        return null;
    }

    /// <summary>
    /// Determines whether additional eligible items exist after the current blob
    /// within the same Azure blob page.
    /// </summary>
    /// <param name="values">The collection of blob items on the current page.</param>
    /// <param name="currentName">The blob name of the most recently emitted model.</param>
    /// <param name="resume">An optional cursor marker name for pagination.</param>
    /// <param name="f">The current <see cref="ModelFilterDto"/> used for filtering.</param>
    /// <returns>
    /// <see langword="true"/> if another eligible blob exists on the current page; otherwise <see langword="false"/>.
    /// </returns>
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

    /// <summary>
    /// Builds a full, SAS-preserving URI for a blob given its name.
    /// </summary>
    /// <param name="blobName">The name (path) of the blob within the container.</param>
    /// <returns>A <see cref="Uri"/> pointing to the blob.</returns>
    /// <exception cref="ArgumentNullException">Thrown if <paramref name="blobName"/> is null or empty.</exception>
    /// <remarks>
    /// Ensures no leading slash is present before resolving the URI.
    /// </remarks>
    private Uri BuildBlobUri(string blobName)
    {
        if (string.IsNullOrWhiteSpace(blobName))
            throw new ArgumentNullException(nameof(blobName));

        blobName = blobName.TrimStart('/'); // avoid leading slash = different blob name
        return _container.GetBlobClient(blobName).Uri; // includes SAS if the container client has it
    }

    /// <summary>
    /// Attempts to extract a <see cref="Guid"/> value from blob metadata by key.
    /// </summary>
    /// <param name="metadata">The blob metadata dictionary.</param>
    /// <param name="key">The metadata key to lookup.</param>
    /// <returns>The parsed <see cref="Guid"/> value, or <c>null</c> if parsing fails.</returns>
    private static Guid? TryGetGuidMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var idStr) && Guid.TryParse(idStr, out var g) ? g : null;

    /// <summary>
    /// Reads a string value from metadata or returns <c>null</c> if missing or whitespace.
    /// </summary>
    private static string? ReadStringMetadataOrNull(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var v) && !string.IsNullOrWhiteSpace(v) ? v : null;

    /// <summary>
    /// Reads a string value from metadata, returning a provided default if missing or invalid.
    /// </summary>
    private static string ReadStringMetadataOrDefault(IDictionary<string, string> metadata, string key, string @default)
        => ReadStringMetadataOrNull(metadata, key) ?? @default;

    /// <summary>
    /// Reads and parses a boolean metadata entry.
    /// </summary>
    /// <returns><see langword="true"/> if the metadata value exists and parses as true; otherwise false.</returns>
    private static bool ParseBoolMetadata(IDictionary<string, string> metadata, string key)
        => metadata.TryGetValue(key, out var s) && bool.TryParse(s, out var b) && b;

    /// <summary>
    /// Checks whether a blob’s metadata <c>Id</c> matches the specified model ID.
    /// </summary>
    private static bool TryMatchesId(IDictionary<string, string> metadata, Guid id)
        => metadata.TryGetValue(MetaId, out var idStr)
           && Guid.TryParse(idStr, out var metaId)
           && metaId == id;

    /// <summary>
    /// Enumerates all files related to an asset, classifying them as additional files or state snapshots.
    /// Excludes the main model blob and baseline file.
    /// </summary>
    /// <param name="assetId">The asset folder identifier (prefix).</param>
    /// <param name="entryBlobName">The blob name of the main model file.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A tuple containing:
    /// <list type="bullet">
    /// <item><description><c>additional</c> — non-model, non-state, non-baseline blobs.</description></item>
    /// <item><description><c>state</c> — recognized saved states under <c>{assetId}/state/…/state.json</c>.</description></item>
    /// </list>
    /// </returns>
    /// <remarks>
    /// Used internally when building a complete <see cref="ModelFile"/> representation
    /// with associated state and auxiliary files.
    /// </remarks>
    private async Task<(List<AdditionalFile> additional, List<StateFile> state)> EnumerateFilesAsync(
        string assetId,
        string entryBlobName,
        CancellationToken ct)
    {
        var additionalFiles = new List<AdditionalFile>();
        var stateFiles = new List<StateFile>();

        var prefix = assetId.TrimEnd('/') + "/";

        await foreach (var sub in _container.GetBlobsAsync(
                           traits: BlobTraits.Metadata,
                           states: BlobStates.None,
                           prefix: prefix,
                           cancellationToken: ct))
        {
            // skip the main model file
            if (string.Equals(sub.Name, entryBlobName, StringComparison.OrdinalIgnoreCase))
                continue;

            // 2) Baseline: exclude from additional — it’s handled separately via GetBaselineAsync
            if (sub.Name.StartsWith($"{assetId}/baseline/", StringComparison.OrdinalIgnoreCase))
                continue;

            // 3) State snapshots: collect only {assetId}/state/.../state.json
            if (sub.Name.StartsWith($"{assetId}/state/", StringComparison.OrdinalIgnoreCase) &&
                sub.Name.EndsWith("/state.json", StringComparison.OrdinalIgnoreCase))
            {
                var subUri = BuildBlobUri(sub.Name);

                // Extract timestamp:
                // Priority: custom metadata["UploadedAtUtc"] we wrote in SaveStateAsync
                // Fallback: blob.Properties.CreatedOn
                DateTimeOffset? createdAt;
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

                stateFiles.Add(new StateFile
                {
                    Version = ExtractVersionFromStatePath(assetId, sub.Name),
                    Name = Path.GetFileName(sub.Name), // "state.json"
                    Url = subUri,
                    SizeBytes = sub.Properties.ContentLength,
                    CreatedOn = createdAt,
                    ContentType = sub.Properties.ContentType
                });

                continue;
            }

            // 4) Everything else under {assetId}/... goes to Additional
            {
                var subUri = BuildBlobUri(sub.Name);

                // Timestamp preference: metadata["UploadedAtUtc"] > blob.Properties.CreatedOn
                DateTimeOffset? createdAt;
                if (sub.Metadata != null &&
                    sub.Metadata.TryGetValue("UploadedAtUtc", out var uploadedAtRaw2) &&
                    DateTimeOffset.TryParse(uploadedAtRaw2, out var dto2))
                {
                    createdAt = dto2;
                }
                else
                {
                    createdAt = sub.Properties.CreatedOn;
                }

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

    /// <summary>
    /// Extracts the logical version name from a blob path under <c>{assetId}/state/</c>.
    /// </summary>
    /// <param name="assetId">The asset identifier prefix.</param>
    /// <param name="fullBlobName">The full blob name (e.g., <c>{assetId}/state/v2/state.json</c>).</param>
    /// <returns>
    /// The version string (e.g., <c>"v2"</c>, <c>"test"</c>),  
    /// or <c>"Default"</c> if no version subfolder exists.
    /// </returns>
    /// <remarks>
    /// This helper normalizes malformed or missing paths to <c>"Default"</c> for safety.
    /// </remarks>
    private static string ExtractVersionFromStatePath(string assetId, string fullBlobName)
    {
        var prefix = assetId.TrimEnd('/') + "/state/";
        if (!fullBlobName.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return "unknown";

        var rest = fullBlobName.Substring(prefix.Length);

        // No subfolder → Default
        if (string.IsNullOrWhiteSpace(rest) ||
            rest.Equals("state.json", StringComparison.OrdinalIgnoreCase) ||
            rest.Equals("/", StringComparison.OrdinalIgnoreCase))
        {
            return "Default";
        }

        // Folder version case: "{version}/state.json"
        var slashIdx = rest.IndexOf('/');
        if (slashIdx > 0)
        {
            var version = rest[..slashIdx];
            if (string.IsNullOrWhiteSpace(version))
                return "Default";

            return version.Trim();
        }

        // Fallback — if somehow the structure is malformed
        return "Default";
    }

    /// <summary>
    /// Checks whether a blob matches the provided filter criteria.
    /// </summary>
    /// <param name="filterDto">The active model filter DTO.</param>
    /// <param name="blob">The blob item to inspect.</param>
    /// <param name="md">The blob metadata dictionary.</param>
    /// <returns>
    /// <see langword="true"/> if the blob passes all filtering rules; otherwise <see langword="false"/>.
    /// </returns>
    /// <remarks>
    /// Used during listing and counting operations to apply client-side filters on metadata,
    /// such as format, category, favourite flag, or fuzzy query matching.
    /// </remarks>
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

    /// <summary>
    /// Counts how many blobs match the given <see cref="ModelFilterDto"/> conditions.
    /// </summary>
    /// <param name="filterDto">Filtering options to apply (format, favourite, category, etc.).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>The number of matching blobs in the container.</returns>
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


    /// <summary>
    /// Builds a <see cref="ModelFile"/> object from a blob and its metadata,
    /// enriching it with additional, state, and baseline file information.
    /// </summary>
    /// <param name="blob">The entry blob representing the model file.</param>
    /// <param name="md">The associated metadata dictionary.</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>A populated <see cref="ModelFile"/> instance.</returns>
    /// <remarks>
    /// Central method used when listing or retrieving models by ID.
    /// Calls <see cref="EnumerateFilesAsync"/> to gather related assets and <see cref="GetBaselineAsync"/> for baseline info.
    /// </remarks>
    private async Task<ModelFile> BuildModelFileAsync(
        BlobItem blob,
        IDictionary<string, string> md,
        CancellationToken ct)
    {
        var id = TryGetGuidMetadata(md, MetaId) ?? Guid.NewGuid();
        var fileUri = BuildBlobUri(blob.Name);
        var assetId = ReadStringMetadataOrNull(md, MetaAssetId) ?? blob.Name.Split('/', 2)[0];
        var (additional, stateFiles) = await EnumerateFilesAsync(assetId, blob.Name, ct);
        var baseline = await GetBaselineAsync(assetId, ct);

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
            Baseline = baseline,
            IsFavourite = fav,
            IsNew = isNew
        };
    }

    /// <summary>
    /// Retrieves the baseline file (if present) for the specified asset.
    /// </summary>
    /// <param name="assetId">The asset identifier (folder prefix).</param>
    /// <param name="ct">Cancellation token.</param>
    /// <returns>
    /// A <see cref="StateFile"/> representing the baseline snapshot,
    /// or <c>null</c> if no baseline file exists.
    /// </returns>
    /// <remarks>
    /// Looks for <c>{assetId}/baseline/baseline.json</c> and returns its metadata and URL.
    /// This file represents the model’s saved baseline state, distinct from state versions.
    /// </remarks>
    private async Task<StateFile?> GetBaselineAsync(string assetId, CancellationToken ct)
    {
        var blobName = $"{assetId.TrimEnd('/')}/baseline/baseline.json";
        var client = _container.GetBlobClient(blobName);

        try
        {
            var props = await client.GetPropertiesAsync(cancellationToken: ct);
            var uri = BuildBlobUri(blobName);

            return new StateFile
            {
                Version = "baseline", // optional: helpful in logs/UI
                Name = "baseline.json",
                Url = uri,
                SizeBytes = props.Value.ContentLength,
                CreatedOn = props.Value.CreatedOn,
                ContentType = props.Value.ContentType
            };
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            return null; // no baseline present
        }
    }

    #endregion
}