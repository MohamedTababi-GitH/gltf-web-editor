using Moq;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Web.Controllers;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;
using Microsoft.AspNetCore.Http;

namespace ECAD_Backend.Tests;

[TestClass]
public class ModelControllerTests
{
    private Mock<IModelService> _mockService;
    private ModelController _controller;

    [TestInitialize]
    public void SetUp()
    {
        _mockService = new Mock<IModelService>();
        _controller = new ModelController(_mockService.Object);
    }

    [TestMethod]
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
        Assert.IsNotNull(okResult);
        var actualList = okResult.Value as IReadOnlyList<ModelItemDto>;
        Assert.IsNotNull(actualList);
        Assert.AreEqual(1, actualList.Count);
        Assert.AreEqual(name, actualList[0].Name);
    }

    [TestMethod]
    public async Task Upload_ReturnsBadRequest_WhenFileIsNull()
    {
        // Act
        var fileAlias = "alias";
        var result = await _controller.Upload(null, fileAlias, CancellationToken.None);

        // Assert
        var badRequest = result as BadRequestObjectResult;
        Assert.IsNotNull(badRequest);
        Assert.AreEqual("No file uploaded.", badRequest.Value);
    }

    [TestMethod]
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
        Assert.IsNotNull(okResult);
        dynamic value = okResult.Value;
        Assert.AreEqual(message, value.Message);
        Assert.AreEqual(alias, value.Alias);
        Assert.AreEqual(blobName, value.BlobName);
    }
}