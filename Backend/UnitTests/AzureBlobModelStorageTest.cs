using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using ECAD_Backend.Infrastructure.Cursor;
using Microsoft.Extensions.Options;
using Moq;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class AzureBlobModelStorageTest
{
    private Mock<ICursorSerializer> _mockCursor = null!;
    
    [TestMethod]
    public void Constructor_Throws_WhenConnectionStringMissing()
    {
        // Arrange
        var connectionString = "";
        var containermodels = "models";
        
        // Act
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = connectionString,
                ContainerModels = containermodels
            }
        );
        _mockCursor = new Mock<ICursorSerializer>();
        
        // Assert
        Assert.Throws<InvalidOperationException>(() => new AzureBlobModelStorage(options, _mockCursor.Object));
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenBlobNameIsEmpty()
    {
        // Arrange
        var blobName = "";
        var content = new MemoryStream([1]);
        var contentType = "image/png";
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = "https://fake.blob.core.windows.net/container",
                ContainerModels = "models"
            }
        );
        _mockCursor = new Mock<ICursorSerializer>();
        var storage = new AzureBlobModelStorage(options, _mockCursor.Object);
        
        // Act + Assert
        var result = await Assert.ThrowsAsync<ArgumentException>(async () =>
            await storage.UploadAsync(blobName, content, contentType));
        Assert.AreEqual(nameof(blobName), result.ParamName);
    }
    
    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamIsNull()
    {
        // Arrange
        var blobName = "blobName";
        MemoryStream content = null!;
        var contentType = "image/png";
        var options = Options.Create(new BlobOptions
        {
            ConnectionString = "https://fake.blob.core.windows.net/container",
            ContainerModels = "models"
        });
        _mockCursor = new Mock<ICursorSerializer>();
        var storage = new AzureBlobModelStorage(options, _mockCursor.Object);
        
        // Act + Assert
        var result = await Assert.ThrowsAsync<ArgumentNullException>(async () =>
            await storage.UploadAsync(blobName, content, contentType));
        Assert.AreEqual(nameof(content), result.ParamName);
    }
}