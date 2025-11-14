using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.ResultDTO;

[TestClass]
public class UpdateStateResultDtoTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        string defaultMessage = default!;
        string defaultAssetId = default!;
        
        // Act
        var dto = new UpdateStateResultDto();
        
        // Assert
        Assert.AreEqual(defaultMessage, dto.Message);
        Assert.AreEqual(defaultAssetId, dto.AssetId);
        Assert.IsNull(dto.Version);
        Assert.IsNull(dto.BlobName);
    }
    
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var message = "message";
        var assetId = "assetId";
        var version = "version";
        var blobName = "blobName";
        
        // Act
        var dto = new UpdateStateResultDto
        {
            Message = message,
            AssetId = assetId,
            Version = version,
            BlobName = blobName
        };
        
        // Assert
        Assert.AreEqual(message, dto.Message);
        Assert.AreEqual(assetId, dto.AssetId);
        Assert.AreEqual(version, dto.Version);
        Assert.AreEqual(blobName, dto.BlobName);
    }
}