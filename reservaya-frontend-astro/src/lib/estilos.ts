// Clases compartidas por los componentes .astro y los scripts que pintan DOM.
// Un solo lugar para que botones y campos se vean igual en toda la landing.

const BOTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-piedra disabled:text-pizarra";

export const BOTON = {
  primario: `${BOTON_BASE} bg-cesped text-tiza hover:bg-cesped-hondo`,
  secundario: `${BOTON_BASE} border border-borde bg-tiza text-basalto hover:bg-piedra`,
  texto: "inline-flex min-h-11 items-center gap-2 font-semibold text-cesped-hondo underline-offset-4 hover:underline",
} as const;

export const CAMPO =
  "w-full rounded-control border border-borde bg-tiza px-3 text-base text-basalto focus:border-cesped disabled:bg-piedra disabled:text-pizarra";

export const ETIQUETA = "mb-1.5 block text-sm font-medium text-basalto";

/** Tonos de etiqueta de estado (Badge.astro y scripts). «libre» es el único verde. */
export const INSIGNIA = {
  libre: "bg-cesped-suave text-cesped-hondo",
  neutro: "bg-piedra text-basalto",
  error: "bg-error-suave text-error",
} as const;
export const INSIGNIA_BASE = "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium";

export const AVISO = {
  error: "rounded-control bg-error-suave px-4 py-3 text-sm font-medium text-error",
  ok: "rounded-control bg-cesped-suave px-4 py-3 text-sm font-medium text-cesped-hondo",
} as const;
