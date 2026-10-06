// Número de soporte por WhatsApp (solo dígitos, con código de país, p. ej. 51987654321).
// Sin la variable, los botones de WhatsApp no se muestran (spec 19: nada de números inventados).
const numero = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export const whatsappDisponible = numero.length >= 8;

export function whatsappUrl(texto?: string): string | null {
  if (!whatsappDisponible) return null;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
}

// "51987654321" → "987 654 321" (sin el código de país de Perú).
export function whatsappVisible(): string {
  const local = numero.startsWith('51') && numero.length === 11 ? numero.slice(2) : numero;
  return local.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}
