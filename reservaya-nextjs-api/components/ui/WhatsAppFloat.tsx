import { MessageCircle } from 'lucide-react';

export function WhatsAppFloat() {
  return (
    <a
      href="https://wa.me/51999999999"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_16px_rgba(37,211,102,0.4)] transition-all duration-300 hover:-translate-y-1 hover:scale-110"
    >
      <MessageCircle size={26} strokeWidth={2} />
    </a>
  );
}
