using Moq;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;
using ECAD_Backend.Web.Controllers;
using Microsoft.AspNetCore.Http;


namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelControllerTest
{
    private Mock<IModelService> _mockModelService = null!;
    private Mock<IModelStateService> _mockStateService = null!;
    private Mock<IModelUploadService> _mockUploadService = null!;
    private ModelController _controller = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockModelService = new Mock<IModelService>();
        _mockStateService = new Mock<IModelStateService>();
        _mockUploadService = new Mock<IModelUploadService>();
        _controller = new ModelController(_mockModelService.Object, _mockUploadService.Object, _mockStateService.Object);
    }

    [TestMethod]
    public async Task GetAll_ReturnsOk_WithPageResult()
    {
        // Arrange
        var name = "Model1";
        var expectedPage = new PageResultDto<ModelItemDto>(
            new List<ModelItemDto>{ new()
                {
                    Name = name,
                    Id = Guid.NewGuid(),
                    Format = "glb",
                    Url = new Uri("http://localhost")
                }
            }, null, false);
        _mockModelService.Setup(s => s.ListAsync(It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<ModelFilterDto>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(expectedPage);

        // Act
        var result = await _controller.GetAll(limit: 5, cancellationToken: CancellationToken.None);
        var okObject = result.Result as OkObjectResult;
        var receivedPage = okObject!.Value as PageResultDto<ModelItemDto>;

        // Assert
        Assert.IsNotNull(okObject);
        Assert.IsNotNull(receivedPage);
        Assert.HasCount(1, receivedPage.Items);
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
        _mockUploadService.Setup(s => s.UploadAsync(It.IsAny<UploadModelRequestDto>(), It.IsAny<CancellationToken>()))
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
    public async Task Upload_Throws_WhenNoFiles()
    {
        // Arrange
        var expectedErrorMessage = "No files were uploaded";
        var files = new List<IFormFile>();
        var fileAlias = "alias";
        var originalFileName = "test.glb";
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _controller.Upload(files, fileAlias, originalFileName, null, null, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task Delete_ReturnsNoContent_WhenDeleted()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockModelService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        
        // Act
        var result = await _controller.Delete(id, CancellationToken.None);
        
        // Assert
        Assert.IsInstanceOfType(result, typeof(NoContentResult));
    }

    [TestMethod]
    public async Task Delete_Throws_WhenNotDeleted()
    {
        // Arrange
        var expectedErrorMessage = "We couldn't find a model with the ID";
        var id = Guid.NewGuid();
        _mockModelService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _controller.Delete(id, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task Delete_Throws_WhenNoFiles()
    {
        // Arrange
        var expectedErrorMessage = "provided ID is invalid";
        var emptyId = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _controller.Delete(emptyId, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
}