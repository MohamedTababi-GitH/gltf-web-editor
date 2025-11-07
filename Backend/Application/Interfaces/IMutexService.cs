namespace ECAD_Backend.Application.Interfaces
{
    public interface IMutexService
    {
        void AcquireLock(Guid modelId);
        void ReleaseLock(Guid modelId);
        bool IsLocked(Guid modelId);
        
        /// <summary>
        /// Extends the duration of an existing lock, proving the client is still active.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to heartbeat.</param>
        /// <exception cref="Infrastructure.Exceptions.ModelLockedException">
        /// Thrown if no active lock is held for the specified model ID.
        /// </exception>
        void Heartbeat(Guid modelId);
    }
}