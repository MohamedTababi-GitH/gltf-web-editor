using ECAD_Backend.Application.DTOs.General;

namespace ECAD_Backend.UnitTests.DTOs.General;

[TestClass]
public class ModelItemDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "Alias";
        var format = "gltf";
        var sizeBytes = 2048L;
        var url = new Uri("http://www.example.com");
        var createdOn = new DateTimeOffset(2001, 9, 11, 7, 0, 0, TimeSpan.Zero);
        var assetId = "validAssetId";
        var categories = new List<string> { "category1", "category2" };
        var description = "description";
        var isFavourite = true;
        var isNew = true;
        var additionalFile1 = new AdditionalFileDto{Name = "texture.bin", Url = new Uri("http://models/texture.bin")};
        var additionalFile2 = new AdditionalFileDto{Name = "shading.png", Url = new Uri("http://models/shading.png")};
        var additionalFiles = new List<AdditionalFileDto> { additionalFile1, additionalFile2 };
        var stateFile1 = new StateFileDto();
        var stateFile2 = new StateFileDto();
        var stateFiles = new List<StateFileDto> { stateFile1, stateFile2 };
        var baseline = new BaselineFileDto();
        
        // Act
        var dto = new ModelItemDto
        {
            Id = id,
            Name = name,
            Format = format,
            SizeBytes = sizeBytes,
            Url = url,
            CreatedOn = createdOn,
            AssetId = assetId,
            Categories = categories,
            Description = description,
            IsFavourite = isFavourite,
            IsNew = isNew,
            AdditionalFiles = additionalFiles,
            StateFiles = stateFiles,
            Baseline = baseline,
        };
        
        // Assert
        Assert.AreEqual(id, dto.Id);
        Assert.AreEqual(name, dto.Name);
        Assert.AreEqual(format, dto.Format);
        Assert.AreEqual(sizeBytes, dto.SizeBytes);
        Assert.AreEqual(url, dto.Url);
        Assert.AreEqual(createdOn, dto.CreatedOn);
        Assert.AreEqual(assetId, dto.AssetId);
        Assert.AreEqual(categories, dto.Categories);
        Assert.AreEqual(description, dto.Description);
        Assert.AreEqual(isFavourite, dto.IsFavourite);
        Assert.AreEqual(isNew, dto.IsNew);
        Assert.AreEqual(additionalFiles, dto.AdditionalFiles);
        Assert.AreEqual(stateFiles, dto.StateFiles);
        Assert.AreEqual(baseline, dto.Baseline);
    }

    [TestMethod]
    public void Constructor_OptionalProperties_CanBeNull()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "Alias";
        var format = "glb";
        var url = new Uri("http://www.example.com");
        
        // Act
        var dto = new ModelItemDto
        {
            Id = id,
            Name = name,
            Format = format,
            Url = url
        };
        
        // Assert
        Assert.IsNull(dto.SizeBytes);
        Assert.IsNull(dto.CreatedOn);
        Assert.IsNull(dto.AssetId);
        Assert.IsNull(dto.Categories);
        Assert.IsNull(dto.Description);
        Assert.IsFalse(dto.IsFavourite, "bools are set to false by default, cannot be null");
        Assert.IsFalse(dto.IsNew, "bools are set to false by default, cannot be null");
        Assert.IsNull(dto.AdditionalFiles);
        Assert.IsNull(dto.StateFiles);
        Assert.IsNull(dto.Baseline);
    }
}