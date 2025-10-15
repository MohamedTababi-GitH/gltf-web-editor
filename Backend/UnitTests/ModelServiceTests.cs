using Moq;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.Tests;

[TestClass]
public class ModelServiceTests
{
    private Mock<IModelStorage> _mockStorage;
    private ModelService _service;

    [TestInitialize]
    public void SetUp()
    {
        _mockStorage = new Mock<IModelStorage>();
        _service = new ModelService(_mockStorage.Object);
    }

    [TestMethod]
    public async Task ListAsync_ReturnsMappedDtos()
    {
        // Arrange
        var name = "TestFile1";
        var format = "glb";
        var guid = Guid.NewGuid() ;
        var url = new Uri("http://localhost"); 
        var files = new List<ModelFile> { new() { Name = name, Format = format, Id = guid , Url = url} };
        _mockStorage.Setup(s => s.ListAsync(It.IsAny<CancellationToken>()))
                    .ReturnsAsync(files);

        // Act
        var result = await _service.ListAsync();

        // Assert
        Assert.AreEqual(1, result.Count);
        Assert.AreEqual(name, result[0].Name);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenAliasInvalid()
    {
        // Arrange
        var filename = "file.glb";
        var alias = "Invalid Alias!";
        var request = new UploadModelRequest
        {
            Content = new MemoryStream(),
            OriginalFileName = filename,
            Alias = alias
        };

        // Act + Assert
        var ex = await Assert.ThrowsExceptionAsync<ArgumentException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        StringAssert.Contains(ex.Message, "Alias not valid");
    }

    [TestMethod]
    public async Task UploadAsync_CallsStorageUpload_WhenValid()
    {
        // Arrange
        var stream = new MemoryStream(new byte[] { 1, 2 });
        var filename = "file.glb";
        var alias = "alias1";
        var request = new UploadModelRequest
        {
            Content = stream,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act
        var result = await _service.UploadAsync(request, CancellationToken.None);

        // Assert
        _mockStorage.Verify(s => s.UploadAsync(
            It.IsAny<string>(),
            stream,
            "model/gltf-binary",
            It.IsAny<IDictionary<string, string>>(),
            It.IsAny<CancellationToken>()),
            Times.Once);

        Assert.AreEqual("Uploaded successfully.", result.Message);
        Assert.AreEqual(alias, result.Alias);
    }
}