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
/// Provides methods to upload model files and list model files stored in an Azure Blob Storage container.
/// </summary>
public class AzureBlobModelStorage : IModelStorage
{
    // Represents a specific blob container within the Azure Storage account
    private readonly BlobContainerClient _container;

    /// <summary>
    /// Initializes a new instance of the <see cref="AzureBlobModelStorage"/> class.
    /// Configures the Blob container client using provided BlobOptions.
    /// </summary>
    /// <param name="opts">The options containing connection string and container name.</param>
    /// <exception cref="ArgumentNullException">Thrown if <paramref name="opts"/> is null.</exception>
    /// <exception cref="InvalidOperationException">Thrown if required configuration values are missing.</exception>
    public AzureBlobModelStorage(IOptions<BlobOptions> opts)
    {
        // Grab the BlobOptions section from configuration (via dependency injection)
        var o = opts.Value ?? throw new ArgumentNullException(nameof(opts));
        
        if (string.IsNullOrWhiteSpace(o.ConnectionString))
            throw new InvalidOperationException("Storage:ConnectionString is missing.");
        if (string.IsNullOrWhiteSpace(o.ContainerModels))
            throw new InvalidOperationException("Storage:ContainerModels is missing.");
        
        _container = new BlobContainerClient(new Uri(o.ConnectionString));
        
        // test if works the following way 
        // var service = new BlobServiceClient(o.ConnectionString);
        // _container = service.GetBlobContainerClient(o.ContainerModels);
    }

