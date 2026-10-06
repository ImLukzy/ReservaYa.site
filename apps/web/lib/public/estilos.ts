// Clases compartidas por los componentes .astro y los scripts que pintan DOM.
// Un solo lugar para que botones y campos se vean igual en toda la landing.

const BOTON_BASE =
  "btn-tactil min-h-11 px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none";

export const BOTON = {
  primario: `${BOTON_BASE} bg-cesped text-tiza hover:bg-cesped-hondo`,
  secundario: `${BOTON_BASE} btn-tactil--claro bg-tiza text-basalto hover:bg-cesped-suave`,
  oscuro: `${BOTON_BASE} bg-cesped-hondo text-tiza hover:bg-noche`,
  peligro: `${BOTON_BASE} bg-error text-tiza hover:bg-error-hondo`,
  texto: "inline-flex min-h-11 items-center gap-2 font-semibold text-cesped-hondo underline-offset-4 hover:underline",
} as const;

export const CAMPO =
  "w-full rounded-full border border-borde bg-tiza px-4 py-2.5 text-base text-basalto transition-colors hover:border-pizarra focus:border-cesped focus:outline-none disabled:bg-piedra disabled:text-pizarra";

/** Número de paso en círculo (spec 47): pasos de /duenos y de /sortear. */
export const NUMERO_PASO =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cesped-suave text-base font-semibold tabular-nums text-cesped-hondo";

export const ETIQUETA = "mb-1.5 block text-sm font-medium text-basalto";

/** Tonos de etiqueta de estado (Badge.astro y scripts). «libre» es el único verde. */
export const INSIGNIA = {
  libre: "border-transparent bg-cesped-suave text-cesped-hondo",
  neutro: "border-cal bg-tiza text-basalto",
  error: "border-transparent bg-error-suave text-error",
} as const;
export const INSIGNIA_BASE = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

export const AVISO = {
  error: "rounded-surface border border-error bg-error-suave px-4 py-3 text-sm font-semibold text-error",
  ok: "rounded-surface border border-cesped bg-cesped-suave px-4 py-3 text-sm font-semibold text-cesped-hondo",
} as const;
