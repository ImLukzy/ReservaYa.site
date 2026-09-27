'use client';

// Cabecera de página: línea de cal inferior, fondo sólido (sin backdrop-blur) y
// alto mínimo reservado para que el título no desplace el contenido.
export function TopBar({
  breadcrumb,
  title,
  action,
}: {
  breadcrumb: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 min-h-14 border-b border-cal bg-sillar py-3 pl-14 pr-4 sm:-mx-6 sm:pr-6 md:-mx-8 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-pizarra">{breadcrumb}</p>
          {title && (
            <h1 className="truncate font-display text-2xl font-bold text-basalto sm:text-3xl">{title}</h1>
          )}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
