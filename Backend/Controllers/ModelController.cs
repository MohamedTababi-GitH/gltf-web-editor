using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Controllers;

[ApiController]
[Route("api/model")]
public class ModelController : ControllerBase
{
    private readonly IModelStorage _storage;
    public ModelController(IModelStorage storage) => _storage = storage;

    // List all glTF/GLB files stored in models container
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ModelFile>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ModelFile>>> GetAll(CancellationToken ct)
    {
        var items = await _storage.ListAsync(ct);
        return Ok(items);
    }

    //Upload a glTF/GLB 
    [HttpPost("upload")]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        using var stream = file.OpenReadStream();
        await _storage.UploadAsync(file.FileName, stream, file.ContentType, ct);

        return Ok($"File '{file.FileName}' uploaded successfully.");
    }

}