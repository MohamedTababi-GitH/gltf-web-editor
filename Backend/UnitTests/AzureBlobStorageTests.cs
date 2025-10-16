using Microsoft.Extensions.Options;
using Moq;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class AzureBlobStorageTests
{
    [TestMethod]
    public void Constructor_Throws_WhenConnectionStringMissing()
    {
        // Arrange
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = null,
                ContainerModels = "models"
            }
        );
        
        // Act + Assert
        Assert.ThrowsException<InvalidOperationException>(() => new AzureBlobModelStorage(options));
    }

    [TestMethod]
    public void Constructor_Throws_WhenContainerNameMissing()
    {
        // Arrange
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = "https://fake.blob.core.windows.net/container",
                ContainerModels = ""
            }
        );
        
        // Act + Assert
        Assert.ThrowsException<InvalidOperationException>(() => new AzureBlobModelStorage(options));
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenBlobNameIsEmpty()
    {
        // Arrange
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = "https://fake.blob.core.windows.net/container",
                ContainerModels = "models"
            }
        );
        var storage = new AzureBlobModelStorage(options);
        
        // Act + Assert
        await Assert.ThrowsExceptionAsync<ArgumentException>(async () =>
            await storage.UploadAsync("", new MemoryStream(), "application/octet-stream"));
    }

    [TestMethod]
    public async Task UploadAsync_Throws_WhenStreamIsNull()
    {
        // Arrange
        var options = Options.Create(new BlobOptions
        {
            ConnectionString = "https://fake.blob.core.windows.net/container",
            ContainerModels = "models"
        });
        var storage = new AzureBlobModelStorage(options);
        
        // Act + Assert
        await Assert.ThrowsExceptionAsync<ArgumentNullException>(async () =>
            await storage.UploadAsync("blobName", null, "application/octet-stream"));
    }

    // [TestMethod]
    // public async Task UploadAsync_Succeeds_WithValidParameters()
    // {
    //     // Arrange
    //     var options = Options.Create(new BlobOptions
    //     {
    //         ConnectionString = "https://fake.blob.core.windows.net/container",
    //         ContainerModels = "models"
    //     });
    //     var storage = new AzureBlobModelStorage(options);
    //     
    //     using var memoryStream = new MemoryStream(new byte[] {1, 2, 3});
    //     
    //     // Act + Assert
    //     // No Azure Connection possible, so checking for valid parameters
    //     try
    //     {
    //         await storage.UploadAsync("blobName", memoryStream, "application/octet-stream");
    //         Assert.IsTrue(true);
    //     }
    //     catch (Exception ex)
    //     {
    //         Assert.Fail($"Unexpected exception thrown: {ex.GetType().Name} - {ex.Message}");
    //     }
    // }
}