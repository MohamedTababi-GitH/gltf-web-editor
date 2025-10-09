using ECAD_Backend.Domain.Entities;
namespace ECAD_Backend.Application.Interfaces;

public interface IModelStorage
{
    Task<IReadOnlyList<ModelFile>> ListAsync(CancellationToken ct = default);
}