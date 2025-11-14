using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.ResultDTO;

[TestClass]
public class DeleteModelResultDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var message = "message";
        
        // Act
        var dto = new DeleteModelResultDto{Message = message};
        
        // Assert
        Assert.AreEqual(message, dto.Message);
    }
}