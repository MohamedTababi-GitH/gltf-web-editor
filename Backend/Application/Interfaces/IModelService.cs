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
    /// Locks a model in memory to prevent other operations (such as delete or update) 
    /// from being executed concurrently on the same model.
    /// </summary>
    /// <param name="id">The unique model identifier.</param>
    /// <exception cref="ModelLockedException">
    /// Thrown if the model is already locked by another user or process.
    /// </exception>
    void LockModel(Guid id);
    
    /// <summary>
    /// Releases the lock for a model, allowing other operations to access or modify it again.
    /// </summary>
    /// <param name="id">The unique model identifier.</param>
    void UnlockModel(Guid id);
    
    /// <summary>
    /// Extends the duration of an existing lock, proving the client is still active.
    /// </summary>
    /// <param name="id">The unique model identifier.</param>
    void Heartbeat(Guid id);
    
    /// <summary>
    /// Retrieves a read-only list of model items asynchronously.
    /// </summary>
    /// <param name="limit">The maximum number of items to return.</param>
    /// <param name="cursor">The pagination cursor for fetching the next set of results.</param>
    /// <param name="filterDto">The filter criteria to apply to the model list.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing a paginated list of <see cref="ModelItemDto"/>.</returns>
    Task<PageResultDto<ModelItemDto>> ListAsync(int limit, string? cursor, ModelFilterDto filterDto,
        CancellationToken cancellationToken);

    /// <summary>
    /// Deletes a model by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the model to delete.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing a boolean indicating whether the deletion was successful.</returns>
    Task<bool> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken);

    /// <summary>
    /// Updates the metadata of a model by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the model to update.</param>
    /// <param name="newAlias">The new alias for the model. If null, the existing alias is retained.</param>
    /// <param name="categories">The updated list of categories. If null, existing categories are retained.</param>
    /// <param name="description">The new description for the model. If null, the existing description is retained.</param>
    /// <param name="isFavourite">The new favourite status for the model. If null, the existing status is retained.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing the update result.</returns>
    Task<UpdateDetailsResultDto> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken);

    /// <summary>
    /// Updates the 'IsNew' status of a model by its unique identifier.
    /// </summary>
    /// <param name="id">The unique identifier of the model to update.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A task representing the asynchronous operation, containing the update result.</returns>
    Task<UpdateDetailsResultDto> UpdateIsNewAsync(
        Guid id,
        CancellationToken cancellationToken
    );
    
    /// <summary>
    /// Retrieves a specific model by its unique identifier.
    /// </summary>
    /// <param name="id">The unique ID of the model.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>
    /// The <see cref="ModelItemDto"/> representing the model, or throws <see cref="NotFoundException"/> if not found.
    /// </returns>
    Task<ModelItemDto> GetByIdAsync(Guid id, CancellationToken cancellationToken);
}