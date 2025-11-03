namespace ECAD_Backend.Application.Interfaces
{
    public interface IMutexService
    {
        void AcquireLock(Guid modelId);
        void ReleaseLock(Guid modelId);
        bool IsLocked(Guid modelId);
    }
}