using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
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
public sealed class ModelService(IModelStorage storage, IModelMapper mapper) : IModelService
{
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);

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
        UpdateModelDetailsRequestDto requestDto,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new ValidationException("The provided model ID is invalid.");
        if (requestDto is null)
            throw new BadRequestException("The request is empty.");

        // Normalize inputs (treat whitespace-only as null => delete)
        static string? NormalizeString(string? s) =>
            string.IsNullOrWhiteSpace(s) ? null : s.Trim();

        static List<string>? NormalizeList(List<string>? list) =>
            list is null
                ? null
                : list.Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
                    .ToList();

        var alias = NormalizeString(requestDto.NewAlias);
        var description = NormalizeString(requestDto.Description);
        var categories = NormalizeList(requestDto.Categories);

        if (alias is not null && !AliasRegex.IsMatch(alias))
            throw new ValidationException(
                "The alias format is invalid. It can only contain letters, numbers, and underscores.");
        
        var setMd = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var removeMd = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (alias is null) removeMd.Add("alias");
        else setMd["alias"] = alias;
        if (description is null) removeMd.Add("description");
        else setMd["description"] = description;
        if (categories is null || categories.Count == 0) removeMd.Add("categories");
        else setMd["categories"] = string.Join(",", categories);

        if (requestDto.IsFavourite.HasValue)
            setMd["isFavourite"] = requestDto.IsFavourite.Value ? "true" : "false";

        // Always clear "isNew" when details are updated
        setMd["isNew"] = "false";

        if (setMd.Count == 1 && setMd.ContainsKey("isNew") && removeMd.Count == 0)
            throw new ValidationException("You have to change something to update a model.");

        var updated = await storage.UpdateDetailsAsync(id, setMd, removeMd, cancellationToken);
        if (!updated)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return new UpdateDetailsResultDto { Message = "Updated successfully." };
    }

    #endregion
}