using ECAD_Backend.Application.Services;
using ECAD_Backend.Infrastructure.Exceptions;

namespace ECAD_Backend.UnitTests.Services;

[TestClass]
public class MutexServiceTest
{
    private MutexService _mutexService = null!;
    
    [TestInitialize]
    public void Setup()
    {
        _mutexService = new MutexService();
    }
    
    [TestMethod]
    public void AcquireLock_Succeeds()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        
        // Assert
        Assert.IsTrue(_mutexService.IsLocked(id));
    }
    
    [TestMethod]
    public void AcquireLock_Throws_WhenLocked()
    {
        // Arrange
        var expectedErrorMessage = "model is currently being used";
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        var result = Assert.Throws<ModelLockedException>(() => _mutexService.AcquireLock(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public void ReleaseLock_Succeeds()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        _mutexService.ReleaseLock(id);
        
        // Assert
        Assert.IsFalse(_mutexService.IsLocked(id));
    }

    [TestMethod]
    public void IsLocked_ReturnsTrue_IfLocked()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        var result = _mutexService.IsLocked(id);
        
        // Assert
        Assert.IsTrue(result);
    }

    [TestMethod]
    public void IsLocked_ReturnsFalse_WhenExpired()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        var field = typeof(MutexService).GetField("_locks", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var dict = (System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTime>)field.GetValue(_mutexService)!;
        dict[id] = DateTime.UtcNow.AddSeconds(-5);  // manually expire
        var result = _mutexService.IsLocked(id);
        
        // Assert
        Assert.IsFalse(result);
    }

    [TestMethod]
    public void IsLocked_ReturnsFalse_WhenLockRemoved()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        _mutexService.ReleaseLock(id);
        var result = _mutexService.IsLocked(id);
        
        // Assert
        Assert.IsFalse(result);
    }

    [TestMethod]
    public void Heartbeat_Succeeds()
    {
        // Arrange
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        _mutexService.Heartbeat(id);
        
        // Assert
        Assert.IsTrue(_mutexService.IsLocked(id));
    }

    [TestMethod]
    public void Heartbeat_Throws_WhenNotLocked()
    {
        // Arrange
        var expectedErrorMessage = "No active lock found to renew. The lease may have expired or was never acquired";
        var id = Guid.NewGuid();
        
        // Act
        var result = Assert.Throws<ModelLockedException>(() => _mutexService.Heartbeat(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public void Heartbeat_Throws_WhenExpired()
    {
        // Arrange
        var expectedErrorMessage = "Lock expired before heartbeat was received";
        var id = Guid.NewGuid();
        
        // Act
        _mutexService.AcquireLock(id);
        var field = typeof(MutexService).GetField("_locks", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var dict = (System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTime>)field.GetValue(_mutexService)!;
        dict[id] = DateTime.UtcNow.AddSeconds(-5);  // manually expire
        var result = Assert.Throws<ModelLockedException>(() => _mutexService.Heartbeat(id));
        
        // Assert
        Assert.Contains(expectedErrorMessage, result.Message);
    }

    [TestMethod]
    public void Heartbeat_Throws_WhenContended()
    {
        // Arrange
        var expectedErrorMessage = "Failed to renew lock due to contention";
        var id = Guid.NewGuid();
        bool exceptionThrown = false;
        
        // Act
        _mutexService.AcquireLock(id);
        var field = typeof(MutexService).GetField("_locks", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var dict = (System.Collections.Concurrent.ConcurrentDictionary<Guid, DateTime>)field.GetValue(_mutexService)!;

        for (int attempt = 0; attempt < 1000 && !exceptionThrown; attempt++)
        {
            dict[id] = DateTime.UtcNow.AddSeconds(5);

            var t = new Thread(() =>
            {
                for (int i = 0; i < 10; i++)
                    dict[id] = DateTime.UtcNow.AddMilliseconds(1);
            });
            t.Start();

            try
            {
                _mutexService.Heartbeat(id);
            }
            catch (ModelLockedException ex)
            {
                if ( ex.Message.Contains(expectedErrorMessage))
                    exceptionThrown = true;
            }
            t.Join();
        }
        
        // Assert
        Assert.IsTrue(exceptionThrown, "Expected a ModelLockedException, but none occurred.");
    }
}