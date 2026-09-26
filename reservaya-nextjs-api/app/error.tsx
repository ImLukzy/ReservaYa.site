'use client';

import { ErrorPanel } from '@/components/ui/ErrorPanel';

// Errores en layouts anidados (p. ej. requireAuth del panel con la API caída).
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <ErrorPanel error={error} reintentar={unstable_retry} />
    </main>
  );
}
