using System.Collections.Concurrent;

namespace ReservaFacil.Api.Security;

public interface IRateLimiter
{
    bool IsLimited(string key, int limit, TimeSpan window);
}

public class MemoryRateLimiter : IRateLimiter
{
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _hits = new();

    public bool IsLimited(string key, int limit, TimeSpan window)
    {
        var now = DateTime.UtcNow;
        var queue = _hits.GetOrAdd(key, _ => new Queue<DateTime>());

        lock (queue)
        {
            while (queue.Count > 0 && now - queue.Peek() >= window)
                queue.Dequeue();

            if (queue.Count >= limit) return true;

            queue.Enqueue(now);
            return false;
        }
    }
}