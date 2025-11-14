using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.UnitTests.Entities;

[TestClass]
public class ModelFileTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "name";
        var format = ".glb";
        var sizeBytes = 256L;
        var url = new Uri("http://model/name.glb");
        var createdOn = new DateTimeOffset(1987, 6, 5, 4, 3, 2, TimeSpan.Zero);
        var categories = new List<string> {"category1", "category2"};
        var description = "description";
        var assetId = "assetId";
        var isFavourite = true;
        var isNew = true;
        var additionalFile1 = new AdditionalFile{Name = "texture.bin", Url = new Uri("http://models/texture.bin")};
        var additionalFile2 = new AdditionalFile{Name = "shading.png", Url = new Uri("http://models/shading.png")};
        var additionalFiles = new List<AdditionalFile> { additionalFile1, additionalFile2 };
        var stateFile1 = new StateFile();
        var stateFile2 = new StateFile();
        var stateFiles = new List<StateFile> { stateFile1, stateFile2 };
        var baseline = new StateFile();
        
        // Act
        var modelFile = new ModelFile
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
            Baseline = baseline
        };
        
        // Assert
        Assert.AreEqual(id, modelFile.Id);
        Assert.AreEqual(name, modelFile.Name);
        Assert.AreEqual(format, modelFile.Format);
        Assert.AreEqual(sizeBytes, modelFile.SizeBytes);
        Assert.AreEqual(url, modelFile.Url);
        Assert.AreEqual(createdOn, modelFile.CreatedOn);
        Assert.AreEqual(categories, modelFile.Categories);
        Assert.AreEqual(description, modelFile.Description);
        Assert.AreEqual(assetId, modelFile.AssetId);
        Assert.AreEqual(isFavourite, modelFile.IsFavourite);
        Assert.AreEqual(isNew, modelFile.IsNew);
        Assert.AreEqual(additionalFiles, modelFile.AdditionalFiles);
        Assert.AreEqual(stateFiles, modelFile.StateFiles);
        Assert.AreEqual(baseline, modelFile.Baseline);
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
        var modelFile = new ModelFile
        {
            Id = id,
            Name = name,
            Format = format,
            Url = url
        };
        
        // Assert
        Assert.IsNull(modelFile.SizeBytes);
        Assert.IsNull(modelFile.CreatedOn);
        Assert.IsNull(modelFile.Categories);
        Assert.IsNull(modelFile.Description);
        Assert.IsNull(modelFile.AssetId);
        Assert.IsFalse(modelFile.IsFavourite, "bools are set to false by default, cannot be null");
        Assert.IsFalse(modelFile.IsNew, "bools are set to false by default, cannot be null");
        Assert.IsNull(modelFile.AdditionalFiles);
        Assert.IsNull(modelFile.StateFiles);
        Assert.IsNull(modelFile.Baseline);
    }
}