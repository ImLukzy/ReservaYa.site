'use client';

import { ErrorPanel } from '@/components/ui/ErrorPanel';

// Errores de una página del panel: el sidebar (layout) sigue visible.
export default function DashboardError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return <ErrorPanel error={error} reintentar={unstable_retry} />;
}
