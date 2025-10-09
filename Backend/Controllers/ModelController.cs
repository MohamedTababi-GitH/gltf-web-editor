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

}