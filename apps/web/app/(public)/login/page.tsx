import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Entrar | ReservaYa", "Entra a tu cuenta de ReservaYa para reservar canchas y ver tus partidos.", "/login", "noindex, follow")

export default function Page() { return <PublicContent /> }
