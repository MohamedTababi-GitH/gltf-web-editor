using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.Application.Interfaces;

/// <summary>
/// Defines the contract for model-related operations within the application.
/// </summary>
public interface IModelService
{
    /// <summary>
    /// Retrieves a read-only list of model items asynchronously.
    /// </summary>
    /// <param name="limit"></param>
    /// <param name="cursor"></param>
    /// <param name="filter"></param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing a list of <see cref="ModelItemDto"/>.</returns>
    Task<PageResult<ModelItemDto>> ListAsync(int limit, string? cursor, ModelFilter filter, CancellationToken cancellationToken);

    /// <summary>
    /// Uploads a model asynchronously based on the specified request data.
    /// </summary>
    /// <param name="request">The request containing model upload details.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing the upload result as <see cref="UploadResultDto"/>.</returns>
    Task<UploadResultDto> UploadAsync(
        UploadModelRequest request,
        CancellationToken cancellationToken);

    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken);

    /// <summary>
    /// Updates the alias metadata of a model by its Id.
    /// </summary>
    Task<UpdateDetailsResultDto> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken);

    Task<UpdateDetailsResultDto> UpdateIsNewAsync
    (
        Guid id,
        CancellationToken cancellationToken
    );

    Task<UpdateResultDto> SaveStateAsync( UpdateStateRequest request, CancellationToken cancellationToken);
}