import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Libro de reclamaciones | ReservaYa", "Registra tu queja o reclamo. Respondemos en un plazo máximo de 15 días hábiles.", "/libro-reclamaciones", "noindex, follow")

export default function Page() { return <PublicContent /> }
