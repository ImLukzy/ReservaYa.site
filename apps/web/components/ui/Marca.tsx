import Link from "next/link";

interface Props {
  className?: string;
  // "sitio": tokens del .public-site (texto claro, verde vivo). "noche": fondo noche del panel claro.
  tono?: "sitio" | "noche";
  href?: string;
}

const TONOS = {
  sitio: { texto: "text-basalto", verde: "text-cesped" },
  noche: { texto: "text-tiza", verde: "text-cesped-vivo" },
} as const;

// Marca: cancha vista desde arriba (líneas de cal) + nombre en letra de señalética.
// Única implementación para cabecera, pie y panel: misma fuente, peso, tamaño e icono.
export function Marca({ className = "", tono = "sitio", href = "/" }: Props) {
  const { texto, verde } = TONOS[tono];
  return (
    <Link href={href} className={`inline-flex min-h-11 items-center gap-2 ${texto} ${className}`.trim()} aria-label="ReservaYa, inicio">
      <svg className={`h-7 w-7 shrink-0 ${verde}`} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="5" width="22" height="18" rx="2" />
        <path d="M14 5v18" />
        <circle cx="14" cy="14" r="3.5" />
      </svg>
      <span className="font-cuerpo text-xl font-bold antialiased leading-none tracking-tight">Reserva<span className={verde}>Ya</span></span>
    </Link>
  );
}
