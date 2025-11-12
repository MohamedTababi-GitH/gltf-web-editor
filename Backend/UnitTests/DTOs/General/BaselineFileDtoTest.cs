using ECAD_Backend.Application.DTOs.General;

namespace ECAD_Backend.UnitTests.DTOs.General;

[TestClass]
public class BaselineFileDtoTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        var defaultName = "baseline.json";
        Uri defaultUrl = default!;
        
        // Act
        var dto = new BaselineFileDto();
        
        // Assert
        Assert.AreEqual(defaultName, dto.Name);
        Assert.AreEqual(defaultUrl, dto.Url);
        Assert.IsNull(dto.Url, "Url should default to null (default!).");
        Assert.IsNull(dto.SizeBytes);
        Assert.IsNull(dto.CreatedOn);
        Assert.IsNull(dto.ContentType);
    }
    
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var name = "baseline_v2.json";
        var url = new Uri("http://model/versions/baseline_v2.json");
        var sizeBytes = 1024L;
        var createdOn = new DateTimeOffset(2025, 3, 16, 8, 0, 0, TimeSpan.Zero);
        var contentType = "application/json";
        
        // Act
        var dto = new BaselineFileDto
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
}