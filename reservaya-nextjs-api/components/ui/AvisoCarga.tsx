import { AlertTriangle } from 'lucide-react';

// Errores de lectura de una página (lib/carga.ts). Se pinta en el render del servidor
// junto con la página, así que no aparece después ni desplaza el contenido (CLS 0);
// sin errores no ocupa espacio.
export function AvisoCarga({ errores }: { errores: readonly string[] }) {
  if (errores.length === 0) return null;
  return (
    <div
      role="alert"
      className="mb-4 flex gap-3 rounded-xl border border-error/30 bg-error-suave px-4 py-3 text-sm text-error"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <ul className="space-y-0.5 font-semibold">
          {errores.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs">
          Lo que ves puede estar incompleto. Recarga la página para reintentar.
        </p>
      </div>
    </div>
  );
}
