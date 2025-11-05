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
/// Handles API requests related to model files.
/// </summary>
[ApiController]
[Route("api/model")]
public class ModelController : ControllerBase
{
    private readonly IModelService _modelService;
    private readonly IModelUploadService _uploadService;
    private readonly IModelStateService _stateService;

    /// <summary>
    /// Initializes a new instance of the <see cref="ModelController"/> class.
    /// </summary>
    /// <param name="service">The model service used for handling model operations.</param>
    /// <param name="modelService"></param>
    /// <param name="uploadService"></param>
    /// <param name="stateService"></param>
    public ModelController(IModelService modelService, IModelUploadService uploadService,
        IModelStateService stateService)
    {
        _modelService = modelService;
        _uploadService = uploadService;
        _stateService = stateService;
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
    /// Uploads one or more model files.
    /// </summary>
    /// <param name="files">The uploaded file(s).</param>
    /// <param name="fileAlias">An alias for the uploaded file.</param>
    /// <param name="originalFileName">The original filename of the uploaded model.</param>
    /// <param name="categories">Optional categories for the file.</param>
    /// <param name="description">Optional description for the file.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>Returns a message with details about the uploaded file.</returns>
    /// <response code="200">Upload succeeded and returns file details.</response>
    /// <response code="400">No file was uploaded or invalid request data.</response>
    /// <remarks>
    /// The maximum allowed file size is 25 MB.
    /// </remarks>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26214400)] // 25 MB
    public async Task<IActionResult> Upload(
        [FromForm] List<IFormFile> files,
        [FromForm] string fileAlias,
        [FromForm] string originalFileName,
        [FromForm] List<string>? categories,
        [FromForm] string? description,
        CancellationToken cancellationToken)
    {
        // Validate uploaded files
        if (files.Count == 0)
            throw new BadRequestException("No files were uploaded. Please select a file to upload.");

        if (string.IsNullOrWhiteSpace(fileAlias))
            throw new BadRequestException("File alias is required.");

        // Prepare to upload file streams
        var uploadFiles = new List<(string FileName, Stream Content)>();

        try
        {
            foreach (var file in files)
                uploadFiles.Add((file.FileName, file.OpenReadStream()));

            // Build the upload request DTO
            var request = new UploadModelRequestDto
            {
                OriginalFileName = originalFileName,
                Files = uploadFiles,
                Alias = fileAlias,
                Categories = categories,
                Description = description
            };

            // Perform upload via the service layer
            var result = await _uploadService.UploadAsync(request, cancellationToken);
            return Ok(new UploadResultDto
                { Message = result.Message, Alias = result.Alias, BlobName = result.BlobName });
        }
        catch (ArgumentException ex)
        {
            throw new BadRequestException(ex.Message);
        }
        finally
        {
            // Ensure all streams are disposed
            foreach (var (_, stream) in uploadFiles)
                await stream.DisposeAsync();
        }
    }

    /// <summary>Deletes a model by its Id.</summary>
    /// <param name="id">The GUID that was exposed as ModelItemDto.Id</param>
    /// <param name="cancellationToken"></param>
    /// <response code="204">Delete succeeded.</response>
    /// <response code="404">No model with the given Id was found.</response>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        var deleted = await _modelService.DeleteAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException(
                $"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return NoContent();
    }

    /// <summary>
    /// Updates details (alias, category, description, etc.) for a model.
    /// </summary>
    /// <param name="id">The model ID.</param>
    /// <param name="requestDto">The update requestDto data.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <response code="204">Update succeeded.</response>
    /// <response code="400">Invalid ID or requestDto data.</response>
    /// <response code="404">Model not found.</response>
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
    /// Retrieves a specific model by its unique identifier.
    /// </summary>
    /// <param name="id">The model's unique ID.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>The model details as a <see cref="ModelItemDto"/>.</returns>
    /// <response code="200">Returns the requested model.</response>
    /// <response code="404">If no model was found with the given ID.</response>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ModelItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await _modelService.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

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
    /// Deletes a named state version for the given asset.
    /// </summary>
    /// <param name="assetId">The asset folder identifier.</param>
    /// <param name="version">The version label (e.g., "v2", "test4").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <response code="200">Version deleted successfully.</response>
    /// <response code="404">Version not found.</response>
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

    // POST /api/model/{assetId}/baseline
    [HttpPost("{assetId}/baseline")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(1_048_576)] // ~1 MB
    public async Task<IActionResult> SaveBaseline(
        [FromRoute] string assetId,
        [FromForm] SaveStateFormDto form, // reuse your form: either StateJson or StateFile
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(assetId))
            throw new BadRequestException("AssetId is required.");

        // normalize content (string or file)
        string json = form.StateJson ?? string.Empty;
        if (string.IsNullOrEmpty(json))
        {
            if (form.StateFile is null)
                throw new BadRequestException("Either 'StateJson' or 'StateFile' must be provided.");

            using var reader = new StreamReader(form.StateFile.OpenReadStream());
            json = await reader.ReadToEndAsync(cancellationToken);
        }

        if (string.IsNullOrWhiteSpace(json))
            throw new BadRequestException("Baseline content is empty.");

        var req = new UpdateBaselineRequestDto
        {
            AssetId = assetId,
            BaselineJson = json
        };

        var result = await _stateService.SaveBaselineAsync(req, cancellationToken);

        return Ok(new UpdateBaselineResultDto
        {
            Message = result.Message,
            AssetId = result.AssetId,
            BlobName = result.BlobName
        });
    }

    // DELETE /api/model/{assetId}/baseline
    [HttpDelete("{assetId}/baseline")]
    [ProducesResponseType(typeof(DeleteBaselineResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBaseline(
        string assetId,
        CancellationToken cancellationToken)
    {
        var result = await _stateService.DeleteBaselineAsync(assetId, cancellationToken);
        return Ok(result);
    }


    /// <summary>
    /// Locks a specific model to prevent concurrent edits or deletions.
    /// </summary>
    /// <param name="id">The unique identifier of the model to lock.</param>
    /// <response code="200">Model successfully locked.</response>
    /// <response code="400">Invalid model ID was provided.</response>
    [HttpPost("{id:guid}/lock")]
    public IActionResult LockModel(Guid id)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid model ID.");

        _modelService.LockModel(id);
        return Ok();
    }

    /// <summary>
    /// Unlocks a specific model, allowing other users or services to edit or delete it again.
    /// </summary>
    /// <param name="id">The unique identifier of the model to unlock.</param>
    /// <response code="200">Model successfully unlocked.</response>
    /// <response code="400">Invalid model ID was provided.</response>
    [HttpPost("{id:guid}/unlock")]
    public IActionResult UnlockModel(Guid id)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid model ID.");

        _modelService.UnlockModel(id);
        return Ok();
    }
}