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
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border-2 border-basalto bg-[#25D366] text-grafito shadow-[3px_3px_0_0_#1f2a24] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#1f2a24] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_0_#1f2a24]"
    >
      <MessageCircle size={26} strokeWidth={2} aria-hidden="true" />
    </a>
  );
}
