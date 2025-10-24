// using Azure;
// using Azure.Storage.Blobs;
// using Azure.Storage.Blobs.Models;
// using Microsoft.Extensions.Options;
// using Moq;
// using ECAD_Backend.Infrastructure.Options;
// using ECAD_Backend.Infrastructure.Storage;
//
// namespace ECAD_Backend.UnitTests;
//
// [TestClass]
// public class AzureBlobModelStorageTest
// {
//     [TestMethod]
//     public void Constructor_Throws_WhenConnectionStringMissing()
//     {
//         // Arrange
//         var connectionString = "";
//         var containermodels = "models";
//         
//         // Act
//         var options = Options.Create(new BlobOptions
//             {
//                 ConnectionString = connectionString,
//                 ContainerModels = containermodels
//             }
//         );
//         
//         // Assert
//         Assert.Throws<InvalidOperationException>(() => new AzureBlobModelStorage(options));
//     }
//
//     [TestMethod]
//     public void Constructor_Throws_WhenContainerNameMissing()
//     {
//         // Arrange
//         var connectionString = "https://fake.blob.core.windows.net/container";
//         var containermodels = "";
//         
//         // Act
//         var options = Options.Create(new BlobOptions
//             {
//                 ConnectionString = connectionString,
//                 ContainerModels = containermodels
//             }
//         );
//         
//         // Assert
//         Assert.Throws<InvalidOperationException>(() => new AzureBlobModelStorage(options));
//     }
//
//     [TestMethod]
//     public async Task ListPageAsync_ReturnsPageResult()
//     {
//         
//     }
//
//     [TestMethod]
//     public async Task UploadAsync_Throws_WhenBlobNameIsEmpty()
//     {
//         // Arrange
//         var blobName = "";
//         var content = new MemoryStream([1]);
//         var contentType = "image/png";
//         var options = Options.Create(new BlobOptions
//             {
//                 ConnectionString = "https://fake.blob.core.windows.net/container",
//                 ContainerModels = "models"
//             }
//         );
//         var storage = new AzureBlobModelStorage(options);
//         
//         // Act + Assert
//         var result = await Assert.ThrowsAsync<ArgumentException>(async () =>
//             await storage.UploadAsync(blobName, content, contentType));
//         Assert.AreEqual(nameof(blobName), result.ParamName);
//     }
//
//     [TestMethod]
//     public async Task UploadAsync_Throws_WhenStreamIsNull()
//     {
//         // Arrange
//         var blobName = "blobName";
//         MemoryStream content = null!;
//         var contentType = "image/png";
//         var options = Options.Create(new BlobOptions
//         {
//             ConnectionString = "https://fake.blob.core.windows.net/container",
//             ContainerModels = "models"
//         });
//         var storage = new AzureBlobModelStorage(options);
//         
//         // Act + Assert
//         var result = await Assert.ThrowsAsync<ArgumentNullException>(async () =>
//             await storage.UploadAsync(blobName, content, contentType));
//         Assert.AreEqual(nameof(content), result.ParamName);
//     }
// }