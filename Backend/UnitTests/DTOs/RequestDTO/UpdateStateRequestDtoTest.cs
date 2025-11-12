using ECAD_Backend.Application.DTOs.RequestDTO;

namespace ECAD_Backend.UnitTests.DTOs.RequestDTO;

[TestClass]
public class UpdateStateRequestDtoTest
{
    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        string defaultAssetId = default!;
        string defaultStateJson = default!;
        
        // Act
        var dto = new UpdateStateRequestDto();
        
        // Arrange
        Assert.AreEqual(defaultAssetId, dto.AssetId);
        Assert.AreEqual(defaultStateJson, dto.StateJson);
        Assert.IsNull(dto.TargetVersion);
    }

    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var assetId = "assetId";
        var targetVersion = "version";
        var stateJson = "stateJson";
        
        // Act
        var dto = new UpdateStateRequestDto
        {
            AssetId = assetId,
            TargetVersion = targetVersion,
            StateJson = stateJson
        };
        
        // Assert
        Assert.AreEqual(assetId, dto.AssetId);
        Assert.AreEqual(targetVersion, dto.TargetVersion);
        Assert.AreEqual(stateJson, dto.StateJson);
    }
}