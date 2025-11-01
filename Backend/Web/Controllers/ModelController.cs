using System.ComponentModel.DataAnnotations;
using ECAD_Backend.Application.DTOs.Filter;
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
    private readonly IModelService _service;

    /// <summary>
    /// Initializes a new instance of the <see cref="ModelController"/> class.
    /// </summary>
    /// <param name="service">The model service used for handling model operations.</param>
    public ModelController(IModelService service) => _service = service;

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
    [ProducesResponseType(typeof(PageResult<ModelItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PageResult<ModelItemDto>>> GetAll(
        [FromQuery, Range(1,100)] int limit = 10,
        [FromQuery] string? cursor = null,
        [FromQuery] bool? isNew = null,
        [FromQuery] List<string>? categories = null,
        [FromQuery] bool? isFavourite = null,
        [FromQuery] string? q = null,
        [FromQuery] string? format = null,
        [FromQuery] string? prefix = null,
        CancellationToken cancellationToken = default)
    {
        var filter = new ModelFilter
        {
            IsNew = isNew,
            Categories = categories,
            IsFavourite = isFavourite,
            Q = q,
            Format = format,
            Prefix = prefix
        };

        var page = await _service.ListAsync(limit, cursor, filter, cancellationToken);

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
            var request = new UploadModelRequest
            {
                OriginalFileName = originalFileName,
                Files = uploadFiles,
                Alias = fileAlias,
                Categories = categories,
                Description = description
            };

            // Perform upload via the service layer
            var result = await _service.UploadAsync(request, cancellationToken);
            return Ok(new UploadResultDto { Message = result.Message, Alias = result.Alias, BlobName = result.BlobName });
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

        var deleted = await _service.DeleteAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException($"We couldn't find a model with the ID '{id}'. Please check the ID and try again.");

        return NoContent();
    }

    /// <summary>
    /// Updates details (alias, category, description, etc.) for a model.
    /// </summary>
    /// <param name="id">The model ID.</param>
    /// <param name="request">The update request data.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <response code="204">Update succeeded.</response>
    /// <response code="400">Invalid ID or request data.</response>
    /// <response code="404">Model not found.</response>
    [HttpPut("{id:guid}/details")]
    public async Task<IActionResult> PutDetails(
        Guid id,
        [FromBody] UpdateModelDetailsRequest request,
        CancellationToken cancellationToken)
    {
        // Validate input
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        // Ask the service to update model details
        var update = await _service.UpdateDetailsAsync(
            id,
            request.NewAlias,
            request.Categories,
            request.Description,
            request.IsFavourite,
            cancellationToken);

        return Ok( new UpdateResultDto{Message = update.Message} );
    }

    [HttpPatch("{id:guid}/isNew")]
    public async Task<IActionResult> PutIsNew(
        Guid id,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("The provided ID is invalid. Please check the ID and try again.");

        var update = await _service.UpdateIsNewAsync(id, cancellationToken);
        
        return Ok( new UpdateResultDto{Message = update.Message} );
    }
}
