using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.ResultDTO;

[TestClass]
public class UploadResultDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var message = "message";
        var alias =  "alias";
        var blobName = "blobName";
        
        // Act
        var dto = new UploadResultDto
        {
            Message = message,
            Alias = alias,
            BlobName = blobName,
        };
        
        // Assert
        Assert.AreEqual(message, dto.Message);
        Assert.AreEqual(alias, dto.Alias);
        Assert.AreEqual(blobName, dto.BlobName);
    }
}