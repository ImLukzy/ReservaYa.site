import { apiRequest } from './http';
export function solicitarSuscripcion(complejoId: string, plan: string) {
  return apiRequest<{ suscripcion: Record<string, unknown> }>('/api/suscripciones', {
    method: 'POST', body: JSON.stringify({ complejoId, plan }),
  });
}
