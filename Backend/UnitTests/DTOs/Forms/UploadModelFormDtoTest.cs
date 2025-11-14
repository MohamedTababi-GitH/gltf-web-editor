using ECAD_Backend.Application.DTOs.Forms;
using Microsoft.AspNetCore.Http;

namespace ECAD_Backend.UnitTests.DTOs.Forms;

[TestClass]
public class UploadModelFormDtoTest
{
    [TestMethod]
    public void Constructor_AssignsProperties()
    {
        // Arrange
        var fileName = "file";
        var filePath = fileName+".txt";
        var baseStream = new MemoryStream();
        var file = new FormFile(baseStream, 0, baseStream.Length, fileName, filePath);
        var files = new List<IFormFile> {file};
        var fileAlias = "fileAlias";
        var originalFileName = "originalFileName";
        var categories = new List<string>{"category1", "category2"};
        var descrpition = "descrpition";
        var baselineJson =  "baselineJson";
        
        // Act
        var dto = new UploadModelForm
        {
            Files = files,
            FileAlias = fileAlias,
            OriginalFileName = originalFileName,
            Categories = categories,
            Description = descrpition,
            BaselineJson = baselineJson
        };
        
        // Assert
        Assert.AreEqual(files, dto.Files);
        Assert.AreEqual(fileAlias, dto.FileAlias);
        Assert.AreEqual(originalFileName, dto.OriginalFileName);
        Assert.AreEqual(categories, dto.Categories);
        Assert.AreEqual(descrpition, dto.Description);
        Assert.AreEqual(baselineJson, dto.BaselineJson);
    }

    public void Constructor_SetsDefaultValues()
    {
        // Arrange
        List<IFormFile> defaultFiles = new();
        string defaultFileAlias = default!;
        string defaultOriginalFileName = default!;
        
        // Act
        var dto = new UploadModelForm();
        
        // Assert
        Assert.IsNotNull(dto);
        Assert.AreEqual(defaultFiles, dto.Files);
        Assert.AreEqual(defaultFileAlias, dto.FileAlias);
        Assert.AreEqual(defaultOriginalFileName, dto.OriginalFileName);
        Assert.IsNull(dto.Categories);
        Assert.IsNull(dto.Description);
        Assert.IsNull(dto.BaselineJson);
    }
}