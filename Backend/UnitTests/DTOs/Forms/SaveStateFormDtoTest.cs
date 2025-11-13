using ECAD_Backend.Application.DTOs.Forms;
using ECAD_Backend.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace ECAD_Backend.UnitTests.DTOs.Forms;

[TestClass]
public class SaveStateFormDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var stateJson = "stateJson";
        var stateFile = new FormFile(Stream.Null, 0, 0, "state", "state.txt");
        var targetVersion = "targetVersion";

        // Act
        var dto = new SaveStateFormDto
        {
            StateJson = stateJson,
            StateFile = stateFile,
            TargetVersion = targetVersion
        };

        // Assert
        Assert.AreEqual(stateJson, dto.StateJson);
        Assert.AreEqual(stateFile, dto.StateFile);
        Assert.AreEqual(targetVersion, dto.TargetVersion);
    }

    [TestMethod]
    public void Constructor_Properties_CanBeNull()
    {
        // Arrange & Act
        var dto = new SaveStateFormDto();
        
        // Assert
        Assert.IsNotNull(dto);
        Assert.IsNull(dto.StateJson);
        Assert.IsNull(dto.StateFile);
        Assert.IsNull(dto.TargetVersion);
    }
}