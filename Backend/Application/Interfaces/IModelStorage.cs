using ECAD_Backend.Domain.Entities;
namespace ECAD_Backend.Application.Interfaces;

public interface IModelStorage
{
    Task<IReadOnlyList<ModelFile>> ListAsync(CancellationToken ct = default);
    Task UploadAsync(string blobName, 
                     Stream content, 
                     string contentType, 
                     IDictionary<string, string>? metadata = null,
                     CancellationToken ct = default);
}