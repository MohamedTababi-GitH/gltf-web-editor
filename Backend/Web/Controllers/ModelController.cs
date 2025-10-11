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
    [ProducesResponseType(typeof(IReadOnlyList<ModelItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ModelItemDto>>> GetAll(CancellationToken cancellationToken)
    {
        var items = await _service.ListAsync(cancellationToken);
        return Ok(items);
    }
    
    /// <summary>
    /// Uploads a model file.
    /// </summary>
    /// <param name="file">The file to be uploaded.</param>
    /// <param name="fileAlias">An alias for the uploaded file.</param>
    /// <param name="cancellationToken">Cancellation token to cancel the operation.</param>
    /// <returns>Returns a message with details about the uploaded file.</returns>
    /// <response code="200">Upload succeeded and returns file details.</response>
    /// <response code="400">No file was uploaded or the upload request was invalid.</response>
    /// <remarks>
    /// The maximum allowed file size is 25 MB.
    /// </remarks>
    [HttpPost("upload")]
    [RequestSizeLimit(26214400)]
    public async Task<IActionResult> Upload(IFormFile file, [FromForm] string fileAlias,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file uploaded.");
        
        await using var stream = file.OpenReadStream();
        var request = new UploadModelRequest
        {
            Content = stream,
            OriginalFileName = file.FileName,
            Alias = fileAlias,
        };
        
        try
        {
            var result = await _service.UploadAsync(request, cancellationToken);
            return Ok(new { message = result.Message, alias = result.Alias, blobName = result.BlobName });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
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
}