    /// <summary>
    /// Uploads a blob (model file) to the Azure Blob Storage container.
    /// </summary>
    /// <param name="blobName">The name of the blob to upload.</param>
    /// <param name="content">The content stream of the blob.</param>
    /// <param name="contentType">The content type (MIME type) of the blob.</param>
    /// <param name="metadata">Optional metadata to attach to the blob.</param>
    /// <param name="ct">Cancellation token for the async operation.</param>
    /// <returns>A task that represents the asynchronous upload operation.</returns>
    /// <exception cref="ArgumentException">Thrown if <paramref name="blobName"/> is null or whitespace.</exception>
    /// <exception cref="ArgumentNullException">Thrown if <paramref name="content"/> is null.</exception>
    public async Task UploadAsync(
        string blobName, 
        Stream content, 
        string contentType, 
        IDictionary<string, string>? metadata = null,
        CancellationToken ct = default)
    {
        // Validate that the provided blob name is not empty or null
        if (string.IsNullOrWhiteSpace(blobName))
            throw new ArgumentException("Blob name cannot be empty.", nameof(blobName));
        
        if (content == null) 
            throw new ArgumentNullException(nameof(content));

        var blobClient = _container.GetBlobClient(blobName);
        
        // Stamp an internal GUID as metadata
        metadata ??= new Dictionary<string, string>();
        
        if (!metadata.ContainsKey("Id")) metadata["Id"] = Guid.NewGuid().ToString("N");
        var options = new BlobUploadOptions
        {
            // HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
            HttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrEmpty(contentType) ? "application/octet-stream" : contentType
            },
            Metadata = metadata,
            Conditions = new BlobRequestConditions { IfNoneMatch = ETag.All } // No overwrites
        };
        await blobClient.UploadAsync(content, options, ct);
    }

    /// <summary>
    /// Lists all model files currently stored in the Azure Blob Storage container.
    /// Only files with .glb or .gltf extensions are included.
    /// </summary>
    /// <param name="ct">Cancellation token for the async operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a read-only list of <see cref="ModelFile"/> objects.</returns>
    // TODO : REFACTOR
    public async Task<IReadOnlyList<ModelFile>> ListAsync(CancellationToken ct = default)
    {
        // Create an empty list to hold our domain objects (ModelFile)
        var result = new List<ModelFile>();

        // Async enumeration through all blobs in the container
        // BlobTraits.Metadata → includes metadata in results
        // BlobStates.None → no special blob states (snapshots, versions, etc.)
        await foreach (BlobItem blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None,
                           cancellationToken: ct))
        {
            // Get Blob name (filename)
            var name = blob.Name;

            // Ensure we only accept .glb and .gltf
            var format = name.EndsWith(".glb", StringComparison.OrdinalIgnoreCase) ? "glb" : name.EndsWith(".gltf", StringComparison.OrdinalIgnoreCase) ? "gltf" : null;

            // If file is not one of the supported formats, skip it
            if (format is null) continue;

            // Construct a public URL (works if the container has public read access)
            // e.g., https://mystorage.blob.core.windows.net/models/connector.glb
            var url = new Uri($"{_container.Uri}/{Uri.EscapeDataString(name)}");
            var temp = _container.Uri.ToString();  // convert Uri to string
            var parts = temp.Split('?', 2);        // split into base and query, max 2 parts

            string finalURL;

            if (parts.Length == 2)
            {
                finalURL = parts[0] + '/' + Uri.EscapeDataString(name) + '?' + parts[1];
            }
            else
            {
                finalURL = parts[0] + '/' + Uri.EscapeDataString(name);
            }
            var finalUri = new Uri(finalURL);
            Console.WriteLine("url is: " + finalURL);
            
            var id = blob.Metadata.ContainsKey("Id") ? Guid.Parse(blob.Metadata["Id"]) : Guid.NewGuid();
            var alias = blob.Metadata.ContainsKey("alias") ? blob.Metadata["alias"] : "Model";


            // Create a new domain object to represent the file
            result.Add(new ModelFile
            {
                Id = id,
                Name = alias,
                Format = format,
                SizeBytes = blob.Properties.ContentLength,
                CreatedOn = blob.Properties.CreatedOn,
                Url = finalUri
            });
        }

        // Return the final list of files to the caller (controller/service)
        return result;
    }
    public async Task<bool> DeleteByIdAsync(Guid id, CancellationToken ct = default)
    {
        bool anyDeleted = false;

        await foreach (var blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, states: BlobStates.None, cancellationToken: ct))
        {
            if (blob.Metadata != null &&
                blob.Metadata.TryGetValue("Id", out var idStr) &&
                Guid.TryParse(idStr, out var metaId) &&
                metaId == id)
            {
                // Delete by prefix to be safe:
                if (blob.Metadata.TryGetValue("assetId", out var assetId) && !string.IsNullOrWhiteSpace(assetId))
                {
                    // Delete everything under {assetId}/
                    await DeleteByAssetIdAsync(assetId, ct);
                    anyDeleted = true;
                }
                else
                {
                    // Fallback: delete just this one blob
                    var client = _container.GetBlobClient(blob.Name);
                    await client.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, conditions: null, cancellationToken: ct);
                    anyDeleted = true;
                }
                // no break on purpose if multiple blobs share the same Id (unlikely but harmless)
            }
        }

        return anyDeleted;
    }
    public async Task<int> DeleteByAssetIdAsync(string assetId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new ArgumentException("Asset id required.", nameof(assetId));

        var prefix = assetId.TrimEnd('/') + "/";
        int count = 0;

        await foreach (var blob in _container.GetBlobsAsync(prefix: prefix, cancellationToken: ct))
        {
            var client = _container.GetBlobClient(blob.Name);
            var resp = await client.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, conditions: null, cancellationToken: ct);
            if (resp.Value) count++;
        }

        return count;
    }
    public async Task<bool> UpdateAliasAsync(Guid id, string newAlias, CancellationToken ct = default)
    {
        bool updated = false;

        await foreach (var blob in _container.GetBlobsAsync(traits: BlobTraits.Metadata, cancellationToken: ct))
        {
            if (blob.Metadata != null &&
                blob.Metadata.TryGetValue("Id", out var idStr) &&
                Guid.TryParse(idStr, out var metaId) &&
                metaId == id)
            {
                var client = _container.GetBlobClient(blob.Name);

                // Copy existing metadata
                var metadata = new Dictionary<string, string>(blob.Metadata, StringComparer.OrdinalIgnoreCase)
                {
                    ["alias"] = newAlias
                };

                // Apply
                await client.SetMetadataAsync(metadata, cancellationToken: ct);
                updated = true;
            }
        }
        return updated;
    }
    
}