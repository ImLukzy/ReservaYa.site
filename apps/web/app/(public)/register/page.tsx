import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Crear cuenta | ReservaYa", "Crea tu cuenta de ReservaYa para reservar canchas en Arequipa.", "/register", "noindex, follow")

export default function Page() { return <PublicContent /> }
