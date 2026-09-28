'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

// Fallback de los error.tsx. En producción Next oculta el mensaje de los errores
// de servidor; se muestra un texto fijo y el digest para cruzarlo con los logs.
export function ErrorPanel({
  error,
  reintentar,
}: {
  error: Error & { digest?: string };
  reintentar: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-cal bg-tiza p-8 text-center sm:p-12"
    >
      <AlertTriangle className="mb-4 h-12 w-12 text-error" strokeWidth={1.5} aria-hidden="true" />
      <h2 className="font-display text-xl font-bold text-basalto">No pudimos cargar esta sección</h2>
      <p className="mt-1 text-sm text-pizarra">
        El servidor no respondió como esperábamos. Si persiste, puede que la API esté caída.
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-pizarra">Ref: {error.digest}</p>}
      <button
        type="button"
        onClick={reintentar}
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-cesped px-5 py-2.5 text-sm font-semibold text-tiza transition-colors hover:bg-cesped-hover"
      >
        <RotateCw className="h-4 w-4" aria-hidden="true" /> Reintentar
      </button>
    </div>
  );
}
