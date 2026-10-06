import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Cómo reservar | ReservaYa", "Guía para reservar una cancha en ReservaYa, paso a paso.", "/ayuda", "index, follow")

export default function Page() { return <PublicContent /> }
