using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.ResultDTO;

[TestClass]
public class DeleteStateVersionResultDtoTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        string defaultMessage = "Deleted.";
        string defaultAssetId = default!;
        string defaultVersion = default!;
        
        // Act
        var dto = new DeleteStateVersionResultDto();
        
        // Assert
        Assert.IsNotNull(dto);
        Assert.AreEqual(defaultMessage, dto.Message);
        Assert.AreEqual(defaultAssetId, dto.AssetId);
        Assert.AreEqual(defaultVersion, dto.Version);
        Assert.AreEqual(0, dto.DeletedBlobs);
    }

    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var message = "message";
        var assetId = "assetId";
        var version = "version";
        var deletedBlobs = 4;
        
        // Act
        var dto = new DeleteStateVersionResultDto
        {
            Message = message,
            AssetId = assetId,
            Version = version,
            DeletedBlobs = deletedBlobs
        };
        
        // Assert
        Assert.AreEqual(message, dto.Message);
        Assert.AreEqual(assetId, dto.AssetId);
        Assert.AreEqual(version, dto.Version);
        Assert.AreEqual(deletedBlobs, dto.DeletedBlobs);
    }
}