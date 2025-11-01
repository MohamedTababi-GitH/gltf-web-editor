namespace ECAD_Backend.Application.Interfaces
{
    public interface ILockService : IAsyncDisposable
    {
        /// <summary>
        /// Attempts to acquire a lock for a given key.
        /// </summary>
        /// <param name="key">The unique key to lock on (e.g., a model ID or alias).</param>
        /// <param name="duration">The duration for which to hold the lock.</param>
        /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
        /// <returns>
        /// A task that represents the asynchronous operation. The task result is a non-null lock identifier if the lock
        /// was acquired, or null if the lock is already held by another process.
        /// </returns>
        Task<string?> TryAcquireLockAsync(string key, TimeSpan duration, CancellationToken cancellationToken);
        /// <summary>
        /// Releases a previously acquired lock.
        /// </summary>
        /// <param name="key">The unique key that was locked.</param>
        /// <param name="lockId">The lock identifier returned by <see cref="TryAcquireLockAsync"/>.</param>
        /// <param name="cancellationToken">A token to monitor for cancellation requests.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        Task ReleaseLockAsync(string key, string lockId, CancellationToken cancellationToken);

    }
}