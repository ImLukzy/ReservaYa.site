import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Envía una sugerencia | ReservaYa", "¿Qué mejorarías de ReservaYa? Cuéntanos tu idea.", "/mejoras", "index, follow")

export default function Page() { return <PublicContent /> }
