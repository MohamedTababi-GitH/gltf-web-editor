using Moq;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.DTOs;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Exceptions;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelServiceTest
{
    private Mock<IModelStorage> _mockStorage = null!;
    private ModelService _service = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockStorage = new Mock<IModelStorage>();
        _service = new ModelService(_mockStorage.Object);
    }

    [TestMethod]
    public async Task ListAsync_ReturnsPageResult()
    {
        // Arrange
        var name = "TestFile1";
        var format = "glb";
        var guid = Guid.NewGuid() ;
        var url = new Uri("http://localhost"); 
        var files = new List<ModelFile> { new() { Name = name, Format = format, Id = guid , Url = url} };
        var limit = 5;
        var filter = new ModelFilter();
        _mockStorage.Setup(s => s.ListPageAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<ModelFilter>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((files, null));

        // Act
        var result = await _service.ListAsync(limit, null, filter, CancellationToken.None);

        // Assert
        Assert.HasCount(1, result.Items);
        Assert.AreEqual(name, result.Items[0].Name);
    }

    [TestMethod]
    public async Task ListAsync_Throws_WhenLimitIsTooSmall()
    {
        // Arrange
        var limit = 0;
        var filter = new ModelFilter();

        // Act & Assert
        var result = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(async () =>
            await _service.ListAsync(limit, null, filter, CancellationToken.None));
        
        // Assert
        Assert.AreEqual("limit", result.ParamName);
    }

    [TestMethod]
    public async Task ListAsync_Throws_WhenLimitIsTooBig()
    {
        // Arrange
        const string expectedErrorMessage = "limit must be 1..100";
        var limit = 101;
        var filter = new ModelFilter();

        // Act & Assert
        var result = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(async() =>
            await _service.ListAsync(limit, null, filter, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    [TestMethod]
    public async Task UploadAsync_CallsStorageUpload_WhenValid()
    {
        // Arrange
        var stream = new MemoryStream([1]);
        var filename = "file.glb";
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = [(filename, stream)],
            OriginalFileName = filename,
            Alias = alias
        };

        // Act
        var result = await _service.UploadAsync(request, CancellationToken.None);

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
        const string expectedErrorMessage = "request cannot be null";
        UploadModelRequest request = null!;

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenFileIsNull()
    {
        // Arrange
        const string expectedErrorMessage = "No files provided";
        var request = new UploadModelRequest
        {
            Files = null!,
            OriginalFileName = null!,
            Alias = null!
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenFileListIsEmpty()
    {
        // Arrange
        const string expectedErrorMessage = "No files provided";
        var emptyList = new List<(string, Stream)>();
        var request = new UploadModelRequest
        {
            Files = emptyList,
            OriginalFileName = null!,
            Alias = null!
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenAliasIsNull()
    {
        // Arrange
        const string expectedErrorMessage = "Alias is required";
        var filename = "file.glb";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        string alias = null!;
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenAliasInvalid()
    {
        // Arrange
        const string expectedErrorMessage = "Alias must contain";
        var filename = "file.glb";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "Invalid Alias!";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenOriginalFileNameIsNull()
    {
        // Arrange
        const string expectedErrorMessage = "Original file name";
        string filename = null!;
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenWrongFileExtension()
    {
        // Arrange
        const string expectedErrorMessage = ".glb or .gltf file";
        var filename = "file.jpg";
        var stream = new MemoryStream([1]);
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

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
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = entryFileName,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));
        
        // Assert
        var expectedErrorMessage = $"Entry file '{entryFileName}' was not included";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenFirstFileEmpty()
    {
        // Arrange
        const string expectedErrorMessage = "File stream";
        const string expectedErrorMessageEnd = "null.";
        var filename = "model.glb";
        MemoryStream stream = null!;
        var files = new List<(string, Stream)> {(filename, stream)};
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = filename,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        Assert.EndsWith(expectedErrorMessageEnd, result.Message);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenAnyFileEmpty()
    {
        // Arrange
        const string expectedErrorMessage = "File stream";
        const string expectedErrorMessageEnd = "null.";
        var file1 = "model.gltf";
        var file2 = "model.bin";
        var stream1 = new MemoryStream([1]);
        MemoryStream stream2 = null!;
        var files = new List<(string, Stream)> {(file1, stream1), (file2, stream2)};
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        StringAssert.EndsWith(result.Message, expectedErrorMessageEnd);
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenUnsupportedFileExtension()
    {
        // Arrange
        const string expectedErrorMessage = "Unsupported file type";
        var file1 = "model.glb";
        var file2 = "model.txt";
        var stream1 = new MemoryStream([1]);
        var stream2 = new MemoryStream([2]);
        var files = new List<(string, Stream)> {(file1, stream1), (file2, stream2)};
        var alias = "alias";
        var request = new UploadModelRequest
        {
            Files = files,
            OriginalFileName = file1,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task DeleteAsync_CallsStorageAndReturnsTrue()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.DeleteByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

        // Act
        var result = await _service.DeleteAsync(id, CancellationToken.None);

        // Assert
        Assert.IsTrue(result);
    }
    
    [TestMethod]
    public async Task DeleteAsync_Throws_WhenEmptyId()
    {
        // Arrange
        const string expectedErrorMessage = "Invalid model ID";
        var id = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.DeleteAsync(id, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task DeleteAsync_CallsStorageAndThrows_WhenInvalidId()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.DeleteByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _service.DeleteAsync(id, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"Model with ID '{id}' not found";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_CallsStorageAndReturnsTrue()
    {
        // Arrange
        var id = Guid.NewGuid();
        var newAlias = "newAlias";
        _mockStorage.Setup(s => s.UpdateDetailsAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        
        // Act
        var result = await _service.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None);
        
        // Assert
        Assert.IsTrue(result);
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_Throws_WhenEmptyId()
    {
        // Arrange
        const string expectedErrorMessage = "Invalid model ID";
        var id = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UpdateDetailsAsync(id, null, null,null, null, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_Throws_WhenAliasInvalid()
    {
        // Arrange
        const string expectedErrorMessage = "Alias format is invalid";
        var newAlias = "Invalid Alias!";
        var id  = Guid.NewGuid();
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () =>
            await _service.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_CallsStorageAndThrows_WhenIDInvalid()
    {
        // Arrange
        const string expectedErrorMessage = "Model with ID";
        const string expectedErrorMessageEnd = "not found.";
        var newAlias = "newAlias";
        var id  = Guid.NewGuid();
        _mockStorage.Setup(s => s.UpdateDetailsAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<string?>(),
            It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () =>
            await _service.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        Assert.EndsWith(expectedErrorMessageEnd, result.Message);
    }
}