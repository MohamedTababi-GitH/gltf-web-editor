using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.Application.Interfaces
{
    /// <summary>
    /// Handles validating and ingesting new model assets (the .glb/.gltf and companions) into storage.
    /// </summary>
    public interface IModelUploadService
    {
        /// <summary>
        /// Uploads a model asynchronously based on the specified requestDto data.
        /// </summary>
        /// <param name="requestDto">The requestDto containing model upload details.</param>
        /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
        /// <returns>A task representing the asynchronous operation, containing the upload result as <see cref="UploadResultDto"/>.</returns>
        Task<UploadResultDto> UploadAsync(UploadModelRequestDto requestDto, CancellationToken cancellationToken);
    }
}