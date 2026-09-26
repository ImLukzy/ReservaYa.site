import { AlertTriangle } from 'lucide-react';

// Errores de lectura de una página (lib/carga.ts). Sin errores no ocupa espacio.
export function AvisoCarga({ errores }: { errores: readonly string[] }) {
  if (errores.length === 0) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <ul className="space-y-0.5 font-semibold">
          {errores.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-red-600">
          Lo que ves puede estar incompleto. Recarga la página para reintentar.
        </p>
      </div>
    </div>
  );
}
