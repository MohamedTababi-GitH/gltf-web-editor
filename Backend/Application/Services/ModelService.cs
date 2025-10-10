using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Services;

public sealed class ModelService : IModelService
{
    private readonly IModelStorage _storage;
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);
    public ModelService(IModelStorage storage) => _storage = storage;
    
    // Utility mapper (Can be moved to separate class later)
    private static ModelItemDto Map(ModelFile f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        Format = f.Format,
        SizeBytes = f.SizeBytes,
        Url = f.Url,
        CreatedOn = f.CreatedOn
    };
    
    public async Task<IReadOnlyList<ModelItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var files = await _storage.ListAsync(cancellationToken);
        return files.Select(Map).ToList();
    }

    public async Task<UploadResultDto> UploadAsync(UploadModelRequest request, CancellationToken cancellationToken)
    {
        if (request is null) throw new ArgumentNullException(nameof(request));
        
        if (request.Content is null) 
            throw new ArgumentException("No file content provided.", nameof(request.Content));
        
        if (string.IsNullOrWhiteSpace(request.OriginalFileName))
            throw new ArgumentException("Original file name required.", nameof(request.OriginalFileName));
        
        if (string.IsNullOrWhiteSpace(request.Alias))
            throw new ArgumentException("Alias required.", nameof(request.Alias));
        
        if (!AliasRegex.IsMatch(request.Alias))
            throw new ArgumentException("Alias not valid.", nameof(request.Alias));
        
        var extension = Path.GetExtension(request.OriginalFileName).ToLowerInvariant();
        
        if (extension != ".glb" && extension != ".gltf")
            throw new ArgumentException("Invalid file extension.", nameof(request.OriginalFileName));
        
        var baseName = Path.GetFileNameWithoutExtension(request.OriginalFileName);
        var blobName = $"{Guid.NewGuid():N}_{baseName}{extension}";

        var contentType = extension switch
        {
            ".glb"  => "model/gltf-binary",
            ".gltf" => "model/gltf+json",
            _       => "application/octet-stream"
        };

        var metadata = new Dictionary<string, string>
        {
            ["alias"] = request.Alias,
            ["basename"] = request.OriginalFileName,
            ["UploadedAtUtc"] = DateTime.UtcNow.ToString("O"),
        };
        
        await _storage.UploadAsync(blobName, request.Content, contentType, metadata, cancellationToken);

        return new UploadResultDto
        {
            Message = "Uploaded successfully.",
            Alias = request.Alias,
            BlobName = blobName,
        };
    }
}