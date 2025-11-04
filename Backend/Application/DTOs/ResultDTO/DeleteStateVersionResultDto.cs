namespace ECAD_Backend.Application.DTOs.ResultDTO;

public class DeleteStateVersionResultDto
{
        public string Message { get; set; } = "Deleted.";
        public string AssetId { get; set; } = default!;
        public string Version { get; set; } = default!;
        public int DeletedBlobs { get; set; }
}