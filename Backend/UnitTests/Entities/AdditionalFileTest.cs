using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.UnitTests.Entities;

[TestClass]
public class AdditionalFileTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var name = "name";
        var url = new Uri("http://model/name");
        var sizeBytes = 512L;
        var createdOn = new DateTimeOffset(2022, 11, 11, 22, 11, 11,  TimeSpan.Zero);
        var contentType = "image/png";
        
        // Act
        var additionalFile = new AdditionalFile
        {
            Name = name,
            Url = url,
            SizeBytes = sizeBytes,
            CreatedOn = createdOn,
            ContentType = contentType
        };
        
        // Assert
        Assert.AreEqual(name, additionalFile.Name);
        Assert.AreEqual(url, additionalFile.Url);
        Assert.AreEqual(sizeBytes, additionalFile.SizeBytes);
        Assert.AreEqual(createdOn, additionalFile.CreatedOn);
        Assert.AreEqual(contentType, additionalFile.ContentType);
    }

    [TestMethod]
    public void Constructor_OptionalProperties_CanBeNull()
    {
        // Arrange
        var name = "name";
        var url = new Uri("http://model/name");
        
        // Act
        var additionalFile = new AdditionalFile
        {
            Name = name,
            Url = url,
        };
        
        // Assert
        Assert.IsNull(additionalFile.SizeBytes);
        Assert.IsNull(additionalFile.CreatedOn);
        Assert.IsNull(additionalFile.ContentType);
    }
}