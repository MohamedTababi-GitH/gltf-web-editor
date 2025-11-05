using System.Text;
using System.Text.Json;
using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure.Exceptions;
using Moq;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class ModelStateServiceTest
{
    private Mock<IModelStorage> _mockStorage = null!;
    private ModelStateService _modelStateService = null!;

    [TestInitialize]
    public void Setup()
    {
        _mockStorage = new Mock<IModelStorage>();
        _modelStateService = new ModelStateService(_mockStorage.Object);
    }

    [TestMethod]
    public async Task SaveStateAsync_ReturnsUpdateStateResult()
    {
        // Arrange
        var message = "Saved successfully.";
        var assetId = "assetId";
        var stateJson = "validStateJson";
        var requestDto = new UpdateStateRequestDto { AssetId = assetId, StateJson = stateJson };
        _mockStorage.Setup(s => s.UploadOrOverwriteAsync(It.IsAny<string>(), It.IsAny<MemoryStream>(),
            It.IsAny<string>(), It.IsAny<Dictionary<string, string>?>(), It.IsAny<CancellationToken>()));

        // Act
        var result = await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None);

        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(assetId, result.AssetId);
        Assert.AreEqual(message, result.Message);
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestIsNull()
    {
        // Arrange
        var expectedErrorMessage = "state update requestDto is empty";
        UpdateStateRequestDto requestDto = null!;
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestAssetIdIsNull()
    {
        // Arrange
        var expectedErrorMessage = "AssetId is required";
        var requestDto = new UpdateStateRequestDto
        {
            AssetId = null!,
            StateJson = null!
        };
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestStateJsonIsNull()
    {
        // Arrange
        var expectedErrorMessage = "StateJson is required";
        var assetId = "assetId";
        var requestDto = new UpdateStateRequestDto
        {
            AssetId = assetId,
            StateJson = null!
        };
        
        // Act
        var result  = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestStateJsonNotValid()
    {
        // Arrange
        var expectedErrorMessage = "StateJson must be valid JSON";
        var assetId = "assetId";
        var stateJson = "invalidStateJson";
        var requestDto = new UpdateStateRequestDto { AssetId = assetId, StateJson = stateJson };
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestStateJsonIsTooLarge()
    {
        // Arrange
        var expectedErrorMessage = "StateJson is too large";
        var assetId = "assetId";
        var stateJson = "validStateJson";
        var requestDto = new UpdateStateRequestDto { AssetId = assetId, StateJson = stateJson };
        var mockEncoder = new Mock<Encoding>();
        mockEncoder.Setup(e => e.GetBytes(It.IsAny<string>())).Returns(new byte[1_000_001]);
        
        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.SaveStateAsync(requestDto, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);

    }

    [TestMethod]
    public async Task DeleteVersionAsync_ReturnsDeleteStateVersionResult()
    {
        // Arrange
        var assetId = "assetId";
        var version = "version2";
        var message = $"Deleted version '{version}'.";
        _mockStorage.Setup(s =>
                s.DeleteStateVersionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        
        // Act
        var result = await _modelStateService.DeleteVersionAsync(assetId, version, CancellationToken.None);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(assetId, result.AssetId);
        Assert.AreEqual(version, result.Version);
        Assert.AreEqual(message, result.Message);
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenAssetIdIsNull()
    {
        // Arrange
        var expectedErrorMessage = "AssetId is required";
        string assetId = null!;
        var version = "version2";

        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.DeleteVersionAsync(assetId, version, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenVersionIsNull()
    {
        // Arrange
        var expectedErrorMessage = "Version is required";
        var assetId = "assetId";
        string version = null!;

        // Act
        var result = await Assert.ThrowsAsync<ValidationException>(async () => await _modelStateService.DeleteVersionAsync(assetId, version, CancellationToken.None));

        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenVersionNotFound()
    {
        // Arrange
        string assetId = "assetId";
        var version = "version2";
        _mockStorage.Setup(s =>
                s.DeleteStateVersionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);

        // Act
        var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _modelStateService.DeleteVersionAsync(assetId, version, CancellationToken.None));

        // Assert
        var expectedErrorMessage = $"version '{version}' was not found for asset '{assetId}'.";
        Assert.Contains(expectedErrorMessage, result.Message);   
    }
}