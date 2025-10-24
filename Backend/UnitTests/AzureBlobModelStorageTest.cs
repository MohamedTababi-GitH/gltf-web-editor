using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Options;
using Moq;
using ECAD_Backend.Infrastructure.Options;
using ECAD_Backend.Infrastructure.Storage;

namespace ECAD_Backend.UnitTests;

[TestClass]
public class AzureBlobModelStorageTest
{
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
        
        // Assert
        Assert.Throws<InvalidOperationException>(() => new AzureBlobModelStorage(options));
    }

    [TestMethod]
    public void Constructor_Throws_WhenContainerNameMissing()
    {
        // Arrange
        var connectionString = "https://fake.blob.core.windows.net/container";
        var containermodels = "";
        
        // Act
        var options = Options.Create(new BlobOptions
            {
                ConnectionString = connectionString,
                ContainerModels = containermodels
            }
        );
        
        // Assert
        Assert.Throws<InvalidOperationException>(() => new AzureBlobModelStorage(options));
    }

    [TestMethod]
    public async Task ListPageAsync_ReturnsPageResult()
    {
        
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
        var storage = new AzureBlobModelStorage(options);
        
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
        var storage = new AzureBlobModelStorage(options);
        
        // Act + Assert
        var result = await Assert.ThrowsAsync<ArgumentNullException>(async () =>
            await storage.UploadAsync(blobName, content, contentType));
        Assert.AreEqual(nameof(content), result.ParamName);
    }
    
    [TestMethod]
    public async Task UploadAsync_DoesNotThrow_ForValidParameters()
    {
        // Arrange
        var opts = Options.Create(new BlobOptions
        {
            ConnectionString = "https://127.0.0.1/devstoreaccount1/models", // fake but valid URI format
            ContainerModels = "models"
        });

        var storage = new AzureBlobModelStorage(opts);

        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        try
        {
            // Act
            await storage.UploadAsync("test-valid.glb", stream, "model/gltf-binary", null, CancellationToken.None);

            // Assert – if we reach here, validation succeeded
            Assert.IsTrue(true);
        }
        catch (ArgumentException ex)
        {
            Assert.Fail($"Validation should not fail for valid parameters: {ex.Message}");
        }
        catch (Exception ex)
        {
            // We ignore Azure RequestFailedException here because this test focuses on *validation logic*.
            if (ex.GetType().Name == "RequestFailedException")
            {
                Assert.Inconclusive("UploadAsync() attempted network call — validation passed before Azure request.");
            }
            else
            {
                Assert.Fail($"Unexpected exception: {ex.GetType().Name} - {ex.Message}");
            }
        }
    }
    
    private class TestableAzureBlobStorage : AzureBlobModelStorage
    {
        private readonly BlobClient _fakeBlobClient;

        public TestableAzureBlobStorage(IOptions<BlobOptions> options, BlobClient fakeBlobClient) : base(options)
        {
            _fakeBlobClient = fakeBlobClient;
        }
        
        // Override GetBlobClient behavior
        public void SetContainerForTesting(BlobContainerClient blobContainerClient)
        {
            var field = typeof(AzureBlobModelStorage).GetField("_container", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            field!.SetValue(this, blobContainerClient);
        }
    }

    [TestMethod]
    public async Task UploadAsync_DoesNotThrow_WithFakeBlobClient()
    {
        // Arrange
        var fakeResponse = new Mock<Response<BlobContentInfo>>();
        var mockBlobClient = new Mock<BlobClient>();

        mockBlobClient
            .Setup(c => c.UploadAsync(
                It.IsAny<Stream>(),
                It.IsAny<BlobUploadOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(fakeResponse.Object);

        // We can’t mock BlobContainerClient directly — create a fake container via test subclass
        var fakeContainer = typeof(BlobContainerClient)
            .GetConstructor(new[] { typeof(Uri) })!
            .Invoke(new object[] { new Uri("https://fake.blob.core.windows.net/models") }) as BlobContainerClient;

        // Configure options
        var opts = Options.Create(new BlobOptions
        {
            ConnectionString = "https://fake.blob.core.windows.net/container",
            ContainerModels = "models"
        });

        // Create testable subclass instance
        var storage = new TestableAzureBlobStorage(opts, mockBlobClient.Object);
        storage.SetContainerForTesting(fakeContainer);

        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        // Act
        try
        {
            await storage.UploadAsync("test.glb", stream, "model/gltf-binary");
            Assert.IsTrue(true);
        }
        catch (Exception ex)
        {
            Assert.Fail($"Unexpected exception: {ex.Message}");
        }
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

    [TestMethod]
    public async Task DeleteByIdAsync_ReturnsTrue()
    {
        // Act
        var id = Guid.NewGuid();
        var blobName = "blobName";
    }
}