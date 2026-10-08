import { CookiePreferences } from "./CookieConsent";
import Link from "next/link";
import { Marca } from "@/components/ui/Marca";
import Icon from "./ui/Icon";
import Misti from "./ui/Misti";
import { EMAIL, INSTAGRAM, whatsappUrl } from "../../lib/public/contacto";


export default function Footer() {


// Pie: marca, contacto y legal. Compacto y accesible.



const enlaceLegal = "inline-flex min-h-11 min-w-11 items-center text-pizarra hover:text-basalto hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped rounded px-1";

return (<>


<footer className="border-t border-cal bg-tiza">
  <div className="mx-auto max-w-page px-4 py-8 md:px-6">
    <Misti className="misti mb-8 text-cesped/45" />
    {/* Fila 1: marca + descripción / contacto */}
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
      <div>
        <Marca />
        <p className="mt-2 max-w-xs text-sm text-pizarra">Reservas de canchas deportivas en Arequipa, a la sombra del Misti.</p>
      </div>
      <ul className="flex items-center gap-3">
        <li>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener"
            aria-label="WhatsApp"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control hover:bg-cesped-suave focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped"
          >
            <Icon nombre="mensaje" className="h-5 w-5 text-cesped-hondo" />
          </a>
        </li>
        <li>
          <a
            href={`mailto:${EMAIL}`}
            aria-label="Correo"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control hover:bg-piedra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped"
          >
            <Icon nombre="correo" className="h-5 w-5 text-pizarra" />
          </a>
        </li>
        <li>
          <a
            href={INSTAGRAM}
            target="_blank"
            rel="noopener"
            aria-label="Instagram"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-control hover:bg-piedra focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesped"
          >
            <Icon nombre="instagram" className="h-5 w-5 text-pizarra" />
          </a>
        </li>
      </ul>
    </div>

    {/* Fila 2: legal */}
    <div className="mt-6 border-t border-cal pt-6">
      <ul className="flex flex-wrap items-center gap-2 text-xs text-pizarra md:gap-4 md:text-sm">
        <li>© {new Date().getFullYear()} ReservaYa</li>
        <li className="hidden md:inline text-basalto/30">·</li>
        <li><Link href="/jugar" className={enlaceLegal}>Jugar</Link></li>
        <li><Link href="/legal/terms" className={enlaceLegal}>Términos</Link></li>
        <li className="hidden md:inline text-basalto/30">·</li>
        <li><Link href="/legal/privacy" className={enlaceLegal}>Privacidad</Link></li>
        <li className="hidden md:inline text-basalto/30">·</li>
        <li><Link href="/libro-reclamaciones" className={enlaceLegal}>Libro de reclamaciones</Link></li>
        <li className="hidden md:inline text-basalto/30">·</li>
        <li><Link href="/mejoras" className={enlaceLegal}>Sugerencias</Link></li>
        <li><CookiePreferences /></li>
      </ul>
    </div>
  </div>
</footer>

</>);
}
