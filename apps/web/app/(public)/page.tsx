import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("ReservaYa | Canchas libres en Arequipa", "Mira qué canchas de fútbol, vóley, básquet, pádel y tenis están libres hoy en Arequipa y resérvalas en un minuto.", "/", "index, follow")

export default function Page() { return <PublicContent /> }
