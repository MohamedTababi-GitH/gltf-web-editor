using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Mappers.Interfaces;

/// <summary>
/// Defines a contract for mapping <see cref="ModelFile"/> domain entities
/// into API-facing <see cref="ModelItemDto"/> objects.
/// </summary>
/// <remarks>
/// This interface decouples the mapping logic from service implementations,
/// enabling easier testing, maintenance, and replacement of mapping behavior
/// without touching business logic.
/// </remarks>
public interface IModelMapper
{
    /// <summary>
    /// Maps a <see cref="ModelFile"/> entity from the domain layer
    /// into a <see cref="ModelItemDto"/> suitable for API responses.
    /// </summary>
    /// <param name="source">The source model file entity to map.</param>
    /// <returns>A new <see cref="ModelItemDto"/> populated with data from the source.</returns>
    ModelItemDto ToDto(ModelFile source);
}