using Moq;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Web.Controllers;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;

namespace ECAD_Backend.BackendTesting;

[TestFixture]
public class ModelControllerTests
{
    private Mock<IModelService> _mockService;
    private ModelController _controller;

    [SetUp]
    public void SetUp()
    {
        _mockService = new Mock<IModelService>();
        _controller = new ModelController(_mockService.Object);
    }

    [Test]
    public async Task GetAll_ReturnsOk_WithListOfModels()
    {
        // Arrange
        var guid = Guid.NewGuid();
        var name = "TestModel1";
        var format = "glb";
        var url = new Uri("http://localhost");
        var expectedList = new List<ModelItemDto> {new ModelItemDto {Id = guid, Name = name, Format = format, Url = url}};
        _mockService.Setup(s => s.ListAsync(It.IsAny<CancellationToken>()))
                    .ReturnsAsync(expectedList);

        // Act
        var result = await _controller.GetAll(CancellationToken.None);

        // Assert
        var okResult = result.Result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        var actualList = okResult.Value as IReadOnlyList<ModelItemDto>;
        Assert.That(actualList, Is.Not.Null);
        Assert.That(actualList.Count, Is.EqualTo(1));
        Assert.That(actualList[0].Name, Is.EqualTo(name));
    }

    [Test]
    public async Task Upload_ReturnsBadRequest_WhenFileIsNull()
    {
        // Act
        var fileAlias = "alias";
        var result = await _controller.Upload(null, fileAlias, CancellationToken.None);

        // Assert
        var badRequest = result as BadRequestObjectResult;
        Assert.That(badRequest, Is.Not.Null);
        Assert.That(badRequest.Value, Is.EqualTo("No file uploaded."));
    }

    [Test]
    public async Task Upload_ReturnsOk_WhenUploadSucceeds()
    {
        // Arrange
        var mockFile = new Mock<IFormFile>();
        var fileName = "test.glb";
        var message = "Uploaded successfully.";
        var alias = "alias";
        var blobName = "blob123";
        mockFile.Setup(f => f.FileName).Returns(fileName);
        mockFile.Setup(f => f.Length).Returns(10);
        mockFile.Setup(f => f.OpenReadStream()).Returns(new MemoryStream(new byte[] { 1 }));

        _mockService.Setup(s => s.UploadAsync(It.IsAny<UploadModelRequest>(), It.IsAny<CancellationToken>()))
                    .ReturnsAsync(new UploadResultDto
                    {
                        Message = message,
                        Alias = alias,
                        BlobName = blobName
                    });

        // Act
        var result = await _controller.Upload(mockFile.Object, alias, CancellationToken.None);

        // Assert
        var okResult = result as OkObjectResult;
        Assert.That(okResult, Is.Not.Null);
        dynamic value = okResult.Value;
        Assert.That(value.message, Is.EqualTo(message));
        Assert.That(value.alias, Is.EqualTo(alias));
        Assert.That(value.blobName, Is.EqualTo(blobName));
    }
}