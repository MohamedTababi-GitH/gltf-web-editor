using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
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

        if (!string.IsNullOrWhiteSpace(page.NextCursor))
            Response.Headers["X-Next-Cursor"] = page.NextCursor;

        return Ok(page);
    }

    /// <summary>
    /// Uploads a model file.
    /// </summary>
    /// <param name="files"></param>
    /// <param name="fileAlias">An alias for the uploaded file.</param>
    /// <param name="originalFileName"></param>
    /// <param name="description"></param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <param name="category"></param>
    /// <returns>Returns a message with details about the uploaded file.</returns>
    /// <response code="200">Upload succeeded and returns file details.</response>
    /// <response code="400">No file was uploaded or the upload request was invalid.</response>
    /// <remarks>
    /// The maximum allowed file size is 25 MB.
    /// </remarks>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(26214400)]
    public async Task<IActionResult> Upload([FromForm] List<IFormFile> files,
        [FromForm] string fileAlias,
        [FromForm] string originalFileName,
        [FromForm] string? category,
        [FromForm] string? description,
        CancellationToken cancellationToken)
    {
        if (files.Count == 0)
            return BadRequest("No files uploaded.");

        // Build the request with streams (dispose after service finishes)
        var uploadFiles = new List<(string FileName, Stream Content)>();
        try
        {
            foreach (var file in files)
                uploadFiles.Add((file.FileName, file.OpenReadStream()));

            var request = new UploadModelRequest
            {
                OriginalFileName = originalFileName,
                Files = uploadFiles,
                Alias = fileAlias,
                Category = category,
                Description = description
            };

            var result = await _service.UploadAsync(request, cancellationToken);
            return Ok(new UploadResultDto{ Message = result.Message, Alias = result.Alias, BlobName = result.BlobName });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        finally
        {
            // Ensure all streams are disposed
            foreach (var (_, stream) in uploadFiles)
                stream.Dispose();
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
        if (id == Guid.Empty) return BadRequest("Invalid id.");

        var deleted = await _service.DeleteAsync(id, cancellationToken);
        if (!deleted) return NotFound();

        return NoContent();
    }

    [HttpPut("{id:guid}/details")]
    public async Task<IActionResult> PutDetails(
        Guid id,
        [FromBody] UpdateModelDetailsRequest request,
        CancellationToken cancellationToken)
    {
        if (id == Guid.Empty) return BadRequest("Invalid id.");

        try
        {
            var ok = await _service.UpdateDetailsAsync(
                id,
                request.NewAlias,
                request.Category,
                request.Description,
                request.IsFavourite,
                cancellationToken);

            return ok ? NoContent() : NotFound();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}