using ECAD_Backend.Application.DTOs;
namespace ECAD_Backend.Application.Interfaces;

public interface IModelService
{
    Task<IReadOnlyList<ModelItemDto>> ListAsync(CancellationToken cancellationToken);
    Task<UploadResultDto> UploadAsync(UploadModelRequest request, CancellationToken cancellationToken);
}