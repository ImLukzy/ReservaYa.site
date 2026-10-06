'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/public/Header';
import Footer from '@/components/public/Footer';
import { Button } from "@/components/ui/Button";
import { CroquisCancha } from "@/components/ui/CroquisCancha";
import { EMAIL } from '@/lib/public/contacto';
import { ErrorPanel } from '@/components/ui/ErrorPanel';

// Errores en layouts anidados (p. ej. requireAuth del panel con la API caída).
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const pathname = usePathname();
  const panel = ['/dashboard', '/admin', '/tecnico'].some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'));
  if (!panel) return <div className="public-site flex min-h-screen flex-col">
    <Header />
    <main className="min-h-[calc(100svh-4rem)] flex-1">
      <section className="mx-auto max-w-texto px-4 py-16 md:px-6 lg:py-24">
        <div className="card-tactil p-8 text-center sm:p-12">
          <span className="eyebrow inline-flex rounded-full border border-error bg-error-suave px-3 py-1 text-error">Error del servidor</span>
          <CroquisCancha apariencia="publica" className="mx-auto mb-4 h-32 w-full max-w-xs" />
          <h1 className="mt-3 font-display text-3xl font-bold text-basalto lg:text-4xl">Algo falló de nuestro lado</h1>
          <p className="mx-auto mt-3 max-w-md text-lg text-pizarra">Vuelve a intentarlo en unos minutos. Si sigue pasando, escríbenos a {EMAIL}.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={unstable_retry} className="btn-tactil min-h-11 bg-cesped px-5 text-tiza">Volver a intentar</button>
            <Button apariencia="publica" href="/">Ir al inicio</Button><Button apariencia="publica" href={`mailto:${EMAIL}`} variante="secundario">Escribirnos</Button>
          </div>
        </div>
      </section>
    </main><Footer />
  </div>;
  return (
    <main className="flex min-h-screen items-center justify-center bg-sillar">
      <ErrorPanel error={error} reintentar={unstable_retry} />
    </main>
  );
}
