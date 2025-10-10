using ECAD_Backend.Domain.Entities;
namespace ECAD_Backend.Application.Interfaces;

/// <summary>
/// Abstraction for storage operations related to model files.
/// </summary>
public interface IModelStorage
{
    /// <summary>
    /// Retrieves a read-only list of all model files asynchronously.
    /// </summary>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a read-only list of <see cref="ModelFile"/> instances.</returns>
    Task<IReadOnlyList<ModelFile>> ListAsync(CancellationToken ct = default);

    /// <summary>
    /// Uploads a model file to storage asynchronously.
    /// </summary>
    /// <param name="blobName">The name of the blob or file to upload.</param>
    /// <param name="content">The stream containing the content to upload.</param>
    /// <param name="contentType">The MIME type of the content.</param>
    /// <param name="metadata">Optional metadata to associate with the uploaded file.</param>
    /// <param name="ct">A cancellation token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous upload operation.</returns>
    Task UploadAsync(string blobName, 
                     Stream content, 
                     string contentType, 
                     IDictionary<string, string>? metadata = null,
                     CancellationToken ct = default);
}