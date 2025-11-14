using Moq;
using Microsoft.AspNetCore.Mvc;
using ECAD_Backend.Application.DTOs.Filter;
using ECAD_Backend.Application.DTOs.Forms;
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
        _controller = new ModelController(_mockModelService.Object, _mockUploadService.Object, _mockStateService.Object,null);
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

    // [TestMethod]
    // public async Task Upload_ReturnsOk_WithUploadResult()
    // {
    //     // Arrange
    //     var fileMocked = new Mock<IFormFile>();
    //     var fileName = "test.glb";
    //     var memoryStream = new MemoryStream([1]);
    //     var message = "Uploaded successfully.";
    //     var alias = "alias";
    //     var blobName = "blob123";
    //     var expectedUploadResult = new UploadResultDto
    //     {
    //         Message = message,
    //         Alias = alias,
    //         BlobName = blobName
    //     };
    //     var files =  new List<IFormFile> { fileMocked.Object };
    //     
    //     fileMocked.Setup(f => f.FileName).Returns(fileName);
    //     fileMocked.Setup(f => f.OpenReadStream()).Returns(memoryStream);
    //     _mockUploadService.Setup(s => s.UploadAsync(
    //             It.IsAny<UploadModelRequestDto>(), It.IsAny<CancellationToken>()))
    //         .ReturnsAsync(expectedUploadResult);
    //
    //     // Act
    //     var result = await _controller.Upload(files, alias, fileName, null, null, CancellationToken.None);
    //     var okResult = result as OkObjectResult;
    //     var uploadResult = okResult!.Value as UploadResultDto;
    //
    //     // Assert
    //     Assert.IsNotNull(okResult);
    //     Assert.AreEqual(message, uploadResult!.Message);
    //     Assert.AreEqual(alias, uploadResult.Alias);
    //     Assert.AreEqual(blobName, uploadResult.BlobName);
    // }

    // [TestMethod]
    // public async Task Upload_Throws_WhenNoFiles()
    // {
    //     // Arrange
    //     var expectedErrorMessage = "No files were uploaded";
    //     var files = new List<IFormFile>();
    //     var fileAlias = "alias";
    //     var originalFileName = "test.glb";
    //     
    //     // Act
    //     var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
    //         await _controller.Upload(files, fileAlias, originalFileName, null, null, CancellationToken.None));
    //
    //     // Assert
    //     Assert.Contains(expectedErrorMessage, result.Message);
    // }
    //
    // [TestMethod]
    // public async Task Upload_Throws_WhenNoAlias()
    // {
    //     // Arrange
    //     var expectedErrorMessage = "alias is required";
    //     var fileMocked = new Mock<IFormFile>();
    //     var files = new List<IFormFile> {fileMocked.Object };
    //     string fileAlias = null!;
    //     var originalFileName = "test.glb";
    //     
    //     // Act
    //     var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
    //         await _controller.Upload(files, fileAlias, originalFileName, null, null, CancellationToken.None));
    //
    //     // Assert
    //     Assert.Contains(expectedErrorMessage, result.Message);
    // }
    //
    // [TestMethod]
    // public async Task Upload_CatchAndThrows_WhenUploadServiceThrows()
    // {
    //     // Arrange
    //     var expectedErrorMessage = "upload service throws";
    //     var fileMocked = new Mock<IFormFile>();
    //     var files = new List<IFormFile> { fileMocked.Object };
    //     var fileName = "test.glb";
    //     var memoryStream = new MemoryStream([1]);
    //     var fileAlias = "alias";
    //     var originalFileName = "test.glb";
    //     var serviceException = new BadRequestException("The upload service throws.");
    //     
    //     fileMocked.Setup(f => f.FileName).Returns(fileName);
    //     fileMocked.Setup(f => f.OpenReadStream()).Returns(memoryStream);
    //     _mockUploadService.Setup(s => s.UploadAsync(
    //         It.IsAny<UploadModelRequestDto>(), It.IsAny<CancellationToken>()))
    //         .ThrowsAsync(serviceException);
    //     
    //     // Act
    //     var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
    //         await _controller.Upload(files, fileAlias, originalFileName, null, null, CancellationToken.None));
    //     
    //     // Assert
    //     Assert.Contains(expectedErrorMessage, result.Message);
    // }

    // [TestMethod]
    // public async Task Delete_ReturnsOk_WithDeleteModelResultDto()
    // {
    //     // Arrange
    //     var id = Guid.NewGuid();
    //     _mockModelService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
    //     
    //     // Act
    //     var result = await _controller.Delete(id, CancellationToken.None);
    //     var okResult = result.Result as OkObjectResult;
    //     var deleteModelResult = okResult!.Value as DeleteModelResultDto;
    //     
    //     // Assert
    //     var expectedMessage = $"Model '{id}' was deleted successfully.";
    //     Assert.IsNotNull(result);
    //     Assert.Contains(expectedMessage, deleteModelResult!.Message);
    // }

    // [TestMethod]
    // public async Task Delete_Throws_WhenNotDeleted()
    // {
    //     // Arrange
    //     var expectedErrorMessage = "We couldn't find a model with the ID";
    //     var id = Guid.NewGuid();
    //     _mockModelService.Setup(s => s.DeleteAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(false);
    //     
    //     // Act
    //     var result = await Assert.ThrowsAsync<NotFoundException>(async () => await _controller.Delete(id, CancellationToken.None));
    //
    //     // Assert
    //     Assert.Contains(expectedErrorMessage, result.Message);
    // }

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

    [TestMethod]
    public async Task PutDetails_ReturnsOk_WithUpdateDetailsResult()
    {
        // Arrange
        var expectedMessage = "Updated successfully.";
        var expectedUpdateDetailsResult = new UpdateDetailsResultDto {Message = expectedMessage};
        var id = Guid.NewGuid();
        var newAlias = "newAlias";
        var description = "empty description";
        var isFavourite = false;
        var requestDto = new UpdateModelDetailsRequestDto
            {NewAlias = newAlias, Description = description, IsFavourite = isFavourite};
        _mockModelService.Setup(s => s.UpdateDetailsAsync
            (It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<List<string>>(),
            It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedUpdateDetailsResult);
        
        // Act
        var result = await _controller.PutDetails(id, requestDto, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var updateResult = okResult!.Value as UpdateDetailsResultDto;
        
        // Assert
        Assert.IsNotNull(okResult);
        Assert.AreEqual(expectedMessage, updateResult!.Message);
    }

    [TestMethod]
    public async Task PutDetails_Throws_WhenEmptyID()
    {
        // Arrange
        var expectedErrorMessage = "provided ID is invalid";
        var emptyId = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _controller.PutDetails(emptyId, null!, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task PutIsNew_ReturnsOk_WithUpdateDetailsResult()
    {
        // Arrange
        var expectedMessage = "Updated successfully.";
        var expectedUpdateDetailsResult = new UpdateDetailsResultDto {Message = expectedMessage};
        var id = Guid.NewGuid();
        _mockModelService.Setup(s => s.UpdateIsNewAsync
            (It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedUpdateDetailsResult);
        
        // Act
        var result = await _controller.PutIsNew(id, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var updateResult = okResult!.Value as UpdateDetailsResultDto;
        
        // Assert
        Assert.IsNotNull(okResult);
        Assert.AreEqual(expectedMessage, updateResult!.Message);
    }

    [TestMethod]
    public async Task PutIsNew_Throws_WhenEmptyID()
    {
        // Arrange
        var expectedErrorMessage = "provided ID is invalid";
        var emptyId = Guid.Empty;
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _controller.PutIsNew(emptyId, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveState_ReturnsOk_WithUpdateStateResult()
    {
        // Arrange
        var expectedMessage = "Saved successfully.";
        var assetId = "valid AssetId";
        var version = "2.0";
        var stateJson = "valid stateJSON";
        var expectedUpdateStateResult = new UpdateStateResultDto {Message = expectedMessage, AssetId = assetId, Version = version};
        var form = new SaveStateFormDto{TargetVersion = version, StateJson = stateJson};
        _mockStateService.Setup(s => s.SaveStateAsync(It.IsAny<UpdateStateRequestDto>(), It.IsAny<CancellationToken>())).ReturnsAsync(expectedUpdateStateResult);
        
        // Act
        var result = await _controller.SaveState(assetId, form, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var updateStateResult = okResult!.Value as UpdateStateResultDto;
        
        // Assert
        Assert.IsNotNull(okResult);
        Assert.AreEqual(expectedUpdateStateResult.Message, updateStateResult!.Message);
        Assert.AreEqual(expectedUpdateStateResult.AssetId, updateStateResult.AssetId);
        Assert.AreEqual(expectedUpdateStateResult.Version, updateStateResult.Version);
    }

    [TestMethod]
    public async Task SaveState_Throws_WhenAssetIdNull()
    {
        // Arrange
        var expectedErrorMessage = "AssetId is required";
        string assetId = null!;
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () =>
            await _controller.SaveState(assetId, null!, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveState_Throws_WhenNoStateProvided()
    {
        // Arrange
        var expectedErrorMessage = "Either 'StateJson' or 'StateFile' must be provided";
        var assetId = "valid AssetID";
        var form = new SaveStateFormDto();
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _controller.SaveState(assetId, form, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task SaveState_Throws_WhenEmptyState()
    {
        // Arrange
        var expectedErrorMessage = "State content is empty";
        var assetId = "valid AssetID";
        var mockedFormFile = new Mock<IFormFile>();
        mockedFormFile.Setup(f => f.OpenReadStream()).Returns(new MemoryStream());
        var form = new SaveStateFormDto {StateFile = mockedFormFile.Object};
        
        // Act
        var result = await Assert.ThrowsAsync<BadRequestException>(async () => await _controller.SaveState(assetId, form, CancellationToken.None));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public async Task GetById_ReturnsOk_WithModelItem()
    {
        // Arrange
        var id = Guid.NewGuid();
        var name = "ModelName";
        var format = "glb";
        var url = new Uri("https://localhost");
        var modelItemDto = new ModelItemDto {Name = name, Format = format, Id = id, Url = url};
        _mockModelService.Setup(s => s.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync(modelItemDto);
        
        // Act
        var result = await _controller.GetById(id, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var modelItemResult = okResult!.Value as ModelItemDto;
        
        // Assert
        Assert.IsNotNull(okResult);
        Assert.AreEqual(modelItemDto, modelItemResult);
    }
    
    [TestMethod]
    public async Task DeleteStateVersion_ReturnsOk_WithDeleteStateVersionResult()
    {
        // Arrange
        var expectedMessage = "Deleted successfully.";
        var assetId = "valid AssetId";
        var version = "2.0";
        var expectedDeleteStateVersionResult = new DeleteStateVersionResultDto {Version = version, AssetId = assetId, Message = expectedMessage};
        _mockStateService.Setup(s => s.DeleteVersionAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(expectedDeleteStateVersionResult);
        
        // Act
        var result = await _controller.DeleteStateVersion(assetId, version, CancellationToken.None);
        var okResult = result as OkObjectResult;
        var deleteStateVersionResult = okResult!.Value as DeleteStateVersionResultDto;
        
        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(expectedDeleteStateVersionResult.Message, deleteStateVersionResult!.Message);
        Assert.AreEqual(expectedDeleteStateVersionResult.AssetId, deleteStateVersionResult.AssetId);
        Assert.AreEqual(expectedDeleteStateVersionResult.Version, deleteStateVersionResult.Version);
    }

    [TestMethod]
    public Task LockModel_ReturnsOk()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        var result = _controller.LockModel(id);

        // Assert
        Assert.IsInstanceOfType(result, typeof(OkResult));
        return Task.CompletedTask;
    }

    [TestMethod]
    public Task LockModel_Throws_WhenInvalidID()
    {
        // Arrange
        var expectedErrorMessage = "Invalid model ID";
        var id = Guid.Empty;
        
        // Act 
        var result = Assert.Throws<BadRequestException>(() => _controller.LockModel(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        return Task.CompletedTask;
    }

    [TestMethod]
    public Task UnlockModel_ReturnsOk()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        var result = _controller.UnlockModel(id);

        // Assert
        Assert.IsInstanceOfType(result, typeof(OkResult));
        return Task.CompletedTask;
    }

    [TestMethod]
    public Task UnlockModel_Throws_WhenInvalidID()
    {
        // Arrange
        var expectedErrorMessage = "Invalid model ID";
        var id = Guid.Empty;
        
        // Act 
        var result = Assert.Throws<BadRequestException>(() => _controller.UnlockModel(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        return Task.CompletedTask;
    }

    [TestMethod]
    public Task Heartbeat_ReturnsOk()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        var result = _controller.Heartbeat(id);

        // Assert
        Assert.IsInstanceOfType(result, typeof(OkResult));
        return Task.CompletedTask;
    }

    [TestMethod]
    public Task Heartbeat_Throws_WhenInvalidID()
    {
        // Arrange
        var expectedErrorMessage = "Invalid model ID";
        var id = Guid.Empty;
        
        // Act 
        var result = Assert.Throws<BadRequestException>(() => _controller.Heartbeat(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
        return Task.CompletedTask;
    }
}