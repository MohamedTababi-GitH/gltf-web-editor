using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Mappers.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for managing existing 3D model metadata.
/// Handles listing, updating details, deleting models, and clearing "isNew" flags.
/// 
/// This service doesn't handle file uploads or editor state persistence —
/// those are managed by <see cref="IModelUploadService"/> and <see cref="IModelStateService"/> respectively.
/// </summary>
public sealed class ModelService(IModelStorage storage, IModelMapper mapper, IMutexService mutexService) : IModelService
{
    private readonly IMutexService _mutex = mutexService;
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

    //Authour: Zou
    /// <summary>
    /// Locks a model in memory to prevent other operations (such as delete or update) 
    /// from being executed concurrently on the same model.
    /// </summary>
    /// <param name="id">The unique model identifier.</param>
    /// <exception cref="ModelLockedException">
    /// Thrown if the model is already locked by another user or process.
    /// </exception>
    public void LockModel(Guid id)
    {
        _mutex.AcquireLock(id);
    }
    /// <summary>
    /// Releases the lock for a model, allowing other operations to access or modify it again.
    /// </summary>
    /// <param name="id">The unique model identifier.</param>
    public void UnlockModel(Guid id)
    {
        _mutex.ReleaseLock(id);
    }
    
    // -----

    #region CRUD Operations

    public async Task<ModelItemDto> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is invalid.");

        var modelFile = await storage.GetByIdAsync(id, cancellationToken);
        if (modelFile is null)
            throw new NotFoundException($"No model was found with ID '{id}'.");

