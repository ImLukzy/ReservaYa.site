// Clases compartidas por los componentes .astro y los scripts que pintan DOM.
// Un solo lugar para que botones y campos se vean igual en toda la landing.

const BOTON_BASE =
  "btn-tactil min-h-11 px-5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const BOTON = {
  primario: `${BOTON_BASE} bg-cesped text-tiza hover:bg-cesped-hondo`,
  secundario: `${BOTON_BASE} bg-tiza text-basalto hover:bg-piedra`,
  oscuro: `${BOTON_BASE} bg-noche text-tiza hover:bg-basalto`,
  peligro: `${BOTON_BASE} bg-error text-tiza hover:bg-error-hondo`,
  texto: "inline-flex min-h-11 items-center gap-2 font-bold text-cesped-hondo underline-offset-4 hover:underline",
} as const;

export const CAMPO =
  "w-full rounded-full border-2 border-basalto bg-tiza px-4 py-2.5 text-base text-basalto shadow-dura-sm focus:shadow-[4px_4px_0_0_var(--color-cesped)] focus:outline-none disabled:bg-piedra disabled:text-pizarra";

export const ETIQUETA = "mb-1.5 block text-sm font-bold text-basalto";

/** Tonos de etiqueta de estado (Badge.astro y scripts). «libre» es el único verde. */
export const INSIGNIA = {
  libre: "border-basalto bg-cesped-suave text-cesped-hondo",
  neutro: "border-basalto bg-tiza text-basalto",
  error: "border-basalto bg-error-suave text-error",
} as const;
export const INSIGNIA_BASE = "inline-flex items-center rounded-full border-2 px-3 py-0.5 text-xs font-bold";

export const AVISO = {
  error: "rounded-xl border-2 border-error bg-error-suave px-4 py-3 text-sm font-semibold text-error",
  ok: "rounded-xl border-2 border-cesped bg-cesped-suave px-4 py-3 text-sm font-semibold text-cesped-hondo",
} as const;
