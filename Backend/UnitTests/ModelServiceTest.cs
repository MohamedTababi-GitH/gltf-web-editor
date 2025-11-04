using Moq;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.General;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Mappers.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Domain.Entities;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelServiceTest
{
    private Mock<IModelStorage> _mockStorage = null!;
    private Mock<IModelMapper> _mockMapper = null!;
    private ModelService _modelService = null!;
    private ModelUploadService _modelUploadService = null!;

    [TestInitialize]
    public void SetUp()
    {
        _mockStorage = new Mock<IModelStorage>();
        _mockMapper = new Mock<IModelMapper>();
        _modelService = new ModelService(_mockStorage.Object, _mockMapper.Object);
    }

    [TestMethod]
    public async Task GetByIdAsync_ReturnsModelItem()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "alias";
        var format = "glb";
        var url = new Uri("http://localhost");
        var modelFile = new ModelFile{Name = name, Format = format, Url = url, Id = id};
        var modelItemDto = new ModelItemDto {Id = id, Name = name, Format = format,  Url = url};
        _mockStorage.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(modelFile);
        _mockMapper.Setup(m => m.ToDto(It.IsAny<ModelFile>())).Returns(modelItemDto);

        // Act
        var result = await _modelService.GetByIdAsync(id,  CancellationToken.None);

        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(modelItemDto.Id, result.Id);
        Assert.AreEqual(modelItemDto.Name, result.Name);

    }

    [TestMethod]
    public async Task GetByIdAsync_Throws_WhenEmptyID()
    {
        // Arrange
        var expectedErrorMessage = "The provided model ID is invalid.";
        var emptyId = Guid.Empty;

        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelService.GetByIdAsync(emptyId, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);

    }
    
    [TestMethod]
    public async Task GetByIdAsync_CallsStorageAndThrows_WhenModelFileIsNull()
    {
        // Arrange
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(null as ModelFile);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _modelService.GetByIdAsync(id, CancellationToken.None));
        
        // Assert
        var expectedErrorMessage = $"No model was found with ID '{id}'.";
        Assert.Contains(expectedErrorMessage, result.Message);

    }

    [TestMethod]
    public async Task ListAsync_ReturnsPageResult()
    {
        // Arrange
        var name = "TestFile1";
        var format = "glb";
        var guid = Guid.NewGuid();
        var url = new Uri("http://localhost");

        var modelFile = new ModelFile
        {
            Name = name,
            Format = format,
            Id = guid,
            Url = url
        };

        var files = new List<ModelFile> { modelFile };
        var limit = 5;
        var filter = new ModelFilterDto();

        // storage.ListPageAsync -> returns (files, null cursor)
        _mockStorage
            .Setup(s => s.ListPageAsync(
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<ModelFilterDto>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((files, (string?)null));

        // storage.CountAsync -> return some total (doesn't affect NRE but keeps service happy)
        _mockStorage
            .Setup(s => s.CountAsync(
                It.IsAny<ModelFilterDto>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        // mapper.ToDto -> map ModelFile -> ModelItemDto that the controller / API returns
        _mockMapper
            .Setup(m => m.ToDto(modelFile))
            .Returns(new ModelItemDto
            {
                Id = guid,
                Name = name,
                Format = format,
                Url = url
            });

        // Act
        var result = await _modelService.ListAsync(limit, null, filter, CancellationToken.None);

        // Assert
        Assert.AreEqual(1, result.Items.Count, "Expected one item in the page result.");
        Assert.AreEqual(name, result.Items[0].Name, "Item Name should match mapped alias.");
        Assert.AreEqual(format, result.Items[0].Format);
        Assert.AreEqual(url, result.Items[0].Url);
        Assert.AreEqual(1, result.TotalCount);
        Assert.IsNull(result.NextCursor);
        Assert.IsFalse(result.HasMore);
    }

    [TestMethod]
    public async Task ListAsync_Throws_WhenLimitIsTooSmall()
    {
        // Arrange
        var limit = 0;
        var filter = new ModelFilterDto();

        // Act & Assert
        var result = await Assert.ThrowsAsync<ArgumentOutOfRangeException>(async () =>
            await _modelService.ListAsync(limit, null, filter, CancellationToken.None));
        
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
            await _modelService.ListAsync(limit, null, filter, CancellationToken.None));

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
        var result = await _modelService.DeleteAsync(id, CancellationToken.None);

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
            await _modelService.DeleteAsync(id, CancellationToken.None));

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
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _modelService.DeleteAsync(id, CancellationToken.None));

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
        var result = await _modelService.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None);
        
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
            await _modelService.UpdateDetailsAsync(id, null, null,null, null, CancellationToken.None));
        
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
            await _modelService.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None));
        
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
            await _modelService.UpdateDetailsAsync(id, newAlias, null, null, null, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateIsNewAsync_CallsStorageAndReturnsUpdateDetailsResult()
    {
        // Arrange
        var emptyMessage = "";
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.UpdateIsNewAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        
        // Act
        var result = await _modelService.UpdateIsNewAsync(id, CancellationToken.None);
        
        // Assert
        Assert.AreEqual(emptyMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateIsNewAsync_Throws_WhenEmptyID()
    {
        // Arrange
        var expectedErrorMessage = "provided model ID is not valid";
        var id = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelService.UpdateIsNewAsync(id, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task UpdateIsNewAsync_CallsStorageAndThrows_WhenInvalidId()
    {
        // Arrange
        var expectedErrorMessage = "couldn't find a model with the ID";
        var id = Guid.NewGuid();
        _mockStorage.Setup(s => s.UpdateIsNewAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
        
        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _modelService.UpdateIsNewAsync(id, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }
}