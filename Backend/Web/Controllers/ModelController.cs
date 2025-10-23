using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Exceptions;

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
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>A list of model item DTOs.</returns>
    /// <response code="200">Returns the list of model items.</response>
    [HttpGet]
    [ProducesResponseType(typeof(PageResult<ModelItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PageResult<ModelItemDto>>> GetAll(
        [FromQuery] int limit = 10,
        [FromQuery] string? cursor = null,
        [FromQuery] string? category = null,
        [FromQuery] bool? isFavourite = null,
        [FromQuery] string? q = null,
        [FromQuery] string? format = null,
        [FromQuery] DateTimeOffset? createdAfter = null,
        [FromQuery] DateTimeOffset? createdBefore = null,
        [FromQuery] string? prefix = null,
        CancellationToken cancellationToken = default)
    {
        var filter = new ModelFilter
        {
            Category = category,
            IsFavourite = isFavourite,
            Q = q,
            Format = format,
            CreatedAfter = createdAfter,
            CreatedBefore = createdBefore,
            Prefix = prefix
        };

        var page = await _service.ListAsync(limit, cursor, filter, cancellationToken);

        if (page.NextCursor is not null)
            Response.Headers["X-Next-Cursor"] = page.NextCursor;

        return Ok(page);
    }

    /// <summary>
    /// Uploads one or more model files.
    /// </summary>
    /// <param name="files">The uploaded file(s).</param>
    /// <param name="fileAlias">An alias for the uploaded file.</param>
    /// <param name="originalFileName">The original filename of the uploaded model.</param>
    /// <param name="category">Optional category for the file.</param>
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
        [FromForm] string? category,
        [FromForm] string? description,
        CancellationToken cancellationToken)
    {
        // Validate uploaded files
        if (files.Count == 0)
            throw new BadRequestException("No files uploaded.");

        // Prepare upload file streams
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
                Category = category,
                Description = description
            };

            // Perform upload via the service layer
            var result = await _service.UploadAsync(request, cancellationToken);

            // Return a success response
            return Ok(new
            {
                message = result.Message,
                alias = result.Alias,
                blobName = result.BlobName
            });
        }
        finally
        {
            // Always dispose file streams after use
            foreach (var (_, stream) in uploadFiles)
                stream.Dispose();
        }
    }

    /// <summary>
    /// Deletes a model by its unique identifier.
    /// </summary>
    /// <param name="id">The GUID that was exposed as <see cref="ModelItemDto.Id"/>.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <response code="204">Delete succeeded.</response>
    /// <response code="404">No model with the given Id was found.</response>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (id == Guid.Empty)
            throw new BadRequestException("Invalid ID.");

        var deleted = await _service.DeleteAsync(id, cancellationToken);
        if (!deleted)
            throw new NotFoundException($"Model with ID '{id}' was not found.");

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
            throw new BadRequestException("Invalid ID.");

        // Ask the service to update model details
        var ok = await _service.UpdateDetailsAsync(
            id,
            request.NewAlias,
            request.Category,
            request.Description,
            request.IsFavourite,
            cancellationToken);

        // Throw domain-specific exception if not found
        if (!ok)
            throw new NotFoundException($"Model with ID '{id}' was not found.");

        return NoContent();
    }
}
