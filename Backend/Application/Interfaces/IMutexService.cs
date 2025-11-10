namespace ECAD_Backend.Application.Interfaces
{
    /// <summary>
    /// Provides a lightweight in-memory locking mechanism to ensure exclusive access
    /// to a specific model during update or delete operations.
    /// </summary>
    /// <remarks>
    /// The mutex service prevents concurrent modifications to the same model,
    /// ensuring data consistency while operations such as uploads, edits, or deletions are in progress.
    /// Locks are typically short-lived and should be released explicitly once the operation completes.
    /// </remarks>
    public interface IMutexService
    {
        /// <summary>
        /// Acquires an exclusive lock for the specified model.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to lock.</param>
        /// <exception cref="Infrastructure.Exceptions.ModelLockedException">
        /// Thrown if the model is already locked by another operation.
        /// </exception>
        void AcquireLock(Guid modelId);

        /// <summary>
        /// Releases the lock previously acquired for the specified model.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model whose lock should be released.</param>
        void ReleaseLock(Guid modelId);

        /// <summary>
        /// Determines whether the specified model is currently locked.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to check.</param>
        /// <returns>
        /// <see langword="true"/> if the model is currently locked;
        /// otherwise, <see langword="false"/>.
        /// </returns>
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