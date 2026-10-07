import { z } from 'zod';

// F1 shares only the health contract. Business DTOs follow their parity gates.
export const healthResponseSchema = z.object({ ok: z.literal(true) }).strict();
export type HealthResponse = z.infer<typeof healthResponseSchema>;
