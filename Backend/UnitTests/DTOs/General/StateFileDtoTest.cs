using ECAD_Backend.Application.DTOs.General;

namespace ECAD_Backend.UnitTests.DTOs.General;

[TestClass]
public class StateFileDtoTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        string defaultVersion = default!;
        string defaultName = default!;
        Uri url = default!;
        
        // Act
        var dto = new StateFileDto();
        
        // Assert
        Assert.AreEqual(defaultVersion, dto.Version);
        Assert.AreEqual(defaultName, dto.Name);
        Assert.AreEqual(url, dto.Url);
        Assert.IsNull(dto.SizeBytes);
        Assert.IsNull(dto.CreatedOn);
        Assert.IsNull(dto.ContentType);
    }

    [TestMethod]
    public void Constructor_SetsProperties()
    {
        // Arrange
        var version = "v2";
        var name = "name";
        var url = new Uri("http://model/states/v2.json");
        var sizeBytes = 1024;
        var createdOn = new DateTimeOffset(2025, 11, 11, 11, 11, 11, TimeSpan.Zero);
        var contentType = "application/octet-stream";
        
        // Act
        var dto = new StateFileDto
        {
            Version = version,
            Name = name,
            Url = url,
            SizeBytes = sizeBytes,
            CreatedOn = createdOn,
            ContentType = contentType
        };
        
        // Assert
        Assert.AreEqual(version, dto.Version);
        Assert.AreEqual(name, dto.Name);
        Assert.AreEqual(url, dto.Url);
        Assert.AreEqual(sizeBytes, dto.SizeBytes);
        Assert.AreEqual(createdOn, dto.CreatedOn);
        Assert.AreEqual(contentType, dto.ContentType);
    }
}