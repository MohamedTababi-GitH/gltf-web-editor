using System.Collections.Concurrent;
using ECAD_Backend.Application.Interfaces;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.Application.Services
{
    /// <summary>
    /// Simple in-memory mutex implementation (single-server).
    /// </summary>
    public class MutexService : IMutexService
    {
        private readonly ConcurrentDictionary<Guid, bool> _locks = new();

        /// <summary>
        /// Acquires an in-memory lock for the specified model ID.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to lock.</param>
        /// <exception cref="ModelLockedException">
        /// Thrown if the model is already locked by another request or user.
        /// </exception>
        public void AcquireLock(Guid modelId)
        {
            if (!_locks.TryAdd(modelId, true))
                throw new ModelLockedException($"Model with ID {modelId} is currently locked.");
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
        /// Checks whether a model is currently locked.
        /// </summary>
        /// <param name="modelId">The unique identifier of the model to check.</param>
        /// <returns><c>true</c> if the model is locked; otherwise, <c>false</c>.</returns>
        public bool IsLocked(Guid modelId)
        {
            return _locks.ContainsKey(modelId);
        }
    }
}
