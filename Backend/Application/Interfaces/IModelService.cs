using ECAD_Backend.Application.DTOs;
namespace ECAD_Backend.Application.Interfaces;

/// <summary>
/// Defines the contract for model-related operations within the application.
/// </summary>
public interface IModelService
{
    /// <summary>
    /// Retrieves a read-only list of model items asynchronously.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing a list of <see cref="ModelItemDto"/>.</returns>
    Task<IReadOnlyList<ModelItemDto>> ListAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Uploads a model asynchronously based on the specified request data.
    /// </summary>
    /// <param name="request">The request containing model upload details.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing the upload result as <see cref="UploadResultDto"/>.</returns>
    Task<UploadResultDto> UploadAsync(UploadModelRequest request, CancellationToken cancellationToken);
}