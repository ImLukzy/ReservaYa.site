// Contacto oficial de ReservaYa (un solo lugar para la landing).
export const EMAIL = "lukas.melgar@tecsup.edu.pe";
const WHATSAPP = "51907425900";


export function whatsappUrl(texto?: string): string {
  return `https://wa.me/${WHATSAPP}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
