using ECAD_Backend.Application.DTOs.RequestDTO;

namespace ECAD_Backend.UnitTests.DTOs.RequestDTO;

[TestClass]
public class UploadModelRequestDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var file1 = "originalFile.txt";
        var stream1 = new MemoryStream();
        var files = new List<(string, Stream)> { (file1, stream1)};
        var originalFileName = "originalFileName";
        var alias = "alias";
        var categories = new List<string> { "categories" };
        var description = "description";
        var baselineJson = "baselineJson";
        
        // Act
        var dto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = originalFileName,
            Alias = alias,
            Categories = categories,
            Description = description,
            BaselineJson = baselineJson
        };
        
        // Assert
        Assert.AreEqual(files, dto.Files);
        Assert.AreEqual(originalFileName, dto.OriginalFileName);
        Assert.AreEqual(alias, dto.Alias);
        Assert.AreEqual(categories, dto.Categories);
        Assert.AreEqual(description, dto.Description);
        Assert.AreEqual(baselineJson, dto.BaselineJson);
    }

    [TestMethod]
    public void Constructor_OptionalProperties_CanBeNull()
    {
        // Arrange
        var  file1 = "originalFile.txt";
        var stream1 = new MemoryStream();
        var files = new List<(string, Stream)> { (file1, stream1)};
        var originalFileName = "originalFileName";
        var alias = "alias";
        var description = "description";
        var baselineJson = "baselineJson";
        
        // Act
        var dto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = originalFileName,
            Alias = alias,
            Description = description,
            BaselineJson = baselineJson
        };
        
        // Assert
        Assert.IsNull(dto.Categories);
    }
}