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

        public void AcquireLock(Guid modelId)
        {
            if (!_locks.TryAdd(modelId, true))
                throw new ModelLockedException($"Model with ID {modelId} is currently locked.");
        }

        public void ReleaseLock(Guid modelId)
        {
            _locks.TryRemove(modelId, out _);
        }

        public bool IsLocked(Guid modelId)
        {
            return _locks.ContainsKey(modelId);
        }
    }
}
