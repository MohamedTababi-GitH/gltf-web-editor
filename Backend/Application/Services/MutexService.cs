using System.Collections.Concurrent;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services
{
    /// <summary>
    /// Simple in-memory lease-based mutex implementation (single-server).
    /// </summary>
    public class MutexService : IMutexService
    {
        // Store the UTC time when the lock expires
        private readonly ConcurrentDictionary<Guid, DateTime> _locks = new();
        
        // Define how long a lock lease lasts
        private static readonly TimeSpan LeaseDuration = TimeSpan.FromSeconds(60);

        /// <summary>
        /// Acquires an in-memory lock for the specified model ID.
        /// A lock can be acquired if one does not exist, or if the existing one has expired.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to lock.</param>
        /// <exception cref="ModelLockedException">
        /// Thrown if the model is already locked by another request or user and the lease is active.
        /// </exception>
        public void AcquireLock(Guid modelId)
        {
            var newExpiry = DateTime.UtcNow + LeaseDuration;

            // Atomically add or update the lock
            _locks.AddOrUpdate(
                key: modelId,
                addValue: newExpiry,
                updateValueFactory: (key, existingExpiry) =>
                {
                    // If the existing lock is still active, throw
                    if (existingExpiry > DateTime.UtcNow)
                        throw new ModelLockedException($"This model is currently being used.");
                    
                    // Otherwise, the lock is expired, so take it
                    return newExpiry;
                });
        }

        /// <summary>
        /// Releases the lock for the specified model ID, allowing other operations to proceed.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to unlock.</param>
        public void ReleaseLock(Guid modelId)
        {
            _locks.TryRemove(modelId, out _);
        }

        /// <summary>
        /// Checks whether a model is currently locked with an active lease.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to check.</param>
        /// <returns><c>true</c> if the model is locked and the lease is active; otherwise, <c>false</c>.</returns>
        public bool IsLocked(Guid modelId)
        {
            if (_locks.TryGetValue(modelId, out var expiryTime))
            {
                // Lock exists. Is it still active?
                if (expiryTime > DateTime.UtcNow)
                    return true;

                // Lock has expired, perform opportunistic cleanup
                _locks.TryRemove(modelId, out _);
            }
            
            return false;
        }

        /// <summary>
        /// Extends the duration of an existing lock, proving the client is still active.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to heartbeat.</param>
        /// <exception cref="ModelLockedException">
        /// Thrown if no active lock is held for the specified model ID (e.g., it expired or was never acquired).
        /// </exception>
        public void Heartbeat(Guid modelId)
        {
            if (!_locks.TryGetValue(modelId, out var existingExpiry))
                throw new ModelLockedException("No active lock found to renew. The lease may have expired or was never acquired.");

            if (existingExpiry <= DateTime.UtcNow)
                throw new ModelLockedException("Lock expired before heartbeat was received. Please re-acquire the lock.");

            var newExpiry = DateTime.UtcNow + LeaseDuration;
            
            // Try to update the lease time, conditional on it still being the same one we read
            if (!_locks.TryUpdate(modelId, newExpiry, existingExpiry))
                throw new ModelLockedException("Failed to renew lock due to contention. Please try again.");
        }
    }
}