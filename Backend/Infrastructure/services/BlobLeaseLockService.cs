using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Specialized;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Options;
using Microsoft.Extensions.Options;

namespace ECAD_Backend.Infrastructure.Services;
/// <summary>
/// Implements a distributed lock using Azure Blob Storage leases.
/// A dedicated container is used to store zero-byte "lock files".
/// </summary>
public sealed class BlobLeaseLockService : ILockService
{
    private readonly BlobContainerClient _container;

    public BlobLeaseLockService(IOptions<BlobOptions> opts)
    {
        var o = opts.Value;

        if (string.IsNullOrWhiteSpace(o.ConnectionString))
            throw new InvalidOperationException("The storage connection string is missing.");

        // A separate container for locks is recommended to keep them isolated from your data.
        const string lockContainerName = "app-locks";

        var service = new BlobServiceClient(o.ConnectionString);
        _container = service.GetBlobContainerClient(lockContainerName);
    }

    /// <summary>
    /// Ensures the lock container exists. Called once at startup.
    /// </summary>
    public async Task InitializeAsync(CancellationToken cancellationToken)
    {
        await _container.CreateIfNotExistsAsync(cancellationToken: cancellationToken);
    }

    public async Task<string?> TryAcquireLockAsync(string key, TimeSpan duration, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Lock key cannot be empty.", nameof(key));

        var blobClient = _container.GetBlobClient(key);
        var leaseClient = blobClient.GetBlobLeaseClient();

        // Ensure the blob exists so we can place a lease on it.
        // This is an idempotent operation.
        if (!await blobClient.ExistsAsync(cancellationToken))
        {
            await blobClient.UploadAsync(Stream.Null, overwrite: false, cancellationToken);
        }

        try
        {
            // Attempt to acquire the lease. If the blob is already leased, this will throw an exception.
            var response = await leaseClient.AcquireAsync(duration, cancellationToken: cancellationToken);
            return response.Value.LeaseId;
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 409) // Conflict
        {
            // This status code (409) indicates that the lease is already held by someone else.
            return null;
        }
    }

    public async Task ReleaseLockAsync(string key, string lockId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Lock key cannot be empty.", nameof(key));
        if (string.IsNullOrWhiteSpace(lockId))
            throw new ArgumentException("Lock ID cannot be empty.", nameof(lockId));

        var leaseClient = _container.GetBlobClient(key).GetBlobLeaseClient(lockId);
        await leaseClient.ReleaseAsync(cancellationToken: cancellationToken);
    }

    public ValueTask DisposeAsync()
    {
        // No-op for this implementation
        return ValueTask.CompletedTask;
    }
}