        return mapper.ToDto(modelFile);
    }

    /// <summary>
    /// Returns a paginated list of stored model entries based on filter criteria.
    /// </summary>
    /// <param name="limit">
    /// The maximum number of items to return in this page. Must be between 1 and 100.
    /// </param>
    /// <param name="cursor">
    /// An opaque continuation token returned by a previous call to <see cref="ListAsync"/>.
    /// Pass <c>null</c> to start from the beginning.
    /// </param>
    /// <param name="filterDto">
    /// Optional filter criteria (categories, format, search text, etc.).
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// A <see cref="PageResultDto{T}"/> containing:
    /// <list type="bullet">
    /// <item><description><c>Items</c> – the mapped model entries for this page</description></item>
    /// <item><description><c>NextCursor</c> – a token to request the next page, or <c>null</c> if there are no more results</description></item>
    /// <item><description><c>HasMore</c> – whether another page is available</description></item>
    /// <item><description><c>TotalCount</c> – total number of items that match the filter</description></item>
    /// </list>
    /// </returns>
    /// <exception cref="ArgumentOutOfRangeException">
    /// Thrown if <paramref name="limit"/> is outside the allowed range.
    /// </exception>
    public async Task<PageResultDto<ModelItemDto>> ListAsync(
        int limit, string? cursor, ModelFilterDto filterDto, CancellationToken cancellationToken)
    {
        if (limit <= 0 || limit > 100)
            throw new ArgumentOutOfRangeException(nameof(limit), "The page limit must be between 1 and 100.");

        var (files, next) = await storage.ListPageAsync(limit, cursor, filterDto, cancellationToken);
        var items = files.Select(mapper.ToDto).ToList();

        next = string.IsNullOrWhiteSpace(next) ? null : next;

        // hasMore strictly follows whether we returned a usable nextCursor
        var hasMore = next is not null;
        var total = await storage.CountAsync(filterDto, cancellationToken);

        return new PageResultDto<ModelItemDto>(items, next, hasMore, total);
    }

    /// <summary>
    /// Deletes an existing model (and all of its associated blobs) by logical model ID.
    /// </summary>
    /// <param name="id">
    /// The model's <c>Id</c> (not the <c>assetId</c> / blob folder name).
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// <c>true</c> if the model was found and deleted; otherwise throws.
    /// </returns>
    /// <remarks>
    /// This is a logical delete that delegates to the storage layer.
    /// The storage layer is responsible for locating all blobs belonging to the model and removing them.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if the supplied <paramref name="id"/> is empty.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with that ID exists.
    /// </exception>
    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        if (_mutex.IsLocked(id))
        {
            throw new ModelLockedException($"This Model is currently being used.");
        }

        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");

        var deleted = await storage.DeleteByIdAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return true;
    }

    /// <summary>
    /// Updates mutable metadata on a stored model entry (alias, categories, description, favourite flag).
    /// </summary>
    /// <param name="id">
    /// The logical model ID whose metadata should be updated.
    /// </param>
    /// <param name="newAlias">
    /// New alias to assign to the model, or <c>null</c> to clear the alias. If provided, it must match the allowed pattern.
    /// </param>
    /// <param name="categories">
    /// New category list for the model. Whitespace-only values are dropped. Pass <c>null</c> to clear categories.
    /// </param>
    /// <param name="description">
    /// New description for the model. Whitespace-only becomes <c>null</c>, which clears the description.
    /// </param>
    /// <param name="isFavourite">
    /// Whether to mark or unmark this model as a favourite. Pass <c>null</c> to leave unchanged.
    /// </param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UpdateDetailsResultDto"/> with a human-readable status message.
    /// </returns>
    /// <remarks>
    /// This does <b>not</b> modify the underlying 3D binary.  
    /// It updates blob metadata (e.g. "alias", "description", "categories", "isFavourite") on the relevant entry blob.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if <paramref name="id"/> is invalid or if <paramref name="newAlias"/> is provided but does not match the required pattern.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with the given ID exists.
    /// </exception>
    public async Task<UpdateDetailsResultDto> UpdateDetailsAsync(
        Guid id,
        string? newAlias,
        List<string>? categories,
        string? description,
        bool? isFavourite,
        CancellationToken cancellationToken)
    {
        if (_mutex.IsLocked(id))
            throw new ModelLockedException($"Tis Model {id} is currently being used.");

        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");

        // Normalize whitespace-only strings to null (treat as deletion)
        string? Normalize(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        List<string>? NormalizeList(List<string>? list) =>
            list?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList();

        var normalizedCategories = NormalizeList(categories);
        Normalize(description);
        var alias = Normalize(newAlias);

        // Validate alias only if it's being set (not deleted)
        if (alias is not null && !AliasRegex.IsMatch(alias))
            throw new ValidationException(
                "The alias format is invalid. It can only contain letters, numbers, and underscores.");

        var updated = await storage.UpdateDetailsAsync(
            id, alias, normalizedCategories, Normalize(description), isFavourite, cancellationToken);

        if (!updated)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return new UpdateDetailsResultDto
        {
            Message = "Updated successfully."
        };
    }
    
    /// <summary>
    /// Clears or updates the <c>isNew</c> flag for a model so that it no longer appears as "new" in the UI.
    /// </summary>
    /// <param name="id">The logical model ID to update.</param>
    /// <param name="cancellationToken">Token to cancel the request.</param>
    /// <returns>
    /// An <see cref="UpdateDetailsResultDto"/> indicating success.
    /// </returns>
    /// <remarks>
    /// This is typically called after the model has been surfaced to the user,
    /// to stop highlighting it as a newly uploaded asset.
    /// </remarks>
    /// <exception cref="ValidationException">
    /// Thrown if <paramref name="id"/> is invalid.
    /// </exception>
    /// <exception cref="NotFoundException">
    /// Thrown if no model with that ID exists.
    /// </exception>
    public async Task<UpdateDetailsResultDto> UpdateIsNewAsync(
        Guid id,
        CancellationToken cancellationToken
    )
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is not valid. Please check the ID and try again.");
        
        var updated = await storage.UpdateIsNewAsync(id, cancellationToken);
        
        if (!updated)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return new UpdateDetailsResultDto
        {
            Message = ""
        };
    }
    
    #endregion
}