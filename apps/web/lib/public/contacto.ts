// Contacto oficial de ReservaYa (un solo lugar para la landing).
export const EMAIL = "hola@reservaya.pe";
const WHATSAPP = "51907425900";

export const INSTAGRAM = "https://www.instagram.com/reservaya.pe";

export function whatsappUrl(texto?: string): string {
  return `https://wa.me/${WHATSAPP}${texto ? `?text=${encodeURIComponent(texto)}` : ""}`;
}
