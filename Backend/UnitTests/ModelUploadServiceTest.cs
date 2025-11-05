using System.Collections.ObjectModel;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure.Exceptions;
using Moq;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelUploadServiceTest
{
    private Mock<IModelStorage> _mockStorage = null!;
    private ModelUploadService _modelUploadService = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockStorage = new Mock<IModelStorage>();
        _modelUploadService = new ModelUploadService(_mockStorage.Object);
    }
    
    
    
    [TestMethod]
    public async Task UploadAsync_CallsStorageUpload_WhenValid()
    {
        // Arrange
        var stream = new MemoryStream([1]);
        var filename = "file.glb";
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = [(filename, stream)],
            OriginalFileName = filename,
            Alias = alias
        };

        // Act
        var result = await _modelUploadService.UploadAsync(request, CancellationToken.None);

        // Assert
        _mockStorage.Verify(s => s.UploadAsync(
                It.IsAny<string>(),
                It.IsAny<Stream>(),
                It.IsAny<string>(),
                It.IsAny<IDictionary<string, string>>(),
                It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);

        Assert.AreEqual("Uploaded successfully.", result.Message);
        Assert.AreEqual(alias, result.Alias);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenRequestIsNull()
    {
        // Arrange
        var expectedErrorMessage = "The upload requestDto is empty";
        UploadModelRequestDto requestDto = null!;

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(requestDto, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenFileIsNull()
    {
        // Arrange
        var expectedErrorMessage = "No files were provided in the upload request";
        var request = new UploadModelRequestDto
        {
            Files = null!,
            OriginalFileName = null!,
            Alias = null!
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenFileListIsEmpty()
    {
        // Arrange
        var expectedErrorMessage = "No files were provided in the upload request";
        var emptyList = new List<(string, Stream)>();
        var request = new UploadModelRequestDto
        {
            Files = emptyList,
            OriginalFileName = null!,
            Alias = null!
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamInFileListIsNull()
    {
        // Arrange
        var file1 = "file.glb";
        var stream1 = new MemoryStream([1]);
        var file2 = "file2.glb";
        MemoryStream stream2 = null!;
        var alias = "model";
        var files = new List<(string, Stream)>{
            (file1, stream1), (file2, stream2)
        };
        var requestDto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _modelUploadService.UploadAsync(requestDto, CancellationToken.None));
        
        // Assert
        var expectedErrorMessage = $"The content of the file '{file2}' is empty or unreadable";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamInFileListIsUnreadable()
    {
        // Arrange
        var mockStream = new Mock<MemoryStream>();
        var file1 = "file.glb";
        var stream1 = new MemoryStream([1]);
        var file2 = "file2.glb";
        var alias = "model";
        var files = new List<(string, Stream)>{
            (file1, stream1), (file2, mockStream.Object)
        };
        var requestDto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };
        mockStream.Setup(s => s.CanRead).Returns(false);

        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _modelUploadService.UploadAsync(requestDto, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"The content of the file '{file2}' is empty or unreadable";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamInFileListIsEmpty()
    {
        // Arrange
        var file1 = "file.glb";
        var stream1 = new MemoryStream([1]);
        var file2 = "file2.glb";
        var stream2 = new MemoryStream([]);
        var alias = "model";
        var files = new List<(string, Stream)>{
            (file1, stream1), (file2, stream2)
        };
        var requestDto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _modelUploadService.UploadAsync(requestDto, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"The content of the file '{file2}' is empty.";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamInFileListIsEmptyMemoryStream()
    {
        // Arrange
        var file1 = "file.glb";
        var stream1 = new MemoryStream([1]);
        var file2 = "file2.glb";
        var stream2 = new MemoryStream([]);
        var alias = "model";
        var files = new List<(string, Stream)>{
            (file1, stream1), (file2, stream2)
        };
        var requestDto = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _modelUploadService.UploadAsync(requestDto, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"The content of the file '{file2}' is empty.";
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    // TODO for non-MemoryStream

    [TestMethod]
    public async Task UploadAsync_Throws_WhenAliasIsNull()
    {
        // Arrange
        var expectedErrorMessage = "name for the model is required";
        var filename = "file.glb";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        string alias = null!;
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenAliasInvalid()
    {
        // Arrange
        var expectedErrorMessage = "name can only contain letters, numbers, and underscores";
        var filename = "file.glb";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "Invalid Alias!";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenOriginalFileNameIsNull()
    {
        // Arrange
        var expectedErrorMessage = "original file name";
        string filename = null!;
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenWrongFileExtension()
    {
        // Arrange
        var expectedErrorMessage = ".glb or .gltf file";
        var filename = "file.jpg";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenEntryFileNotPresent()
    {
        // Arrange
        var filename = "model.glb";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var entryFileName = "entryFile.glb";
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = entryFileName,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));
        
        // Assert
        var expectedErrorMessage = $"The main model file '{entryFileName}' is missing";
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    //TODO required external files

    [TestMethod]
    public async Task UploadAsync_Throws_WhenFirstFileEmpty()
    {
        // Arrange
        var filename = "model.glb";
        MemoryStream stream = null!;
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"The content of the file '{filename}' is empty";
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenAnyFileEmpty()
    {
        // Arrange
        var file1 = "model.gltf";
        var stream1 = new MemoryStream([1]);
        var fileFail = "model.bin";
        MemoryStream stream2 = null!;
        var files = new List<(string, Stream)> {(file1, stream1), (fileFail, stream2)};
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"The content of the file '{fileFail}' is empty";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenUnsupportedFileExtension()
    {
        // Arrange
        var file1 = "model.glb";
        var stream1 = new MemoryStream([1]);
        var fileFail = "model.txt";
        var stream2 = new MemoryStream([2]);
        var files = new List<(string, Stream)> {(file1, stream1), (fileFail, stream2)};
        var alias = "alias";
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _modelUploadService.UploadAsync(request, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"file type of '{fileFail}' is not supported";
        Assert.Contains(expectedErrorMessage, result.Message);
    }
}