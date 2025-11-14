using ECAD_Backend.Application.DTOs.RequestDTO;
using ECAD_Backend.Application.DTOs.ResultDTO;

namespace ECAD_Backend.Application.Interfaces
{
    /// <summary>
    /// Handles persisting editor/runtime state (scene config, annotations, etc.) for an asset.
    /// </summary>
    public interface IModelStateService
    {
        /// <summary>
        /// Saves the state of a model asynchronously.
        /// </summary>
        /// <param name="requestDto">The request containing the state data to save.</param>
        /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
        /// <returns>A task representing the asynchronous operation, containing the state update result.</returns>
        Task<UpdateStateResultDto> SaveStateAsync(UpdateStateRequestDto requestDto,
            CancellationToken cancellationToken);

        /// <summary>
        /// Deletes a named state version (folder) by version label.
        /// </summary>
        Task<DeleteStateVersionResultDto> DeleteStateVersionAsync(
            string assetId,
            string version,
            CancellationToken cancellationToken);
    }
}