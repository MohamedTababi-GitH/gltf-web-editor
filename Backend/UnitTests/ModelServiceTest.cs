using Moq;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Exceptions;

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
        // _service = new ModelService(_mockStorage.Object);
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
        var filter = new ModelFilterDto();
        _mockStorage.Setup(s => s.ListPageAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<ModelFilterDto>(), It.IsAny<CancellationToken>()))
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
        var filter = new ModelFilterDto();

        // Act & Assert
        var result = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(async () =>
            await _service.ListAsync(limit, null, filter, CancellationToken.None));
        
        // Assert
        Assert.AreEqual(nameof(limit), result.ParamName);
    }

    [TestMethod]
    public async Task ListAsync_Throws_WhenLimitIsTooBig()
    {
        // Arrange
        var expectedErrorMessage = "page limit must be between 1 and 100";
        var limit = 101;
        var filter = new ModelFilterDto();

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
        var request = new UploadModelRequestDto
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
        var expectedErrorMessage = "The upload requestDto is empty";
        UploadModelRequestDto requestDto = null!;

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(requestDto, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

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
            await _service.UploadAsync(request, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

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
        var request = new UploadModelRequestDto
        {
            Files = files,
            OriginalFileName = entryFileName,
            Alias = alias
        };

        // Act & Assert
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _service.UploadAsync(request, CancellationToken.None));
        
        // Assert
        var expectedErrorMessage = $"The main model file '{entryFileName}' is missing";
        Assert.Contains(expectedErrorMessage, result.Message);
    }

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
            await _service.UploadAsync(request, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

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
            await _service.UploadAsync(request, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"file type of '{fileFail}' is not supported";
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
        var expectedErrorMessage = "provided model ID is not valid";
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
        var expectedErrorMessage = "couldn't find a model with the ID";
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.DeleteByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _service.DeleteAsync(id, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_CallsStorageAndReturnsTrue()
    {
        // Arrange
        var id = Guid.NewGuid();
        var newAlias = "newAlias";
        _mockStorage.Setup(s => s.UpdateDetailsAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<List<string>?>(),
            It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        
        // Act
        var result = await _service.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None);
        
        // Assert
        _mockStorage.Verify(s => s.UpdateDetailsAsync(
                It.IsAny<Guid>(),
                It.IsAny<string?>(),
                It.IsAny<List<string>?>(),
                It.IsAny<string?>(),
                It.IsAny<bool?>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
        
        Assert.AreEqual("Updated successfully.", result.Message);
        
    }

    [TestMethod]
    public async Task UpdateDetailsAsync_Throws_WhenEmptyId()
    {
        // Arrange
        var expectedErrorMessage = "provided model ID is not valid";
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
        var expectedErrorMessage = "alias format is invalid";
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
        var expectedErrorMessage = "couldn't find a model with the ID";
        var newAlias = "newAlias";
        var id  = Guid.NewGuid();
        _mockStorage.Setup(s => s.UpdateDetailsAsync(It.IsAny<Guid>(), It.IsAny<string?>(), It.IsAny<List<string>?>(),
            It.IsAny<string?>(), It.IsAny<bool?>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () =>
            await _service.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
}