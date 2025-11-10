using ECAD_Backend.Application.Mappers.Implementation;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelMapperTest
{
    private ModelMapper _modelMapper = null!;
    
    [TestInitialize]
    public void Setup()
    {
        _modelMapper = new ModelMapper();
    }

    [TestMethod]
    public void ToDto_MapsFile_Correctly()
    {
        // Arrange
        var id = Guid.NewGuid();
        var alias = "model";
        var format = "glb";
        var size = 1024;
        var url = new Uri("http://localhost");
        var created = new DateTimeOffset();
        var assetId = "valid AssetId";
        var categories = new List<string> { "Test", "Mapping" };
        var description = "Test description";
        var favourite = true;
        var isNew = true;

        var source = new ModelFile
        {
            Id = id,
            Name = alias,
            Format = format,
            SizeBytes = size,
            Url = url,
            CreatedOn = created,
            AssetId = assetId,
            Categories = categories,
            Description = description,
            IsFavourite = favourite,
            IsNew = isNew
        };
        
        // Act
        var result = _modelMapper.ToDto(source);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(id, result.Id);
        Assert.AreEqual(alias, result.Name);
        Assert.AreEqual(format, result.Format);
        Assert.AreEqual(size, result.SizeBytes);
        Assert.AreEqual(url, result.Url);
        Assert.AreEqual(created, result.CreatedOn);
        Assert.AreEqual(assetId, result.AssetId);
        Assert.AreEqual(categories, result.Categories);
        Assert.AreEqual(description, result.Description);
        Assert.AreEqual(favourite, result.IsFavourite);
        Assert.AreEqual(isNew, result.IsNew);
    }
    
    [TestMethod]
    public void ToDto_MapsAdditionalFiles_Correctly()
    {
        // Arrange
        var addName = "model.bin";
        var addUrl = new Uri("http://localhost");
        var addSize = 1024;
        var addCreated = new DateTimeOffset();
        var addContent = "ContentType";
        var additionalFile = new AdditionalFile{Name = addName, Url = addUrl, SizeBytes = addSize, CreatedOn = addCreated, ContentType = addContent};
        var additionalFiles = new List<AdditionalFile> {additionalFile};
        
        var id = Guid.NewGuid();
        var alias = "model";
        var format = "gltf";
        var url = new Uri("http://localhost");

        var source = new ModelFile
        {
            Id = id,
            Name = alias,
            Format = format,
            Url = url,
            AdditionalFiles = additionalFiles
        };
        
        // Act
        var result = _modelMapper.ToDto(source);
        
        // Assert
        var addFile = result.AdditionalFiles![0];
        Assert.IsNotNull(result);
        Assert.IsNotNull(result.AdditionalFiles);
        Assert.HasCount(1, result.AdditionalFiles);
        Assert.AreEqual(addName, addFile.Name);
        Assert.AreEqual(addUrl, addFile.Url);
        Assert.AreEqual(addSize, addFile.SizeBytes);
        Assert.AreEqual(addCreated, addFile.CreatedOn);
        Assert.AreEqual(addContent, addFile.ContentType);
    }

    [TestMethod]
    public void ToDto_MapsStateFiles_Correctly()
    {
        // Arrange
        var version1 = "1.0";
        var version2 = "2.0";
        var name = "state.json";
        var stateUrl = new Uri("http://localhost");
        var stateSize = 1024;
        var stateCreated = new DateTimeOffset();
        var stateContent = "application/json";
        var stateFile1 = new StateFile{Version = version1, Name = name, Url = stateUrl, SizeBytes = stateSize, CreatedOn = stateCreated, ContentType = stateContent};
        var stateFile2 = new StateFile{Version = version2};
        var stateFiles = new List<StateFile>{stateFile1, stateFile2};
        var id = Guid.NewGuid();
        var alias = "model";
        var format = "glb";
        var url = new Uri("http://localhost");

        var source = new ModelFile
        {
            Id = id,
            Name = alias,
            Format = format,
            Url = url,
            StateFiles = stateFiles
        };
        
        // Act
        var result = _modelMapper.ToDto(source);
        
        // Assert
        var stFile1 = result.StateFiles![0];
        var stFile2 = result.StateFiles![1];
        Assert.IsNotNull(result);
        Assert.IsNotNull(result.StateFiles);
        Assert.HasCount(2, result.StateFiles);
        Assert.AreEqual(version2, stFile2.Version);
        Assert.AreEqual(version1, stFile1.Version);
        Assert.AreEqual(name, stFile1.Name);
        Assert.AreEqual(url, stFile1.Url);
        Assert.AreEqual(stateSize, stFile1.SizeBytes);
        Assert.AreEqual(stateCreated, stFile1.CreatedOn);
        Assert.AreEqual(stateContent, stFile1.ContentType);
    }

    [TestMethod]
    public void ToDto_MapsAdditionalLists_CorrectlyAsNull()
    {
        
        // Arrange
        var id = Guid.NewGuid();
        var alias = "model";
        var format = "glb";
        var url = new Uri("http://localhost");

        var source = new ModelFile
        {
            Id = id,
            Name = alias,
            Format = format,
            Url = url
        };
        
        // Act
        var result = _modelMapper.ToDto(source);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.IsNull(result.AdditionalFiles);
        Assert.IsNull(result.StateFiles);
    }

    [TestMethod]
    public void ToDto_Throws_WhenSourceIsNull()
    {
        // Arrange
        ModelFile source = null!;
        
        // Act
        var result = Assert.Throws<ArgumentNullException>(() => _modelMapper.ToDto(source));
        
        // Assert
        Assert.AreEqual(nameof(source), result.ParamName);
    }
}