import type { ReactNode } from "react";
import Image from "next/image";
import Icon from "./ui/Icon";

interface Props {
  titulo: string;
  texto?: string;
  idTitulo?: string;
}
export default function AuthCard(props: Props & { children?: ReactNode; arriba?: ReactNode; pie?: ReactNode }) {
const { children, arriba, pie } = props;

// Tarjeta centrada de las páginas de cuenta (entrar, registro y contraseña).
// En pantallas grandes (xl+) va acompañada de un panel visual decorativo: foto real de cancha bajo el velo verde (spec 53).



const { titulo, texto, idTitulo } = props;
const ventajas = ["Confirmación directa del complejo", "Horarios libres por hora y deporte", "Organización de partidos y torneos"];

return (<>


<div className="cuenta-pantalla mx-auto grid w-full max-w-5xl gap-8 px-4 py-10 lg:py-16 xl:grid-cols-[minmax(0,26rem)_1fr] xl:items-center">
  <section className="mx-auto w-full max-w-md xl:mx-0 xl:max-w-none">
    <div className="card-tactil bg-tiza p-6 shadow-suave-lg sm:p-8">
      {arriba}
      <h1 id={idTitulo} className="text-2xl font-bold text-basalto lg:text-3xl">{titulo}</h1>
      {texto && <p className="mt-2 text-pizarra">{texto}</p>}
      <div className="mt-6">{children}</div>
    </div>
    <div className="mt-5 text-center">{pie}</div>
  </section>

  <aside className="relative isolate hidden overflow-hidden rounded-surface bg-cancha-noche p-8 text-blanco shadow-suave-lg xl:flex xl:min-h-[28.75rem] xl:flex-col xl:justify-between" aria-hidden="true">
    <Image src="/img/hero/cuenta-atardecer.webp" alt="" fill sizes="36rem" loading="eager" className="-z-10 object-cover" />
    <div className="cuenta-velo -z-10" />
    <div className="relative z-10">
      <p className="font-semibold text-reflector">ReservaYa Arequipa</p>
      <h2 className="titular mt-3 text-6xl text-blanco">
        La cancha lista antes del pitazo
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-blanco/90">
        Consulta horarios libres por hora, organiza tus partidos y reserva con confirmación directa del complejo.
      </p>
    </div>

    <ul className="relative z-10 mt-8 space-y-3 border-t border-blanco/20 pt-6">
      {ventajas.map((v) => (
        <li key={v} className="flex items-center gap-3 text-sm font-medium text-blanco">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cesped text-tiza"><Icon nombre="ok" className="h-4 w-4" /></span>{v}
        </li>
      ))}
    </ul>
  </aside>
</div>

</>);
}
