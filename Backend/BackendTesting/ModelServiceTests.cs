using Moq;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Domain.Entities;

namespace ECAD_Backend.BackendTesting;

[TestFixture]
public class ModelServiceTests
{
    private Mock<IModelStorage> _mockStorage;
    private ModelService _service;

    [SetUp]
    public void SetUp()
    {
        _mockStorage = new Mock<IModelStorage>();
        _service = new ModelService(_mockStorage.Object);
    }

    [Test]
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
        Assert.That(result, Has.Count.EqualTo(1));
        Assert.That(result.First().Name, Is.EqualTo(name));
    }

    [Test]
    public void UploadAsync_Throws_WhenAliasInvalid()
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
        var ex = Assert.ThrowsAsync<ArgumentException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        Assert.That(ex!.Message, Does.Contain("Alias not valid"));
    }

    [Test]
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

        Assert.That(result.Message, Is.EqualTo("Uploaded successfully."));
        Assert.That(result.Alias, Is.EqualTo(alias));
    }
}