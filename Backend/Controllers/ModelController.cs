using System.Text.RegularExpressions;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace ECAD_Backend.Controllers;

[ApiController]
[Route("api/model")]
public class ModelController : ControllerBase
{
    private readonly IModelStorage _storage;
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);
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
    // form-data:
    //      file: (binary)
    //      fileAlias: XYZ
    [HttpPost("upload")]
    [RequestSizeLimit(26214400)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string fileAlias, //alias Manav asked about
        CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        if (string.IsNullOrWhiteSpace(fileAlias))
            return BadRequest("Alias cannot be empty.");
        
        if (!AliasRegex.IsMatch(fileAlias))
            return BadRequest("Alias not valid.");
        
        // check file extension
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        // TODO: add verification for .bin file extension if .gltf is used
        // TODO: add support for 2 files upload
        if (ext != ".glb" || ext != ".gltf")
            return BadRequest("Invalid file extension.");
        
        // blob name : guid + _ + base name + extension
        var basename = Path.GetFileNameWithoutExtension(file.FileName);
        var blobName = $"{Guid.NewGuid():N}_{basename}{ext}";

        // Dont trust the client
        var contenType = ext switch
        {
            ".glb" => "model/gltf-binary",
            ".gltf" => "model/gltf+json",
            _       => "application/octet-stream"
        };

        var metadata = new Dictionary<string, string>
        {
            ["alias"] = fileAlias,
            ["basename"] = file.FileName,
            ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O")
        };

        await using var stream = file.OpenReadStream();
        await _storage.UploadAsync(blobName, stream, contenType, metadata, ct);
        
        return Ok(new {message = "Uploaded successfully.", alias = fileAlias, blobName});
    }

}