using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Interfaces;

/// <summary>
/// Abstraction for storage operations related to model files.
/// </summary>
public interface IModelStorage
{
    /// <summary>
    /// Retrieves a paginated list of model files asynchronously.
    /// </summary>
    /// <param name="limit">The maximum number of items to return in this page.</param>
    /// <param name="cursor">The cursor for pagination, indicating where to start fetching the next set of results.</param>
    /// <param name="filterDto">The filter criteria to apply to the model list.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>A tuple containing the list of model files and an optional cursor for the next page.</returns>
    Task<(IReadOnlyList<ModelFile> Items, string? NextCursor)> ListPageAsync(
        int limit,
        string? cursor,
        ModelFilterDto filterDto,
        CancellationToken ct = default
    );

    /// <summary>
    /// Uploads a model file to storage asynchronously.
    /// </summary>
    /// <param name="blobName">The name of the blob or file to upload.</param>
    /// <param name="content">The stream containing the content to upload.</param>
    /// <param name="contentType">The MIME type of the content.</param>
    /// <param name="metadata">Optional metadata to associate with the uploaded file.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>A task representing the asynchronous upload operation.</returns>
    Task UploadAsync(
        string blobName,
        Stream content,
        string contentType,
        IDictionary<string, string>? metadata = null,
        CancellationToken ct = default
    );

    /// <summary>
    /// Deletes all blobs associated with the specified model ID.
    /// </summary>
    /// <param name="id">The unique identifier of the model.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>True if the deletion was successful; otherwise, false.</returns>
    Task<bool> DeleteByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>
    /// Deletes all blobs under the virtual folder of an asset.
    /// </summary>
    /// <param name="assetId">The identifier of the asset whose blobs should be deleted.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>The number of blobs deleted.</returns>
    Task<int> DeleteByAssetIdAsync(string assetId, CancellationToken ct = default);

    /// <summary>
    /// Updates metadata for the entry blob of a model identified by <paramref name="id"/>.
    /// Applies <paramref name="setMetadata"/> (upserts keys) and removes any keys in <paramref name="removeKeys"/>.
    /// Returns true if the model was found and updated.
    /// </summary>
    Task<bool> UpdateDetailsAsync(
        Guid id,
        IDictionary<string, string> setMetadata,
        IEnumerable<string> removeKeys,
        CancellationToken ct);

    /// <summary>
    /// Counts the total number of models matching the specified filter criteria.
    /// </summary>
    /// <param name="filterDto">The filter criteria to apply.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>The total number of models matching the filter criteria.</returns>
    Task<int> CountAsync(ModelFilterDto filterDto, CancellationToken ct = default);

    /// <summary>
    /// Uploads a new blob or overwrites an existing one with the same name.
    /// </summary>
    /// <param name="blobName">The name of the blob to upload or overwrite.</param>
    /// <param name="content">The stream containing the content to upload.</param>
    /// <param name="contentType">The MIME type of the content.</param>
    /// <param name="metadata">Optional metadata to associate with the uploaded file.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>A task representing the asynchronous upload operation.</returns>
    Task UploadOrOverwriteAsync(
        string blobName,
        Stream content,
        string contentType,
        IDictionary<string, string>? metadata = null,
        CancellationToken ct = default);

    /// <summary>
    /// Deletes all blobs under {assetId}/state/{version}/.
    /// Returns the number of deleted blobs (0 if the version folder was empty or missing).
    /// </summary>
    Task<int> DeleteStateVersionAsync(string assetId, string version, CancellationToken ct);

    Task<ModelFile?> GetByIdAsync(Guid id, CancellationToken ct);
}