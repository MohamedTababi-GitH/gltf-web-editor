using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.UnitTests.Entities;

[TestClass]
public class StateFileTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        string defaultVersion = default!;
        string defaultName = default!;
        Uri url = default!;
        
        // Act
        var stateFile = new StateFile();
        
        // Assert
        Assert.IsNotNull(stateFile);
        Assert.AreEqual(defaultVersion, stateFile.Version);
        Assert.AreEqual(defaultName, stateFile.Name);
        Assert.AreEqual(url, stateFile.Url);
        Assert.IsNull(stateFile.SizeBytes);
        Assert.IsNull(stateFile.CreatedOn);
        Assert.IsNull(stateFile.ContentType);
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
        var stateFile = new StateFile
        {
            Version = version,
            Name = name,
            Url = url,
            SizeBytes = sizeBytes,
            CreatedOn = createdOn,
            ContentType = contentType
        };
        
        // Assert
        Assert.AreEqual(version, stateFile.Version);
        Assert.AreEqual(name, stateFile.Name);
        Assert.AreEqual(url, stateFile.Url);
        Assert.AreEqual(sizeBytes, stateFile.SizeBytes);
        Assert.AreEqual(createdOn, stateFile.CreatedOn);
        Assert.AreEqual(contentType, stateFile.ContentType);
    }
}