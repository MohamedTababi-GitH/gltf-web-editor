using Moq;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Web.Controllers;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelControllerTest
{
    private Mock<IModelService> _mockService = null!;
    private ModelController _controller = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockService = new Mock<IModelService>();
        _controller = new ModelController(_mockService.Object);
    }

    [TestMethod]
    public async Task GetAll_ReturnsOk_WithPageResult()
    {
        // Arrange
        var name = "Model1";
        var expectedPage = new PageResult<ModelItemDto>(
            new List<ModelItemDto>{ new()
                {
                    Name = name,
                    Id = Guid.NewGuid(),
                    Format = "glb",
                    Url = new Uri("http://localhost")
                }
            }, null, false);
        _mockService.Setup(s => s.ListAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<ModelFilter>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(expectedPage);

        // Act
        var result = await _controller.GetAll(limit: 5, cancellationToken: CancellationToken.None);
        var okObject = result.Result as OkObjectResult;
        var receivedPage = okObject.Value as PageResult<ModelItemDto>;

        // Assert
        Assert.IsNotNull(okObject);
        Assert.IsNotNull(receivedPage);
        Assert.AreEqual(1, receivedPage.Items.Count);
        Assert.AreEqual(name, receivedPage.Items[0].Name);
    }

    [TestMethod]
    public async Task Upload_ReturnsOk_WhenUploadSucceeds()
    {
        // Arrange
        var fileMocked = new Mock<IFormFile>();
        var fileName = "test.glb";
        var memoryStream = new MemoryStream([1]);
        var message = "Uploaded successfully.";
        var alias = "alias";
        var blobName = "blob123";
        var expectedUploadResult = new UploadResultDto
        {
            Message = message,
            Alias = alias,
            BlobName = blobName
        };
        var files =  new List<IFormFile> { fileMocked.Object };
        
        fileMocked.Setup(f => f.FileName).Returns(fileName);
        fileMocked.Setup(f => f.OpenReadStream()).Returns(memoryStream);
        _mockService.Setup(s => s.UploadAsync(It.IsAny<UploadModelRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedUploadResult);

        // Act
        var result = await _controller.Upload(files, alias, fileName, null, null, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var uploadResult = okResult!.Value as UploadResultDto;

        // Assert
        Assert.IsNotNull(okResult);
        Assert.AreEqual(message, uploadResult!.Message);
        Assert.AreEqual(alias, uploadResult.Alias);
        Assert.AreEqual(blobName, uploadResult.BlobName);
    }

    [TestMethod]
    public async Task Upload_ReturnsBadRequest_WhenNoFiles()
    {
        // Arrange
        var files = new List<IFormFile>();
        var fileAlias = "alias";
        var originalFileName = "test.glb";
        var expectedBadRequest = "No files uploaded.";
        
        // Act
        var result = await _controller.Upload(files, fileAlias, originalFileName, null, null, CancellationToken.None);
        var badRequest = result as BadRequestObjectResult;

        // Assert
        Assert.IsNotNull(badRequest);
        Assert.AreEqual(expectedBadRequest, badRequest.Value);
    }

    [TestMethod]
    public async Task Delete_ReturnsNoContent_WhenDeleted()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        
        // Act
        var result = await _controller.Delete(id, CancellationToken.None);
        
        // Assert
        Assert.IsInstanceOfType(result, typeof(NoContentResult));
    }

    [TestMethod]
    public async Task Delete_ReturnsNotFound_WhenNotDeleted()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await _controller.Delete(id, CancellationToken.None);
        
        // Assert
        Assert.IsInstanceOfType(result, typeof(NotFoundResult));
    }

    [TestMethod]
    public async Task Delete_ReturnsBadRequest_WhenNoFiles()
    {
        // Arrange
        var emptyId = Guid.Empty;
        var expectedBadRequest = "Invalid id.";
        
        // Act
        var result = await _controller.Delete(emptyId, CancellationToken.None);
        var badRequest = result as BadRequestObjectResult;
        
        // Assert
        Assert.IsNotNull(badRequest);
        Assert.AreEqual(expectedBadRequest, badRequest.Value);
    }
}