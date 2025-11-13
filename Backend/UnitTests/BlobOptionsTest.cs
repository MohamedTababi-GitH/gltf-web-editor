using ECAD_Backend.Infrastructure.Options;

namespace ECAD_Backend.UnitTests;


[TestClass]
public class BlobOptionsTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var connectionString = "connectionString";
        var containerModels = "containerModels";
        
        // Act
        var options = new BlobOptions
        {
            ConnectionString = connectionString,
            ContainerModels = containerModels
        };
        
        // Assert
        Assert.AreEqual(connectionString, options.ConnectionString);
        Assert.AreEqual(containerModels, options.ContainerModels);
    }

    [TestMethod]
    public void Constructor_Properties_CanBeNull()
    {
        // Arrange & Act
        var options = new BlobOptions();
        
        // Assert
        Assert.IsNotNull(options);
        Assert.IsNull(options.ConnectionString);
        Assert.IsNull(options.ContainerModels);
    }
}