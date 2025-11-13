using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.ResultDTO;

[TestClass]
public class PageResultDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var items = new List<string> {"item1", "item2"};
        var nextCursor = "nextCursor";
        var hasMore = true;
        var totalCount = 10;
        
        // Act
        var dto = new PageResultDto<string>(items, nextCursor, hasMore, totalCount);
        
        // Assert
        Assert.AreEqual(items, dto.Items);
        Assert.AreEqual(nextCursor, dto.NextCursor);
        Assert.AreEqual(hasMore, dto.HasMore);
        Assert.AreEqual(totalCount, dto.TotalCount);
    }

    [TestMethod]
    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        var defaultTotalCount = 0;
        var items = new List<int> {1,2,3};
        var nextCursor = "nextCursor";
        var hasMore = false;
        
        // Act
        var dto = new PageResultDto<int>(items, nextCursor, hasMore);
        
        // Assert
        Assert.AreEqual(defaultTotalCount, dto.TotalCount);
    }
    
    [TestMethod]
    public void Records_WithSameValues_AreEqual()
    {
        // Arrange
        var items = new List<string> {"item1", "item2"};
        var nextCursor = "nextCursor";
        var hasMore = true;
        var totalCount = 7;
        
        // Act
        var dto1 = new PageResultDto<string>(items, nextCursor, hasMore, totalCount);
        var dto2 = new PageResultDto<string>(items, nextCursor, hasMore, totalCount);
        
        // Assert
        Assert.AreEqual(dto1, dto2);
    }
}