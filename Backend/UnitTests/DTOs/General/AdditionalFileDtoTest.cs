using ECAD_Backend.Application.DTOs.General;

namespace ECAD_Backend.UnitTests.DTOs.General;

[TestClass]
public class AdditionalFileDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var name = "texture.png";
        var url = new Uri("http://models/texture.png");
        var sizeBytes = 2048L;
        var createdOn = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        var contentType = "image/png";
        
        // Act
        var dto = new AdditionalFileDto
        {
            Name = name,
            Url = url,
            SizeBytes = sizeBytes,
            CreatedOn = createdOn,
            ContentType = contentType
        };
        
        // Assert
        Assert.AreEqual(name, dto.Name);
        Assert.AreEqual(url, dto.Url);
        Assert.AreEqual(sizeBytes, dto.SizeBytes);
        Assert.AreEqual(createdOn, dto.CreatedOn);
        Assert.AreEqual(contentType, dto.ContentType);
    }

    [TestMethod]
    public void Constructor_OptionalProperties_CanBeNull()
    {
        // Arrange
        var name = "texture.png";
        var url = new Uri("http://models/texture.png");
        
        // Act
        var dto = new AdditionalFileDto
        {
            Name = name,
            Url = url,
        };
        
        // Assert
        Assert.IsNull(dto.SizeBytes);
        Assert.IsNull(dto.CreatedOn);
        Assert.IsNull(dto.ContentType);
    }
}