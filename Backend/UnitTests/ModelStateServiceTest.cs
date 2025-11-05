using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Application.Services;
using Moq;

namespace ECAD_Backend.UnitTests;

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
        
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestIsNull()
    {
        
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestAssetIdIsNull()
    {
        
    }

    [TestMethod]
    public async Task SaveStateAsync_Throws_WhenRequestStateJsonIsNull()
    {
        
    }

    [TestMethod]
    public async Task SaveStateAsync_ThrowsWhenRequestStateJsonIsTooLarge()
    {
        
    }

    [TestMethod]
    public async Task DeleteVersionAsync_ReturnsDeleteStateVersionResult()
    {
        
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenAssetIdIsNull()
    {
        
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenVersionIsNull()
    {
       
    }

    [TestMethod]
    public async Task DeleteVersionAsync_Throws_WhenVersionNotFound()
    {
        
    }
}