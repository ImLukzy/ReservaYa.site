import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from './index';

describe('health response contract', () => {
  it('accepts healthy service and rejects false or extra internal fields', () => {
    expect(healthResponseSchema.parse({ ok: true })).toEqual({ ok: true });
    expect(healthResponseSchema.safeParse({ ok: false }).success).toBe(false);
    expect(healthResponseSchema.safeParse({ ok: true, connection: 'private' }).success).toBe(false);
  });
});
