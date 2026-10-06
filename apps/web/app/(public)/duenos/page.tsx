import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Publica tus canchas | ReservaYa para dueños", "Recibe reservas de tus canchas en Arequipa sin contestar llamadas. Agenda, precios, caja y trabajadores en un solo panel.", "/duenos", "index, follow")

export default function Page() { return <PublicContent /> }
