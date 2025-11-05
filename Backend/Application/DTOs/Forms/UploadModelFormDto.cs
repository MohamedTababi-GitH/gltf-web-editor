namespace ECAD_Backend.Application.DTOs.Forms;

public sealed class UploadModelForm
{
    // required
    public List<IFormFile> Files { get; set; } = new();

    public string FileAlias { get; set; } = default!;
    public string OriginalFileName { get; set; } = default!;

    // optional
    public List<string>? Categories { get; set; }
    public string? Description { get; set; }

    // optional baseline (either string or file)
    public string? BaselineJson { get; set; }
}