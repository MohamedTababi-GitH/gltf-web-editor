using ECAD_Backend.Application.DTOs.Filter;

namespace ECAD_Backend.UnitTests.DTOs.Filter;

[TestClass]
public class ModelFilterDtoTest
{
    [TestMethod]
    public void Contructor_AssignsProperties()
    {
        // Arrange
        var categories = new List<string>{"category1", "category2"};
        var isNew = true;
        var isFavourite = true;
        var format = "/api/model?format=glb";
        var q = "/api/model?q=oak";
        var prefix = "/api/model?prefix=furniture";
        
        // Act
        var dto = new ModelFilterDto
        {
            Categories = categories,
            IsNew = isNew,
            IsFavourite = isFavourite,
            Format = format,
            Q = q,
            Prefix = prefix
        };
        
        // Assert
        Assert.AreEqual(dto.Categories, categories);
        Assert.AreEqual(dto.IsNew, isNew);
        Assert.AreEqual(dto.IsFavourite, isFavourite);
        Assert.AreEqual(dto.Format, format);
        Assert.AreEqual(dto.Q, q);
        Assert.AreEqual(dto.Prefix, prefix);
    }

    [TestMethod]
    public void Constructor_Properties_CanBeNull()
    {
        // Arrange & Act
        var dto = new ModelFilterDto();
        
        // Assert
        Assert.IsNotNull(dto);
        Assert.IsNull(dto.Categories);
        Assert.IsNull(dto.IsNew);
        Assert.IsNull(dto.IsFavourite);
        Assert.IsNull(dto.Format);
        Assert.IsNull(dto.Q);
        Assert.IsNull(dto.Prefix);
    }
}