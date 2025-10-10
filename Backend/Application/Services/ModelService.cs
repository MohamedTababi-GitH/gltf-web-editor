using System.Text.RegularExpressions;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Services;

/// <summary>
/// Provides application logic for managing 3D model files, including validation and interaction with storage.
/// Orchestrates the validation of model uploads and retrieval of stored models.
/// </summary>
public sealed class ModelService : IModelService
{
    private readonly IModelStorage _storage;
    private static readonly Regex AliasRegex = new Regex("^[a-zA-Z0-9_]+$", RegexOptions.Compiled);
    public ModelService(IModelStorage storage) => _storage = storage;
    
    /// <summary>
    /// Maps a <see cref="ModelFile"/> entity to a <see cref="ModelItemDto"/> data transfer object.
    /// </summary>
    /// <param name="f">The model file entity to map.</param>
    /// <returns>A <see cref="ModelItemDto"/> representing the model file.</returns>
    private static ModelItemDto Map(ModelFile f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        Format = f.Format,
        SizeBytes = f.SizeBytes,
        Url = f.Url,
        CreatedOn = f.CreatedOn
    };
    
    /// <summary>
    /// Retrieves a list of all stored model items.
    /// </summary>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>A read-only list of <see cref="ModelItemDto"/> representing the stored models.</returns>
    public async Task<IReadOnlyList<ModelItemDto>> ListAsync(CancellationToken cancellationToken = default)
    {
        var files = await _storage.ListAsync(cancellationToken);
        return files.Select(Map).ToList();
    }

    /// <summary>
    /// Validates and uploads a 3D model file according to the specified request.
    /// </summary>
    /// <param name="request">The upload request containing file content, original file name, and alias.</param>
    /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
    /// <returns>An <see cref="UploadResultDto"/> containing the result of the upload operation.</returns>
    /// <exception cref="ArgumentNullException">Thrown when the <paramref name="request"/> is null.</exception>
    /// <exception cref="ArgumentException">
    /// Thrown when the request content is null, original file name or alias is missing,
    /// alias does not match required pattern, or file extension is invalid.
    /// </exception>
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