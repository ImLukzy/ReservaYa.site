import { MessageCircle } from 'lucide-react';
import { whatsappUrl } from '@/lib/whatsapp';

// Verde de marca WhatsApp con icono grafito (9.9:1); sin número configurado no se pinta.
export function WhatsAppFloat() {
  const href = whatsappUrl();
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-cal bg-cesped text-tiza shadow-suave-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-suave active:translate-x-0.5 active:translate-y-0.5 active:shadow-suave-sm"
    >
      <MessageCircle size={26} strokeWidth={2} aria-hidden="true" />
    </a>
  );
}
