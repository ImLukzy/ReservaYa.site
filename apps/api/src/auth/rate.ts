import { Injectable } from '@nestjs/common';
export const MAX_RATE_KEYS = 10_000;
const SWEEP_INTERVAL_MS = 30_000;
@Injectable()
export class RateLimiter {
  private readonly hits = new Map<string, { timestamps: number[]; expiresAt: number }>();
  private nextSweep = 0;
  get size() { return this.hits.size; }
  limited(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    if (now >= this.nextSweep) {
      for (const [name, entry] of this.hits) if (entry.expiresAt <= now) this.hits.delete(name);
      this.nextSweep = now + SWEEP_INTERVAL_MS;
    }
    const queue = (this.hits.get(key)?.timestamps ?? []).filter(t => now - t < windowMs);
    if (queue.length >= limit) return true;
    // Reject new keys at capacity instead of evicting active limits (which would allow bypass).
    if (!this.hits.has(key) && this.hits.size >= MAX_RATE_KEYS) return true;
    queue.push(now);
    this.hits.set(key, { timestamps: queue, expiresAt: now + windowMs });
    return false;
  }
  reset(key: string) { this.hits.delete(key); }
}
