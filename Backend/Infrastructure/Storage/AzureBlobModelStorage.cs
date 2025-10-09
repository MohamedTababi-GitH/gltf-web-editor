/* 
Brings us azure sdk types:
BlobServiceClient, BlobContainerClient — main entry points for talking to Blob Storage
BlobItem, BlobTraits - listing and inspecting blobs
*/

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using Microsoft.Extensions.Options;

namespace ECAD_Backend.Infrastructure.Storage;

// This class implements the repository/service that connects to Azure Blob Storage
// and lists model files (glTF / glb) stored in the "models" container.
public class AzureBlobModelStorage : IModelStorage
{
    // Represents a specific blob container within the Azure Storage account
    private readonly BlobContainerClient _container;

    // Constructor – runs when this class is created (injected into a controller or service)
    public AzureBlobModelStorage(IOptions<BlobOptions> opts)
    {
        // Grab the BlobOptions section from configuration (via dependency injection)
        var o = opts.Value ?? throw new ArgumentNullException(nameof(opts));

        /*
        // Validate that connection string and container name exist, otherwise throw early error
        if (string.IsNullOrWhiteSpace(o.ConnectionString)) throw new InvalidOperationException("Storage:ConnectionString is missing.");
        if (string.IsNullOrWhiteSpace(o.ContainerModels)) throw new InvalidOperationException("Storage:ContainerModels is missing.");

        // Create a service-level client (represents the Azure Storage account)
        var service = new BlobServiceClient(o.ConnectionString);
        
        // From that service, get a reference to the specific container for model files
        _container = service.GetBlobContainerClient(o.ContainerModels);
        
        */
        _container = new BlobContainerClient(new Uri(o.ConnectionString));


        // Optional: create container automatically if it doesn't exist
        // You can uncomment this for local dev or demos
        //_container.CreateIfNotExists(PublicAccessType.Blob);
    }

    public async Task UploadAsync(string blobName, 
                                  Stream content, 
                                  string contentType, 
                                  IDictionary<string, string>? metadata = null,
                                  CancellationToken ct = default)
    {
        // Validate that the provided blob name is not empty or null
        if (string.IsNullOrWhiteSpace(blobName))
            throw new ArgumentException("Blob name cannot be empty.", nameof(blobName));

        var blobClient = _container.GetBlobClient(blobName);
        
        // Stamp an internal GUID as metadata
        metadata ??= new Dictionary<string, string>();
        
        if (!metadata.ContainsKey("id")) metadata["id"] = Guid.NewGuid().ToString("N");
        var options = new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = contentType },
            Metadata = metadata,
        };
        await blobClient.UploadAsync(content, options, ct);
    }

    // Lists all model files currently stored in the container
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

            // Create a new domain object to represent the file
            result.Add(new ModelFile
            {
                Id = id,
                Name = name,
                Format = format,
                SizeBytes = blob.Properties.ContentLength,
                CreatedOn = blob.Properties.CreatedOn,
                Url = finalUri
            });
        }

        // Return the final list of files to the caller (controller/service)
        return result;
    }
}