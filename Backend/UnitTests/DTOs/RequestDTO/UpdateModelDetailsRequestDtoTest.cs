using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.UnitTests.DTOs.RequestDTO;

[TestClass]
public class UpdateModelDetailsRequestDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var newAlias = "newAlias";
        var categories = new List<string> { "category1", "category2" };
        var description = "newDescription";
        var isFavourite = false;
        
        // Act
        var dto = new UpdateModelDetailsRequestDto
        {
            NewAlias = newAlias,
            Categories = categories,
            Description = description,
            IsFavourite = isFavourite
        };

        // Assert
        Assert.AreEqual(newAlias, dto.NewAlias);
        Assert.AreEqual(categories, dto.Categories);
        Assert.AreEqual(description, dto.Description);
        Assert.AreEqual(isFavourite, dto.IsFavourite);
    }

    [TestMethod]
    public void Constructor_OptionalProperties_CanBeNull()
    {
        // Arrange
        var newAlias = "newAlias";
        var description = "newDescription";
        var isFavourite = false;
        
        // Act
        var dto = new UpdateModelDetailsRequestDto
        {
            NewAlias = newAlias,
            Description = description,
            IsFavourite = isFavourite
        };

        // Assert
        Assert.IsNull(dto.Categories);
    }
}