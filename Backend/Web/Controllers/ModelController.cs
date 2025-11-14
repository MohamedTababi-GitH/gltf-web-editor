using System.ComponentModel.DataAnnotations;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.Forms;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Web.Controllers;

/// <summary>
/// Handles API requests related to 3D model lifecycle: upload, list, retrieval,
/// metadata updates, deletion, and state/baseline management. Also exposes lightweight
/// concurrency controls (lock/heartbeat/unlock) for safe edits.
/// </summary>
[ApiController]
[Route("api/model")]
public class ModelController : ControllerBase
{
    private readonly IModelService _modelService;
    private readonly IModelUploadService _uploadService;
    private readonly IModelStateService _stateService;
    private readonly IMutexService _mutexService;

    public ModelController(IModelService modelService, IModelUploadService uploadService,
        IModelStateService stateService, IMutexService mutexService)
    {
        _modelService = modelService;
        _uploadService = uploadService;
        _stateService = stateService;
        _mutexService = mutexService;
    }

    /// <summary>
    /// Retrieves a list of all model items.
    /// </summary>
    /// <param name="limit"></param>
    /// <param name="cursor"></param>
    /// <param name="isNew"></param>
    /// <param name="categories"></param>
    /// <param name="isFavourite"></param>
    /// <param name="q"></param>
    /// <param name="format"></param>
    /// <param name="prefix"></param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>A list of model item DTOs.</returns>
    /// <response code="200">Returns the list of model items.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PageResultDto<ModelItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PageResultDto<ModelItemDto>>> GetAll(
        [FromQuery, Range(1, 100)] int limit = 10,
        [FromQuery] string? cursor = null,
        [FromQuery] bool? isNew = null,
        [FromQuery] List<string>? categories = null,
        [FromQuery] bool? isFavourite = null,
        [FromQuery] string? q = null,
        [FromQuery] string? format = null,
        [FromQuery] string? prefix = null,
        CancellationToken cancellationToken = default)
    {
        var filter = new ModelFilterDto
        {
            IsNew = isNew,
            Categories = categories,
            IsFavourite = isFavourite,
            Q = q,
            Format = format,
            Prefix = prefix
        };

        var page = await _modelService.ListAsync(limit, cursor, filter, cancellationToken);

        if (!string.IsNullOrWhiteSpace(page.NextCursor))
            Response.Headers["X-Next-Cursor"] = page.NextCursor;

        return Ok(page);
    }

    /// <summary>
    /// Uploads a new 3D model package (entry <c>.glb/.gltf</c> plus companion files) and optional baseline state.
    /// </summary>
    /// <param name="form">
    /// Multipart form containing the model files, alias/metadata, and an optional baseline JSON string.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>An <see cref="UploadResultDto"/> with the created model’s alias and blob name.</returns>
    /// <response code="200">Upload succeeded.</response>
    /// <response code="400">Invalid form data (e.g., no files or missing alias).</response>
    /// <remarks>
    /// The controller converts the multipart payload into an internal request DTO and delegates to the upload service.
    /// If <c>BaselineJson</c> is provided, it will be written to <c>{assetId}/baseline/baseline.json</c>.
    /// </remarks>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26214400)]
    public async Task<IActionResult> Upload(
        [FromForm] UploadModelForm form,
        CancellationToken cancellationToken)
    {
        if (form.Files is null || form.Files.Count == 0)
            throw new BadRequestException("No files were uploaded. Please select a file to upload.");
        if (string.IsNullOrWhiteSpace(form.FileAlias))
            throw new BadRequestException("File alias is required.");

        var uploadFiles = new List<(string FileName, Stream Content)>();
        try
        {
            foreach (var f in form.Files)
                uploadFiles.Add((f.FileName, f.OpenReadStream()));

            var request = new UploadModelRequestDto
            {
                OriginalFileName = form.OriginalFileName,
                Files = uploadFiles,
                Alias = form.FileAlias,
                Categories = form.Categories,
                Description = form.Description,

                BaselineJson = string.IsNullOrWhiteSpace(form.BaselineJson) ? null : form.BaselineJson
            };

            var result = await _uploadService.UploadAsync(request, cancellationToken);
            return Ok(new UploadResultDto
                { Message = result.Message, Alias = result.Alias, BlobName = result.BlobName });
        }
        finally
        {
            foreach (var (_, s) in uploadFiles)
                await s.DisposeAsync();
        }
    }

    /// <summary>
    /// Deletes a model by its ID, removing the entire asset folder and related resources.
    /// </summary>
    /// <param name="id">The GUID previously exposed in <see cref="ModelItemDto.Id"/>.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// A <see cref="DeleteModelResultDto"/> containing a human-readable confirmation message.
    /// </returns>
    /// <response code="200">Delete succeeded and a confirmation message is returned.</response>
    /// <response code="400">Invalid or empty ID.</response>
    /// <response code="404">No model found with the provided ID.</response>
    /// <response code="423">Model is locked by another operation.</response>
    /// <remarks>
    /// The service enforces a mutex; if the model is currently locked, a <c>423 Locked</c> response is returned.
    /// </remarks>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        // DeleteAsync returns true or throws (NotFound / Validation / Locked)
        await _modelService.DeleteAsync(id, cancellationToken);

        var dto = new DeleteModelResultDto
        {
            Message = "Model  was deleted successfully."
        };

        return Ok(dto);
    }

    /// <summary>
    /// Updates model metadata (alias, categories, description, favourite flag) and clears the <c>isNew</c> marker.
    /// </summary>
    /// <param name="id">The model ID.</param>
    /// <param name="requestDto">The metadata updates to apply.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>An <see cref="UpdateDetailsResultDto"/> with a confirmation message.</returns>
    /// <response code="200">Update succeeded and a confirmation message is returned.</response>
    /// <response code="400">Invalid ID or malformed request body.</response>
    /// <response code="404">Model not found.</response>
    /// <remarks>
    /// This endpoint replaces older, split endpoints and centralizes metadata updates into a single call.
    /// The underlying storage marks <c>isNew=false</c> to indicate the model has been opened/edited.
    /// </remarks>
    [HttpPut("{id:guid}/details")]
    public async Task<IActionResult> PutDetails(
        Guid id,
        [FromBody] UpdateModelDetailsRequestDto requestDto,
        CancellationToken cancellationToken)
    {
        // Validate input
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        // Ask the service to update model details
        var update = await _modelService.UpdateDetailsAsync(
            id,
            requestDto.NewAlias,
            requestDto.Categories,
            requestDto.Description,
            requestDto.IsFavourite,
            cancellationToken);

        return Ok(new UpdateDetailsResultDto { Message = update.Message });
    }

    /// <summary>
    /// Retrieves a specific model by its unique identifier, including baseline, states, and additional files.
    /// </summary>
    /// <param name="id">The model's unique ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The model as a <see cref="ModelItemDto"/>.</returns>
    /// <response code="200">Model found.</response>
    /// <response code="404">No model exists with the specified ID.</response>
    /// <remarks>
    /// The service aggregates the entry model blob, baseline (if present), versioned state snapshots,
    /// and auxiliary files under the same asset folder.
    /// </remarks>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ModelItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _modelService.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    /// <summary>
    /// Marks the specified model as not new (<c>isNew=false</c>) in blob metadata.
    /// </summary>
    /// <param name="id">The model ID.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>An <see cref="UpdateDetailsResultDto"/> with a confirmation message.</returns>
    /// <response code="200">Flag updated.</response>
    /// <response code="400">Invalid ID.</response>
    /// <response code="404">Model not found.</response>
    /// <remarks>
    /// Intended to be called when a model is first opened/consumed by a client.
    /// </remarks>
    [HttpPatch("{id:guid}/isNew")]
    public async Task<IActionResult> PutIsNew(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        var update = await _modelService.UpdateIsNewAsync(id, cancellationToken);

        return Ok(new UpdateDetailsResultDto { Message = update.Message });
    }

    /// <summary>
    /// Saves a state snapshot for an asset, either as the working copy or as a named version.
    /// </summary>
    /// <param name="assetId">The asset folder identifier.</param>
    /// <param name="form">
    /// Multipart form containing the JSON state as a string (<c>StateJson</c>) or as a file (<c>StateFile</c>),
    /// and an optional <c>TargetVersion</c>.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>
    /// An <see cref="UpdateStateResultDto"/> describing where the state was stored (blob path, version).
    /// </returns>
    /// <response code="200">State saved.</response>
    /// <response code="400">No state provided or empty content.</response>
    /// <response code="422">Invalid JSON format or size constraints exceeded.</response>
    /// <remarks>
    /// When <c>TargetVersion</c> is omitted, the state is saved as the working copy at <c>{assetId}/state/state.json</c>.  
    /// When provided (e.g., <c>v2</c>), it is saved under <c>{assetId}/state/{TargetVersion}/state.json</c>.
    /// </remarks>
    [HttpPost("{assetId}/state")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(1048576)] // ~1 MB
    public async Task<IActionResult> SaveState(
        [FromRoute] string assetId,
        [FromForm] SaveStateFormDto form,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new BadRequestException("AssetId is required.");

        // normalize content
        string finalStateJson = form.StateJson ?? string.Empty;

        if (string.IsNullOrEmpty(finalStateJson))
        {
            if (form.StateFile is null)
                throw new BadRequestException("Either 'StateJson' or 'StateFile' must be provided.");

            using var reader = new StreamReader(form.StateFile.OpenReadStream());
            finalStateJson = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(finalStateJson))
            throw new BadRequestException("State content is empty.");

        var request = new UpdateStateRequestDto
        {
            AssetId = assetId,
            TargetVersion = form.TargetVersion,
            StateJson = finalStateJson
        };

        var result = await _stateService.SaveStateAsync(request, cancellationToken);

        return Ok(new UpdateStateResultDto
        {
            Message = result.Message,
            AssetId = result.AssetId,
            Version = result.Version,
            BlobName = result.BlobName
        });
    }

    /// <summary>
    /// Deletes a named state version (or the latest working copy) for an asset.
    /// </summary>
    /// <param name="assetId">The asset folder identifier.</param>
    /// <param name="version">
    /// The version label (e.g., <c>"v2"</c> or <c>"test4"</c>).  
    /// Use <c>"state"</c> or <c>"Default"</c> to delete the working copy at <c>state/state.json</c>.
    /// </param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A <see cref="DeleteStateVersionResultDto"/> with details of the deletion.</returns>
    /// <response code="200">Version (or working copy) deleted.</response>
    /// <response code="404">Version not found for the specified asset.</response>
    /// <response code="422">Validation error.</response>
    [HttpDelete("{assetId}/state/{version}")]
    [ProducesResponseType(typeof(DeleteStateVersionResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteStateVersion(
        string assetId,
        string version,
        CancellationToken cancellationToken)
    {
        var result = await _stateService.DeleteVersionAsync(assetId, version, cancellationToken);
        return Ok(result);
    }


    /// <summary>
    /// Acquires an exclusive lock for the specified model to prevent concurrent edits or deletion.
    /// </summary>
    /// <param name="id">The model ID to lock.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns><c>200 OK</c> on success.</returns>
    /// <response code="200">Model successfully locked.</response>
    /// <response code="400">Invalid ID.</response>
    /// <response code="404">Model not found.</response>
    /// <response code="423">Lock already held by another client.</response>
    /// <remarks>
    /// Lock semantics are enforced via the application’s mutex service. Locks are expected to be short-lived,
    /// and should be followed by a <see cref="Heartbeat"/> to keep them alive while the client is active.
    /// </remarks>
    [HttpPost("{id:guid}/lock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public async Task<IActionResult> LockModel(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid model ID.");
        
        await _modelService.GetByIdAsync(id, cancellationToken);
        
        _mutexService.AcquireLock(id);
        return Ok();
    }

    /// <summary>
    /// Releases a previously acquired lock for the specified model.
    /// </summary>
    /// <param name="id">The model ID to unlock.</param>
    /// <returns><c>200 OK</c> on success.</returns>
    /// <response code="200">Model successfully unlocked.</response>
    /// <response code="400">Invalid ID.</response>
    /// <remarks>
    /// This endpoint is idempotent: calling it when no lock exists has no adverse effects on server state.
    /// </remarks>
    [HttpPost("{id:guid}/unlock")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult UnlockModel(Guid id)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid model ID.");

        _mutexService.ReleaseLock(id);
        return Ok();
    }

    /// <summary>
    /// Renews the existing lock for the specified model, signaling that the client is still active.
    /// </summary>
    /// <param name="id">The model ID whose lock should be renewed.</param>
    /// <returns><c>200 OK</c> on success.</returns>
    /// <response code="200">Lock renewed.</response>
    /// <response code="400">Invalid ID.</response>
    /// <response code="423">No active lock exists for this model.</response>
    /// <remarks>
    /// Clients should call this periodically (e.g., every N seconds) to keep the lock from expiring.
    /// </remarks>
    [HttpPost("{id:guid}/heartbeat")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status423Locked)]
    public IActionResult Heartbeat(Guid id)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid model ID.");

        _mutexService.Heartbeat(id);
        return Ok();
    }
}