import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Buscar canchas libres | ReservaYa", "Canchas libres en Arequipa por distrito, deporte, día y hora, con su precio real.", "/canchas", "index, follow")

export default function Page() { return <PublicContent /> }
