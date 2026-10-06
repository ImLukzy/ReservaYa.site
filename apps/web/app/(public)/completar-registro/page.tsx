import PublicContent from "./content"
import { publicMetadata } from "@/lib/public/metadata"

export const metadata = publicMetadata("Completar registro | ReservaYa", "Completa tu registro con ReservaYa.", "/completar-registro", "noindex, follow")

export default function Page() { return <PublicContent /> }
