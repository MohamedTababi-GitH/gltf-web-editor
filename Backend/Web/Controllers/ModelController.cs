using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Web.Controllers;

[ApiController]
[Route("api/model")]
public class ModelController : ControllerBase
{
    private readonly IModelService _service;
    public ModelController(IModelService service) => _service = service;

    // List items
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ModelItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ModelItemDto>>> GetAll(CancellationToken cancellationToken)
    {
        var items = await _service.ListAsync(cancellationToken);
        return Ok(items);
    }
    
    // Upload Items
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
}