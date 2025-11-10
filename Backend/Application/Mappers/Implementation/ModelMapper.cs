using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.Mappers.Interfaces;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Application.Mappers.Implementation;

/// <summary>
/// Provides the concrete mapping logic for converting domain-layer
/// <see cref="ModelFile"/> entities into API-layer <see cref="ModelItemDto"/> objects.
/// </summary>
/// <remarks>
/// This implementation performs a direct field-to-field projection,
/// including nested mapping for <c>AdditionalFiles</c> and <c>StateFiles</c>.
/// Future versions could extend this to handle transformations, filtering,
/// or derived metadata.
/// </remarks>
public sealed class ModelMapper : IModelMapper
{
    /// <inheritdoc />
    public ModelItemDto ToDto(ModelFile source)
    {
        if (source == null) throw new ArgumentNullException(nameof(source));

        return new ModelItemDto
        {
            Id = source.Id,
            Name = source.Name,
            Format = source.Format,
            SizeBytes = source.SizeBytes,
            Url = source.Url,
            CreatedOn = source.CreatedOn,
            Categories = source.Categories,
            Description = source.Description,
            AssetId = source.AssetId,
            IsFavourite = source.IsFavourite,
            IsNew = source.IsNew,

            AdditionalFiles = source.AdditionalFiles?.Select(x => new AdditionalFileDto
            {
                Name = x.Name,
                Url = x.Url,
                SizeBytes = x.SizeBytes,
                CreatedOn = x.CreatedOn,
                ContentType = x.ContentType
            }).ToList(),

            StateFiles = source.StateFiles?.Select(s => new StateFileDto
            {
                Version = s.Version,
                Name = s.Name,
                Url = s.Url,
                SizeBytes = s.SizeBytes,
                CreatedOn = s.CreatedOn,
                ContentType = s.ContentType
            }).ToList(),

            Baseline = source.Baseline is null
                ? null
                : new BaselineFileDto
                {
                    Name = source.Baseline.Name,
                    Url = source.Baseline.Url,
                    SizeBytes = source.Baseline.SizeBytes,
                    CreatedOn = source.Baseline.CreatedOn,
                    ContentType = source.Baseline.ContentType
                }
        };
    }
}