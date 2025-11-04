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
    /// Updates the metadata details for the model with the specified ID.
    /// </summary>
    /// <param name="id">The unique identifier of the model to update.</param>
    /// <param name="newAlias">The new alias for the model. If null, the existing alias is retained.</param>
    /// <param name="categories">The updated list of categories. If null, existing categories are retained.</param>
    /// <param name="description">The new description for the model. If null, the existing description is retained.</param>
    /// <param name="isFavourite">The new favourite status for the model. If null, the existing status is retained.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>True if the update was successful; otherwise, false.</returns>
    Task<bool> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken ct = default
    );

    Task<bool> UpdateDetailsAsync
    (
        Guid id,
        Dictionary<string, string> newMetadata,
        CancellationToken ct = default
    );

    /// <summary>
    /// Updates the 'IsNew' status for the model with the specified ID.
    /// </summary>
    /// <param name="id">The unique identifier of the model to update.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>True if the update was successful; otherwise, false.</returns>
    Task<bool> UpdateIsNewAsync(Guid id, CancellationToken ct = default);

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
    
    Task<ModelFile?> GetByIdAsync(Guid id, CancellationToken ct);
}