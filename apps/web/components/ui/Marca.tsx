import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  className?: string;
}
export function Marca(props: Props & { children?: ReactNode; arriba?: ReactNode; pie?: ReactNode }) {


// Marca: cancha vista desde arriba (líneas de cal) + nombre en letra de señalética.

const { className: extra = "" } = props;

return (<>


<Link href="/" className={`inline-flex min-h-11 items-center gap-2 text-basalto ${extra}`.trim()} aria-label="ReservaYa, inicio">
  <svg className="h-7 w-7 shrink-0 text-cesped" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="5" width="22" height="18" rx="2" />
    <path d="M14 5v18" />
    <circle cx="14" cy="14" r="3.5" />
  </svg>
  <span className="text-xl font-bold leading-none tracking-tight">Reserva<span className="text-cesped">Ya</span></span>
</Link>

</>);
}
